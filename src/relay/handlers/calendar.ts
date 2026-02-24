import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { isCalendarQuery } from '../utils/detectors.js';
import { CalendarDisplayService } from '../../services/calendar-display.js';
import { ToneService } from '../../services/tone.js';
import { t } from '../../utils/i18n.js';

function norskMonthNameToIndex(name: string): number | null {
  if (!name) return null;
  const n = name.toLowerCase();
  const map: Record<string, number> = {
    januar: 0,
    februar: 1,
    mars: 2,
    april: 3,
    mai: 4,
    juni: 5,
    juli: 6,
    august: 7,
    september: 8,
    oktober: 9,
    november: 10,
    desember: 11,
  };
  return map[n] ?? null;
}

function norskMonthIndexToName(idx: number): string {
  const list = [
    'Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'
  ];
  return list[((idx % 12) + 12) % 12];
}

export class CalendarHandler implements MessageHandler {
  readonly name = 'calendar';

  private weekOffsets: Map<string, number>;

  constructor(weekOffsets: Map<string, number>) {
    this.weekOffsets = weekOffsets;
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    return isCalendarQuery(message);
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const lowerMsg = message.toLowerCase();

      let monthIndex: number | undefined;
      let yearForMonth: number | undefined;
      const mMonthColon = message.match(/\/kalender\s+måned\s*:\s*([a-zøæåäö]+)\b/i);
      if (mMonthColon && mMonthColon[1]) {
        const nm = mMonthColon[1];
        const idx = norskMonthNameToIndex(nm);
        if (idx !== null) monthIndex = idx;
      } else {
        const mMonthPlain = lowerMsg.match(/kalender\s+måned\s+([a-zæøå]+)\b/i);
        if (mMonthPlain && mMonthPlain[1]) {
          const idx = norskMonthNameToIndex(mMonthPlain[1]);
          if (idx !== null) monthIndex = idx;
        }
      }
      const m = message.match(/\/kalender uke:(-?\d+)/i);
      if (m && m[1] !== undefined) {
        const parsed = parseInt(m[1], 10);
        if (!Number.isNaN(parsed)) {
          this.weekOffsets.set(ctx.channelId, parsed);
        }
      }
      const calendar = new CalendarDisplayService();
      const offset = this.weekOffsets.get(ctx.channelId) ?? 0;
      let embed: any;
      if (typeof monthIndex === 'number') {
        const year = (typeof yearForMonth === 'number') ? yearForMonth : new Date().getFullYear();
        embed = await calendar.buildWeekEmbed(undefined, undefined, offset, monthIndex, year);
      } else {
        embed = await calendar.buildWeekEmbed(undefined, undefined, offset);
      }
      if (embed) {
        const lines: string[] = [];
        if ((embed as any).title) lines.push((embed as any).title);
        if (typeof monthIndex === 'number') {
          lines.push(`Kalender måned: ${norskMonthIndexToName(monthIndex)}`);
        }
        if ((embed as any).fields && Array.isArray((embed as any).fields)) {
          for (const f of (embed as any).fields) {
            const name = f?.name ?? '';
            const value = f?.value ?? '';
            lines.push(`${name}: ${value}`.trim());
          }
        }
        const text = lines.join('\n');
        if (text) {
          const toned = ToneService.apply(text + '\n\n⚠️ *Kalenderhendelser er ikke implementert endå. Bruk "husk" for å lagre minner.*', ctx.userId);
          await ctx.discord.sendMessage(ctx.channelId, toned, { embed: embed as any });
          return { handled: true };
        }
      } else {
        await ctx.discord.sendMessage(ctx.channelId, 'Kalenderen kunne ikke bygges akkurat nå.');
        return { handled: true };
      }
    } catch (err) {
      console.error('[Relay] Calendar embed error:', err);
      await ctx.discord.sendMessage(ctx.channelId, t('calendar.fetchFailed'));
      return { handled: true, error: err instanceof Error ? err.message : String(err) };
    }
    return { handled: false };
  }
}

export class DayDetailsHandler implements MessageHandler {
  readonly name = 'dayDetails';

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    return /detaljer om\s+/i.test(m) || /vis(?: dag)?\s+/i.test(m);
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const ddMatch = message.match(/detaljer om\s+(.+)/i) || message.match(/vis(?: dag)?\s+(.+)/i);
      if (!ddMatch || !ddMatch[1]) {
        return { handled: false };
      }
      const dateStr = ddMatch[1].trim();
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return { handled: false };
      }
      const calendar = new CalendarDisplayService();
      const details = await calendar.getDayDetails(date);
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
        const text = [header, ...lines].join('\n');
        await ctx.discord.sendMessage(ctx.channelId, text);
        return { handled: true };
      }
    } catch {
      // no-op on day-details failures
    }
    return { handled: false };
  }
}
