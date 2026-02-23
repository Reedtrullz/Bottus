# Plan: AI Discord Bot for Group Chat Monitoring

## TL;DR
> Build an AI-assisted Discord bot that monitors group channels and group DMs, extracts dates and commitments, automatically syncs events to Google Calendar, and creates tasks/reminders within Discord. The bot supports an opt-in consent flow via /jeg-samtykker, runs in a Norway-timezone context, and requires two-person approval for changes to its behavior. It will learn tone from participants to improve interaction while prioritizing privacy. MVP focuses on channel reminders, calendar sync, and basic extraction with robust privacy controls.

## Context

- Original request: Create an AI Discord bot that reads messages to manage a calendar and to-do lists based on what it hears. The bot must operate in group channels and a 3-person group DM, auto-manage calendar/todos, and adapt to user tone.
- Key decisions from interview:
- Group DMs enabled; timezone Europe/Oslo; consent via /jeg-samtykker; extraction of dates and agreements; reminders in channel; governance requires two-person approvals for changes; tone-learning capability.

## Work Objectives

- Objective: Deliver MVP that reads messages from server channels and a 3-person group DM, extracts dates and agreements, and creates calendar events and tasks accordingly, with reminders in Discord.
- Deliverables:
- [ ] 1. Consent flow implemented: /jeg-samtykker opt-in in group DM with bot
- [ ] 2. Data model for events, tasks, and tone-adaptive metadata
- [ ] 3. Google Calendar integration for events (OAuth + calendar API wiring)
- [ ] 4. Message ingestion pipeline for server channels and group DM (Discord.js or equivalent)
- [ ] 5. Extraction logic for dates and commitments (rule-based + optional NLP)
- [ ] 6. In-channel reminders and calendar-based reminders
- [ ] 7. Data retention policy enforcement (TTL = 1 hour for raw data; privacy controls)
- [ ] 8. Change governance workflow requiring two approvals
- [ ] 9. Tone learning component to adjust responses (privacy-preserving)
- [ ] 10. MVP test plan and agent-executed QA scenarios

## Definition of Done
- All mandatory features implemented and wired to Google Calendar with a test event flow.
- Opt-in flow operational in group DM.
- Data retention TTL enforced; no long-term storage unless explicitly approved.
- Change proposals require two approvals and a traceable audit.
- Agent-executed QA scenarios pass for happy path and edge cases.

## Must Have (guardrails)
- No reading messages without opt-in; opt-in must be visible and revocable.
- Data retention strictly limited to TTL; sensitive data minimization.
- Two-person approval for any changes to bot behavior.
- Tone-learning must be privacy-conscious and opt-outable.
- Explicit consent revocation flow with data deletion path.
- DM permission verification before relying on group DM access; fallback documented.
- Secure credential storage with rotation and minimal OAuth scopes.
- Per-server/per-user privacy toggles and audit trail for governance.

## Must NOT Have
- Reading DMs with non-consenting users outside scope; no broad telemetry without consent.
- Storing raw messages beyond TTL; no sensitive PII retention.
- Automatic changes to bot configuration without explicit two-signature approvals.

## Verification Strategy (Agent-Executed QA)
- Frontend/UI: Playwright not applicable; Discord bot interactions using API mocks.
- Backend/API: Google Calendar API interactions mocked for unit tests; integration tests with test calendar.
- Logging: evidence saved under .sisyphus/evidence/task-PLAN-N
- Expected test coverage: happy-path extraction and calendar sync; failure mode for missing opt-in; two-sign-off required for change proposals.

## Execution Strategy
- Waves: Parallelizable tasks with clear dependencies; aim for 5-8 tasks per wave.
- Dependencies: Consent flow must be ready before ingestion; calendar integration before test events; two-signature governance in place before enabling config changes.

---

## TODOs

- [ ] 1. Implement consent opt-in flow in group DM: /jeg-samtykker; verify opt-in state per user.
  - **What to do**: Implement a command in group DM that records user opt-in status in a secure store. Ensure the command can be invoked by any participant in the group DM with the bot. Persist per-user consent and allow revocation via a separate command. Provide a confirmation message to the user and log the event for auditability.
  - **Acceptance Criteria**:
    - Command /jeg-samtykker exists and can be invoked in group DM with the bot; returns success for user A.
    - Consent status stored for user A is retrievable and shows as CONSENTED.
    - Revocation flow exists and denies future data processing for user after revocation.
  - **QA Scenarios**:
    - Happy Path: User runs /jeg-samtykker in group DM; bot responds with confirmation; consent status stored.
    - Negative: User revokes consent; bot stops processing messages for that user.
  - **Evidence**: .sisyphus/evidence/task-1-consent.md
- [ ] 1a. DM Permission Verification: Verify Discord bot can access group DM; document fallback if blocked.
  - **What to do**: Test that the bot has the necessary intents and permissions to read messages in a 3-person group DM. If Discord API blocks group DM access, document a fallback strategy (e.g., require users to add bot to a server channel instead).
  - **Acceptance Criteria**:
    - Bot can successfully read messages in group DM when added; or fallback path is documented and functional.
  - **QA Scenarios**:
    - Happy Path: Bot added to group DM and reads messages after opt-in.
    - Negative: Group DM access blocked; fallback to server channel works.
  - **Evidence**: .sisyphus/evidence/task-1a-dm-perms.md
- [ ] 1b. Consent Revocation Flow: Implement explicit /jeg-tilbakekall command for revocation and data deletion.
  - **What to do**: Add a revocation command that deletes user's consent status and triggers data purge for that user's messages. Provide confirmation and audit log.
  - **Acceptance Criteria**:
    - Command /jeg-tilbakekall exists; after execution, consent status is REVOKED and user data is purged per TTL policy.
  - **QA Scenarios**:
    - Happy Path: User runs /jeg-tilbakekall; consent revoked; data deleted.
  - **Evidence**: .sisyphus/evidence/task-1b-revocation.md
- [ ] 2. Design data model: Event, Task, and ToneProfile; define TTL rules.
  - **What to do**: Create a minimal in-memory schema and a persistent store layout for events, tasks, and tone metadata. Define TTL for raw data (1 hour) and retention policy for analytics data. Include indexes for quick lookups by user, channel, date, and type (event/task/consent). Draft TypeScript types or schema definitions (without implementation) and outline API for read/write operations.
  - **Acceptance Criteria**:
    - Data model definitions exist with fields: id, userId, channelId, timestamp, type (enum: event|task|consent), payload, ttl, toneScore (optional).
    - TTL policy documented and conceptually applied in storage logic.
  - **QA Scenarios**:
    - Verify insertion of an event with correct fields; TTL is set.
  - **Evidence**: .sisyphus/evidence/task-2-datamodel.md
- [ ] 2a. Storage Solution: Select and document storage approach (SQLite with encryption); define schema.
  - **What to do**: Evaluate and select a storage solution (SQLite with encryption at rest recommended for MVP). Document schema for Event, Task, Consent, ToneProfile tables. Include encryption approach and access controls.
  - **Acceptance Criteria**:
    - Storage solution selected and documented; schema defined with fields, indexes, and relationships.
    - Encryption approach documented.
  - **QA Scenarios**:
    - Verify schema creation scripts exist and match data model.
  - **Evidence**: .sisyphus/evidence/task-2a-storage.md
- [ ] 3. Implement group DM and channel message ingestion with Discord API permissions checks.
  - **What to do**: Set up listeners for server channels and group DM events; ensure bot has necessary intents and permissions; implement access control to prevent reading messages from unconsented users. Add guardrails to avoid triggering on DMs outside allowed scopes.
  - **Acceptance Criteria**:
    - Bot subscribes to message events in allowed channels and group DMs.
    - Reads messages only when the user has opted in.
    - No crash on missing permissions; proper error logging.
  - **QA Scenarios**:
    - Happy Path: Message in allowed channel is ingested and logged.
    - Negative: Message from non-consented user is ignored with no processing.
  - **Evidence**: .sisyphus/evidence/task-3-ingestion.md
- [ ] 4. Implement date/decision extraction rules (start with regex-based date parsing; plan NLP fallback).
  - **What to do**: Implement a staged extraction pipeline that detects dates and commitments from messages using regex first; design a fallback to NLP (NER) if needed. Normalize extracted dates to ISO 8601 and attach context such as channel and user.
  - **Acceptance Criteria**:
    - Extraction returns date/time with correct timezone (Europe/Oslo) and associated user/channel.
  - **QA Scenarios**:
    - Happy Path: Message "Meeting on 2026-03-11 14:00 Oslo" yields event with date 2026-03-11T14:00:00+01:00 (or +02:00 DST as applicable).
  - **Evidence**: .sisyphus/evidence/task-4-extraction.md
- [ ] 5. Integrate Google Calendar API for event creation and updates; handle OAuth scopes and refresh tokens.
  - **What to do**: Wire the Google Calendar API for creating/updating events when dates are extracted. Implement OAuth 2.0 flow handling, token refresh, and minimal permission scopes required (calendar.events, calendar.calendars). Ensure events are created in a dedicated bot calendar or per-user calendars as configured.
  - **Acceptance Criteria**:
    - Bot can create a calendar event with correct title, start, end, and description.
    - Access tokens refreshed transparently; error handling when tokens expire.
  - **QA Scenarios**:
    - Happy Path: Simulated date extraction triggers event creation in test calendar; API returns 200 and eventId.
  - **Evidence**: .sisyphus/evidence/task-5-calendar.md
- [ ] 5a. Security & Credentials: Implement secure token storage, rotation, and minimal OAuth scopes.
  - **What to do**: Implement secure storage for Google API tokens (encrypted at rest). Set up token refresh logic and automatic rotation. Define minimal OAuth scopes (calendar.events.write, calendar.calendars.readonly). Document credential handling and failure modes.
  - **Acceptance Criteria**:
    - Tokens stored encrypted; refresh works automatically; minimal scopes used.
  - **QA Scenarios**:
    - Happy Path: Token refresh succeeds; expired token re-authenticates transparently.
  - **Evidence**: .sisyphus/evidence/task-5a-security.md
- [ ] 6. Reminders: post channel reminders and optional calendar invites.
  - **What to do**: Implement reminder posting in the channel when events/tasks approach; optionally emit calendar invites if appropriate. Ensure reminders respect timezone and user preferences.
  - **Acceptance Criteria**:
    - Reminder message posted in channel at correct time.
  - **QA Scenarios**:
    - Happy Path: A due task triggers a channel reminder with correct date/time.
  - **Evidence**: .sisyphus/evidence/task-6-reminders.md
- [ ] 7. Implement data retention TTL: purge raw data after 1 hour; ensure logs/aggregates align with policy.
  - **What to do**: Enforce TTL for raw message data and derived analytics; implement purge routines, retention windows, and access controls. Document policy and ensure only anonymized/aggregated data persists beyond TTL where allowed.
  - **Acceptance Criteria**:
    - Raw messages deleted after 1 hour; aggregated data retained per policy.
  - **QA Scenarios**:
    - Happy Path: Simulated ingestion time triggers TTL purge; verify no raw data remains beyond 1h.
  - **Evidence**: .sisyphus/evidence/task-7-retention.md
- [ ] 7a. Privacy Controls: Implement per-server/per-user privacy toggles and data access controls.
  - **What to do**: Add configuration options for server admins and users to toggle data collection, tone learning, and reminder preferences. Implement access controls to ensure users can only view their own data.
  - **Acceptance Criteria**:
    - Privacy toggles exist and can be configured per-server and per-user; access controls enforced.
  - **QA Scenarios**:
    - Happy Path: User toggles tone learning off; no tone adaptation occurs.
  - **Evidence**: .sisyphus/evidence/task-7a-privacy.md
- [ ] 8. Governance: add two-signature proposal workflow for bot behavior changes.
  - **What to do**: Implement a proposal-and-approval workflow where any member can propose a change, but changes only apply after 2 approvals from different participants. Track proposals, approvals, and apply changes with full audit trail. Document proposal lifecycle (create -> pending -> approve -> apply -> closed).
  - **Acceptance Criteria**:
    - Proposals created with unique IDs and status "pending".
    - Requires two distinct approvals before applying configuration changes.
    - Audit log records all actions.
  - **QA Scenarios**:
    - Happy Path: User A proposes change; User B approves; User C approves; change is applied.
    - Negative: Only one approval; change not applied.
  - **Evidence**: .sisyphus/evidence/task-8-governance.md
- [ ] 9. Tone learning: implement lightweight tone-adaptation layer; ensure privacy controls.
  - **What to do**: Add a lightweight tone-adaptation layer that adjusts bot responses based on detected tone. Ensure privacy by avoiding training on raw data without consent, and provide a user-controllable toggle to disable tone adaptation.
- [ ] 9a. Tone Learning Design: Define privacy-first approach (metadata-only, no raw message training), opt-in toggle, user notice.
  - **What to do**: Document the design for tone learning: derive tone signals from metadata only (e.g., message frequency, emoji usage), not raw message content. Implement opt-in toggle per-user and per-server. Include user-facing privacy notice about tone adaptation.
  - **Acceptance Criteria**:
    - Tone adaptation uses metadata only; opt-in toggle functional; privacy notice displayed.
  - **QA Scenarios**:
    - Happy Path: User disables tone learning; bot uses default neutral tone.
  - **Evidence**: .sisyphus/evidence/task-9a-tone-design.md
- [ ] 10. MVP QA: define scenarios, execute automated tests (mocked) and document evidence.

## Final Verification Wave
- F1. Plan Compliance Audit (oracle)
- F2. Code Quality Review (unspecified-high)
- F3. Real Manual QA (playwright-like tests adapted to Discord via mocks)
- F4. Scope Fidelity Check (deep)

## Plan Name and Storage
- Plan saved to: .sisyphus/plans/ai-discord-bot.md

## Plan Generated: ai-discord-bot

**Key Decisions Made**
- Group DMs are included; the bot will read messages in server group channels and a 3-person group DM where consent is granted.
- Timezone is Europe/Oslo; all times for events, reminders, and schedule calculations follow this TZ.
- Consent policy: /jeg-samtykker opt-in is required for each participant; any member can run it in the group DM with the bot.
- Extraction scope includes dates and agreements; these map to Google Calendar events and Discord tasks/to-dos.
- Reminders are posted in the channel by default; calendar invites can be emitted if appropriate.
- Governance: changes to bot behavior require two approvals from different participants before being applied.
- Tone learning: bot will adapt its tone to the chat while preserving privacy controls; opt-out is available.

**Scope**
- IN: Discord server channels, 3-person group DM; Google Calendar integration; event/task creation; channel reminders; consent flow; two-sign-off governance; tone adaptation (opt-in).
- OUT: Personal DMs beyond the group DM; data beyond TTL; any retained raw messages beyond TTL.

**Guardrails Applied**
- Privacy-first: consent required; revocation supported.
- TTL: raw message data purged after 1 hour; analytics data retained per policy.
- Change governance: two distinct approvers required for changes.
- Tone learning: privacy-preserving and opt-out capable.

**Verification Strategy (Agent-Executed QA)**
- Happy-path tests for consent, ingestion, date extraction, and calendar creation using mocked Google Calendar API.
- Negative tests for missing consent, misparsed dates, and failed token refreshes.
- Evidence artifacts saved under .sisyphus/evidence/task-{N}-<slug>.<ext> for each scenario.

**Execution Strategy**
- Parallel Waves: 2-3 waves with 4-6 tasks per wave; then a final integration and verification wave.
- Critical path: Consent flow -> Ingestion -> Extraction -> Calendar Sync -> Reminders -> TTL -> Governance -> Tone Learning -> MVP QA -> Final Verification.

---

## Wave 1 (Foundation & Scaffolding)
- 1. Implement consent opt-in flow in group DM: /jeg-samtykker; verify opt-in state per user. (Dependencies: none)
- 1a. DM Permission Verification: Verify Discord bot can access group DM; document fallback if blocked. (Dependencies: none)
- 1b. Consent Revocation Flow: Implement explicit /jeg-tilbakekall command for revocation and data deletion. (Dependencies: task 1)
- 2. Design data model: Event, Task, ToneProfile; define TTL rules. (Dependencies: consent schema)
- 2a. Storage Solution: Select and document storage approach (SQLite with encryption); define schema. (Dependencies: task 2)
- 3. Implement group DM and channel message ingestion with Discord API permissions checks. (Dependencies: data model, 1a)
- 4. Implement date/decision extraction rules (regex-first; NLP fallback). (Dependencies: ingestion)
- 5. Google Calendar integration scaffold: OAuth flow and token storage; calendar/events API wiring. (Dependencies: extraction)
- 5a. Security & Credentials: Implement secure token storage, rotation, and minimal OAuth scopes. (Dependencies: task 5)
- 6. Reminders: channel-based reminders implementation plan and hooks. (Dependencies: ingestion, calendar)

---

## Wave 2 (Integration & Add-ons)
- 7. Implement data retention TTL: purge raw data after 1 hour; ensure logs/aggregates align with policy. (Dependencies: consent, ingestion)
- 7a. Privacy Controls: Implement per-server/per-user privacy toggles and data access controls. (Dependencies: task 7)
- 8. Governance: two-signature proposal workflow with audit trail; document proposal lifecycle. (Dependencies: consent, policy docs)
- 9. Tone learning: lightweight tone-adaptation layer with privacy safeguards; provide opt-out toggle. (Dependencies: QA)
- 9a. Tone Learning Design: Define privacy-first approach (metadata-only, no raw message training), opt-in toggle, user notice. (Dependencies: task 9)
- 10. MVP QA: define scenarios, execute automated tests (mocked) and document evidence. (Dependencies: all prior tasks)

---

## Final Verification Wave
- F1. Plan Compliance Audit (oracle)
- F2. Code Quality Review (unspecified-high)
- F3. Real Manual QA (Discord-mocked tests)
- F4. Scope Fidelity Check (deep)

Plan saved to: .sisyphus/plans/ai-discord-bot.md
