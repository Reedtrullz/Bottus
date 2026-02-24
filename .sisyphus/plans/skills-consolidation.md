# Skill System Analysis & Work Plan

## Executive Summary

The skill system has several issues affecting functionality and code quality:

| Issue | Severity | Type |
|-------|----------|------|
| MemorySkill broken getMemory/setMemory | HIGH | Bug |
| Handlers have MORE features than skills | HIGH | Architecture |
| Dead code (ImageSkill, CalendarSkill, ExtractionSkill) | MEDIUM | Code Quality |
| Missing skills (DayDetails, Clarification) | MEDIUM | Feature Gap |
| Duplicate calendar/memory implementations | MEDIUM | Architecture |

---

## Context

### What We Discovered

**Handlers have MORE features than skills:**

| Handler | Features | Skill Equivalent | Gap |
|---------|----------|------------------|-----|
| MemoryHandler | Date/time detection, clarification flow ("avtale" vs "minne") | MemorySkill | Missing clarification |
| CalendarHandler | Week/month embeds via CalendarDisplayService | CalendarSkillV2 | Missing embed views |
| DayDetailsHandler | Day-specific event details | (none) | Missing entirely |
| ClarificationHandler | "avtale"/"minne" response handling | (none) | Missing entirely |
| ImageHandler | Direct ComfyUI call | ImageSkill | Skill is dead code |

**MemorySkill (`src/relay/skills/memory-skill.ts`):**
- Uses MemoryService correctly for handle() → stores to SQLite
- But getMemory/setMemory (lines 84-90) use local Map instead
- Missing clarification flow from MemoryHandler

**Calendar Skill:**
- CalendarSkillV2: Simple CRUD, ICS export
- CalendarHandler: Week/month views (MORE features)
- Need to add CalendarDisplayService to CalendarSkillV2

**Dead code:**
- ImageSkill - bypassed by direct handler in relay/index.ts:561-578
- CalendarSkill - returns placeholders only
- ExtractionSkill - extraction happens elsewhere

### Best Practices Research

From pattern analysis:

1. **Single Responsibility**: Each skill should handle ONE domain
2. **Centralized Persistence**: Use services for persistence, not local state
3. **Consistent Handler Chain**: Either use skills OR handlers, not both
4. **Error Handling**: Always enhance prompts before external APIs
5. **Graceful Degradation**: Fallback when services unavailable

---

## Work Objectives

### Core Objective
Fix broken skills and consolidate duplicate functionality for maintainability.

### Must Have
- [ ] MemorySkill uses MemoryService (not local Map)
- [ ] MemorySkill has clarification flow (from MemoryHandler)
- [ ] CalendarSkillV2 has week/month views (from CalendarHandler)
- [ ] DayDetailsSkill exists (migrated from DayDetailsHandler)
- [ ] ClarificationSkill exists (migrated from ClarificationHandler)
- [ ] Old handlers removed after skill migration
- [ ] Dead code removed (ImageSkill, CalendarSkill, ExtractionSkill)

### Must NOT Have
- [ ] No duplicate image handling paths
- [ ] No skills that don't use centralized services
- [ ] No deprecated handlers left in the codebase

---

## Verification Strategy

### Test Infrastructure
- Framework: vitest
- Run: `npm test`
- No new test infrastructure needed

### QA Policy
Every task includes agent-executed verification:
- Run `npm run build` - verify compilation
- Run `npm test` - verify tests pass
- Code review via eslint if available

---

## Execution Plan

### Wave 1: Quick Fixes (Parallel - 3 tasks)

- [ ] 1.1 **Fix MemorySkill getMemory/setMemory**
  
  **What to do**: Remove local Map from MemorySkill, delegate to MemoryService
  - Delete lines 20, 84-90 (memories Map)
  - Update getMemory to: `return this.memoryService.recall(userId)`
  - Update setMemory to: `await this.memoryService.store(userId, fact)`

  **File**: `src/relay/skills/memory-skill.ts`
  
  **References**:
  - `src/relay/skills/memory-skill.ts` - current implementation
  - `src/services/memory.ts:3-17` - MemoryService API
  - `src/db/index.ts:408-430` - memoryDb (SQLite-backed)

  **Verification**:
  - [ ] npm run build passes
  - [ ] npm test passes

- [ ] 1.2 **Remove deprecated CalendarSkill**
  
  **What to do**: Remove placeholder calendar skill
  - Delete `src/relay/skills/calendar-skill.ts`
  - Remove import from `relay/index.ts` (if imported)

  **File**: `src/relay/skills/calendar-skill.ts`
  
  **Verification**:
  - [ ] npm run build passes

- [ ] 1.3 **Remove ImageSkill and ExtractionSkill** (dead code)
  
  **What to do**: Remove dead skills
  - Remove ImageSkill from relay/index.ts registration (line 420)
  - Remove ExtractionSkill from relay/index.ts registration (line 423)
  - Image generation works via direct handler path at line 561-578
  - Extraction happens in main flow at line 940, not via skill

  **Files**:
  - `src/relay/index.ts` - remove skill registrations
  - `src/relay/skills/image-skill.ts` - can delete or keep (not registered)
  - `src/relay/skills/extraction-skill.ts` - can delete or keep (not registered)

  **Verification**:
  - [ ] npm run build passes

### Wave 2: Handler → Skill Migration (4 tasks)

- [ ] 2.1 **Enhance MemorySkill with clarification flow**
  
  **What to do**: Add MemoryHandler features to MemorySkill
  - Add date/time pattern detection from handlers/memory.ts lines 6-11
  - Add pendingClarifications Map (like MemoryHandler line 17)
  - Add clarification flow: when date pattern detected, ask "avtale" or "minne"
  - Handle "avtale" and "minne" responses
  - Keep existing MemoryService integration

  **File**: `src/relay/skills/memory-skill.ts`
  
  **Reference**: `src/relay/handlers/memory.ts:29-70` - MemoryHandler clarification flow
  
  **Required imports**:
  - `datePatterns` array from handlers/memory.ts
  - Use existing MemoryService

  **Verification**:
  - [ ] npm run build passes
  - [ ] Test "husk imorgen kl 14" triggers clarification

- [ ] 2.2 **Add ClarificationSkill**
  
  **What to do**: Create skill for pending clarification responses
  - Handle "avtale" vs "minne" responses
  - Delete pending clarifications after handling
  - Import from `src/relay/skills/interfaces.js`
  
  **File**: Create `src/relay/skills/clarification-skill.ts`
  
  **Reference**: `src/relay/handlers/memory.ts:73-106` - ClarificationHandler
  
  **Pattern**:
  ```typescript
  export class ClarificationSkill implements Skill {
    readonly name = 'clarification';
    readonly description = 'Handles pending clarification responses';
    
    canHandle(message: string, ctx: HandlerContext): boolean {
      // Check if there's a pending clarification for this channel
      // Check if message is "avtale" or "minne"
    }
    
    async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
      // Handle the clarification response
    }
  }
  ```

  **Verification**:
  - [ ] npm run build passes

- [ ] 2.3 **Enhance CalendarSkillV2 with week/month views**
  
  **What to do**: Add CalendarDisplayService integration
  - Import CalendarDisplayService from `../../services/calendar-display.js`
  - Add week/month embed building capability
  - Keep existing CRUD + ICS export
  - Add patterns: "kalender uke", "kalender måned", "calendar week", "calendar month"
  
  **File**: `src/relay/skills/calendar-skill-v2.ts`
  
  **Reference**: 
  - `src/relay/handlers/calendar.ts` - CalendarHandler for embed logic
  - `src/services/calendar-display.ts` - CalendarDisplayService API
  
  **Required changes**:
  - Add `CalendarDisplayService` import and instance
  - Add `buildWeekEmbed()` call for week/month queries
  - Handle Norwegian month names

  **Verification**:
  - [ ] npm run build passes
  - [ ] Test "vis kalender" or "calendar week"

- [ ] 2.4 **Add DayDetailsSkill**
  
  **What to do**: Create skill for day-specific details
  - Handle "detaljer om" / "vis dag X" patterns
  - Use CalendarDisplayService.getDayDetails()
  
  **File**: Create `src/relay/skills/day-details-skill.ts`
  
  **Reference**: `src/relay/handlers/calendar.ts:114-155` - DayDetailsHandler
  
  **Pattern**:
  ```typescript
  export class DayDetailsSkill implements Skill {
    readonly name = 'dayDetails';
    readonly description = 'Get details for specific days';
    
    canHandle(message: string): boolean {
      return /detaljer om\s+/i.test(m) || /vis(?: dag)?\s+/i.test(m);
    }
  }
  ```

  **Verification**:
  - [ ] npm run build passes
  
  **Reference**: `src/relay/handlers/calendar.ts:114-155` - DayDetailsHandler

  **Verification**:
  - [ ] npm run build passes

### Wave 3: Remove Old Handlers (2 tasks)

- [ ] 3.1 **Remove handlers that are now replaced by skills**
  
  **What to do**: Update relay/index.ts to remove old handlers after skills are enhanced
  
  **Files to modify**:
  1. `src/relay/index.ts`:
     - Remove imports: ImageHandler, CalendarHandler, DayDetailsHandler, MemoryHandler, ClarificationHandler (line 11)
     - Remove instantiations: lines 412-416
     - Remove handler.canHandle() checks: lines 628-647
  
  2. `src/relay/handlers/index.ts`:
     - Remove exports: ImageHandler, CalendarHandler, DayDetailsHandler, MemoryHandler, ClarificationHandler
  
  **Keep these handlers** (NOT migrated to skills):
  - TechStackHandler - for "tech stack" queries
  - HelpHandler - for help queries
  - FeedbackHandler - for reaction/interaction logging (different pattern)

  **Verification**:
  - [ ] npm run build passes
  - [ ] npm test passes
  
  **Keep for now**:
  - TechStackHandler (not a skill)
  - HelpHandler (not a skill)
  - FeedbackHandler (different pattern - reaction-based)

- [ ] 3.2 **Register new skills in skillRegistry**
  
  **What to do**: Add new/enhanced skills to relay/index.ts
  
  **Skill registrations should be**:
  ```typescript
  skillRegistry.register(new CalendarSkillV2(calendarV2));
  skillRegistry.register(new MemorySkill());
  skillRegistry.register(new ClarificationSkill());
  skillRegistry.register(new DayDetailsSkill());
  ```

  **Verification**:
  - [ ] npm run build passes
  - [ ] All 4 skills register on startup

### Wave 4: Cleanup (1 task)

- [ ] 4.1 **Final cleanup and docs**
  
  **What to do**:
  - Run full test suite
  - Verify all skills register without warnings

  **Documentation updates - src/relay/AGENTS.md**:
  - Update SKILLS SYSTEM table:
    ```
    | Skill | Purpose |
    |-------|---------|
    | calendar-skill-v2 | Calendar events (CRUD, ICS export, week/month) |
    | memory-skill | User memory with clarification flow |
    | clarification-skill | Pending response handling |
    | day-details-skill | Day-specific event details |
    ```
  - Remove: calendar-skill (deprecated), image-skill (dead), extraction-skill (dead)
  
  **Documentation updates - src/relay/handlers/AGENTS.md**:
  - Update FILES table - remove handlers migrated to skills
  - Add note: "Most handlers migrated to skills. Remaining: TechStackHandler, HelpHandler, FeedbackHandler"
  
  **Documentation updates - AGENTS.md (root)**:
  - Update SKILLS SYSTEM section with new skills table

  **Verification**:
  - [ ] npm run build passes
  - [ ] npm test passes
  - [ ] All skills register without warnings

---

## Commit Strategy

- Wave 1: `fix(skills): MemorySkill persistence + remove dead code`
- Wave 2: `refactor(skills): migrate handler features to skills`
- Wave 3: `refactor(relay): remove old handlers, use skills only`
- Wave 4: `chore(skills): cleanup + docs`

---

## Success Criteria

### Verification Commands
```bash
npm run build    # Must pass
npm test        # All tests pass
```

### Final Checklist
- [ ] MemorySkill uses MemoryService for get/set
- [ ] MemorySkill has clarification flow ("avtale" vs "minne")
- [ ] CalendarSkillV2 has week/month embed views
- [ ] DayDetailsSkill exists and works
- [ ] ClarificationSkill exists and works
- [ ] Old handlers removed (ImageHandler, CalendarHandler, DayDetailsHandler, MemoryHandler, ClarificationHandler)
- [ ] Dead skills removed (ImageSkill, ExtractionSkill, CalendarSkill)
- [ ] All skills register without warnings
- [ ] Build and tests pass

---

## Key Files Reference

### Skill Registration (relay/index.ts:420-423)
```typescript
// After changes - should be:
skillRegistry.register(new CalendarSkillV2(calendarV2));
skillRegistry.register(new MemorySkill());
skillRegistry.register(new ClarificationSkill());
skillRegistry.register(new DayDetailsSkill());
```

### Handler Imports to Remove (relay/index.ts:11)
```typescript
// Remove from import:
ImageHandler, CalendarHandler, DayDetailsHandler, MemoryHandler, ClarificationHandler
```

### New Skills to Create
- `src/relay/skills/clarification-skill.ts`
- `src/relay/skills/day-details-skill.ts`
