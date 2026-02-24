import type { Skill, HandlerContext, SkillResponse } from './interfaces.js';
import type { CalendarServiceV2 } from '../../services/calendar-v2.js';
import { CalendarDisplayService } from '../../services/calendar-display.js';

export class CalendarSkillV2 implements Skill {
  readonly name = 'calendar-v2';
  readonly description = 'Local calendar with recurring events, reminders, ICS export, and week/month views';

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
      this.calendar.parseNaturalDate(message) !== null
    );
  }

  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    const userId = ctx.userId;
    const channelId = ctx.channelId;

    const lower = message.toLowerCase();
    
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
      response: 'I can create calendar events, list upcoming events, export to ICS, or delete events. What would you like to do?',
    };
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
    // Extract event title from message
    const titleToDelete = message
      .replace(/delete|remove|slett/gi, '')
      .replace(/event|arrangement/gi, '')
      .trim();

    if (!titleToDelete) {
      return { 
        handled: true, 
        response: 'Please provide the event title to delete. For example: "delete meeting" or "slett møte"' 
      };
    }

    // Get all events to find matching ones
    const events = await this.calendar.getEvents(channelId, 'all');
    const matching = events.filter(e => 
      e.title.toLowerCase().includes(titleToDelete.toLowerCase()) ||
      titleToDelete.toLowerCase().includes(e.title.toLowerCase())
    );

    if (matching.length === 0) {
      return { 
        handled: true, 
        response: `No events found matching "${titleToDelete}"` 
      };
    }

    // Find events owned by user or just delete first match
    const userEvent = matching.find(e => e.creatorId === userId);
    const eventToDelete = userEvent || matching[0];

    // Check ownership if not user's event
    if (eventToDelete.creatorId !== userId && matching.length > 1) {
      const options = matching.map((e, i) => `${i + 1}. ${e.title} (${e.creatorId === userId ? 'yours' : `by ${e.creatorId}`})`).join('\n');
      return {
        handled: true,
        response: `Found multiple events:\n${options}\n\nPlease specify which one to delete.`
      };
    }

    // Delete the event
    const success = await this.calendar.deleteEvent(eventToDelete.id, userId);
    
    if (success) {
      return {
        handled: true,
        response: `🗑️ Deleted event: **${eventToDelete.title}**`
      };
    } else {
      return {
        handled: true,
        response: `Could not delete event. You can only delete events you created.`
      };
    }
  }
}
