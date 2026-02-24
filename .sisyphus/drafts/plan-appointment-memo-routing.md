# Draft: Appointment vs Memo Routing Plan

## Requirements (confirmed)
- The bot should determine, for user messages, whether to create a Google Calendar appointment (calendar event) or to store a memo/memory in persistent storage. 
- Introduce a centralized routing point that maps extraction results to the correct domain store (CalendarService or MemoryService) and surfaces concrete actions as plan items.
- Add a safe, minimal change to control response style without mutating runtime behavior by default (see AI_STYLE toggle).
- Maintain human-friendly but concise prompts and avoid exposing internal chain-of-thought in user-facing responses.

## Technical Decisions
- Decision 1: Implement a PlanRouter in src/relay/index.ts (central routing hub)
  - Rationale: A single decision point reduces drift between days/weeks and ensures consistent behavior for appointments vs memos across channels.
  - Outcome: Wire the router so that, given an ExtractionService result, it dispatches to either CalendarService (createEvent) or MemoryService (store) and returns a concrete plan task to the user or the bot pipeline.
- Decision 2: Add an environment/config switch AI_STYLE with values {concise, balanced, verbose} and default balanced
  - Rationale: Controls how much “thinking-like” content is produced in prompts, while keeping the system prompt intact for explainability.
- Decision 3: Optional per-user style override storage (e.g., in tone/memory DB) to customize style, if desired in future iterations
  - Rationale: Enables more granular UX without changing the default behavior for all users.

## Research Findings
- Current modules involved in calendar/memo flow: 
  - src/services/calendar.ts (Google Calendar integration)
  - src/services/calendar-display.ts and calendar-renderer.ts (calendar rendering)
  - src/services/reminders.ts (reminder polling)
  - src/services/memory.ts (memory API)
  - src/db/index.ts (data stores like eventDb, memoryDb, tokenDb)
  - src/relay/discord.ts and src/relay/index.ts (relay/prompt construction and memory flow)
- There is no existing central PlanRouter; routing is implicit via separate service calls in relay/AI prompts.
- The AI prompts are produced by src/services/ai.ts with a system prompt that emphasizes helpfulness and clarity, not chain-of-thought disclosure.

## Open Questions
- How should a mixed message be handled if a user request contains both an appointment and a memo in one utterance?
- What exact criteria map an extraction result to a calendar event versus a memory store (keywords, confidence scores, or user intent markers)?
- Do we want to expose a user-facing option to toggle AI_STYLE on a per-session basis or rely on a global env var?

## Scope Boundaries
- IN: Add PlanRouter in relay/index.ts; add AI_STYLE env var integration in ai.ts; add an optional per-user style override placeholder.
- OUT: No changes to OAuth flows, Google API scopes, or database schema; no UI components; no large refactors outside the relay/AI routing path.

## Plan Outline (Next Steps)
- Implement PlanRouter (src/relay/index.ts):
  - Input: Extraction results (from ExtractionService) and current user/channel context.
  - Output: Concrete plan items in the format used by .sisyphus/plans.md (one plan includes tasks to create a calendar event or store a memory).
- Add AI_STYLE integration in src/services/ai.ts:
  - Read process.env.AI_STYLE; default to balanced.
  - Adjust the system prompt to request concise responses when AI_STYLE=concise and allow occasional clarifications when balanced/verbose.
- Optional: Add per-user style override table in src/db/index.ts and a tiny getter/setter in ToneService to apply the style.

## Acceptance Criteria
- A single, centralized routing path exists that can map an Extraction result to either CalendarService or MemoryService with explicit plan tasks.
- AI_STYLE env var exists and toggling it changes at least the length of responses and the frequency of clarifications without exposing chain-of-thought.
- All existing tests (Vitest) continue to pass with no behavior regressions.

## References
- Current modules for calendar/memo flow: CalendarService, MemoryService, ExtractionService, Relay, AI Service, DB layer.

Next action: confirm if you want me to implement PlanRouter and AI_STYLE integration, and whether to add the per-user style toggle. Also, please specify the default AI_STYLE you prefer (concise, balanced, verbose).
