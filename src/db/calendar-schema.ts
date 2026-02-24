import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  timezone: string;
  recurrence?: string;
  recurrenceEnd?: number;
  location?: string;
  creatorId: string;
  channelId: string;
  guildId?: string;
  rsvp?: string;
  reminders?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Reminder {
  id: string;
  eventId: string;
  userId: string;
  remindAt: number;
  sent: boolean;
  createdAt: number;
}

let SQL: initSqlJs.SqlJsStatic | null = null;

export async function initSql(): Promise<initSqlJs.SqlJsStatic> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

export function createCalendarDb(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      startTime INTEGER NOT NULL,
      endTime INTEGER,
      timezone TEXT NOT NULL,
      recurrence TEXT,
      recurrenceEnd INTEGER,
      location TEXT,
      creatorId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      guildId TEXT,
      rsvp TEXT,
      reminders TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_startTime ON calendar_events (startTime)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_channelId ON calendar_events (channelId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_recurrence ON calendar_events (recurrence)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      remindAt INTEGER NOT NULL,
      sent INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (eventId) REFERENCES calendar_events(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_reminders_remindAt ON reminders (remindAt)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reminders_eventId ON reminders (eventId)`);
}

export function rowToCalendarEvent(row: any[]): CalendarEvent {
  return {
    id: row[0],
    title: row[1],
    description: row[2] || undefined,
    startTime: row[3],
    endTime: row[4] || undefined,
    timezone: row[5],
    recurrence: row[6] || undefined,
    recurrenceEnd: row[7] || undefined,
    location: row[8] || undefined,
    creatorId: row[9],
    channelId: row[10],
    guildId: row[11] || undefined,
    rsvp: row[12] || undefined,
    reminders: row[13] || undefined,
    createdAt: row[14],
    updatedAt: row[15],
  };
}
