# src/db/ - Database Layer

## OVERVIEW
SQLite database via sql.js. Two schema files + main access layer.

## FILES
| File | Purpose |
|------|---------|
| index.ts | Database access layer, initialization |
| calendar-schema.ts | Calendar events table |
| interactions-schema.ts | User feedback/interactions table |

## SCHEMA: calendar_events
```sql
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  startTime INTEGER NOT NULL,
  endTime INTEGER,
  timezone TEXT DEFAULT 'Europe/Oslo',
  recurrence TEXT,
  recurrenceEnd INTEGER,
  location TEXT,
  creatorId TEXT,
  channelId TEXT,
  guildId TEXT,
  rsvp TEXT,
  reminders TEXT,
  createdAt INTEGER
);
```

## SCHEMA: interactions
```sql
CREATE TABLE interactions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  channelId TEXT,
  messageId TEXT,
  type TEXT,
  userMessage TEXT,
  botResponse TEXT,
  feedback TEXT,
  critique TEXT,
  timestamp INTEGER
);
```

## USAGE
```typescript
import { createCalendarDb, rowToCalendarEvent } from './calendar-schema.js';
import { createInteractionsDb } from './interactions-schema.js';

const SQL = await initSqlJs();
const db = new SQL.Database();
createCalendarDb(db);
createInteractionsDb(db);
```

## CONVENTIONS
- Use parameterized queries: `db.run(sql, [params])`
- Initialize on startup, not per-request
- Store dates as Unix timestamps (INTEGER)

## ANTI-PATTERNS
- ❌ Never use string interpolation in SQL
- ❌ Never commit .db files (use sql.js in-memory)

---

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Calendar events | calendar-schema.ts |
| User feedback | interactions-schema.ts |
| DB initialization | index.ts |
