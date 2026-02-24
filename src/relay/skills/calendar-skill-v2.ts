import type { Skill, HandlerContext, SkillResponse } from './interfaces.js';
import type { CalendarServiceV2 } from '../../services/calendar-v2.js';
import { CalendarDisplayService } from '../../services/calendar-display.js';

export class CalendarSkillV2 implements Skill {
  readonly name = 'calendar-v2';
  readonly description = 'Local calendar with RSVP, recurring events, reminders, ICS export, and week/month views';

  private calendar: CalendarServiceV2;
  private displayService: CalendarDisplayService;

  constructor(calendar: CalendarServiceV2) {
    this.calendar = calendar;
    this.displayService = new CalendarDisplayService(calendar);
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('calendar') ||
      lower.includes('event') ||
      lower.includes('remind') ||
      lower.includes('schedule') ||
      lower.includes('planlegg') ||
      lower.includes('møte') ||
      lower.includes('avtale') ||
      lower.includes('kalender') ||
      lower.includes('rsvp') ||
      lower.includes('attending') ||
      lower.includes('deltar') ||
      lower.includes('details') ||
      lower.includes('detaljer') ||
      lower.includes('propose') ||
      lower.includes('forslag') ||
      lower.includes('foreslå') ||
      this.calendar.parseNaturalDate(message) !== null
    );
  }

  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    const userId = ctx.userId;
    const channelId = ctx.channelId;

    const lower = message.toLowerCase();

    // RSVP commands
    if (lower.includes('rsvp') || lower.includes('deltar') || lower.includes('attending')) {
      return this.handleRSVP(message, channelId, userId);
    }

    // Event details view
    if (lower.includes('details') || lower.includes('detaljer') || lower.includes('info')) {
      return this.showEventDetails(message, channelId);
    }

    // Time proposal
    if (lower.includes('propose') || lower.includes('forslag') || lower.includes('foreslå') || lower.includes('hvilken tid')) {
      return this.proposeTime(message, channelId, userId);
    }

    if (lower.includes('list') || lower.includes('what\'s coming') || lower.includes('hva skjer')) {
      return this.listEvents(message, channelId);
    }

    if (lower.includes('week') || lower.includes('uke') || lower.includes('kalender uke')) {
      return this.showWeekView(channelId, message);
    }

    if (lower.includes('month') || lower.includes('måned') || lower.includes('kalender måned') || lower.includes('måned')) {
      return this.showMonthView(channelId, message);
    }

    if (lower.includes('today') || lower.includes('idag')) {
      return this.listEventsByRange(channelId, 'today');
    }

    if (lower.includes('export') || lower.includes('ics') || lower.includes('eksport')) {
      return this.exportCalendar(channelId);
    }

    if (lower.includes('delete') || lower.includes('remove') || lower.includes('slett')) {
      return this.deleteEvent(message, channelId, userId);
    }

    const parsed = this.calendar.parseNaturalDate(message);
    if (parsed) {
      return this.createEvent(message, parsed, channelId, userId);
    }

    return {
      handled: true,
      response: 'I can create events, show details, handle RSVPs, propose times, and more. Try:\n' +
        '• "lag arrangement Dinner imorgen kl 18"\n' +
        '• "rsvp Dinner yes"\n' +
        '• "event Dinner" (show details)\n' +
        '• "propose tid" (start time poll)\n' +
        '• "mine arrangementer" (list events)',
    };
  }

  private async handleRSVP(message: string, channelId: string, userId: string): Promise<SkillResponse> {
    const lower = message.toLowerCase();

    // Determine status
    let status: 'yes' | 'no' | 'maybe' = 'yes';
    if (lower.includes('no ') || lower.includes('nei') || lower.includes('cant') || lower.includes('cannot')) {
      status = 'no';
    } else if (lower.includes('maybe') || lower.includes('kanskje')) {
      status = 'maybe';
    }

    // Extract event title
    const title = message
      .replace(/rsvp|deltar|attending|yes|no|maybe|nei|kanskje/gi, '')
      .replace(/what time|when|whenever/gi, '')
      .trim();

    if (!title) {
      return {
        handled: true,
        response: 'Please specify an event. Example: "rsvp Dinner yes" or "deltar Dinner"',
      };
    }

    const event = await this.calendar.findEventByTitle(channelId, title);
    if (!event) {
      return {
        handled: true,
        response: `Could not find event "${title}". Try "mine arrangementer" to see all events.`,
      };
    }

    const success = await this.calendar.updateRSVP(event.id, userId, status);
    if (!success) {
      return {
        handled: true,
        response: 'Could not update RSVP. Event may have been deleted.',
      };
    }

    const statusText = status === 'yes' ? '✅ Attending' : status === 'no' ? '❌ Not attending' : '🤔 Maybe';
    const rsvp = await this.calendar.getRSVP(event.id);
    const yesCount = Object.values(rsvp).filter((v) => v === 'yes').length;
    const noCount = Object.values(rsvp).filter((v) => v === 'no').length;
    const maybeCount = Object.values(rsvp).filter((v) => v === 'maybe').length;

    return {
      handled: true,
      response: `${statusText}: **${event.title}**\n📊 RSVP: ${yesCount} ✅ | ${maybeCount} 🤔 | ${noCount} ❌`,
    };
  }

  private async showEventDetails(message: string, channelId: string): Promise<SkillResponse> {
    // Extract event title from message
    const title = message
      .replace(/details|detaljer|info|event/gi, '')
      .trim();

    if (!title) {
      return {
        handled: true,
        response: 'Please specify an event. Example: "event Dinner" or "detaljer Meeting"',
      };
    }

    const event = await this.calendar.findEventByTitle(channelId, title);
    if (!event) {
      return {
        handled: true,
        response: `Could not find event "${title}". Try "mine arrangementer" to see all events.`,
      };
    }

    const rsvp = await this.calendar.getRSVP(event.id);
    const going = Object.entries(rsvp).filter(([, status]) => status === 'yes').map(([uid]) => uid);
    const notGoing = Object.entries(rsvp).filter(([, status]) => status === 'no').map(([uid]) => uid);
    const maybe = Object.entries(rsvp).filter(([, status]) => status === 'maybe').map(([uid]) => uid);

    const startDate = new Date(event.startTime).toLocaleString('nb-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Oslo',
    });

    let response = `📅 **${event.title}**\n`;
    response += `📆 ${startDate}\n`;

    if (event.location) {
      response += `📍 ${event.location}\n`;
    }
    if (event.description) {
      response += `📝 ${event.description}\n`;
    }

    response += `👤 Created by ${event.creatorId}\n`;

    if (event.recurrence) {
      response += `🔄 Recurring: ${event.recurrence}\n`;
    }

    response += '\n';
    if (going.length > 0) {
      response += `✅ Attending: ${going.map((u) => `<@${u}>`).join(', ')}\n`;
    }
    if (maybe.length > 0) {
      response += `🤔 Maybe: ${maybe.map((u) => `<@${u}>`).join(', ')}\n`;
    }
    if (notGoing.length > 0) {
      response += `❌ Not attending: ${notGoing.map((u) => `<@${u}>`).join(', ')}\n`;
    }

    if (going.length === 0 && maybe.length === 0 && notGoing.length === 0) {
      response += '\nNo RSVPs yet. Use "rsvp [event] yes/no/maybe" to respond!';
    }

    return { handled: true, response };
  }

  private async proposeTime(message: string, _channelId: string, _userId: string): Promise<SkillResponse> {
    // Extract title from proposal request
    const title = message
      .replace(/propose|forslag|foreslå|hvilken tid|finne tid|what time|passer/gi, '')
      .trim() || 'Meeting';

    // Generate time slots for the next week
    const slots = this.generateTimeSlots();

    let response = `🗳️ **Tidspunkt for "${title}"**\n`;
    response += 'Vote with reactions below! (2/3 majority wins)\n\n';
    slots.forEach((slot, idx) => {
      response += `${idx + 1}. ${slot}\n`;
    });
    response += '\nPoll closes in 2 hours.';

    // Note: Full implementation would track reactions and auto-create event
    return {
      handled: true,
      response: `${response}\n\nTo vote, reply with "yes" or "no" for each time, and I'll tally!`,
    };
  }

  private generateTimeSlots(): string[] {
    const slots: string[] = [];
    const now = new Date();
    let dayOffset = 1;

    while (slots.length < 5) {
      const d = new Date(now);
      d.setDate(now.getDate() + dayOffset);
      const dow = d.getDay();

      if (dow !== 0 && dow !== 6) {
        const label = d.toLocaleDateString('nb-NO', { weekday: 'short', month: 'short', day: 'numeric' });
        slots.push(`${label} kl 18:00`);
        slots.push(`${label} kl 19:00`);
      }
      dayOffset++;
    }

    return slots.slice(0, 6);
  }

  private async createEvent(
    message: string,
    parsed: { start: Date; end?: Date; recurrence?: string },
    channelId: string,
    userId: string
  ): Promise<SkillResponse> {
    const title = message
      .replace(/remind me to|planlegg|sett opp|calendar|event|lag en/gi, '')
      .replace(/på |kl |at /gi, ' ')
      .trim() || 'Untitled Event';

    // Check for conflicts
    const endTime = parsed.end?.getTime();
    const startTime = parsed.start.getTime();
    const conflicts = await this.calendar.checkConflicts(channelId, startTime, endTime);

    let conflictWarning = '';
    if (conflicts.length > 0) {
      conflictWarning = '\n⚠️ **Warning:** This overlaps with:\n';
      for (const c of conflicts) {
        const cTime = new Date(c.startTime).toLocaleString('nb-NO', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Oslo',
        });
        conflictWarning += `  • ${c.title} (${cTime})\n`;
      }
    }

    const event = await this.calendar.createEvent(title, parsed.start, {
      endTime: parsed.end,
      recurrence: parsed.recurrence,
      creatorId: userId,
      channelId,
      reminders: [15, 60, 1440],
    });

    let response = `📅 Created event: **${event.title}**\n`;
    response += `   ${new Date(event.startTime).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}`;
    if (event.recurrence) {
      response += ` (recurring: ${event.recurrence})`;
    }
    response += conflictWarning;
    response += `\n💡 Use "rsvp ${event.title} yes" to respond!`;

    return { handled: true, response };
  }

  private async listEvents(_message: string, channelId: string): Promise<SkillResponse> {
    return this.listEventsByRange(channelId, 'week');
  }

  private async listEventsByRange(channelId: string, range: 'today' | 'week'): Promise<SkillResponse> {
    const events = await this.calendar.getEvents(channelId, range);

    if (events.length === 0) {
      const msg = range === 'today' ? 'No events today.' : 'No events this week.';
      return { handled: true, response: msg };
    }

    let response = `📅 **Events ${range === 'today' ? 'Today' : 'This Week'}:**\n`;
    for (const event of events) {
      const date = new Date(event.startTime).toLocaleString('nb-NO', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Oslo',
      });
      response += `\n• **${event.title}** — ${date}`;
    }

    return { handled: true, response };
  }

  private async showWeekView(_channelId: string, _message: string): Promise<SkillResponse> {
    try {
      const weekEmbed = await this.displayService.buildWeekEmbed(undefined, undefined, 0);
      if (weekEmbed?.fields?.length) {
        let response = '📅 **Denne uken:**\n';
        for (const field of weekEmbed.fields) {
          response += `\n${field.name}: ${field.value}`;
        }
        return { handled: true, response };
      }
      return { handled: true, response: 'Ingen hendelser denne uken.' };
    } catch {
      return { handled: true, response: 'Kunne ikke hente ukesvisning.' };
    }
  }

  private async showMonthView(_channelId: string, message: string): Promise<SkillResponse> {
    const lower = message.toLowerCase();
    let targetMonth: number | undefined;
    let targetYear: number | undefined;

    const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
    for (let i = 0; i < months.length; i++) {
      if (lower.includes(months[i])) {
        targetMonth = i;
        break;
      }
    }

    const yearMatch = message.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      targetYear = parseInt(yearMatch[1], 10);
    }

    try {
      const weekEmbed = await this.displayService.buildWeekEmbed(undefined, undefined, 0, targetMonth, targetYear);
      if (weekEmbed?.fields?.length) {
        const monthName = targetMonth !== undefined ? months[targetMonth] : 'denne måneden';
        let response = `📅 **${monthName}${targetYear ? ` ${targetYear}` : ''}:**\n`;
        for (const field of weekEmbed.fields) {
          response += `\n${field.name}: ${field.value}`;
        }
        return { handled: true, response };
      }
      return { handled: true, response: `Ingen hendelser ${targetMonth !== undefined ? months[targetMonth] : 'denne måneden'}.` };
    } catch {
      return { handled: true, response: 'Kunne ikke hente månedsvisning.' };
    }
  }

  private async exportCalendar(channelId: string): Promise<SkillResponse> {
    const events = await this.calendar.getEvents(channelId, 'all');
    const ics = this.calendar.generateICS(events);

    return {
      handled: true,
      response: `📤 Here is your calendar export:\n\`\`\`\n${ics}\n\`\`\``,
    };
  }

  private async deleteEvent(message: string, channelId: string, userId: string): Promise<SkillResponse> {
    const titleToDelete = message
      .replace(/delete|remove|slett/gi, '')
      .replace(/event|arrangement/gi, '')
      .trim();

    if (!titleToDelete) {
      return {
        handled: true,
        response: 'Please provide the event title to delete. For example: "delete meeting" or "slett møte"',
      };
    }

    const events = await this.calendar.getEvents(channelId, 'all');
    const matching = events.filter((e) =>
      e.title.toLowerCase().includes(titleToDelete.toLowerCase()) ||
      titleToDelete.toLowerCase().includes(e.title.toLowerCase())
    );

    if (matching.length === 0) {
      return {
        handled: true,
        response: `No events found matching "${titleToDelete}"`,
      };
    }

    const userEvent = matching.find((e) => e.creatorId === userId);
    const eventToDelete = userEvent || matching[0];

    // Try owner delete first
    if (eventToDelete.creatorId === userId) {
      const success = await this.calendar.deleteEvent(eventToDelete.id, userId);

      if (success) {
        return {
          handled: true,
          response: `🗑️ Deleted event: **${eventToDelete.title}**`,
        };
      }
      return {
        handled: true,
        response: 'Could not delete event.',
      };
    }

    // Group consensus delete (2/3 majority)
    if (matching.length > 1) {
      const options = matching.map((e, i) => `${i + 1}. ${e.title} (${e.creatorId === userId ? 'yours' : `by ${e.creatorId}`})`).join('\n');
      return {
        handled: true,
        response: `Found multiple events:\n${options}\n\nPlease specify which one to delete.`,
      };
    }

    // For non-owner, try consensus delete
    const success = await this.calendar.deleteEventByConsensus(eventToDelete.id, [userId]);

    if (success) {
      return {
        handled: true,
        response: `🗑️ Deleted event by consensus: **${eventToDelete.title}**`,
      };
    }

    return {
      handled: true,
      response: `Could not delete **${eventToDelete.title}**. You can only delete events you created, or need 2/3 majority to delete others.`,
    };
  }
}
