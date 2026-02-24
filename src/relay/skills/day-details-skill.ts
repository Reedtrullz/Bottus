import type { Skill, HandlerContext, SkillResponse } from './interfaces.js';
import { CalendarDisplayService } from '../../services/calendar-display.js';

export class DayDetailsSkill implements Skill {
  readonly name = 'dayDetails';
  readonly description = 'Get details for specific days';

  private displayService: CalendarDisplayService;

  constructor() {
    this.displayService = new CalendarDisplayService();
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    return /detaljer om\s+/i.test(m) || /vis(?: dag)?\s+/i.test(m);
  }

  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    try {
      const ddMatch = message.match(/detaljer om\s+(.+)/i) || message.match(/vis(?: dag)?\s+(.+)/i);
      if (!ddMatch || !ddMatch[1]) {
        return { handled: false, shouldContinue: true };
      }
      const dateStr = ddMatch[1].trim();
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return { handled: false, shouldContinue: true };
      }
      const details = await this.displayService.getDayDetails(date);
      if (Array.isArray(details) && details.length > 0) {
        const header = `Detaljer for ${date.toDateString()}:`;
        const lines = details.map((ev: any) => {
          const when = `${ev.start_time}–${ev.end_time}`.trim();
          const parts = [`${ev.title} (${when})`];
          if (ev.description) parts.push(`Beskrivelse: ${ev.description}`);
          if (ev.attendees && ev.attendees.length > 0) parts.push(`Deltakere: ${ev.attendees.join(', ')}`);
          if (ev.rsvp_status) parts.push(`RSVP: ${ev.rsvp_status}`);
          return parts.join(' | ');
        });
        const response = [header, ...lines].join('\n');
        if (ctx.discord?.sendMessage) {
          await ctx.discord.sendMessage(ctx.channelId, response);
        }
        return { handled: true, response, shouldContinue: false };
      }
      return { 
        handled: true, 
        response: `Ingen hendelser funnet for ${date.toDateString()}.`,
        shouldContinue: false
      };
    } catch {
      return { handled: false, shouldContinue: true };
    }
  }
}
