# Plan: Digital Almanac (Calendar & TODO via @mention)

## TL;DR
> When users tag @inebotten with dates, tasks, or agreements, the bot extracts the info, confirms with the user, stores locally, and sends reminders in Discord. Local storage + Discord reminders (no Google Calendar for MVP).

## Context

**Original Request:**
- User tags @inebotten in a message containing date/task/agreement
- Bot extracts the information using chrono-node
- Bot confirms what was added (or asks follow-up questions)
- Store events/tasks locally in SQLite
- Send reminders in Discord when due

**Existing Infrastructure:**
- `src/services/extraction.ts` — chrono-node date parsing
- `src/db/index.ts` — eventDb, taskDb already exist
- `src/services/reminders.ts` — basic reminder checker (needs enhancement)
- `src/relay/index.ts` — message handling (where integration happens)

**Key Decision:** Start with local storage + Discord reminders. Add Google Calendar/Notion later if needed.

---

## Work Objectives

- **Objective:** Enable @inebotten to extract dates/tasks from tagged messages, confirm with user, store locally, and remind in Discord.
- **Deliverables:**
  1. Extraction integration in relay (detect date/task/agreement in message)
  2. Confirmation flow (high confidence → auto-add + confirm, low → ask follow-up)
  3. Local storage of events and tasks
  4. Discord reminder messages when events/tasks are due
  5. Follow-up question handling via Ollama

---

## Definition of Done

- [x] User tags @inebotten with "Møte på torsdag kl 14" → Bot responds "Lagt til: Møte torsdag kl 14:00"
- [x] User tags @inebotten with vague date ("rundt 6 onsdag") → Bot asks "Fant dato, men hva skal vi møtes om?"
- [x] Stored events appear in database and persist across restarts
- [x] Reminder posted in Discord 1 hour before event/task
- [x] All extraction confidence levels handled appropriately

---

## Must Have

- Extraction runs on every @mention message
- High confidence (date + context clear) → auto-create + confirm
- Medium confidence (date found, context unclear) → ask follow-up
- Low confidence (no date found) → let Ollama handle as normal chat
- Events stored in eventDb with title, time, channel source
- Tasks stored in taskDb with title, due time
- Reminders posted in the same channel where original message was sent

---

## Must NOT Have

- No Google Calendar integration in MVP (local only)
- No automatic event creation without user confirmation (unless 100% confident)
- No reading messages without @mention trigger
- No retention beyond defined TTL

---

## Verification Strategy

**Agent-Executed QA:**
- Test extraction with various date formats
- Verify confirmation message format
- Check database entries created correctly
- Verify reminder timing and content

**Test Commands:**
```bash
# Manual test: tag bot with date
@inebotten Møte på fredag kl 15

# Verify database entry
sqlite3 data/bot.db "SELECT * FROM events"
```

---

## Execution Strategy

### Wave 1 (Integration - 3 tasks)
- Task 1: Wire ExtractionService into relay
- Task 2: Implement confirmation flow
- Task 3: Local storage (eventDb/taskDb)

### Wave 2 (Enhancements - 3 tasks)
- Task 4: Follow-up question handling
- Task 5: Enhanced reminder system  
- Task 6: Query answering (when is X? / what's planned?)

---

## TODOs

- [x] 1. Wire ExtractionService into relay message handler
  **What to do**: Import ExtractionService in src/relay/index.ts. On every @mention, run extraction before sending to Ollama. Return extraction result alongside message.
  **QA Scenarios**:
  - Message "@inebotten Møte på fredag kl 15" → extraction returns event with startTime
  - Message "@inebotten Hei, hva heter du?" → extraction returns empty (not a date)
  **Evidence**: .sisyphus/evidence/almanac-1-extraction.md

- [x] 2. Implement confirmation flow based on confidence
  **What to do**: 
  - HIGH confidence (date + clear title): Create entry, respond "Lagt til: {title} {formattedTime}"
  - MEDIUM confidence (date found, unclear title): Ask "Fant dato, men hva skal vi møtes om?"
  - LOW confidence (no date): Return null, let Ollama handle
  **QA Scenarios**:
  - High: "@inebotten Møte på fredag kl 15" → "Lagt til: Møte fredag kl 15:00"
  - Medium: "@inebotten Møte på fredag" → "Fant dato (fredag), men hva skal møtes om?"
  **Evidence**: .sisyphus/evidence/almanac-2-confirmation.md

- [x] 3. Store events and tasks in database
  **What to do**: Use existing eventDb.create() and taskDb.create(). Store: title, time, channel_id, source_message_id. Use message timestamp for TTL.
  **Acceptance Criteria**:
  - eventDb.create() called with correct fields
  - taskDb.create() called for tasks (type: 'task')
  **QA Scenarios**:
  - Verify entry in SQLite: `SELECT * FROM events`
  **Evidence**: .sisyphus/evidence/almanac-3-storage.md

- [x] 4. Follow-up question handling
  **What to do**: When user responds to follow-up question, parse their answer as the title. Need state management for pending confirmations (store pending_extractions).
  **Acceptance Criteria**:
  - User answers follow-up → entry created with their answer as title
  - Timeout after 5 minutes if no response
  **QA Scenarios**:
  - Bot: "Hva skal møtes om?" → User: "Prosjektgjennomgang" → Event created with title "Prosjektgjennomgang"
  **Evidence**: .sisyphus/evidence/almanac-4-followup.md

- [x] 5. Enhanced reminder system
  **What to do**: Modify ReminderService to post in Discord channel (not just log). Add source_channel_id to events so reminders know where to post. Check every minute, post reminder 1 hour before.
  **Acceptance Criteria**:
  - Reminder posted to correct channel
  - Reminder includes title and formatted time
  **QA Scenarios**:
  - Create event for now + 2 minutes → Reminder posted in channel within 3 minutes
  **Evidence**: .sisyphus/evidence/almanac-5-reminders.md

- [x] 6. Query answering - "When is X?" / "What do we have planned?"
  **What to do**: When user asks about events/tasks (keywords: når, når skal, hva har vi, what's planned, when is), query eventDb/taskDb and respond with natural language. Include both upcoming events AND tasks.
  
  **Detection patterns**:
  - "når skal" / "når er" / "når drar"
  - "hva har vi" / "hva skjer" / "what's planned"
  - "neste" + event type (movie night, trip, etc.)
  
  **Response format**:
  - "Du har {title} {formattedTime}" for single events
  - "Planlagt: 1) {title} {time}, 2) {title} {time}" for multiple
  - "Ingen planlagte arrangementer" if empty
  
  **QA Scenarios**:
  - "@inebotten Når er Alfred i Spania?" → query events for "Alfred" or "Spain" → "Alfred drar til Spania 15. mars"
  - "@inebotten Hva har vi planlagt?" → list all upcoming events and tasks
  - "@inebotten Når er neste filmkveld?" → find event with "film" in title
  **Evidence**: .sisyphus/evidence/almanac-6-query.md

---

## Final Verification Wave

- **F1**: End-to-end test: tag → extract → confirm → store → remind
- **F2**: Code review of relay changes
- **F3**: Manual test with various date formats
- **F4**: Query answering test

---

## Commit Strategy

- `feat(relay): integrate extraction for calendar/todo` — src/relay/index.ts, src/services/extraction.ts
- `feat(almanac): add confirmation flow` — src/relay/index.ts
- `feat(almanac): add follow-up handling` — src/relay/index.ts, src/db/index.ts
- `feat(reminders): post to Discord channel` — src/services/reminders.ts

---

## Success Criteria

```bash
# Test date extraction
@inebotten Møte på fredag kl 15
# Expected: "Lagt til: Møte fredag kl 15:00"

# Test vague date
@inebotten Vi bør snakke på onsdag
# Expected: "Fant dato (onsdag), men hva skal vi snakke om?"

# Verify storage
sqlite3 data/bot.db "SELECT title, start_time FROM events"
# Expected: shows inserted event

# Verify reminder
# (wait for reminder to post in channel)
```
