# Bottus v2 Enhancement Plan

**Project**: Bottus v2 - Calendar & Image Quality Improvements  
**Type**: Feature Enhancement  
**Priority**: High  
**Goal**: Make calendar and image generation "just work"

---

## TL;DR

> **Quick Summary**: Fix critical gaps in calendar (persistence, reminders, delete) and image generation (configurable models, fallback) while improving overall architecture.
> 
> **Deliverables**:
> - Calendar: Persistent storage, working reminders, event deletion
> - Image: Configurable models, robust fallback, proper Discord display
> - Architecture: Modular handlers, unified routing, persisted memory
> 
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES - 3 phases
> **Critical Path**: Calendar persistence → Reminders → Image config → Architecture

---

## Context

### Original Analysis Findings

**Calendar Issues:**
- Events stored in-memory only (lost on restart)
- Reminders only log to console, no Discord notification
- Delete event is a stub
- Dual implementations (v2 + main DB) cause confusion

**Image Issues:**
- Hard-coded model names in workflows
- Only 2 workflow attempts, no robust fallback
- URL sending may not work via selfbot
- Method name typo: getRemainingRemainingTime

**Architecture Issues:**
- Monolithic onMention handler (970 lines)
- HandlerRegistry exists but unused
- MemorySkill uses in-memory Map

---

## Work Objectives

### Core Objectives
1. **Calendar must persist** - Events survive bot restart
2. **Reminders must notify** - Users get Discord messages
3. **Images must work** - Configurable, fallback, display correctly
4. **Architecture must improve** - Modular, testable, maintainable

### Definition of Done
- [ ] Calendar events persist to disk
- [ ] Reminders send Discord messages
- [ ] Users can delete events
- [ ] Image models configurable via env vars
- [ ] Image fallback strategy in place
- [ ] Images display in Discord
- [ ] Memory persists across restarts
- [ ] No monolithic functions >100 lines

---

## Execution Strategy

### Phase Structure

```
Phase 1: Calendar Foundation (Week 1)
├── 1.1 Calendar persistence (file-based sql.js)
├── 1.2 Wire reminders to Discord
├── 1.3 Implement delete event
└── 1.4 Unify calendar data source

Phase 2: Image Robustness (Week 1-2)
├── 2.1 Configurable ComfyUI models
├── 2.2 Extended fallback strategy
├── 2.3 Fix image URL sending
└── 2.4 Fix typo

Phase 3: Architecture (Week 2-3)
├── 3.1 Modular message handlers
├── 3.2 Unified skill routing
└── 3.3 Persist memory
```

---

## TODOs

### Phase 1: Calendar Foundation

- [x] 1.1 Add file-based sql.js persistence to CalendarServiceV2

  **What to do**:
  - Modify CalendarServiceV2.initialize() to load from file
  - Add save() method that exports DB to file periodically
  - Update constructor to accept dbPath parameter
  - Add periodic auto-save (every 5 minutes)

  **References**:
  - `src/services/calendar-v2.ts:14-23` - Current initialize() implementation
  - `src/db/index.ts` - How eventDb handles persistence

  **QA Scenarios**:
  - Create event → Restart bot → List events → Event should persist

- [x] 1.2 Wire reminders to Discord notifications

  **What to do**:
  - Modify sendReminder() to accept Discord client
  - Send message to channel: `⏰ Påminnelse: **${event.title}** starter om ${minutesBefore} minutter`
  - Pass discord client through to CalendarServiceV2

  **References**:
  - `src/services/calendar-v2.ts:270-272` - Current sendReminder() stub

  **QA Scenarios**:
  - Create event with reminder → Wait for reminder time → Discord message appears

- [x] 1.3 Implement deleteEvent functionality

  **What to do**:
  - Parse event title or ID from user message
  - Search events matching title (fuzzy match)
  - Show confirmation or delete directly
  - Return success/failure response

  **References**:
  - `src/relay/skills/calendar-skill-v2.ts:128-130` - Current stub

  **QA Scenarios**:
  - "delete meeting" → Bot asks which → User confirms → Event deleted

- [ ] 1.4 Unify calendar data source

  **What to do**:
  - Decide: Use eventDb (existing) or CalendarServiceV2
  - If using eventDb: Migrate CalendarServiceV2 to use eventDb
  - Remove duplicate calendar-skill.ts if not needed
  - Ensure CalendarDisplayService reads from same source

  **References**:
  - `src/services/calendar-display.ts` - Reads from eventDb
  - `src/db/index.ts` - Main database access

  **QA Scenarios**:
  - Create via skill → Display via embed → Same event shows

---

### Phase 2: Image Robustness

- [ ] 2.1 Make ComfyUI models configurable

  **What to do**:
  - Add env vars: COMFYUI_MODEL, COMFYUI_FALLBACK_MODEL
  - Update buildWorkflow() to use env var
  - Update buildSimpleWorkflow() to use env var
  - Add validation at startup

  **References**:
  - `src/services/comfyui.ts:130-191` - Workflow builders

  **QA Scenarios**:
  - Set COMFYUI_MODEL=dreamshaper.safetensors → Generate image → Uses correct model

- [ ] 2.2 Add extended fallback strategy

  **What to do**:
  - After both workflows fail, try cached recent image OR
  - Return friendly error with retry instructions
  - Add circuit breaker to avoid hammering failing ComfyUI

  **References**:
  - `src/services/comfyui.ts:46-119` - Current generation flow

  **QA Scenarios**:
  - ComfyUI down → User generates image → Clear error message shown

- [ ] 2.3 Fix image URL sending to Discord

  **What to do**:
  - Test current { file: imageUrl } behavior
  - If fails: Download to temp file first, then send
  - Or use Discord embed format

  **References**:
  - `src/relay/skills/image-skill.ts:40` - Current send

  **QA Scenarios**:
  - Generate image → Image appears in Discord channel

- [ ] 2.4 Fix method name typo

  **What to do**:
  - Rename getRemainingRemainingTime → getRemainingTime

  **References**:
  - `src/services/comfyui.ts:122` - Typo location

  **QA Scenarios**:
  - Name change verified via grep

---

### Phase 3: Architecture Improvements

- [ ] 3.1 Modular message handlers

  **What to do**:
  - Extract handlers from relay/index.ts into separate files
  - Create: image-handler.ts, calendar-handler.ts, memory-handler.ts
  - Each handler in its own file with clear interface
  - Use HandlerRegistry consistently

  **References**:
  - `src/relay/index.ts:597-932` - onMention handler
  - `src/relay/handlers/registry.ts` - Existing registry

  **QA Scenarios**:
  - No function in relay/index.ts exceeds 100 lines
  - Each handler can be unit tested in isolation

- [ ] 3.2 Unified skill routing

  **What to do**:
  - Register all skills at startup
  - Replace inline checks with skillRegistry.findHandler()
  - Remove duplicate detection code

  **References**:
  - `src/relay/skills/registry.ts` - Current registry
  - `src/relay/index.ts` - Inline checks

  **QA Scenarios**:
  - All skills registered at startup
  - Messages route through registry

- [ ] 3.3 Persist memory across restarts

  **What to do**:
  - Wire MemorySkill to MemoryService (SQLite-backed)
  - Or write memories to .sisyphus/memories/
  - Load memories on startup

  **References**:
  - `src/relay/skills/memory-skill.ts` - Current in-memory
  - `src/services/memory.ts` - Existing service

  **QA Scenarios**:
  - Store memory → Restart → Recall memory → Still exists

---

## Final Verification Wave

- [ ] F1. Calendar persistence test

  Run: Create event → npm run start:relay (restart) → List events
  Expected: Events persist

- [ ] F2. Reminder notification test

  Run: Create event with 1-minute reminder → Wait 1 minute
  Expected: Discord message appears

- [ ] F3. Image generation test

  Run: "lag et bilde av en katt" in Discord
  Expected: Image appears in channel

- [ ] F4. Memory persistence test

  Run: "husk at jeg liker kaffe" → Restart → "hva husker du"
  Expected: Memory preserved

- [ ] F5. Code quality check

  Run: npx tsc --noEmit && npm test
  Expected: All pass, no new errors

---

## Commit Strategy

- **1**: `fix(calendar): add file-based persistence` - calendar-v2.ts
- **2**: `fix(calendar): wire reminders to Discord` - calendar-v2.ts
- **3**: `fix(calendar): implement delete event` - calendar-skill-v2.ts
- **4**: `fix(calendar): unify data source` - calendar-v2.ts, calendar-display.ts
- **5**: `feat(image): make models configurable` - comfyui.ts
- **6**: `feat(image): add fallback strategy` - comfyui.ts
- **7**: `fix(image): correct URL sending` - image-skill.ts
- **8**: `fix(image): rename method` - comfyui.ts
- **9**: `refactor(handlers): extract modular handlers` - relay/handlers/
- **10**: `refactor: unify skill routing` - relay/index.ts
- **11**: `fix(memory): persist across restarts` - memory-skill.ts

---

## Success Criteria

- [ ] All calendar events persist across bot restart
- [ ] Users receive Discord notifications for reminders
- [ ] Users can delete calendar events
- [ ] Image models configurable via environment variables
- [ ] Image generation has robust fallback when ComfyUI fails
- [ ] Images display correctly in Discord
- [ ] Memory persists across bot restart
- [ ] No function exceeds 100 lines
- [ ] Build passes: npm run build
- [ ] Tests pass: npm test

---

## Success Criteria
