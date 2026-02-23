# Plan: Friendlier Bot Tone (Per-User Tone)

## TL;DR
- Implement per-user tone preferences to tailor responses in both the main bot and the relay.
- Tone will be friendlier, warm, empathetic, with light humor and strong Norwegian emphasis, while preserving accuracy.
- Emojis are allowed; language mix (Norwegian primary, English secondary) maintained.
- Deliver as a single auditable plan file.

## Context
- Current bot replies are functionally correct but feel mechanical.
- We want per-user personalization so each user gets a tailored tone.
- Apply tone consistently across calendar, memory, RSVP, polls, and other features.

## Work Objectives
- Core objective: On every reply, format output using a per-user tone profile.
- Persist per-user tone preferences (default if none) and apply consistently.
- Maintain bilingual support and ensure tone does not degrade data clarity/accuracy.
- Provide graceful fallbacks if tone data is missing.

### Guardrails / Constraints
- Do not obscure data or confuse the user with tone changes.
- Avoid aggressive humor; prefer warmth and clarity.
- Emojis are allowed broadly; ensure readability.
- Tone must be testable via agent-executed QA scenarios.

## Data Model (High-Level)
- Table: user_tone
  - user_id TEXT PRIMARY KEY
  - tone TEXT
  - language TEXT

- Tone service: a lightweight formatter that applies tone to base text (and optionally embeds).

## Tone Rules (Summary)
- Greeting: friendly, personal when possible (e.g., Hei, <name>!)
- Acknowledgement: quick, friendly acknowledgement of user intent
- Clarifying questions: gentle prompts if data missing
- Offers: 2-3 clear options with light humor
- Wrap-up: friendly recap and invitation to continue
- Language: nb-NO default with English fallback in bilingual flows
- Emojis: contextual and tasteful, but not overused
- Humor: tasteful, subtle, not distracting

## Acceptance Criteria (High-Level)
- [Must Have] Per-user tone stored and retrievable for flows
- [Must Have] All flows apply tone in responses
- [Must Have] QA scenarios cover nb-NO flows across 2 flows
- [Must Have] Non-blocking and safe fallbacks when tone data is missing
- [Must Have] No degradation of data or core functionality

## Verification Strategy
- Agent-executed QA for Calendar, Memory, RSVP, Polls in nb-NO
- Validate tone consistency and readability
- Confirm no data loss

-## Execution Strategy (Waves)
- Wave 1: Data model outline and ToneService interface (conceptual)
- Wave 2: Apply tone to 2 flows (Calendar, Memory) with tests
- Wave 3: Extend to all flows and language checks
- Phase 4: Integrate tone into flows (Calendar, Memory, RSVP, Polls)
- Phase 5: QA scenarios (nb-NO + bilingual), then deployment

## Final Verification Wave
- All flows are tone-complete with no regressions
- 100% bilingual coverage
- No regressions in core features

## Notable Decisions
- Default tone chosen: friendly_nb with Norwegian emphasis
- Emoji usage policy: broad but context-aware

-## Plan Lifecycle
- Owner: [Your Name]
- Drafts: .sisyphus/drafts/friendlier-bot-tone.md (notes from discovery)
- Plan: .sisyphus/plans/friendlier-bot-tone.md (final plan)

## NB-NO Policy (Norwegian-first)
- Default language: NB-NO
- Per-user language override stored in user_tone.language
- Main output NB-NO; light English only if necessary for clarity
- Emoji usage: allowed everywhere, kept tasteful
- Greeting/closing/clarifications NB-NO-first with bilingual allowances
