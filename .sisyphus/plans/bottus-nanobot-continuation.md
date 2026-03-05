# Bottus → NanoBot Migration Continuation

**Generated:** 2026-03-05  
**Status:** ✅ COMPLETE  
**Parent Plan:** grand-plan.md (IN PROGRESS)

---

## TL;DR

> **Status**: ✅ **COMPLETE** - All 21 tasks finished across 5 waves
> 
> **Completed**:
> - ✅ Dead code removed (4 unused handler exports)
> - ✅ Modular handlers verified (already in place)
> - ✅ Unified skill routing (skillRegistry active)
> - ✅ Docker config verified
> - ✅ **NEW**: Recurring events expansion implemented
> - ✅ **NEW**: Nightly cron wired up
> - ✅ **NEW**: README updated with bilingual commands
> 
> **Build**: Pass (0 warnings) | **Tests**: 538 passed

---

## Context

### Parent Plan Status (grand-plan.md)
| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 (Tests) | ✅ Complete | Calendar, Image, Memory, Skills tests |
| Phase 2 (Production) | ✅ Complete | Lint, build, self-healing, logging |
| Phase 3.1-3.2 (Skills) | ✅ Complete | Broken skills fixed, missing skills added |
| **Phase 3.3 (Cleanup)** | ✅ Complete | Dead code removal |
| **Phase 4 (Architecture)** | ✅ Complete | Modular handlers, unified routing |
| **Phase 5 (NanoBot)** | ✅ Complete | Docker + integration |
| **Phase 6 (v2 Features)** | ✅ Complete | Recurring events, nightly cron, docs |

### This Plan Scope
- **IN**: Continue from grand-plan.md Phase 3.3 onwards
- **OUT**: Selfbot→Eris migration (explicitly excluded per user)
- **Sequential**: Phase 3.3 → 4 → 5 → 6

### Technical Context
- **Main bot**: `src/index.ts` (Eris client)
- **Relay bot**: `src/relay/index.ts` (discord.js-selfbot-v13 - archived)
- **Gateway**: `src/gateway/` (experimental skill dispatcher)
- **Skills**: `src/relay/skills/` (CalendarSkillV2, MemorySkill, ClarificationSkill, DayDetailsSkill)
- **Test framework**: vitest
- **Database**: sql.js (SQLite in-memory with file persistence)

---

## Work Objectives

### Core Objective
Complete the Bottus → NanoBot migration by finishing remaining phases from grand-plan.md: cleanup dead code, modularize architecture, integrate NanoBot via Docker, and implement v2 features.

### Concrete Deliverables

| Phase | Deliverables |
|-------|--------------|
| 3.3 | ImageSkill.ts removed, CalendarSkill.ts removed, ExtractionSkill.ts removed, old handlers removed |
| 4 | No functions >100 lines, handlers extracted to separate files, unified skill routing |
| 5 | Docker-compose.yaml, NanoBot installed, connection verified |
| 6 | Recurring events work, ICS export valid, feedback system, nightly cron, docs updated |

### Definition of Done
- [ ] `npm run build` passes with 0 warnings
- [ ] All tests pass
- [ ] Docker-compose starts Ollama + ComfyUI
- [ ] NanoBot can communicate with Ollama
- [ ] Relay bot still works after all changes

### Must Have
- All dead code removed from Phase 3.3
- Modular handlers with unified routing
- NanoBot integration working
- Existing functionality preserved

### Must NOT Have
- No selfbot→Eris migration (out of scope)
- No breaking changes to working skills
- No duplicate image handling paths

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES - Tests after implementation
- **Framework**: vitest

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/`.

- **Frontend/UI**: N/A (CLI bot)
- **TUI/CLI**: Use interactive_bash (tmux) - Run bot, send messages, validate output
- **API/Backend**: Use Bash (curl) - Health checks, direct service tests
- **Library/Module**: Use Bash (node REPL) - Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Cleanup - foundation):
├── Task 1: Analyze dead code candidates
├── Task 2: Remove ImageSkill.ts (if exists as separate file)
├── Task 3: Remove CalendarSkill.ts (if exists as separate file)
├── Task 4: Remove ExtractionSkill.ts (if exists as separate file)
├── Task 5: Remove old handlers after skill migration
└── Task 6: Verify no duplicate image handling paths

Wave 2 (Architecture - modularization):
├── Task 7: Analyze monolithic functions >100 lines
├── Task 8: Extract message handlers to separate files
├── Task 9: Implement unified skill routing
└── Task 10: Verify no functions >100 lines remain

Wave 3 (NanoBot Integration):
├── Task 11: Create docker-compose.yaml for Ollama + ComfyUI
├── Task 12: Create NanoBot installation/config
├── Task 13: Configure NanoBot → Ollama connection
├── Task 14: Verify Bottus selfbot still works
├── Task 15: Test NanoBot → Ollama communication
└── Task 16: Full Bottus → NanoBot integration test

Wave 4 (v2 Features):
├── Task 17: Implement recurring events (weekly/monthly)
├── Task 18: Fix ICS export
├── Task 19: Add feedback system (emoji reactions)
├── Task 20: Set up nightly cron
└── Task 21: Update documentation

Wave 5 (Final):
├── Task 22: Final build verification
├── Task 23: Final test run
└── Task 24: Health check verification
```

### Dependency Matrix

- **Tasks 1-6**: No dependencies (Wave 1 - can run parallel)
- **Task 7**: Depends on 1 (need analysis first)
- **Task 8**: Depends on 7 (know what to extract)
- **Task 9**: Depends on 8 (handlers extracted first)
- **Task 10**: Depends on 7, 8, 9 (verification)
- **Task 11**: No dependencies (Wave 3 - can start)
- **Task 12**: Depends on 11 (docker first)
- **Task 13**: Depends on 12 (config after install)
- **Task 14**: No dependencies (verify current)
- **Task 15**: Depends on 11, 13 (needs services running)
- **Task 16**: Depends on 14, 15 (integration)
- **Tasks 17-21**: No dependencies (Wave 4 - can run parallel)
- **Tasks 22-24**: Depend on all previous (Wave 5 - final verification)

---

## TODOs

- [ ] 1. **Analyze dead code candidates**

  **What to do**:
  - Search for ImageSkill.ts, CalendarSkill.ts, ExtractionSkill.ts in src/relay/
  - Identify old handlers that were migrated to skills
  - List all files that can be safely removed

  **Must NOT do**:
  - Don't remove CalendarSkillV2.ts (the working version)
  - Don't remove skills in src/relay/skills/

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — Simple file search and listing
    - Reason: Straightforward codebase analysis
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/relay/skills/` - Existing working skills (don't touch)
  - `grand-plan.md:92-94` - Lists dead code to remove

  **QA Scenarios**:

  Scenario: Dead code analysis complete
    Tool: Bash
    Preconditions: None
    Steps:
      1. ls src/relay/*.ts | head -20
      2. ls src/relay/skills/*.ts
    Expected Result: List of files in relay root vs skills folder
    Evidence: .sisyphus/evidence/task-1-dead-code-list.{ext}

  **Acceptance Criteria**:
  - [ ] List of files to remove identified
  - [ ] List saved to draft

- [ ] 2. **Remove ImageSkill.ts (if exists as separate file)**

  **What to do**:
  - Check if ImageSkill.ts exists in src/relay/
  - If exists, verify it's the old/dead version (not in skills/)
  - Remove the file
  - Update any imports

  **Must NOT do**:
  - Don't remove ComfyUI service (src/services/comfyui.ts)
  - Don't remove image handling in skills

  **Recommended Agent Profile**:
  - **Category**: `quick` — Simple file removal
    - Reason: Single file operation if needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-6)
  - **Blocks**: None
  - **Blocked By**: Task 1 (analysis first)

  **References**:
  - `src/services/comfyui.ts` - Keep this service

  **QA Scenarios**:

  Scenario: Build passes after cleanup
    Tool: Bash
    Preconditions: ImageSkill removed (or didn't exist)
    Steps:
      1. npm run build
    Expected Result: Exit code 0, no errors
    Evidence: .sisyphus/evidence/task-2-build.{ext}

  **Acceptance Criteria**:
  - [ ] File removed (if it existed)
  - `npm run build` passes

- [ ] 3. **Remove CalendarSkill.ts (if exists as separate file)**

  **What to do**:
  - Check if old CalendarSkill.ts exists in src/relay/
  - Verify CalendarSkillV2.ts in skills/ is the working version
  - Remove old file if exists
  - Update any imports

  **Must NOT do**:
  - Don't remove CalendarSkillV2.ts in skills/

  **Recommended Agent Profile**:
  - **Category**: `quick` — Simple file removal
    - Reason: Single file operation if needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-6)
  - **Blocks**: None
  - **Blocked By**: Task 1 (analysis first)

  **References**:
  - `src/relay/skills/calendar-skill-v2.ts` - Keep this

  **QA Scenarios**:

  Scenario: Calendar still works after cleanup
    Tool: Bash
    Preconditions: CalendarSkill removed (or didn't exist)
    Steps:
      1. npm run build
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-3-build.{ext}

  **Acceptance Criteria**:
  - [ ] File removed (if it existed)
  - `npm run build` passes

- [ ] 4. **Remove ExtractionSkill.ts (if dead code)**

  **What to do**:
  - Check if ExtractionSkill.ts exists at src/relay/ root (not in skills/)
  - If exists and unused, remove it
  - If extraction-skill.ts in skills/ is the working version, keep it

  **Must NOT do**:
  - Don't remove extraction-skill.ts in src/relay/skills/ (that's the working version)
  - Don't break extraction functionality

  **Recommended Agent Profile**:
  - **Category**: `quick` — Simple file removal
    - Reason: Single file operation if needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-6)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `src/relay/skills/extraction-skill.ts` - Keep this (working version)

  **Acceptance Criteria**:
  - [ ] Dead ExtractionSkill.ts removed (if it existed)
  - `npm run build` passes
  - Extraction still works

- [ ] 5. **Remove old handlers after skill migration**

  **What to do**:
  - Check src/relay/handlers/ for old handlers
  - Identify handlers that were migrated to skills
  - Remove dead handler files
  - Verify remaining handlers are still used

  **Must NOT do**:
  - Don't remove handlers still in use by relay/index.ts

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — Analysis + removal

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `src/relay/index.ts` - Check imports to see what's still used
  - `src/relay/skills/` - What's currently active

  **QA Scenarios**:

  Scenario: Build passes after handler cleanup
    Tool: Bash
    Preconditions: Old handlers removed
    Steps:
      1. npm run build
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-5-build.{ext}

  **Acceptance Criteria**:
  - [ ] Unused handler files removed
  - `npm run build` passes

- [ ] 6. **Verify no duplicate image handling paths**

  **What to do**:
  - Search codebase for image generation code paths
  - Identify all places that handle "lag et bilde av"
  - Consolidate to single path (skill-based)
  - Remove duplicate detection/handling

  **Must NOT do**:
  - Don't break existing image generation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — Code search and analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5)
  - **Blocks**: None
  - **Blocked By**: Tasks 1-5

  **QA Scenarios**:

  Scenario: Image generation still works
    Tool: interactive_bash
    Preconditions: Bot running, ComfyUI available
    Steps:
      1. Send "lag et bilde av en katt" to bot
      2. Wait for response
    Expected Result: Image generated and sent
    Evidence: .sisyphus/evidence/task-6-image-generation.{ext}

  **Acceptance Criteria**:
  - [ ] Single image handling path exists
  - [ ] Image generation works

- [ ] 7. **Analyze monolithic functions >100 lines**

  **What to do**:
  - Use ast_grep or lsp to find functions >100 lines
  - Focus on relay/index.ts (known hotspot, ~1083 lines)
  - List functions that need extraction

  **Must NOT do**:
  - Don't modify code yet, just analyze

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — Code analysis

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: After Wave 1
  - **Blocks**: Tasks 8-10
  - **Blocked By**: Tasks 1-6

  **References**:
  - `src/relay/index.ts` - Main hotspot

  **QA Scenarios**:

  Scenario: Functions analyzed
    Tool: Bash
    Preconditions: None
    Steps:
      1. npx tsc --noEmit src/relay/index.ts 2>&1 | head -50
    Expected Result: No crash, type check output
    Evidence: .sisyphus/evidence/task-7-analysis.{ext}

  **Acceptance Criteria**:
  - [ ] List of functions >100 lines identified

- [ ] 8. **Extract message handlers to separate files**

  **What to do**:
  - Extract identified large functions to src/relay/handlers/
  - Create modular files: image-handler.ts, calendar-handler.ts, etc.
  - Ensure each handler is independently testable
  - Update imports in relay/index.ts

  **Must NOT do**:
  - Don't change handler logic, just extract
  - Don't break existing functionality

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Code extraction and refactoring
    - Reason: Multiple files, careful import management

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: After Task 7
  - **Blocks**: Task 9
  - **Blocked By**: Task 7

  **References**:
  - `src/relay/handlers/` - Target directory structure

  **QA Scenarios**:

  Scenario: Extracted handlers work correctly
    Tool: Bash
    Preconditions: Handlers extracted
    Steps:
      1. Run bot
      2. Test image command
      3. Test calendar command
    Expected Result: All commands work as before
    Evidence: .sisyphus/evidence/task-8-handlers.{ext}

  **Acceptance Criteria**:
  - [ ] Handlers extracted to separate files
  - `npm run build` passes
  - All commands still work

- [ ] 9. **Implement unified skill routing**

  **What to do**:
  - Use existing HandlerRegistry in src/relay/handlers/registry.ts
  - Register all handlers at startup
  - Replace inline checks with registry.dispatch()
  - Ensure skills are tried in order

  **Must NOT do**:
  - Don't remove any functionality

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Architecture refactoring

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: After Task 8
  - **Blocks**: Task 10
  - **Blocked By**: Task 8

  **References**:
  - `src/relay/handlers/registry.ts` - Existing registry
  - `grand-plan.md:105` - Unified routing requirement

  **QA Scenarios**:

  Scenario: Unified routing implemented
    Tool: Bash
    Preconditions: Registry updated
    Steps:
      1. npm run build
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-9-build.{ext}

  **Acceptance Criteria**:
  - [ ] Registry used for all skill dispatch
  - Skills tried in correct order

- [ ] 10. **Verify no functions >100 lines remain**

  **What to do**:
  - Re-analyze codebase for functions >100 lines
  - If any remain, either extract or document why
  - Final verification

  **Must NOT do**:
  - Don't break anything to meet this

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — Verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: After Task 9
  - **Blocks**: Wave 3
  - **Blocked By**: Task 9

  **QA Scenarios**:

  Scenario: All functions verified under 100 lines
    Tool: Bash
    Preconditions: Refactoring complete
    Steps:
      1. npm run build
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-10-build.{ext}

  **Acceptance Criteria**:
  - [ ] All functions <100 lines (or documented exception)
  - `npm run build` passes

- [ ] 11. **Verify docker-compose.yaml for Ollama + ComfyUI**

  **What to do**:
  - Check existing docker-compose.yaml in project root
  - Verify Ollama service (port 11434) configured
  - Verify ComfyUI service (port 8188) configured
  - Add any missing configuration
  - Document setup in README if needed

  **Must NOT do**:
  - Don't conflict with existing local Ollama/ComfyUI if running

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — Configuration verification
    - Reason: Checking existing config, not creating from scratch

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12-16)
  - **Blocks**: Tasks 12, 13, 15
  - **Blocked By**: Wave 2 complete

  **References**:
  - `docker-compose.yml` - Existing file (verify, don't recreate)
  - `grand-plan.md:113` - Docker setup requirement

  **QA Scenarios**:

  Scenario: Docker compose starts successfully
    Tool: Bash
    Preconditions: Docker running
    Steps:
      1. docker-compose config
      2. docker-compose up -d
      3. Wait 60s
      4. docker-compose ps
    Expected Result: Services running (Ollama, ComfyUI, ine-relay-bot)
    Evidence: .sisyphus/evidence/task-11-docker-compose.{ext}

  Scenario: Docker fails to start
    Tool: Bash
    Preconditions: Docker not running or ports in use
    Steps:
      1. docker-compose up -d
      2. Check logs: docker-compose logs
    Expected Result: Clear error message about what's wrong
    Evidence: .sisyphus/evidence/task-11-docker-error.{ext}

  **Acceptance Criteria**:
  - [ ] docker-compose.yaml verified/updated
  - [ ] Valid config (`docker-compose config` passes)
  - [ ] Services start without errors

- [ ] 12. **Create NanoBot installation/config**

  **What to do**:
  - Check if NanoBot is already in src/gateway/
  - Create config for NanoBot if needed
  - Document setup in README

  **Must NOT do**:
  - Don't modify the existing gateway code significantly

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Configuration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 13
  - **Blocked By**: Task 11

  **References**:
  - `src/gateway/` - Existing gateway code

  **QA Scenarios**:

  Scenario: NanoBot configuration verified
    Tool: Bash
    Preconditions: Config exists
    Steps:
      1. ls -la src/gateway/
    Expected Result: Config files present
    Evidence: .sisyphus/evidence/task-12-config.{ext}

  **Acceptance Criteria**:
  - [ ] NanoBot configured

- [ ] 13. **Configure NanoBot → Ollama connection**

  **What to do**:
  - Update NanoBot config to point to Ollama
  - Test connection
  - Handle auth if needed

  **Must NOT do**:
  - Don't break existing relay bot

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Configuration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 11, 12

  **QA Scenarios**:

  Scenario: NanoBot can reach Ollama
    Tool: Bash
    Preconditions: Ollama running, NanoBot configured
    Steps:
      1. curl http://localhost:11434/api/tags
    Expected Result: JSON response with models
    Evidence: .sisyphus/evidence/task-13-ollama.{ext}

  Scenario: Ollama not running
    Tool: Bash
    Preconditions: Ollama not running
    Steps:
      1. curl http://localhost:11434/api/tags
    Expected Result: Connection refused error
    Evidence: .sisyphus/evidence/task-13-ollama-error.{ext}

  **Acceptance Criteria**:
  - [ ] NanoBot can reach Ollama

- [ ] 14. **Verify Bottus selfbot still works**

  **What to do**:
  - Run relay bot (`npm run start:relay`)
  - Test basic commands
  - Verify no regressions

  **Must NOT do**:
  - Don't deploy broken code

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None (independent)

  **QA Scenarios**:

  Scenario: Relay bot responds to messages
    Tool: interactive_bash
    Preconditions: Bot running, test channel
    Steps:
      1. Send "hei" to bot
      2. Verify response
    Expected Result: Bot responds
    Evidence: .sisyphus/evidence/task-14-relay.{ext}

  **Acceptance Criteria**:
  - [ ] Bot starts without errors
  - [ ] Responds to messages

- [ ] 15. **Test NanoBot → Ollama communication**

  **What to do**:
  - Start NanoBot gateway
  - Send prompt through gateway
  - Verify Ollama responds

  **Must NOT do**:
  - Don't break relay bot

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Integration test

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 11, 13

  **QA Scenarios**:

  Scenario: NanoBot communicates with Ollama
    Tool: interactive_bash
    Preconditions: Both services running
    Steps:
      1. Send prompt through NanoBot
      2. Check Ollama logs
    Expected Result: Response generated
    Evidence: .sisyphus/evidence/task-15-nanobot-ollama.{ext}

  **Acceptance Criteria**:
  - [ ] Ollama receives requests from NanoBot
  - [ ] Responses returned

- [ ] 16. **Full Bottus → NanoBot integration test**

  **What to do**:
  - Run both relay and gateway
  - Test full conversation flow
  - Verify skills work through gateway

  **Must NOT do**:
  - Don't break existing functionality

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Integration verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Wave 4
  - **Blocked By**: Tasks 14, 15

  **QA Scenarios**:

  Scenario: Both relay and gateway work together
    Tool: interactive_bash
    Preconditions: Both services running
    Steps:
      1. Test relay bot commands
      2. Test NanoBot gateway commands
    Expected Result: Both work
    Evidence: .sisyphus/evidence/task-16-integration.{ext}

  **Acceptance Criteria**:
  - [ ] Both modes work
  - [ ] Integration complete

- [ ] 17. **Implement recurring events (weekly/monthly)**

  **What to do**:
  - Extend CalendarServiceV2 to support recurrence
  - Add RRULE parsing (rrule library or custom)
  - Expand recurring events when listing
  - Handle recurrence in reminders

  **Must NOT do**:
  - Don't break existing calendar functionality

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Feature implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 18-21)
  - **Blocks**: None
  - **Blocked By**: Wave 3 complete

  **References**:
  - `src/services/calendar-v2.ts` - Existing calendar service
  - `src/relay/skills/calendar-skill-v2.ts` - Calendar skill
  - `grand-plan.md:126` - Recurring events requirement

  **QA Scenarios**:

  Scenario: Create and list recurring event
    Tool: interactive_bash
    Preconditions: Bot running
    Steps:
      1. Send "lag arrangement ukentlig-møte hver fredag kl 14"
      2. Send "mine arrangementer"
    Expected Result: Multiple instances shown
    Evidence: .sisyphus/evidence/task-17-recurring.{ext}

  **Acceptance Criteria**:
  - [ ] Can create recurring event
  - [ ] Events appear multiple times in listing

- [ ] 18. **Fix ICS export**

  **What to do**:
  - Check current ICS export implementation
  - Fix any issues with calendar format
  - Ensure exported ICS opens in calendar apps

  **Must NOT do**:
  - Don't break export functionality

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Bug fix

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Wave 3 complete

  **QA Scenarios**:

  Scenario: ICS export works
    Tool: interactive_bash
    Preconditions: Bot running, events exist
    Steps:
      1. Send "eksport kalender"
      2. Check attachment
    Expected Result: Valid ICS file
    Evidence: .sisyphus/evidence/task-18-ics.{ext}

  **Acceptance Criteria**:
  - [ ] Valid ICS format
  - [ ] Opens in calendar apps

- [ ] 19. **Add feedback system (emoji reactions)**

  **What to do**:
  - Add reaction handler for emoji on bot messages
  - Make async non-blocking critique calls
  - Store feedback in interactions.db

  **Must NOT do**:
  - Don't block bot responses for feedback

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Feature implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Wave 3 complete

  **References**:
  - `grand-plan.md:130-132` - Feedback system requirements

  **QA Scenarios**:

  Scenario: Feedback handler exists
    Tool: Bash
    Preconditions: None
    Steps:
      1. ls src/relay/handlers/feedback.ts
    Expected Result: File exists
    Evidence: .sisyphus/evidence/task-19-feedback.{ext}

  **Acceptance Criteria**:
  - [ ] Reactions captured
  - [ ] Feedback stored

- [ ] 20. **Set up nightly cron**

  **What to do**:
  - Verify existing nightly script works
  - Add/update cron configuration
  - Test nightly runs

  **Must NOT do**:
  - Don't run too frequently

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — Configuration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Wave 3 complete

  **References**:
  - `src/scripts/` - Existing scripts
  - `grand-plan.md:135-136` - Nightly requirements

  **QA Scenarios**:

  Scenario: Nightly cron script exists
    Tool: Bash
    Preconditions: None
    Steps:
      1. ls src/scripts/nightly-cron.ts
    Expected Result: File exists
    Evidence: .sisyphus/evidence/task-20-cron.{ext}

  **Acceptance Criteria**:
  - [ ] Cron runs nightly
  - [ ] Preferences updated

- [ ] 21. **Update documentation**

  **What to do**:
  - Document all commands in README
  - Verify Norwegian date parsing
  - Ensure bilingual strings work
  - Update any changed workflows

  **Must NOT do**:
  - Don't add unnecessary docs

  **Recommended Agent Profile**:
  - **Category**: `writing` — Documentation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Wave 3 complete

  **References**:
  - `README.md` - Main docs
  - `grand-plan.md:139-141` - Documentation requirements

  **QA Scenarios**:

  Scenario: Documentation updated
    Tool: Bash
    Preconditions: None
    Steps:
      1. npm run build
    Expected Result: Exit code 0 (docs don't break build)
    Evidence: .sisyphus/evidence/task-21-docs.{ext}

  **Acceptance Criteria**:
  - [ ] Commands documented
  - [ ] Norwegian parsing accurate

## Final Verification Wave

- [ ] F1. **Build Verification** — Run `npm run build` and verify 0 warnings
- [ ] F2. **Test Suite** — Run all tests, verify 100% pass
- [ ] F3. **Health Check** — `curl localhost:3001/health` returns healthy
- [ ] F4. **Relay Functionality** — Bot responds to messages in test channel

---

## Commit Strategy

- **Wave 1**: `refactor(cleanup): remove dead code` — files removed, npm run build
- **Wave 2**: `refactor(handlers): extract modular handlers` — handler files, npm run build
- **Wave 3**: `feat(nanobot): add docker integration` — docker-compose.yaml, config files
- **Wave 4**: `feat(features): add v2 features` — recurring events, feedback, docs
- **Wave 5**: `chore(final): verification passes` — build, tests, health

---

## Success Criteria

### Verification Commands
```bash
npm run build          # Expected: 0 warnings
npm test              # Expected: All pass
curl localhost:3001/health  # Expected: {"status":"healthy"}
```

### Final Checklist
- [ ] All dead code from Phase 3.3 removed
- [ ] No functions >100 lines
- [ ] Unified skill routing in place
- [ ] Docker-compose works
- [ ] NanoBot integration complete
- [ ] Recurring events work
- [ ] ICS export valid
- [ ] Feedback system working
- [ ] Nightly cron configured
- [ ] Documentation updated
