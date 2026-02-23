# Calendar Skill Architecture

## Overview

The Calendar Skill (`CalendarSkillV2`) provides calendar event management through natural language commands. It handles event creation, listing, viewing (week/month), export (ICS), and deletion.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User Message                                                               │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ CalendarSkillV2.canHandle()                                         │    │
│  │   - Pattern matching: calendar, event, remind, møte, avtale        │    │
│  │   - Natural date parsing via chrono-node                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ CalendarSkillV2.handle() - Route to action                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                     │
│       ├──────────────┬──────────────┬──────────────┬──────────────┐       │
│       ▼              ▼              ▼              ▼              ▼          │
│  ┌─────────┐   ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐   │
│  │ CREATE  │   │  LIST   │   │   WEEK   │   │  MONTH   │   │ DELETE  │   │
│  │         │   │         │   │   VIEW   │   │   VIEW   │   │         │   │
│  └────┬────┘   └────┬────┘   └────┬─────┘   └────┬─────┘   └────┬────┘   │
│       │              │              │              │              │          │
│       ▼              ▼              ▼              ▼              ▼          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    CalendarServiceV2                                │    │
│  │  • createEvent()    • getEvents()    • deleteEvent()             │    │
│  │  • parseNaturalDate()  • generateICS()                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    CalendarDisplayService                            │    │
│  │  • buildWeekEmbed()    • getDayDetails()                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SQLite (sql.js)                                   │    │
│  │  • calendar_events table                                            │    │
│  │  • reminders table                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Class Responsibilities

### CalendarSkillV2

**File:** `src/relay/skills/calendar-skill-v2.ts`

| Method | Responsibility | Input | Output |
|--------|----------------|-------|--------|
| `canHandle()` | Pattern matching | `message: string` | `boolean` |
| `handle()` | Action routing | `message, ctx` | `SkillResponse` |
| `createEvent()` | Event creation | `message, parsed, channelId, userId` | `SkillResponse` |
| `listEvents()` | List events | `message, channelId` | `SkillResponse` |
| `listEventsByRange()` | List by range | `channelId, range` | `SkillResponse` |
| `showWeekView()` | Week embed | `channelId, message` | `SkillResponse` |
| `showMonthView()` | Month embed | `channelId, message` | `SkillResponse` |
| `exportCalendar()` | ICS export | `channelId` | `SkillResponse` |
| `deleteEvent()` | Event deletion | `message, channelId, userId` | `SkillResponse` |

### CalendarServiceV2

**File:** `src/services/calendar-v2.ts`

| Method | Responsibility | Input | Output |
|--------|----------------|-------|--------|
| `initialize()` | DB setup | - | `Promise<void>` |
| `save()` | Persist to disk | - | `void` |
| `createEvent()` | Insert event | `title, startTime, options` | `CalendarEvent` |
| `getEvents()` | Query events | `channelId, range` | `CalendarEvent[]` |
| `deleteEvent()` | Remove event | `eventId, userId` | `boolean` |
| `parseNaturalDate()` | NLP date parsing | `input: string` | `{start, end?, recurrence?}` |
| `generateICS()` | ICS format | `events: CalendarEvent[]` | `string` |
| `scheduleReminders()` | Set up notifications | `event, reminders[]` | `void` |

### CalendarDisplayService

**File:** `src/services/calendar-display.ts`

| Method | Responsibility | Input | Output |
|--------|----------------|-------|--------|
| `getDayDetails()` | Day events | `date: Date \| string` | `DayDetail[]` |
| `buildWeekEmbed()` | Week visualization | `events, tasks, weekOffset, targetMonth?, targetYear?` | `Embed \| null` |

## Data Model

### CalendarEvent Interface

```typescript
interface CalendarEvent {
  id: string;                    // UUID v4
  title: string;                // Event title
  description?: string;          // Optional description
  startTime: number;             // Unix timestamp (ms)
  endTime?: number;              // Unix timestamp (ms)
  timezone: string;              // Default: 'Europe/Oslo'
  recurrence?: string;           // iCalendar rule (e.g., 'FREQ=WEEKLY')
  recurrenceEnd?: number;       // End of recurrence series
  location?: string;             // Venue/address
  creatorId: string;             // Discord user ID
  channelId: string;            // Discord channel ID
  guildId?: string;              // Discord guild ID
  rsvp?: string;                // JSON string of RSVP data
  reminders?: string;           // JSON array of minutes [15, 60, 1440]
  createdAt: number;            // Unix timestamp
  updatedAt: number;            // Unix timestamp
}
```

### Reminder Interface

```typescript
interface Reminder {
  id: string;           // UUID v4
  eventId: string;      // FK to calendar_events
  userId: string;       // Target user
  remindAt: number;     // Unix timestamp
  sent: boolean;        // Delivery status
  createdAt: number;   // Unix timestamp
}
```

## Database Schema

### calendar_events Table

```sql
CREATE TABLE calendar_events (
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
);

-- Indexes for common queries
CREATE INDEX idx_calendar_events_startTime ON calendar_events (startTime);
CREATE INDEX idx_calendar_events_channelId ON calendar_events (channelId);
CREATE INDEX idx_calendar_events_recurrence ON calendar_events (recurrence);
```

### reminders Table

```sql
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  userId TEXT NOT NULL,
  remindAt INTEGER NOT NULL,
  sent INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (eventId) REFERENCES calendar_events(id)
);

CREATE INDEX idx_reminders_remindAt ON reminders (remindAt);
CREATE INDEX idx_reminders_eventId ON reminders (eventId);
```

## Natural Language Parsing

### Date Extraction

Uses `chrono-node` library for Norwegian/English date parsing:

```typescript
parseNaturalDate("møte imorgen kl 14:30")
// → { start: Date(2026-02-24T14:30), end: Date(2026-02-24T15:30) }

parseNaturalDate("hver mandag kl 09:00")
// → { start: Date(...), recurrence: 'FREQ=WEEKLY' }
```

### Supported Patterns

| Language | Examples |
|----------|----------|
| Norwegian | "imorgen kl 14", "neste mandag", "15. mars kl 10", "hver uke" |
| English | "tomorrow at 2pm", "next Monday", "March 15 at 10am", "weekly" |

### Recurrence Detection

```typescript
// Keywords → iCalendar recurrence rule
"hver uke" / "weekly"     → "FREQ=WEEKLY"
"hver dag" / "daily"      → "FREQ=DAILY"
"monthly"                  → "FREQ=MONTHLY"
```

## Message Routing

### Priority Order

1. **List events**: `list`, `what's coming`, `hva skjer`
2. **Week view**: `week`, `uke`, `kalender uke`
3. **Month view**: `month`, `måned`, `kalender måned`
4. **Today**: `today`, `idag`
5. **Export**: `export`, `ics`, `eksport`
6. **Delete**: `delete`, `remove`, `slett`
7. **Create** (fallback): If natural date detected

### Trigger Patterns

```typescript
const TRIGGERS = {
  // Any of these activate the skill
  calendar: ['calendar', 'kalender', 'event'],
  time: ['remind', 'schedule', 'planlegg'],
  meeting: ['møte', 'avtale'],
  // Natural date parsing as fallback
};
```

## ICS Export Format

Generates RFC 5545 compliant iCalendar:

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Bottus//Calendar//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:uuid-1234@bottus
DTSTAMP:20260223T185000Z
DTSTART:20260224T140000Z
DTEND:20260224T150000Z
SUMMARY:Team Meeting
DESCRIPTION:Weekly sync
LOCATION:Office
END:VEVENT
END:VCALENDAR
```

## Ownership & Permissions

### Delete Authorization

```
1. User requests delete with event title
2. System finds all matching events (title contains query)
3. If user is creator of any match → delete that one
4. If user is NOT creator but matches exist → show disambiguation
5. If no matches → return "not found"
```

### Ownership Check

```typescript
const userEvent = matching.find(e => e.creatorId === userId);
const eventToDelete = userEvent || matching[0];

if (eventToDelete.creatorId !== userId && matching.length > 1) {
  // Show disambiguation
}
```

## Reminder System

### Default Reminder Intervals

```typescript
const DEFAULT_REMINDERS = [15, 60, 1440]; // minutes
// → 15 min, 1 hour, 1 day before
```

### Reminder Flow

```
Event Created
     │
     ▼
┌─────────────────┐
│ Parse reminders │
│ JSON array      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ scheduleReminders│────▶│ setTimeout      │
│ For each interval│     │ (delay = mins)  │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ Discord DM      │
                        │ User            │
                        └─────────────────┘
```

## Error Handling

| Scenario | Response |
|----------|----------|
| No date detected in create | Prompt with help text |
| Delete - no title provided | "Please provide event title" |
| Delete - no matches | "No events found matching X" |
| Delete - not owner | "Could not delete. You can only delete events you created." |
| Week/Month view - no events | "Ingen hendelser denne uken." |
| Week/Month view - error | "Kunne ikke hente ukesvisning." |

## Configuration

### Timezone

Hardcoded to `Europe/Oslo` (Norwegian timezone):

```typescript
const TIMEZONE = 'Europe/Oslo';

// Usage in date formatting
new Date(event.startTime).toLocaleString('nb-NO', {
  timeZone: 'Europe/Oslo',
  // ...
});
```

### Database Path

```typescript
// Default location
const calendarV2 = new CalendarServiceV2('./data/calendar-v2.db');
```

## Skill Registration

```typescript
// src/relay/index.ts
const calendarV2 = new CalendarServiceV2('./data/calendar-v2.db');
skillRegistry.register(new CalendarSkillV2(calendarV2));
```

## Testing Patterns

| Action | Test Message |
|--------|--------------|
| Create event | "lag arrangement møte imorgen kl 14" |
| List events | "hva skjer" / "list events" |
| Week view | "kalender uke" / "calendar week" |
| Month view | "kalender måned" / "calendar month" |
| Today | "hva skjer i dag" / "today" |
| Export | "eksport kalender" / "export calendar" |
| Delete | "slett møte" / "delete meeting" |
