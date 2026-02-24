Learnings from implementing tech stack trigger in src/relay/index.ts:
- Added isTechStackQuery and buildTechStackEmbed following isCalendarQuery style
- Inserted pre-calendar handler to respond with embed when tech stack questions detected
- No external dependencies added; embed: Title, color, and 6 fields
- Verified with lints/build hints (note: actual build should be run in CI)
