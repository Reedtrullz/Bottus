import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as chrono from 'chrono-node';
import { v4 as uuid } from 'uuid';
import { CalendarEvent, createCalendarDb, rowToCalendarEvent } from '../db/calendar-schema.js';

/**
 * Expanded instance of a recurring event
 */
export interface ExpandedEventInstance extends CalendarEvent {
  instanceId: string; // Unique ID for this instance (parentId_instanceIndex)
  originalStartTime: number; // The start time of this specific instance
  originalEndTime?: number; // The end time of this specific instance
}

/**
 * Expand a recurring event into multiple instances within a date range
 */
export function expandRecurringEvent(
  event: CalendarEvent,
  rangeStart: number,
  rangeEnd: number
): ExpandedEventInstance[] {
  if (!event.recurrence) {
    // Non-recurring event - include if within range
    if (event.startTime >= rangeStart && event.startTime <= rangeEnd) {
      return [{
        ...event,
        instanceId: `${event.id}_0`,
        originalStartTime: event.startTime,
        originalEndTime: event.endTime,
      }];
    }
    return [];
  }

  const instances: ExpandedEventInstance[] = [];
  const recurrenceEnd = event.recurrenceEnd || Number.MAX_SAFE_INTEGER;
  const effectiveEnd = Math.min(rangeEnd, recurrenceEnd);

  // Parse recurrence pattern
  const recurrencePattern = event.recurrence.toUpperCase();
  let intervalMs: number | null = null;

  if (recurrencePattern.includes('FREQ=DAILY')) {
    intervalMs = 24 * 60 * 60 * 1000; // 1 day
  } else if (recurrencePattern.includes('FREQ=WEEKLY')) {
    intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  } else if (recurrencePattern.includes('FREQ=MONTHLY')) {
    // Monthly is handled specially - we add months to the date
    intervalMs = null;
  }

  let instanceIndex = 0;
  let currentStart = event.startTime;
  let currentEnd = event.endTime;

  // Generate instances until we pass the effective end date
  while (currentStart <= effectiveEnd) {
    // Include if within the requested range
    if (currentStart >= rangeStart && currentStart <= rangeEnd) {
      instances.push({
        ...event,
        instanceId: `${event.id}_${instanceIndex}`,
        startTime: currentStart,
        endTime: currentEnd,
        originalStartTime: currentStart,
        originalEndTime: currentEnd,
      });
    }

    // Move to next occurrence
    if (intervalMs !== null) {
      // Daily or Weekly - simple interval addition
      currentStart += intervalMs;
      if (currentEnd) {
        currentEnd += intervalMs;
      }
    } else {
      // Monthly - add months to the date
      const startDate = new Date(currentStart);
      startDate.setMonth(startDate.getMonth() + 1);
      
      // Handle month-end edge cases (e.g., Jan 31 -> Feb 28)
      const originalDay = new Date(event.startTime).getDate();
      if (startDate.getDate() !== originalDay) {
        // The month doesn't have enough days, use last day of month
        startDate.setDate(0);
      }
      
      const duration = event.endTime ? event.endTime - event.startTime : 0;
      currentStart = startDate.getTime();
      if (currentEnd && event.endTime) {
        currentEnd = currentStart + duration;
      }
    }

    instanceIndex++;

    // Safety limit - prevent infinite loops
    if (instanceIndex > 1000) {
      break;
    }
  }

  return instances;
}

export class CalendarServiceV2 {
  private db: SqlJsDatabase | null = null;
  private scheduledReminders: Map<string, NodeJS.Timeout> = new Map();
  private initialized: boolean = false;
  private dbPath: string = '';
  private discord: any = null;

  constructor(dbPath: string, discord?: any) {
    this.dbPath = dbPath;
    this.discord = discord;
  }

  /**
   * Set Discord client after construction (for DI)
   */
  setDiscord(discord: any): void {
    this.discord = discord;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const SQL = await initSqlJs();
    // Load from disk if present, otherwise create in-memory DB
    if (fs.existsSync(this.dbPath)) {
      const data = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(data);
    } else {
      this.db = new SQL.Database();
      createCalendarDb(this.db);
    }
    this.initialized = true;
    // Auto-save every 5 minutes
    setInterval(() => this.save(), 5 * 60 * 1000);
  }
  
  public save(): void {
    if (!this.db) return;
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.dbPath, (this.db as any).export());
  }

  async createEvent(
    title: string,
    startTime: Date,
    options: {
      endTime?: Date;
      description?: string;
      timezone?: string;
      recurrence?: string;
      recurrenceEnd?: Date;
      location?: string;
      creatorId: string;
      channelId: string;
      guildId?: string;
      reminders?: number[];
    }
  ): Promise<CalendarEvent> {
    if (!this.db) await this.initialize();
    
    const now = Date.now();
    const id = uuid();
    const event: CalendarEvent = {
      id,
      title,
      description: options.description,
      startTime: startTime.getTime(),
      endTime: options.endTime?.getTime(),
      timezone: options.timezone || 'Europe/Oslo',
      recurrence: options.recurrence,
      recurrenceEnd: options.recurrenceEnd?.getTime(),
      location: options.location,
      creatorId: options.creatorId,
      channelId: options.channelId,
      guildId: options.guildId,
      rsvp: JSON.stringify({}),
      reminders: JSON.stringify(options.reminders || [15, 60]),
      createdAt: now,
      updatedAt: now,
    };

    this.db!.run(`
      INSERT INTO calendar_events 
      (id, title, description, startTime, endTime, timezone, recurrence, 
       recurrenceEnd, location, creatorId, channelId, guildId, rsvp, reminders, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      event.id,
      event.title,
      event.description ?? null,
      event.startTime,
      event.endTime ?? null,
      event.timezone,
      event.recurrence ?? null,
      event.recurrenceEnd ?? null,
      event.location ?? null,
      event.creatorId,
      event.channelId,
      event.guildId ?? null,
      event.rsvp ?? null,
      event.reminders ?? null,
      event.createdAt,
      event.updatedAt
    ]);

    // Schedule reminders
    const reminders = event.reminders ? JSON.parse(event.reminders) : [];
    if (reminders.length > 0) {
      this.scheduleReminders(event, reminders);
    }
    this.save();
    
    return event;
  }

  async getEvents(channelId: string, range: 'today' | 'week' | 'all'): Promise<CalendarEvent[]> {
    if (!this.db) await this.initialize();

    const now = new Date();
    const rangeStart = now.getTime();
    let rangeEnd: number;

    if (range === 'today') {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      rangeEnd = endOfDay.getTime();
    } else if (range === 'week') {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      rangeEnd = endOfWeek.getTime();
    } else {
      rangeEnd = Number.MAX_SAFE_INTEGER;
    }

    const results = this.db!.exec(`
      SELECT id, title, description, startTime, endTime, timezone, recurrence,
             recurrenceEnd, location, creatorId, channelId, guildId, rsvp, reminders, createdAt, updatedAt
      FROM calendar_events
      WHERE channelId = ?
      ORDER BY startTime ASC
    `, [channelId]);

    if (!results.length || !results[0].values.length) {
      return [];
    }

    const events = results[0].values.map(rowToCalendarEvent);
    const expandedEvents: CalendarEvent[] = [];

    for (const event of events) {
      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      expandedEvents.push(...instances);
    }

    expandedEvents.sort((a, b) => a.startTime - b.startTime);
    return expandedEvents;
  }

  async deleteEvent(eventId: string, userId: string): Promise<boolean> {
    if (!this.db) await this.initialize();
    
    const results = this.db!.exec('SELECT * FROM calendar_events WHERE id = ?', [eventId]);
    
    if (!results.length || !results[0].values.length) {
      return false;
    }

    const event = rowToCalendarEvent(results[0].values[0]);
    if (event.creatorId !== userId) {
      return false;
    }

    // Cancel any scheduled reminders
    this.cancelReminders(eventId);

    // Delete reminders
    this.db!.run('DELETE FROM reminders WHERE eventId = ?', [eventId]);

    // Delete event
    this.db!.run('DELETE FROM calendar_events WHERE id = ?', [eventId]);
    this.save();

    return true;
  }

  // Wrapper for compatibility: keep a dedicated public API name while
  // using a differently named internal handler.
  async calendarCommandHandler(interaction: any): Promise<void> {
    let weekOffset = 0;
    try {
      const opts = (interaction?.data?.options) ?? [];
      const ukeOpt = opts.find((o: any) => o.name === 'uke');
      if (ukeOpt && typeof ukeOpt.value === 'number') {
        weekOffset = Number(ukeOpt.value);
      }
    } catch {
      weekOffset = 0;
    }
    
    // Get events from local database
    const events = await this.getEvents('default', 'all');
    
    // Dynamically import CalendarDisplayService to avoid a hard static import
    let embed: any = null;
    try {
      const module = await import('./calendar-display.js');
      const CalendarDisplayService = (module as any).CalendarDisplayService;
      if (CalendarDisplayService) {
        const calendarDisplay = new CalendarDisplayService();
        embed = await calendarDisplay.buildWeekEmbed(events, undefined, weekOffset);
      }
    } catch {
      // If dynamic import fails, fall back to a no-data message below
      embed = null;
    }
    if (embed) {
      await interaction.reply({ embeds: [embed as any] });
    } else {
      await interaction.reply({ content: 'Ingen kalenderdata funnet for denne uka.', ephemeral: true });
    }
  }

  // Compatibility wrapper: expose the expected public API name
  async handleCalendarCommand(interaction: any): Promise<void> {
    return this.calendarCommandHandler(interaction);
  }

  parseNaturalDate(input: string): { start: Date; end?: Date; recurrence?: string } | null {
    const parsed = chrono.parse(input, new Date(), { timezones: ['Europe/Oslo'] } as any);
    
    if (!parsed || parsed.length === 0) return null;

    const start = parsed[0].start.date();
    const end = parsed[0].end?.date();

    // Detect recurrence from context
    let recurrence: string | undefined;
    const lower = input.toLowerCase();
    
    if (lower.includes('weekly') || lower.includes('each week') || lower.includes('hver uke')) {
      recurrence = 'FREQ=WEEKLY';
    } else if (lower.includes('daily') || lower.includes('every day') || lower.includes('hver dag')) {
      recurrence = 'FREQ=DAILY';
    } else if (lower.includes('monthly')) {
      recurrence = 'FREQ=MONTHLY';
    }

    return { start, end, recurrence };
  }

  generateICS(events: CalendarEvent[]): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bottus//Calendar//EN',
      'CALSCALE:GREGORIAN',
    ];

    for (const event of events) {
      const eventLines = [
        'BEGIN:VEVENT',
        `UID:${event.id}@bottus`,
        `DTSTAMP:${new Date(event.createdAt).toISOString()}`,
        `DTSTART:${new Date(event.startTime).toISOString()}`,
      ];
      if (event.endTime) {
        eventLines.push(`DTEND:${new Date(event.endTime).toISOString()}`);
      }
      eventLines.push(
        `SUMMARY:${event.title}`,
      );
      if (event.description) {
        eventLines.push(`DESCRIPTION:${event.description}`);
      }
      if (event.location) {
        eventLines.push(`LOCATION:${event.location}`);
      }
      eventLines.push('END:VEVENT');
      lines.push(...eventLines);
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private scheduleReminders(event: CalendarEvent, minutesArray: number[]): void {
    for (const minutes of minutesArray) {
      const remindAt = event.startTime - minutes * 60 * 1000;
      if (remindAt > Date.now()) {
        const delay = remindAt - Date.now();
        const timeout = setTimeout(() => {
          this.sendReminder(event, minutes);
        }, delay);
        this.scheduledReminders.set(`${event.id}-${minutes}`, timeout);
      }
    }
  }

  private sendReminder(event: CalendarEvent, minutesBefore: number): void {
    // Send Discord notification if client is available
    if (this.discord && event.channelId) {
      const timeText = minutesBefore >= 60 
        ? `${Math.floor(minutesBefore / 60)} time(r)` 
        : `${minutesBefore} minutter`;
      const message = `⏰ **Påminnelse:** ${event.title} starter om ${timeText}`;
      this.discord.sendMessage(event.channelId, message).catch((err: unknown) => {
        console.error(`[Calendar] Failed to send reminder: ${err}`);
      });
    }
    console.log(`[REMINDER] ${event.title} in ${minutesBefore} minutes`);
  }

  private cancelReminders(eventId: string): void {
    for (const [key, timeout] of this.scheduledReminders) {
      if (key.startsWith(eventId)) {
        clearTimeout(timeout);
        this.scheduledReminders.delete(key);
      }
    }
  }

  async updateRSVP(eventId: string, userId: string, status: 'yes' | 'no' | 'maybe'): Promise<boolean> {
    if (!this.db) await this.initialize();

    const results = this.db!.exec('SELECT rsvp FROM calendar_events WHERE id = ?', [eventId]);
    if (!results.length || !results[0].values.length) {
      return false;
    }

    const currentRsvp = results[0].values[0][0] as string | null;
    const rsvpData = currentRsvp ? JSON.parse(currentRsvp) : {};

    rsvpData[userId] = status;

    this.db!.run('UPDATE calendar_events SET rsvp = ?, updatedAt = ? WHERE id = ?',
      [JSON.stringify(rsvpData), Date.now(), eventId]);
    this.save();

    return true;
  }

  async getRSVP(eventId: string): Promise<Record<string, string>> {
    if (!this.db) await this.initialize();

    const results = this.db!.exec('SELECT rsvp FROM calendar_events WHERE id = ?', [eventId]);
    if (!results.length || !results[0].values.length) {
      return {};
    }

    const rsvp = results[0].values[0][0] as string | null;
    return rsvp ? JSON.parse(rsvp) : {};
  }

  async getEventById(eventId: string): Promise<CalendarEvent | null> {
    if (!this.db) await this.initialize();

    const results = this.db!.exec(`
      SELECT id, title, description, startTime, endTime, timezone, recurrence,
             recurrenceEnd, location, creatorId, channelId, guildId, rsvp, reminders, createdAt, updatedAt
      FROM calendar_events WHERE id = ?
    `, [eventId]);

    if (!results.length || !results[0].values.length) {
      return null;
    }

    return rowToCalendarEvent(results[0].values[0]);
  }

  async findEventByTitle(channelId: string, title: string): Promise<CalendarEvent | null> {
    if (!this.db) await this.initialize();

    const results = this.db!.exec(`
      SELECT id, title, description, startTime, endTime, timezone, recurrence,
             recurrenceEnd, location, creatorId, channelId, guildId, rsvp, reminders, createdAt, updatedAt
      FROM calendar_events
      WHERE channelId = ? AND (LOWER(title) LIKE LOWER(?) OR LOWER(?) LIKE LOWER(title))
      ORDER BY startTime ASC
      LIMIT 1
    `, [channelId, `%${title}%`, `%${title}%`]);

    if (!results.length || !results[0].values.length) {
      return null;
    }

    return rowToCalendarEvent(results[0].values[0]);
  }

  async checkConflicts(channelId: string, startTime: number, endTime?: number): Promise<CalendarEvent[]> {
    if (!this.db) await this.initialize();

    const events = await this.getEvents(channelId, 'all');
    const conflicts: CalendarEvent[] = [];

    for (const event of events) {
      const eventEnd = event.endTime || event.startTime + 3600000;

      if (endTime) {
        if (startTime < eventEnd && endTime > event.startTime) {
          conflicts.push(event);
        }
      } else {
        if (startTime >= event.startTime && startTime < eventEnd) {
          conflicts.push(event);
        }
      }
    }

    return conflicts;
  }

  async deleteEventByConsensus(eventId: string, voterIds: string[]): Promise<boolean> {
    if (!this.db) await this.initialize();

    const results = this.db!.exec('SELECT * FROM calendar_events WHERE id = ?', [eventId]);
    if (!results.length || !results[0].values.length) {
      return false;
    }

    const event = rowToCalendarEvent(results[0].values[0]);
    const channelEvents = await this.getEvents(event.channelId, 'all');
    const uniqueCreators = new Set(channelEvents.map(e => e.creatorId));

    const threshold = Math.ceil(uniqueCreators.size * 0.66);

    if (voterIds.length >= threshold) {
      return this.deleteEvent(eventId, voterIds[0]);
    }

    return false;
  }

  close(): void {
    for (const timeout of this.scheduledReminders.values()) {
      clearTimeout(timeout);
    }
    this.scheduledReminders.clear();
    if (this.db) {
      // In production, save to file here
      this.db.close();
    }
  }
}
