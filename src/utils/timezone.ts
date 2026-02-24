export class TimezoneHandler {
  private defaultTimezone = 'Europe/Oslo';

  parseDate(input: string, referenceDate = new Date()): {
    start: Date;
    end?: Date;
    timezone: string;
  } | null {
    const { parseDate } = require('chrono-node');
    const parsed = parseDate(input, referenceDate);

    if (!parsed || parsed.length === 0) return null;

    const start = parsed[0].start.date();
    const end = parsed[0].end?.date();

    return { start, end, timezone: this.defaultTimezone };
  }

  formatNorwegian(date: Date, format: 'full' | 'short' | 'time' = 'full'): string {
    const options: Intl.DateTimeFormatOptions = {};

    if (format === 'full') {
      options.weekday = 'long';
      options.day = 'numeric';
      options.month = 'long';
      options.year = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
    } else if (format === 'short') {
      options.day = 'numeric';
      options.month = 'short';
      options.hour = '2-digit';
      options.minute = '2-digit';
    } else {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    return date.toLocaleString('nb-NO', { ...options, timeZone: this.defaultTimezone });
  }
}
