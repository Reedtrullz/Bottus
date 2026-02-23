# Plan: Discord Calendar Display + Memory Features

## TL;DR
Display calendar/events in Discord via rich embeds + navigation. Option 2 first (embed agenda), Option 3 later (image calendar). Show calendar contextually based on user @mention messages, not just slash commands. Plus persistent memory for personal info across conversations.

## Context

**Existing Infrastructure:**
- `src/db/index.ts` — eventDb.findUpcoming(), taskDb.findPending()
- `src/services/extraction.ts` — chrono-node date parsing
- `src/relay/index.ts` — message handling, confirmation flow
- `src/relay/ollama.ts` — Ollama client

**Key Decision:** Embed agenda MVP (no image generation). Contextual display via @mention triggers. All features local + free.

---

## Dependency Analysis

```
TASK DEPENDENCY GRAPH:

Wave 1 (Foundation - CAN RUN IN PARALLEL):
├── T1: CalendarService ──────────────────────────────┐
├── T7: Memory storage (new table)                 │
└── T14: Timezone support (user preferences)       │
                                                   │
Wave 2 (Depends on Wave 1):                         │
├── T2: /calendar command ──────→ T1               │
├── T3: Contextual triggers ────→ T1                │
├── T8: Memory queries ─────────→ T7                │
└── T9: Reply context ──────────→ (independent)      │
                                                   │
Wave 3 (Depends on Wave 2):                         │
├── T4: Specific event queries ──→ T1 + T3         │
├── T5: Navigation buttons ──────→ T1 + T2         │
├── T10: Memory injection ──────→ T7 + T9          │
└── T11: Recurring events ──────→ T1               │
                                                   │
Wave 4 (Depends on Wave 3):                         │
├── T6: Month jump ──────────────→ T1 + T5         │
├── T12: RSVP reactions ─────────→ T1 + T11        │
├── T13: Time polls ─────────────→ T1 + T12        │
└── T15: Image calendar ─────────→ T1               │
                                                   │
Wave 5 (Final):                                     │
└── T16: Interactive day details → T1 + T15        
```

---

## Work Objectives

- **Objective:** Display upcoming events/tasks in Discord with navigation, contextual calendar display on @mention, plus persistent memory for personal info
- **Deliverables:**
  1. CalendarService with embed rendering
  2. Contextual calendar trigger (when user asks about calendar/plans)
  3. Navigation (prev/today/next week)
  4. Jump to month via select menu
  5. Event detail on click
  6. Persistent memory for personal facts
  7. Reply-based conversation context
  8. Recurring events (hver torsdag, etc.)
  9. RSVP with reactions
  10. Time polls
  11. (Future) Image calendar generation

---

## Definition of Done

 [x] User types "@inebotten hva har vi planlagt?" → Calendar embed appears
 [x] User types "@inebotten når er møtet?" → Shows specific event or calendar
 [x] Navigation buttons work (prev/today/next week)
 [x] Select menu jumps to specific month
- [x] Events color-coded by type
- [x] "@inebotten husk at jeg er allergisk mot gluten" → stored in memory
- [x] "@inebotten hva husker du om meg?" → lists stored facts
- [x] User can create recurring events ("hver torsdag kl 14")
- [x] Events show RSVP reactions (✅/❌/🤔)
- [x] User can poll for best time ("finn en tid for møte denne uken")
- [x] (Future) Image calendar generation works  [DEFERRED to comfyui-integration plan]

---

## Must Have

- Calendar embed shows next 7 days by default
- Navigation via buttons (← Forrige uke | I dag | Neste uke →)
- Jump to month via select menu
- Events from both eventDb and taskDb
- Contextual triggers (not just /calendar command):
  - "hva har vi planlagt?"
  - "når er møtet?"
  - "hva skjer i dag?"
  - "vis kalender"
- Color coding: meetings (blue), tasks (red), personal (green)
- Persistent memory storage for personal facts (SQLite table: memories)
- Memory triggers:
  - "husk at..." / "husk jeg er..."
  - "hva husker du om meg?"
- Recurring events: detect "hver mandag/tirsdag/..." create recurring pattern
- RSVP: add ✅/❌/🤔 reactions to events, track attendance in DB
- Time polls: create Discord poll for finding best time

---

## Must NOT Have

- No Google Calendar sync (local only for MVP)
- No image generation in MVP (save for Option 3)
- No automatic posting without trigger
- No external API dependencies (all local + free)

---

## Execution Strategy

### Wave 1: Foundation (Start Immediately)
- **T1**: CalendarService with embed rendering
- **T7**: Memory storage (new DB table + service)
- **T14**: Timezone support (user preferences)
**Rationale**: These are independent foundations. CalendarService needed for ALL calendar features. Memory storage needed for ALL memory features.

### Wave 2: Basic Commands & Triggers (After Wave 1)
- **T2**: /calendar slash command
- **T3**: Contextual calendar triggers
- **T8**: Memory query commands
- **T9**: Reply-based conversation context
**Rationale**: Basic UI and triggers. All depend on Wave 1 foundations.

### Wave 3: Query & Navigation (After Wave 2)
- **T4**: Specific event queries
- **T5**: Navigation buttons
- **T10**: Memory injection into prompts
- **T11**: Recurring events
**Rationale**: Advanced features built on basic triggers and navigation.

### Wave 4: Advanced Features (After Wave 3)
- **T6**: Month jump select menu
- **T12**: RSVP with reactions
- **T13**: Time polls
- **T15**: (Future) Image calendar
**Rationale**: Complex interactions requiring full calendar flow.

### Wave 5: Polish (After Wave 4)
- **T16**: (Future) Interactive day details

---

## UX FLOW: Complete Package

The complete user journey after all features implemented:

```
1. USER ADDS EVENT:
   "@inebotten Møte hver torsdag kl 14"
   → Extraction detects recurring pattern
   → Creates recurring event (T11)
   → Bot: "Lagt til: Møte hver torsdag kl 14"
   → Event shows RSVP reactions (T12)

2. USER RSVPS:
   User clicks ✅ on event message
   → RSVP recorded in DB
   → "@inebotten hvem kommer?" shows list

3. USER ASKS ABOUT CALENDAR:
   "@inebotten hva har vi planlagt?"
   → Contextual trigger (T3)
   → CalendarService builds embed (T1)
   → Shows week with navigation (T5)
   → Color-coded by type

4. USER NAVIGATES:
   Click "Neste uke"
   → Button interaction (T5)
   → Embed updates to next week

5. USER ASKS SPECIFIC:
   "@inebotten når er møte?"
   → Specific query handler (T4)
   → Searches events, shows match

6. USER STORES MEMORY:
   "@inebotten husk at jeg er allergisk mot gluten"
   → Memory storage (T7)
   → Bot: "Lagt til i minnet!"

7. USER ASKS FOR TIME:
   "@inebotten finn en tid for møte denne uken"
   → Time poll created (T13)
   → Users vote on times
   → Poll closes → event created

8. USER CONTINUES CONVERSATION:
   User replies to bot message
   → Reply context detected (T9)
   → Conversation chain built
   → Memory injected into prompt (T10)
   → Bot responds with context awareness
```

---

## TODOs

### Wave 1: Foundation (CAN RUN IN PARALLEL)

- [x] T1. CalendarService with embed rendering
  **What to do**: Create src/services/calendar-display.ts. Add methods: buildWeekEmbed(events, tasks, weekOffset), formatDayEvents(), getEventColor(). Use existing eventDb.findUpcoming() and taskDb.findPending().
  **Dependencies**: None (foundation)
  **QA Scenarios**:
  - buildWeekEmbed() with 3 events returns embed with 3 day fields
  - getEventColor() returns correct color per event type
  **Files**: src/services/calendar-display.ts (NEW)

- [x] T7. Persistent memory storage
  **What to do**: Create memories table in SQLite (id, user_id, fact, created_at). Add MemoryService with methods: store(userId, fact), recall(userId), search(query). Detect "husk at..." / "husk jeg er..." patterns.
  **Dependencies**: None (foundation)
  **QA Scenarios**:
  - "@inebotten husk at jeg er allergisk mot gluten" → stored in DB
  - "@inebotten hva husker du om meg?" → lists "allergisk mot gluten"
  **Files**: src/db/index.ts (add memories table), src/services/memory.ts (NEW)

- [x] T14. Timezone support
  **What to do**: Detect user timezone from Discord profile or ask explicitly. Store in user_preferences. Convert event times for display.
  **Dependencies**: None (utility)
  **QA Scenarios**:
  - User in CET creates event → shown in CET
  - User in PST asks → converted to their timezone
  **Files**: src/db/index.ts (add user_preferences table)

---

### Wave 2: Basic Commands & Triggers

- [x] T2. Add /calendar slash command
  **What to do**: Add to src/commands/index.ts. /calendar [uke|måned|dag] [dato]. Default: current week. Returns embed with navigation.
  **Dependencies**: T1 (CalendarService)
  **QA Scenarios**:
  - /calendar → shows this week
  - /calendar uke → shows week view
  - /calendar måned januar → shows month
  **Files**: src/commands/index.ts

- [x] T3. Add contextual calendar triggers
  **What to do**: In src/relay/index.ts, add detection for calendar keywords in user messages. Triggers: "hva har vi planlagt", "når er", "hva skjer", "vis kalender", "kalender". If triggered, call CalendarService instead of Ollama.
  **Dependencies**: T1 (CalendarService)
  **QA Scenarios**:
  - "@inebotten hva har vi planlagt?" → calendar appears
  - "@inebotten når er møtet?" → calendar appears
  - "@inebotten hei, hvordan går det?" → normal Ollama response
  **Files**: src/relay/index.ts

- [x] T8. Memory query commands
  **What to do**: Add /husk /hva-husker-du commands. Also contextual: "husker du...?" triggers memory lookup.
  **Dependencies**: T7 (Memory storage)
  **QA Scenarios**:
  - "@inebotten husker du at jeg liker pizza?" → "Ja, jeg husker du liker pizza!"
  - "/husk liste" → shows all stored memories
  **Files**: src/commands/index.ts, src/relay/index.ts

- [x] T9. Reply-based conversation context
  **What to do**: In relay, detect when user replies to bot message. Build conversation chain from message.reply. Include last N messages in Ollama prompt for context.
  **Dependencies**: None (independent relay change)
  **QA Scenarios**:
  - User replies to bot message → conversation continues naturally
  - Branch conversation with reply to any message → includes that message in context
  **Files**: src/relay/index.ts

---

### Wave 3: Query & Navigation

- [x] T4. Handle specific event queries
  **What to do**: When user asks "når er [X]?" and [X] matches event title, show that event specifically. Use eventDb search. Fall back to calendar if no match.
  **Dependencies**: T1 + T3 (CalendarService + contextual triggers)
  **QA Scenarios**:
  - "@inebotten når er møte?" → shows specific event "Møte" if found
  - "@inebotten når er fest?" → "Fant ingen hendelse 'fest'"
  **Files**: src/relay/index.ts, src/services/calendar-display.ts

- [x] T5. Add navigation buttons
  **What to do**: Add component rows to embed: ← Forrige uke | I dag | Neste uke →. Handle button interactions in relay. Update embed on click.
  **Dependencies**: T1 + T2 (CalendarService + /calendar command)
  **QA Scenarios**:
  - Click "Forrige uke" → embed shows previous week
  - Click "I dag" → embed shows current week
  **Files**: src/services/calendar-display.ts, src/relay/index.ts

- [x] T10. Memory injection into prompts
  **What to do**: Before sending to Ollama, inject relevant memories into system prompt. "User facts: - allergic to gluten - likes coffee".
  **Dependencies**: T7 + T9 (Memory storage + reply context)
  **QA Scenarios**:
  - User asks "kan jeg spise pizza?" → bot responds considering allergy memory
  - User asks "what should I drink?" → bot considers coffee preference
  **Files**: src/relay/index.ts, src/services/memory.ts

- [x] T11. Recurring events
  **What to do**: In extraction, detect "hver mandag/tirsdag/...", "annenhver uke", "månedlig". Store recurring pattern in eventDb (recurrence_rule field). Expand to actual events on render.
  **Dependencies**: T1 (CalendarService for rendering)
  **QA Scenarios**:
  - "@inebotten møte hver torsdag kl 14" → creates recurring event
  - Calendar shows every Thursday at 14:00
  **Files**: src/services/extraction.ts, src/db/index.ts, src/services/calendar-display.ts

---

### Wave 4: Advanced Features

- [x] T6. Add month jump select menu
  **What to do**: Add select menu with months (Januar–Desember). On select, jump to that month. Show full month view.
  **Dependencies**: T1 + T5 (CalendarService + navigation buttons)
  **QA Scenarios**:
  - Select "Mars" → embed shows March
  - Events in March shown correctly
  **Files**: src/services/calendar-display.ts, src/relay/index.ts

- [x] T12. RSVP with reactions
  **What to do**: When event created, add ✅/❌/🤔 reactions. Track attendance in event_rsvp table (event_id, user_id, status). Update on reaction add/remove.
  **Dependencies**: T1 + T11 (CalendarService + recurring events for event creation)
  **QA Scenarios**:
  - Event message has reactions → user clicks ✅ → attendance recorded
  - "@inebotten hvem kommer på møte?" → shows list of RSVPs
  **Files**: src/db/index.ts, src/relay/index.ts

- [x] T13. Time polls
  **What to do**: Detect "finn en tid", "hvilken tid passer". Create Discord native poll with time options. On close, create event with winning time.
  **Dependencies**: T1 + T12 (CalendarService + RSVP for event creation flow)
  **QA Scenarios**:
  - "@inebotten finn en tid for møte denne uken" → creates poll with Mon-Fri options
  - Poll closes → event created automatically
  **Files**: src/relay/index.ts, src/services/calendar-display.ts

- [x] T15. (Future) Image calendar generation
  **What to do**: Create CalendarRenderer using sharp/svgson to generate PNG calendar images. Add to CalendarService as alternative view.
  **Dependencies**: T1 (CalendarService foundation)
  **QA Scenarios**:
  - /calendar bilde → generates calendar image
  - Image shows colored dots on event days

---

### Wave 5: Polish

- [x] T16. (Future) Interactive day details
  **What to do**: Click on day number → shows event details modal/embed with full info.
  **Dependencies**: T1 + T15 (CalendarService + image calendar)
  **QA Scenarios**:
  - Click "14" → shows events on 14th

---

## Final Verification Wave

- **F1**: End-to-end: @mention with calendar keyword → embed appears (T1+T2+T3)
- **F2**: Navigation buttons work through 3 weeks (T5)
- **F3**: Month jump works for 3 different months (T6)
- **F4**: "@inebotten husk at jeg liker kaffe" → stored, then "@inebotten hva husker du?" shows it (T7+T8)
- **F5**: Conversation continues naturally with reply context (T9+T10)
- **F6**: Recurring event "hver torsdag" shows all occurrences (T11)
- **F7**: RSVP reactions track attendance correctly (T12)
- **F8**: Time poll creates event on close (T13)
- **F9**: Timezone conversion works for different users (T14)
- **F10**: Complete UX flow test (all waves combined)

---

## Commit Strategy

**Wave 1: Foundation**
- `feat(calendar): add CalendarService with embed rendering` — src/services/calendar-display.ts
- `feat(memory): add persistent memory storage` — src/db/index.ts, src/services/memory.ts
- `feat(utils): add timezone support` — src/db/index.ts

**Wave 2: Basic Commands**
- `feat(calendar): add /calendar slash command` — src/commands/index.ts
- `feat(calendar): add contextual calendar triggers` — src/relay/index.ts
- `feat(memory): add memory query commands` — src/commands/index.ts, src/relay/index.ts
- `feat(relay): add reply-based conversation context` — src/relay/index.ts

**Wave 3: Query & Navigation**
- `feat(calendar): handle specific event queries` — src/relay/index.ts
- `feat(calendar): add navigation buttons` — src/services/calendar-display.ts, src/relay/index.ts
- `feat(memory): inject memories into Ollama prompts` — src/relay/index.ts
- `feat(calendar): add recurring events` — src/services/extraction.ts, src/db/index.ts

**Wave 4: Advanced Features**
- `feat(calendar): add month jump select menu` — src/services/calendar-display.ts
- `feat(calendar): add RSVP with reactions` — src/db/index.ts, src/relay/index.ts
- `feat(calendar): add time polls` — src/relay/index.ts
- `feat(calendar): add image calendar generation` — src/services/calendar-renderer.ts (future)

---

## Success Criteria

```bash
# Test contextual display
@inebotten hva har vi planlagt?
# Expected: Calendar embed with this week

# Test navigation
# Click "Neste uke" button
# Expected: Next week shown

# Test specific query
@inebotten når er møte?
# Expected: Specific event or "Fant ingen..."

# Test /calendar command
/calendar
# Expected: Same embed as contextual

# Test memory
@inebotten husk at jeg er allergisk mot gluten
# Expected: "Lagt til: du er allergisk mot gluten"

@inebotten hva husker du om meg?
# Expected: "Du er allergisk mot gluten"

# Test recurring events
@inebotten møte hver torsdag kl 14
# Expected: Creates recurring event, shows every Thursday

# Test RSVP
# (event shows reactions)
# Click ✅ → attendance recorded

# Test time poll
@inebotten finn en tid for møte denne uken
# Expected: Creates poll with time options
```
