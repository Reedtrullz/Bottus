import { eventDb, taskDb } from '../db/index.js';
import { formatInTimeZone } from 'date-fns-tz';
import { startOfWeek, addDays, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { getISOWeek } from 'date-fns';

type EmbedField = { name: string; value: string; inline?: boolean };

export class CalendarDisplayService {
  private static TIMEZONE = 'Europe/Oslo';

  constructor() {}
  /**
   * Get detailed day view for a given date.
   * Returns an array of events with full details: title, start_time, end_time, description, attendees, rsvp_status
   */
  async getDayDetails(date: Date | string): Promise<Array<{
    title: string;
    start_time: string;
    end_time: string;
    description?: string;
    attendees?: string[];
    rsvp_status?: string;
  }>> {
    const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
    if (Number.isNaN(targetDate.getTime())) return [];
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    let events: any[] = [];
    try {
      // Try to fetch via repository if available
      // @ts-ignore optional properties
      const repo: any = (this as any).calendarRepo ?? (this as any).db;
      if (repo && typeof repo.getDayEvents === 'function') {
        events = await repo.getDayEvents(dayStart, dayEnd);
      } else if (repo && typeof repo.query === 'function') {
        const rows = await repo.query(
          'SELECT title, start_time, end_time, description, attendees, rsvp_status FROM events WHERE start_time >= ? AND start_time < ?;',
          [dayStart.toISOString(), dayEnd.toISOString()]
        );
        events = rows ?? [];
      }
    } catch {
      events = [];
    }

    return (events || []).map((ev: any) => ({
      title: ev.title,
      start_time: ev.start_time,
      end_time: ev.end_time,
      description: ev.description,
      attendees: Array.isArray(ev.attendees) ? ev.attendees : [],
      rsvp_status: ev.rsvp_status,
    }));
  }

  // Optional: targetMonth (0-11) and targetYear (e.g., 2026) allow jumping to a specific month
  // If targetMonth is provided, the calendar will anchor the week view to the first week of that month.
  async buildWeekEmbed(
    events?: any[],
    tasks?: any[],
    weekOffset: number = 0,
    targetMonth?: number,
    targetYear?: number
  ): Promise<{ title?: string; color?: number; fields?: EmbedField[]; components?: any[] } | null> {
    const upcomingEvents = events ?? (eventDb.findUpcoming() as any[]);
    const pendingTasks = tasks ?? (taskDb.findPending() as any[]);

    const today = new Date();
    // Determine the starting date for the 7-day view.
    // If a targetMonth is provided, anchor to the first week of that month in the specified year (or current year).
    let weekDate0: Date;
    if (typeof targetMonth === 'number' && targetMonth >= 0 && targetMonth <= 11) {
      const yearToUse = typeof targetYear === 'number' ? targetYear : today.getFullYear();
      const firstOfMonth = new Date(yearToUse, targetMonth, 1);
      const monthStartWeek = startOfWeek(firstOfMonth, { weekStartsOn: 1 });
      weekDate0 = addDays(monthStartWeek, weekOffset * 7);
    } else {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      weekDate0 = addDays(weekStart, weekOffset * 7);
    }

    const fields: EmbedField[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekDate0, i);
      const dayName = format(date, 'EEEE', { locale: nb });
      const dateLabel = format(date, 'd. LLLL', { locale: nb });

      // Build dayEvents with support for recurring events expansion
      const dayEvents: any[] = [];
      for (const ev of upcomingEvents || []) {
        const recurrence = ev.recurrence_rule ?? ev.recurrenceRule;
        const originalStart = ev.start_time != null ? new Date(ev.start_time * 1000) : null;
        const originalEnd = ev.end_time != null ? new Date(ev.end_time * 1000) : null;
        // Non-recurring events: include if it occurs on this date
        if (!recurrence && originalStart && this.isSameDate(originalStart, date)) {
          dayEvents.push(ev);
          continue;
        }
        // Recurring expansion
        if (recurrence && originalStart) {
          // Extract BYDAY if present
          const byDayMatch = recurrence.match(/BYDAY=([A-Z,]+)/i);
          const byDays = byDayMatch ? byDayMatch[1].split(',') : [];
          const currentDow = date.getUTCDay(); // 0 (Sun) ... 6 (Sat)
          const dowCode = ['SU','MO','TU','WE','TH','FR','SA'][date.getDay()];
          // Determine if this date matches recurrence rule
          let matches = false;
          if (byDays.length > 0) {
            matches = byDays.includes(dowCode);
          } else {
            // No BYDAY specified: assume weekly on the same weekday as the original event
            matches = currentDow === originalStart.getDay();
          }
          // Handle INTERVAL (e.g., every 2 weeks)
          const intervalMatch = recurrence.match(/INTERVAL=(\d+)/i);
          if (matches) {
            if (intervalMatch) {
              const interval = parseInt(intervalMatch[1], 10) || 1;
              const startWeek = getISOWeek(originalStart);
              const currentWeek = getISOWeek(date);
              if (((currentWeek - startWeek) % interval) !== 0) {
                matches = false;
              }
            }
          }
          if (matches) {
            // Build a concrete instance for this date by applying the original time-of-day
            const timeOfDay = {
              hours: originalStart.getHours(),
              minutes: originalStart.getMinutes(),
              seconds: originalStart.getSeconds(),
            };
            const startDate = new Date(date);
            startDate.setHours(timeOfDay.hours, timeOfDay.minutes, timeOfDay.seconds, 0);
            const recStart = Math.floor(startDate.getTime() / 1000);
            const endDate = originalEnd ? new Date(date) : null;
            if (originalEnd) {
              endDate!.setHours(timeOfDay.hours, timeOfDay.minutes, timeOfDay.seconds, 0);
            }
            const recEnd = endDate ? Math.floor(endDate.getTime() / 1000) : undefined;
            const recEv = { ...ev, start_time: recStart, end_time: recEnd };
            dayEvents.push(recEv);
          }
        }
      }
      const dayTasks = (pendingTasks || []).filter((t: any) => {
        const dueDate = t.due_time ? new Date(t.due_time * 1000) : null;
        return dueDate ? this.isSameDate(dueDate, date) : false;
      });

      const lines = this.formatDayEvents(dayEvents, dayTasks, date);
      const header = `${dayName} ${dateLabel}`;
      fields.push({ name: header, value: lines.length ? lines.join('\n') : 'Ingen hendelser', inline: false });
    }

    const navRow = {
      type: 1,
      components: [
        { type: 2, style: 1, label: '◀️ Forrige uke', custom_id: 'kalender_prev' },
        { type: 2, style: 1, label: '📅 I dag', custom_id: 'kalender_today' },
        { type: 2, style: 1, label: 'Neste uke ▶️', custom_id: 'kalender_next' }
      ]
    };

    const monthRow = {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: 'kalender_month',
          placeholder: 'Velg måned',
          options: [
            { label: 'Januar', value: '1' },
            { label: 'Februar', value: '2' },
            { label: 'Mars', value: '3' },
            { label: 'April', value: '4' },
            { label: 'Mai', value: '5' },
            { label: 'Juni', value: '6' },
            { label: 'Juli', value: '7' },
            { label: 'August', value: '8' },
            { label: 'September', value: '9' },
            { label: 'Oktober', value: '10' },
            { label: 'November', value: '11' },
            { label: 'Desember', value: '12' }
          ]
        }
      ]
    };

    const embed = {
      title: `Kalender — uke ${format(weekDate0, 'w', { locale: nb })}`,
      color: 0x5865F2,
      fields,
      components: [navRow, monthRow]
    } as any;
    return embed;
  }

  // Format events and tasks for a specific day
  formatDayEvents(events: any[], tasks: any[], date: Date): string[] {
    const lines: string[] = [];

    // Anchor by date (used to appease linters that date is provided)
    const _dateLabel = format(date, 'yyyy-MM-dd', { locale: nb });

    // Events
    for (const ev of events) {
      const start = ev.start_time ?? ev.startTime;
      const startStr = typeof start === 'number' ? this.formatTimestamp(start) : '';
      const base = `Møte: ${ev.title}${startStr ? ` kl. ${startStr}` : ''}`;
      const desc = ev.description ? ` - ${ev.description}` : '';
      lines.push(base + desc);
    }

    // Tasks
    for (const t of tasks) {
      const due = t.due_time ?? t.dueTime;
      const dueStr = typeof due === 'number' ? this.formatTimestamp(due) : '';
      const base = `Oppgave: ${t.title}${dueStr ? ` (forfall: ${dueStr})` : ''}`;
      const desc = t.description ? ` - ${t.description}` : '';
      lines.push(base + desc);
    }

    if (lines.length === 0) lines.push(`Ingen hendelser (${_dateLabel})`);
    return lines;
  }

  getEventColor(eventType: string): number {
    const t = (eventType || '').toLowerCase();
    if (t === 'personal') return 0x57F287;
    if (t === 'task' || t === 'oppgave') return 0xED4245;
    return 0x5865F2;
  }

  private formatTimestamp(timestampSeconds: number): string {
    const d = new Date(timestampSeconds * 1000);
    return formatInTimeZone(d, CalendarDisplayService.TIMEZONE, 'PPp');
  }

  private isSameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
}
