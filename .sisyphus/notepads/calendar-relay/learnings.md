# Calendar Relay - Learnings

- Implemented calendar-trigger detection in relay to present a calendar embed when a user mentions calendar-related keywords.
- Added isCalendarQuery() to detect Norwegian phrases: 'hva har vi planlagt', 'når er', 'hva skjer', 'vis kalender', 'kalender', 'hva skjer i dag'.
- Integrated CalendarDisplayService.buildWeekEmbed() to produce a text-renderable calendar embed and respond directly on Discord when triggered.
- Imported and used CalendarDisplayService in the relay to avoid modifying Ollama flow for calendar queries.
- Preserved Norwegian UI text semantics by relying on CalendarDisplayService built-in Norwegian labels.
