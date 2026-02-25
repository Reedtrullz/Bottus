# Grand Plan Notepad

## Inherited Wisdom

### Current Project State (2026-02-25)
- Tests pass: 108 passed, 2 skipped
- Build: passes with 0 errors
- Lint: 134 errors, 392 warnings in src/

### Key Files with Lint Issues
- src/db/calendar-schema.ts: useImportType, any types
- src/db/interactions-schema.ts: useImportType, any types
- src/gateway/dispatcher.js: optional chain, unused params
- src/commands/index.ts: any type
- src/gateway/event-bus.ts: any types
- src/gateway/dispatcher.d.ts: any types

### Test Coverage
Existing tests already cover:
- CalendarSkillV2 (25 tests)
- MemorySkill (19 tests)
- ImageSkill (14 tests)
- DayDetailsSkill (15 tests)
- ClarificationSkill (13 tests)
- HelpHandler (15 tests)

## Decisions

### Lint Fix Strategy
- Most lint issues are FIXABLE via biome --write
- Some `any` types require proper typing
- Will batch fix auto-fixable issues first
