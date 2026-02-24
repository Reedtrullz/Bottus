import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { isCalendarQuery } from '../utils/detectors.js';
import { CalendarDisplayService } from '../../services/calendar-display.js';
import { ToneService } from '../../services/tone.js';
import { t } from '../../utils/i18n.js';
import { logger } from '../../utils/logger.js';


export class CalendarHandler implements MessageHandler {
  readonly name = 'calendar';
  private weekOffsets: Map<string, number>;

  constructor(weekOffsets: Map<string, number>) {
    this.weekOffsets = weekOffsets;
  }

  canHandle(_message: string, _ctx: HandlerContext): boolean {
    if (!_message) return false;
    return isCalendarQuery(_message);
  }

  async handle(_message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const calendar = new CalendarDisplayService();
      const offset = this.weekOffsets.get(ctx.channelId) ?? 0;
      const embed = await calendar.buildWeekEmbed(undefined, undefined, offset);
      if (embed) {
        const text = (embed as any).title ? (embed as any).title : '';
        if (text) {
          const toned = ToneService.apply(text, ctx.userId);
          await ctx.discord.sendMessage(ctx.channelId, toned, { embed: embed as any });
          return { handled: true };
        }
      }
      await ctx.discord.sendMessage(ctx.channelId, t('calendar.fetchFailed'));
      return { handled: true };
    } catch (err) {
      logger.error('[Relay] Calendar embed error:', { error: err as any });
      return { handled: true, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export class DayDetailsHandler implements MessageHandler {
  readonly name = 'dayDetails';
  canHandle(_message: string, _ctx: any): boolean { return false; }
  async handle(_message: string, _ctx: HandlerContext): Promise<HandlerResult> {
    return { handled: false };
  }
}
