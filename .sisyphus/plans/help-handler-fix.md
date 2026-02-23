# HelpHandler Fix + Skill Testing Work Plan

## TL;DR

> **Quick Summary**: Fix HelpHandler not triggering in the NanoClaw Gateway by resolving context type mismatch, and add automated skill unit tests using Vitest.
> 
> **Deliverables**:
> - HelpHandler triggers correctly on "help", "hvem er du", etc.
> - 2-3 skill unit tests (CalendarSkill, MemorySkill)
> - Test infrastructure verified via `npm test`
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Verify invocation → Fix context → Add tests → Verify E2E

---

## Context

### Original Request
User reported: HelpHandler.canHandle returns false, debug logs never appear. Also requested automated testing to avoid constantly sending prompts to Inebotten.

### Interview Summary
**Key Discussions**:
- HelpHandler implemented in `src/relay/handlers/help.ts` with rich content
- Gateway uses `SkillDispatcher` in `src/gateway/dispatcher.js`
- Two context types exist: `HandlerContext` (relay) and `GatewayContext` (gateway)
- Vitest test framework exists but no skill unit tests

**Research Findings**:
- NanoClaw uses SKILL.md with YAML frontmatter for natural language triggers
- TypeScript class approach (your implementation) is more testable than prompt-based
- Root cause: context type mismatch causes silent exception

### Metis Review
**Identified Gaps** (addressed):
- Need to verify WHICH dispatcher is failing (relay vs gateway) - added investigation task
- CalendarSkill uses Norwegian patterns - tests must use Norwegian strings
- ExtractionSkill requires ctx.extraction mock - skip for unit tests, too complex

---

## Work Objectives

### Core Objective
1. Fix HelpHandler not triggering (context type mismatch)
2. Add automated skill unit tests

### Concrete Deliverables
- HelpHandler responds to help commands via gateway
- 2-3 skill unit tests (CalendarSkill, MemorySkill prioritized)
- All tests pass via `npm test`

### Definition of Done
- [ ] HelpHandler triggers on "help", "hvem er du", "commands"
- [ ] CalendarSkill tests pass (Norwegian patterns)
- [ ] MemorySkill tests pass
- [ ] npm test passes

### Must Have
- HelpHandler triggers and responds
- At least 2 skill unit tests added

### Must NOT Have (Guardrails)
- No new npm dependencies
- No skill interface changes (breaking)
- No registry refactoring
- No Ollama/ComfyUI client changes

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: YES - Tests-after (adding to existing)
- **Framework**: vitest
- **QA Policy**: Agent-executed via `npm test`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Investigation - independent):
├── Task 1: Verify HelpHandler invocation path [quick]
└── Task 2: Fix context type mismatch [deep]

Wave 2 (Testing + Verification - parallel):
├── Task 3: Add CalendarSkill unit tests [quick]
├── Task 4: Add MemorySkill unit tests [quick]
└── Task 5: E2E verification [quick]
```

### Dependency Matrix
- 1: — — 2
- 2: 1 — 3, 4, 5
- 3: 2 — 
- 4: 2 — 
- 5: 2 —

---

## TODOs

- [ ] 1. Verify HelpHandler invocation path

  **What to do**:
  - Add console.log at HelpHandler.canHandle entry in src/relay/handlers/help.ts
  - Start gateway: `npm run start:gateway`
  - Send "help" or "hvem er du" to bot in Discord
  - Check console for "[Relay] HelpHandler canHandle:" log entry
  - If log appears → context type issue confirmed
  - If log absent → dispatcher isn't invoking HelpHandler

  **Must NOT do**:
  - Don't modify skill interfaces
  - Don't add new dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple debugging task, clear reproduction steps
  - **Skills**: []

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 1
  - Blocks: Task 2
  - Blocked By: None

  **References**:
  - `src/relay/handlers/help.ts:126` - HelpHandler.canHandle entry point
  - `src/gateway/run.ts:25-31` - Where HelpHandler is registered

  **Acceptance Criteria**:
  - [ ] Console shows "[Relay] HelpHandler canHandle:" log entry when help command sent

  **QA Scenarios**:

  Scenario: HelpHandler canHandle is invoked
    Tool: Bash
    Preconditions: Gateway running, bot connected
    Steps:
      1. Send message "@inebotten help" in Discord
      2. Check terminal console output
    Expected Result: Log line appears
    Evidence: .sisyphus/evidence/task-1-help-handler-invoked.log

- [ ] 2. Fix context type mismatch

  **What to do**:
  - Analyze context type difference:
    - HandlerContext: { message, userId, channelId, discord }
    - GatewayContext: { message, discord, memory, ollama, extraction }
  - Option A: Make HelpHandler work with GatewayContext (preferred)
  - Option B: Create context adapter in SkillAdapter
  - Implement fix and verify HelpHandler returns true

  **Must NOT do**:
  - Don't change skill interface contracts
  - Don't modify other handlers

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding type relationships
  - **Skills**: []

  **Parallelization**:
  - Can Run In Parallel: NO
  - Parallel Group: Wave 1
  - Blocks: Tasks 3, 4, 5
  - Blocked By: Task 1

  **References**:
  - `src/relay/handlers/interfaces.ts:6-11` - HandlerContext
  - `src/gateway/interfaces.ts:18-25` - GatewayContext
  - `src/gateway/adapters.js:6-9` - SkillAdapter

  **Acceptance Criteria**:
  - [ ] HelpHandler.canHandle returns true for "help"
  - [ ] HelpHandler.handle executes without errors

  **QA Scenarios**:

  Scenario: HelpHandler triggers on "help"
    Tool: Bash
    Preconditions: Gateway running
    Steps:
      1. Send "@inebotten help" in Discord
      2. Wait for response
    Expected Result: Bot responds with help text
    Evidence: .sisyphus/evidence/task-2-help-response.txt

  Scenario: HelpHandler triggers on "hvem er du"
    Tool: Bash
    Preconditions: Gateway running
    Steps:
      1. Send "@inebotten hvem er du" in Discord
    Expected Result: Bot responds with identity text
    Evidence: .sisyphus/evidence/task-2-identity-response.txt

- [ ] 3. Add CalendarSkill unit tests

  **What to do**:
  - Create tests/gateway/calendar-skill.test.ts
  - Test canHandle with Norwegian: "hva skjer i dag", "kalender", "avtale"
  - Test canHandle returns false for non-calendar

  **Must NOT do**:
  - Don't test against real Ollama/ComfyUI

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 2
  - Blocked By: Task 2

  **References**:
  - `src/relay/skills/calendar-skill.ts`
  - `tests/relay/discord.test.ts` - test pattern

  **Acceptance Criteria**:
  - [ ] File created at tests/gateway/calendar-skill.test.ts
  - [ ] npm test passes

- [ ] 4. Add MemorySkill unit tests

  **What to do**:
  - Create tests/gateway/memory-skill.test.ts
  - Test canHandle: "husk at", "hva husker du", "remember"

  **Must NOT do**:
  - Don't test against real SQLite

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 2
  - Blocked By: Task 2

  **References**:
  - `src/relay/skills/memory-skill.ts`

  **Acceptance Criteria**:
  - [ ] File created at tests/gateway/memory-skill.test.ts
  - [ ] npm test passes

- [ ] 5. E2E verification

  **What to do**:
  - Trigger help in Discord
  - Verify response
  - Run npm test

  **Acceptance Criteria**:
  - [ ] npm test passes
  - [ ] Help responds in Discord

---

## Final Verification Wave

- [ ] F1. Run `npm test` - all tests pass
- [ ] F2. Manual trigger test - "help" command responds

---

## Commit Strategy

- 1: `fix(gateway): resolve HelpHandler context type mismatch` — help.ts, adapters.js
- 2: `test(skills): add CalendarSkill unit tests` — tests/gateway/calendar-skill.test.ts
- 3: `test(skills): add MemorySkill unit tests` — tests/gateway/memory-skill.test.ts

---

## Success Criteria

```bash
npm test  # Expected: all tests pass, including new skill tests
```
