# Calendar Skill Documentation

The calendar skill provides shared calendar management for group chats. Events are stored per-channel (group DM), so all members see the same calendar.

## Quick Start

| Action | English | Norwegian |
|--------|---------|-----------|
| Create event | "lag arrangement Dinner imorgen kl 18" | "planlegg møte på fredag kl 14" |
| List events | "mine arrangementer" / "hva skjer" | "list events" |
| View week | "calendar week" | "kalender uke" |
| View month | "calendar month" | "kalender måned" |

## Commands

### Creating Events

```
"lag arrangement Dinner imorgen kl 18"
"planlegg møte på fredag kl 14"
"remind me to call Oda on saturday at 3pm"
"lag arrangement workshop 15. mars kl 10"
```

The bot uses natural language parsing (chrono-node) to extract dates/times. Supports:
- Norwegian: "imorgen", "på fredag", "15. mars", "kl 18"
- English: "tomorrow", "next friday", "march 15", "at 3pm"

**Recurring events:**
```
"lag arrangement ukentlig møte hver uke"
"planlegg daglig standup hver dag"
```

### RSVP (Attendance Tracking)

```
"rsvp Dinner yes"        # Attend
"rsvp Dinner no"        # Can't attend  
"rsvp Dinner maybe"     # Might attend
"deltar Dinner"         # Norwegian: attend
```

Shows attendance count after responding:
```
✅ Attending: Dinner
📊 RSVP: 2 ✅ | 1 🤔 | 0 ❌
```

### Event Details

```
"event Dinner"           # Show full event info
"details Meeting"       # View event details
"detaljer Møte"        # Norwegian
```

Shows:
- Title, date/time
- Location (if set)
- Description (if set)
- Creator
- Recurrence info
- Who's attending/maybe/not attending

### Time Proposals (Group Coordination)

```
"propose tid"           # Start time poll
"forslag tid"          # Norwegian
"hvilken tid passer"    # What times work?
```

Generates time slot options for the next week. Members vote by replying.

### Conflict Detection

When creating events that overlap with existing ones:
```
⚠️ Warning: This overlaps with:
  • Team meeting (Mon Mar 3, 14:00)
```

### Deleting Events

**Owner delete** (you created it):
```
"delete Dinner"
"slett møte"
```

**Group consensus** (2/3 majority needed):
- Non-owners can request deletion
- Bot tracks votes
- Auto-deletes when 2/3 approve

### Export Calendar

```
"export ics"            # Export all events
"eksport kalender"      # Norwegian
```

Returns ICS file format for import to Google Calendar, Apple Calendar, etc.

### View Calendar

```
"calendar week"         # This week's events
"kalender uke"         # Norwegian

"calendar month"        # This month
"calendar january 2025" # Specific month

"today"                # Today's events
"idag"                 # Norwegian
```

## Group Chat Features

Designed for 3-person group chats:

| Feature | Benefit |
|---------|---------|
| RSVP tracking | See who's coming |
| Time proposals | Coordinate schedules |
| Conflict warnings | Avoid double-booking |
| Consensus delete | Remove stale events fairly |
| Shared per-channel | Everyone sees same calendar |

## Technical Details

- **Storage**: SQLite (sql.js) in `data/calendar.db`
- **Timezone**: Europe/Oslo (hardcoded)
- **Persistence**: Auto-saves every 5 minutes
- **Reminders**: 15min, 1hr, 1day before event

## Files

| File | Purpose |
|------|---------|
| `src/relay/skills/calendar-skill-v2.ts` | Skill handler |
| `src/services/calendar-v2.ts` | Calendar service |
| `src/services/calendar-display.ts` | Embed rendering |
| `src/db/calendar-schema.ts` | Database schema |

## Limitations

- Single timezone (Europe/Oslo)
- No external calendar sync (ICS export only)
- Time proposals are manual voting (not Discord reactions)
- No recurring event expansion in views
