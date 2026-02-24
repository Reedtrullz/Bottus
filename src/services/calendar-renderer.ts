import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { nb } from 'date-fns/locale';

export interface CalendarEvent {
  title: string;
  start_time: string; // ISO date string
  end_time?: string;
  type: 'meeting' | 'task' | 'personal' | string;
}

export class CalendarRenderer {
  private static readonly DAY_COLORS: Record<string, string> = {
    meeting: '#5865F2',
    task: '#ED4245',
    personal: '#57F287',
  };
  private static readonly CELL_W = 100;
  private static readonly CELL_H = 80;
  private static readonly PADDING = 20;
  private static readonly HEADER_H = 40;

  private static toDate(value: string | Date | undefined): Date | null {
    if (!value) return null;
    const dt = typeof value === 'string' ? new Date(value) : value;
    return isNaN(dt.getTime()) ? null : dt;
  }

  private static bucketEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events || []) {
      const dt = this.toDate(ev.start_time);
      if (!dt) continue;
      const key = dt.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }

  public generateMonthImage(year: number, monthIndex: number, events: CalendarEvent[] = []): string {
    const firstOfMonth = new Date(year, monthIndex, 1);
    const startDate = startOfWeek(firstOfMonth, { weekStartsOn: 1 });
    const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));
    const bucket = CalendarRenderer.bucketEventsByDate(events);

    const monthName = format(firstOfMonth, 'LLLL', { locale: nb });
    const width = CalendarRenderer.PADDING * 2 + CalendarRenderer.CELL_W * 7;
    const height = CalendarRenderer.HEADER_H + CalendarRenderer.PADDING * 2 + CalendarRenderer.CELL_H * 6;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svg += `<rect width="100%" height="100%" fill="white"/>`;
    // Title
    svg += `<text x="${CalendarRenderer.PADDING}" y="${CalendarRenderer.HEADER_H - 8}" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#333" text-anchor="start">${monthName} ${year}</text>`;

    // Weekday headers
    const weekdayNames = Array.from({ length: 7 }).map((_, i) =>
      format(addDays(startDate, i), 'EEE', { locale: nb })
    );
    for (let i = 0; i < 7; i++) {
      const x = CalendarRenderer.PADDING + i * CalendarRenderer.CELL_W + 8;
      const y = CalendarRenderer.HEADER_H;
      svg += `<text x="${x}" y="${y - 10}" font-family="Arial" font-size="12" fill="#555">${weekdayNames[i]}</text>`;
    }

    // Draw grid and days
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        const idx = r * 7 + c;
        const day = days[idx];
        const inMonth = day.getMonth() === firstOfMonth.getMonth();
        const x = CalendarRenderer.PADDING + c * CalendarRenderer.CELL_W;
        const y = CalendarRenderer.HEADER_H + CalendarRenderer.PADDING + r * CalendarRenderer.CELL_H;
        const fill = inMonth ? '#fff' : '#f7f7f7';
        svg += `<rect x="${x}" y="${y}" width="${CalendarRenderer.CELL_W - 2}" height="${CalendarRenderer.CELL_H - 2}" rx="6" ry="6" fill="${fill}" stroke="#e6e6e6"/>`;
        // Day number
        svg += `<text x="${x + 6}" y="${y + 16}" font-family="Arial" font-size="12" fill="${inMonth ? '#111' : '#888'}">${day.getDate()}</text>`;
        // events dots
        const key = day.toISOString().slice(0, 10);
        const dayEvents = bucket.get(key) || [];
        dayEvents.slice(0, 4).forEach((ev, i) => {
          const color = CalendarRenderer.DAY_COLORS[ev.type] || '#888';
          const cx = x + 12 + i * 14;
          const cy = y + CalendarRenderer.CELL_H - 14;
          svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="${color}" />`;
        });
      }
    }
    svg += `</svg>`;
    return svg;
  }

  public generateWeekImage(year: number, week: number, events: CalendarEvent[] = []): string {
    const jan4 = new Date(year, 0, 4);
    const week1Start = startOfWeek(jan4, { weekStartsOn: 1 });
    const startDate = addWeeks(week1Start, week - 1);
    const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    const bucket = CalendarRenderer.bucketEventsByDate(events);

    const width = CalendarRenderer.PADDING * 2 + CalendarRenderer.CELL_W * 7;
    const height = CalendarRenderer.HEADER_H + CalendarRenderer.PADDING * 2 + CalendarRenderer.CELL_H;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svg += `<rect width="100%" height="100%" fill="white"/>`;
    const weekLabel = `Uke ${week}, ${year}`;
    svg += `<text x="${CalendarRenderer.PADDING}" y="${CalendarRenderer.HEADER_H - 8}" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#333" text-anchor="start">${weekLabel}</text>`;
    // Days header
    for (let i = 0; i < 7; i++) {
      const x = CalendarRenderer.PADDING + i * CalendarRenderer.CELL_W + 8;
      const y = CalendarRenderer.HEADER_H;
      const label = format(days[i], 'EEE', { locale: nb });
      svg += `<text x="${x}" y="${y - 10}" font-family="Arial" font-size="12" fill="#555">${label}</text>`;
    }
    // Grid (single row)
    for (let i = 0; i < 7; i++) {
      const day = days[i];
      const x = CalendarRenderer.PADDING + i * CalendarRenderer.CELL_W;
      const y = CalendarRenderer.HEADER_H + CalendarRenderer.PADDING;
      svg += `<rect x="${x}" y="${y}" width="${CalendarRenderer.CELL_W - 2}" height="${CalendarRenderer.CELL_H - 2}" rx="6" ry="6" fill="#fff" stroke="#e6e6e6"/>`;
      svg += `<text x="${x + 6}" y="${y + 16}" font-family="Arial" font-size="12" fill="#111">${day.getDate()}</text>`;
      const key = day.toISOString().slice(0, 10);
      const dayEvents = bucket.get(key) || [];
      dayEvents.slice(0, 4).forEach((ev, j) => {
        const color = CalendarRenderer.DAY_COLORS[ev.type] || '#888';
        const cx = x + 12 + j * 14;
        const cy = y + CalendarRenderer.CELL_H - 14;
        svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="${color}" />`;
      });
    }
    svg += `</svg>`;
    return svg;
  }
}

export default CalendarRenderer;
