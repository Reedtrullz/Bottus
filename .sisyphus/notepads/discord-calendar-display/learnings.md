Date: 2026-02-22

- Implemented CalendarDisplayService at src/services/calendar-display.ts.
- Provides weekly calendar embeds for Discord using Norwegian UI (ukes dager, måneder).
- Uses date-fns/date-fns-tz for locale-aware formatting with Europe/Oslo timezone.
- Week starts on Monday (weekStartsOn: 1).
- Colors:
  - Meetings: blue (#5865F2)
  - Tasks: red (#ED4245)
  - Personal: green (#57F287)
- Reuses existing DB access: eventDb.findUpcoming() and taskDb.findPending().
- Format helper formatTimestamp implemented to reuse from ExtractionService style.
