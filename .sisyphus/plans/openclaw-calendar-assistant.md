# Plan: OpenClaw Calendar Assistant Integration

## TL;DR

> Integrate OpenClaw as the AI brain for Ine-Discord, with focus on calendar assistant and agenda keeper functions. Uses relay → OpenClaw → tools architecture for function calling, natural language date extraction, and proactive reminders.

> **Deliverables**:
> - OpenClawClient class for relay → OpenClaw communication
> - Calendar tools integration via MCP or custom tools
> - Natural language → structured data pipeline (chrono-node + OpenClaw)
> - Proactive reminder system

> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: OpenClawClient → Tools → Calendar Integration → Proactive Features

---

## Context

### Original Request
User wants to enhance the relay with OpenClaw's AI capabilities while keeping the selfbot for Group DM access. Key focus areas:
1. Calendar assistant (create, read, update, delete events)
2. Agenda keeper (upcoming events, daily summary)
3. Function calling (tool use for structured actions)
4. Natural language → structured data pipeline
5. Proactive messaging (reminders, follow-ups)

### Key Decisions from Interview
- **Architecture**: Relay → OpenClaw Gateway API → Ollama (not direct)
- **Model**: qwen2.5:14b (128K context, good function calling)
- **Calendar**: Local-first (SQLite) + Google Calendar via MCP optional
- **Language**: Norwegian-first (nb-NO)
- **Selfbot**: Keep user account for Group DM access

### Research Findings

**OpenClaw Integration:**
- Gateway HTTP endpoint: `POST /v1/responses` (enable in config)
- Authentication: Bearer token
- MCP support: Can connect to Google Calendar, Notion, etc.
- Tools: Custom tools via skill system or MCP

**Function Calling Best Practices:**
- JSON Schema definitions for tools
- Clear descriptions = better tool selection
- Validation required for production
- Multi-step planning for complex tasks

**Calendar Tools Schema Example:**
```json
{
  "name": "create_event",
  "description": "Create a calendar event",
  "parameters": {
    "type": "object",
    "properties": {
      "title": { "type": "string", "description": "Event title" },
      "start_time": { "type": "string", "format": "date-time" },
      "end_time": { "type": "string", "format": "date-time" },
      "reminder": { "type": "integer", "description": "Minutes before" }
    },
    "required": ["title", "start_time"]
  }
}
```

**Proactive Messaging Patterns:**
- Morning briefings (daily agenda)
- Pre-event reminders
- Follow-up check-ins ("Did the meeting happen?")
- Confirmation loops for extracted dates

---

## Work Objectives

### Core Objective
Transform Ine-Discord into a calendar-focused AI assistant using OpenClaw's tool capabilities while maintaining Group DM access via selfbot.

### Concrete Deliverables
1. OpenClawClient class with /v1/responses integration
2. Calendar tools (create, read, update, delete events)
3. Natural language date extraction pipeline
4. Proactive reminder scheduler
5. Norwegian language prompt optimization

### Definition of Done
- [ ] Relay communicates with OpenClaw Gateway API
- [ ] Calendar events can be created via natural language
- [ ] Events can be listed and queried
- [ ] Reminders trigger at specified times
- [ ] Norwegian responses work correctly
- [ ] Error handling for all tool failures

### Must Have
- OpenClaw Gateway API integration
- Local calendar storage (existing SQLite)
- Date/time extraction (existing chrono-node)
- Reminder scheduler (existing ReminderService)

### Must NOT Have
- External API dependencies (keep local/free)
- Blocking operations (async all the way)
- Unvalidated tool outputs

---

## Technical Architecture

### Message Flow
```
Discord Group DM → Relay (@mention) → OpenClaw Gateway (/v1/responses)
    → Ollama (qwen2.5:14b) → Tools → Response
    → Relay → Discord Group DM
```

### Tool Integration Strategy

**Option A: MCP (Recommended)**
- Connect Google Calendar via MCP
- OpenClaw manages tool calls
- Your code: SQLite as backup/local storage

**Option B: Custom Tools**
- Define tools in OpenClaw config
- Tools call your existing services
- More control, more setup

**Option C: Hybrid (Recommended)**
- Use existing services for local calendar
- OpenClaw for reasoning + tool selection
- Your code executes calendar operations

### Norwegian Prompt Optimization
```system
Du er inebot, en norsk kalender-assistent. 
- Svar ALLTID på norsk (nb-NO)
- Forstå naturlig språk og konverter til kalenderhandlinger
- Spør bekreftelse før du oppretter hendelser
- Bruk datoformater: DD.MM.YYYY eller "mandag kl 14"
- Inkluder påminnelser automatisk (15 min før)
```

---

## Execution Strategy

### Wave 1: Foundation (3 tasks)
1. OpenClawClient class for Gateway API
2. Environment/config setup
3. Basic message relay test

### Wave 2: Tool Integration (4 tasks)
4. Calendar tool schema definitions
5. Connect to existing calendar service
6. Date extraction pipeline
7. Response formatting

### Wave 3: Proactive Features (3 tasks)
8. Reminder scheduler
9. Morning briefing system
10. Follow-up confirmation flow

---

## TODOs

### Wave 1: Foundation

- [ ] 1. OpenClawClient Class

  **What to do**:
  - Create `src/relay/openclaw-client.ts`
  - Implement `/v1/responses` POST calls
  - Add authentication header handling
  - Add timeout (60s default)
  - Add streaming support for long responses

  **Acceptance Criteria**:
  - [ ] Can send message to OpenClaw Gateway
  - [ ] Receives response back
  - [ ] Handles auth correctly
  - [ ] Timeout works

  **References**:
  - API: docs.openclaw.ai/gateway/openresponses-http-api
  - Example: curl to /v1/responses

- [ ] 2. OpenClaw Gateway Configuration

  **What to do**:
  - Enable `/v1/responses` in config
  - Set authentication token
  - Configure qwen2.5:14b model
  - Test connectivity

  **Acceptance Criteria**:
  - [ ] Gateway responds to API calls
  - [ ] Token auth works

- [ ] 3. Basic Relay Integration

  **What to do**:
  - Replace direct Ollama calls with OpenClawClient
  - Keep @mention trigger
  - Keep conversation history
  - Add error handling

  **Acceptance Criteria**:
  - [ ] Messages relay through OpenClaw
  - [ ] Responses come back to Discord

### Wave 2: Tool Integration

- [ ] 4. Calendar Tool Schemas

  **What to do**:
  - Define JSON Schema for calendar operations:
    - `create_event(title, start_time, end_time?, description?, reminder?)`
    - `list_events(start_date?, end_date?)`
    - `update_event(event_id, ...)`
    - `delete_event(event_id)`
    - `get_event(event_id)`
  - Register tools in OpenClaw config
  - Add Norwegian descriptions

  **Tool Schema Example**:
  ```typescript
  const calendarTools = [
    {
      type: "function",
      function: {
        name: "create_event",
        description: "Opprett en kalenderhendelse. Bruk denne når brukeren nevner en dato eller tidspunkt.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Tittel på hendelsen" },
            start_time: { type: "string", format: "date-time", description: "Starttidspunkt (ISO 8601)" },
            end_time: { type: "string", format: "date-time", description: "Sluttidspunkt (valgfritt)" },
            description: { type: "string", description: "Beskrivelse (valgfritt)" },
            reminder: { type: "integer", description: "Påminnelse i minutter før (standard: 15)" }
          },
          required: ["title", "start_time"]
        }
      }
    }
  ]
  ```

  **Acceptance Criteria**:
  - [ ] Tools registered in OpenClaw
  - [ ] Model can call tools

- [ ] 5. Tool Execution Handler

  **What to do**:
  - Parse tool calls from OpenClaw response
  - Execute via existing CalendarService
  - Return results to OpenClaw
  - Handle errors gracefully

  **Acceptance Criteria**:
  - [ ] Tool calls execute calendar operations
  - [ ] Results returned to model
  - [ ] Errors handled without breaking

- [ ] 6. Date Extraction Pipeline

  **What to do**:
  - Combine chrono-node with OpenClaw reasoning
  - Extract: date, time, duration, title, attendees
  - Generate confirmation prompt
  - Handle ambiguous dates ("next Tuesday")

  **Acceptance Criteria**:
  - [ ] "Møte på mandag kl 14" → parsed correctly
  - [ ] Confirmation asked before creation
  - [ ] Ambiguous dates flagged

- [ ] 7. Response Formatter

  **What to do**:
  - Format event summaries in Norwegian
  - Use existing ToneService
  - Add emojis appropriately
  - Include event links/details

  **Acceptance Criteria**:
  - [ ] Responses in Norwegian
  - [ ] ToneService applied
  - [ ] Clear event information

### Wave 3: Proactive Features

- [ ] 8. Reminder Scheduler

  **What to do**:
  - Integrate with existing ReminderService
  - Parse reminder requests from conversation
  - Schedule Discord notifications
  - Support: 5min, 15min, 1hr, 1day before

  **Acceptance Criteria**:
  - [ ] Reminders trigger at correct time
  - [ ] Discord notification sent
  - [ ] Can list/cancel reminders

- [ ] 9. Morning Briefing System

  **What to do**:
  - Daily cron job (08:00 local time)
  - Query upcoming events for user
  - Format as Norwegian summary
  - Post to Group DM

  **Example Output**:
  ```
  📅 Din dag i dag:
  • 14:00 - Møte med teamet
  • 16:30 - Tannlege
  
  Ingen påminnelser satt for i dag.
  ```

  **Acceptance Criteria**:
  - [ ] Runs daily at configured time
  - [ ] Shows today's events
  - [ ] Works for each user

- [ ] 10. Follow-up Confirmation

  **What to do**:
  - After event time passes, ask "Gikk møtet bra?"
  - Store outcome in memory
  - Offer to reschedule if missed

  **Acceptance Criteria**:
  - [ ] Follow-up triggers after events
  - [ ] Can reschedule if needed

---

## Natural Language → Structured Data Pipeline

### Flow
```
1. User Input: "Vi skal møtes på mandag kl 14:00 i 2 timer"
2. OpenClaw parses intent → calls create_event tool
3. Tool receives: { title, start_time, end_time }
4. CalendarService creates event in SQLite
5. OpenClaw receives result → formats response
6. Relay sends: "📅 Møte opprettet! Påminnelse satt til 13:45"
```

### Error Handling
- Invalid date → Ask user for clarification
- Tool failed → Return error to OpenClaw, let it retry/explain
- Calendar full → Warn user, suggest alternatives

---

## Verification Strategy

### QA Scenarios (Every Task)

**Calendar Creation**:
```
User: "Avtale med Per på onsdag kl 10"
Expected: Tool called with { title: "Avtale med Per", start_time: "2026-02-25T10:00:00" }
Bot: "Vil du opprette denne hendelsen? Jeg kan sette påminnelse 15 min før."
```

**Calendar Query**:
```
User: "Hva har jeg på mandag?"
Expected: Tool called with list_events
Bot: "Du har: ..."
```

**Reminder**:
```
User: "Påminn meg om møtet 30 minutter før"
Expected: Reminder scheduled
Bot: "✅ Påminnelse satt til [time]"
```

---

## Final Verification Wave

- [ ] F1. End-to-end calendar flow works
- [ ] F2. Norwegian language correct
- [ ] F3. Error handling robust
- [ ] F4. Proactive features functional

---

## Commit Strategy

**Option 1: Per-wave commits**
```
feat: add OpenClaw client for relay
feat: add calendar tool integration
feat: add proactive reminder system
```

**Option 2: Single commit**
```
feat: integrate OpenClaw as AI brain for calendar assistant
```

---

## Success Criteria

### Functional
- [ ] Natural language → calendar event works
- [ ] Events can be listed/queried
- [ ] Reminders trigger correctly
- [ ] Norwegian responses correct

### Technical
- [ ] OpenClaw Gateway API integration works
- [ ] Tools execute via existing services
- [ ] Error handling prevents crashes

### User Experience
- [ ] Friendly Norwegian responses
- [ ] Confirmation before actions
- [ ] Clear error messages
