## Plan: Appointment vs Memo Routing with AI_STYLE control

## TL;DR
> Summary: Introduce a centralized PlanRouter to route extraction results to calendar events or memories, and add an AI_STYLE env toggle to influence response style. The plan also proposes an optional per-user style override in the future. 
> Deliverables: 1) PlanRouter in relay, 2) AI_STYLE integration, 3) basic tests, 4) documentation. 
> Effort: Large
> Parallel: YES - multi-wave plan
> Critical Path: PlanRouter → AI_STYLE integration → tests & docs

## Context
### Original Request
- Improve bot decision between creating an appointment (calendar event) or remembering a memo/memory, and adjust thinking style so responses feel human, not overly process-heavy.
### Interview Summary
- Current routing is implicit via multiple services; a centralized router is not present. System prompts guide tone but do not expose chain-of-thought. 
### Metis Review (gaps addressed)
- No centralized routing; need explicit decisioned flow and safe defaults for style.

## Work Objectives
### Core Objective
- Create a single routing entity (PlanRouter) to map extraction results to either CalendarService or MemoryService, with pluggable styling via AI_STYLE.
### Deliverables
- PlanRouter module in src/relay/index.ts path, updated prompt construction, and tests.
- AI_STYLE env var integration in AIService with defaulting and a concise/balanced/verbose spectrum.
- Optional per-user style override scaffolding in the DB layer (future work).
### Definition of Done
- PlanRouter exists, accepts Extraction outputs, and dispatches concrete tasks to the right services.
- AI_STYLE is read from env and influences systemPrompt to reduce hedging; tests verify prompt length or presence of style tag.
- All existing flows continue to pass existing unit tests.

## Must Have
- Central routing path for appointment vs memo decisions.
- Safe, minimal changes to AI prompts.
- Tests that cover routing decisions.

## Must NOT Have
- No breaking changes to OAuth or Google API integration.
- No exposure of internal chain-of-thought in user responses.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision routing with sample Extraction outputs (appointment vs memo).
- Verify prompts are adjusted when AI_STYLE env var is toggled.
- End-to-end check that scheduling creates Google Calendar events and memos write to memory store.
- Evidence: .sisyphus/evidence/task-ROUTER-1.md

## Execution Strategy
### Parallel Execution Waves
- Wave 1: Implement PlanRouter skeleton and AI_STYLE wiring (2 tasks)
- Wave 2: Add unit tests and small integration tests (2 tasks)
- Wave 3: Documentation and rollout plan (1 task)

### Dependency Matrix
- Requires: MemoryService, CalendarService, ExtractionService, AIService, DB layer

### Agent Dispatch Summary
- Wave 1: PlanRouter task (Category: quick), AI_STYLE task (Category: quick)

## TODOs
- [ ] N. Implement PlanRouter in src/relay/index.ts and wire to route Extraction outputs to CalendarService or MemoryService.
  - What to implement: a single function PlanRouter.extractAndDispatch(extraction, context) that returns a concrete set of tasks for the Plan queue and triggers the appropriate services.
  - Acceptance Criteria: (a) given an extraction indicating an event, CalendarService.createEvent is invoked with correct payload; (b) given a memory extraction, MemoryService.store is invoked and memoryDb updated; (c) the router returns a non-empty list of plan actions.
- [ ] N. Add AI_STYLE env var handling in src/services/ai.ts; adjust systemPrompt accordingly.
  - Action: read process.env.AI_STYLE (default: balanced) and adjust a new variable aiStyle that influences the systemPrompt length and the explicitness of follow-ups.
  - Acceptance Criteria: prompts generated with concise style are shorter than 20% of current baseline and contain no extra hedging language; balanced retains current behavior.
- [ ] N. Add 2 small tests: one for routing events, one for memos, plus a prompt style check.
  - Tests: (a) mock Extraction results for event and memo and assert correct service invocation; (b) mock AI_STYLE toggles and verify prompt length/features; (c) smoke test that plan router returns plan actions.
- [ ] N. Document how to adjust AI_STYLE in production and how to revert.
  - Deliverable: updated README snippet or AGENTS note with env var usage and restart instructions.
- [ ] N. Optional: Add per-user style override scaffold in DB for future feature.
  - Outline: a minimal table in db/index.ts and getter/setter in ToneService to apply style if present; not wired into production immediately.

## References
- src/services/calendar.ts, src/services/memory.ts, src/services/extraction.ts, src/db/index.ts, src/relay/discord.ts, src/relay/index.ts, src/services/ai.ts
