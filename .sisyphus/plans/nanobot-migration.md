# NanoBot Migration Plan

## TL;DR

> **Quick Summary**: Migrate Bottus to use NanoBot as the AI backend while keeping Bottus's selfbot system (Discord user account). Hybrid architecture: Bottus selfbot (Discord user) → embeds NanoBot Python library → calls vLLM/Ollama for AI.

> **Deliverables**:
> - Bottus running as selfbot (Discord user account, NOT bot account)
> - NanoBot embedded as Python library in Bottus
> - vLLM + Ollama for local LLM
> - Calendar skill with event extraction, storage, reminders, and completion tracking
> - Image generation skill via ComfyUI
> - Persistent memory system
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Verify Bottus Selfbot → vLLM/Ollama → API Bridge → Calendar Skills → Full Integration

---

## Context

### Original Request
User has Bottus - a custom Discord bot with:
- **Selfbot system** (discord.js-selfbot-v13) - uses Discord USER ACCOUNT, not bot account
- Calendar management (create, list, delete events)
- Image generation via ComfyUI with LLM prompt enhancement
- AI Chat via Ollama
- Event extraction from messages
- Task reminders
- Custom skill engine

**CRITICAL REQUIREMENT**: User MUST keep the selfbot system. Discord user accounts have different capabilities than bot accounts and this is non-negotiable.

User wants to migrate to NanoBot with:
- Local Ollama (hard requirement)
- Selfbot Discord interface (keep existing Bottus selfbot code)
- Calendar features: extract dates, store events, remind, mark complete

### Why Hybrid Architecture?
1. **NanoBot only supports bot accounts** - Official Discord bot tokens, not user account tokens
2. **Bottus selfbot is required** - User account API access via discord.js-selfbot-v13
3. **Solution**: Keep Bottus as Discord interface, use NanoBot as AI backend via API

### Why NanoBot?
1. **Ollama via vLLM** - Cleanest local LLM path
2. **Discord first-class** - Built-in support
3. **24.3k stars** - Largest community in the Claw family
4. **~4,000 lines** - Easy to understand and modify
5. **Skill system** - Markdown-based, easy to extend

---

## Work Objectives

### Core Objective
Hybrid system: Bottus (selfbot) handles Discord communication → calls NanoBot API for AI/agent capabilities. This preserves the selfbot functionality while gaining NanoBot's skill system and local LLM support.

### Concrete Deliverables
- [ ] Bottus selfbot running with Discord user account (NOT bot account)
- [ ] NanoBot running as backend API service
- [ ] vLLM + Ollama integration for local LLM
- [ ] API bridge: Bottus → NanoBot communication
- [ ] Calendar skill: extract dates → store → remind → complete
- [ ] Image generation skill: ComfyUI integration
- [ ] Memory system: per-group context and long-term memory

### Definition of Done
- [ ] Bottus selfbot connects via user account (not bot)
- [ ] NanoBot API running and responding
- [ ] "lag arrangement møte imorgen kl 14" creates calendar event
- [ ] "mine arrangementer" lists events
- [ ] Reminder triggers at scheduled time
- [ ] "ferdig med møte" marks event complete
- [ ] "lag et bilde av en katt" triggers ComfyUI workflow

### Must Have
- Selfbot capability (Discord user account, NOT bot account)
- Local Ollama (no cloud services)
- Discord as primary interface via selfbot
- Calendar extraction from natural language
- Event reminders
- Completion tracking
- API bridge between Bottus and NanoBot

### Must NOT Have
- Cloud LLM APIs (Anthropic, OpenAI)
- Any feature requiring paid services
- Official Discord bot account (must use user account)
- Complex Docker setup (use local vLLM directly)

---

## Verification Strategy

### Test Infrastructure
- **Framework**: nanobot built-in testing
- **Test approach**: Manual QA via Discord messages
- **No TDD**: Skills verified through conversation testing

### QA Policy
Every task includes agent-executed QA via Discord:
- **Happy path**: Normal conversation with bot
- **Error cases**: Invalid input, missing dependencies
- **Evidence**: Discord message history as proof

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - Bottus Selfbot + Backend):
├── Task 1: Environment setup - Python, vLLM, Ollama
├── Task 2: NanoBot installation and API server setup
├── Task 3: vLLM + Ollama integration
├── Task 4: Verify Bottus selfbot still works (keep existing code)
├── Task 5: Create Bottus → NanoBot API bridge
└── Task 6: Test API communication

Wave 2 (Core Skills in NanoBot):
├── Task 7: Calendar storage system (SQLite/file)
├── Task 8: Calendar skill - event creation
├── Task 9: Calendar skill - event listing/deletion
├── Task 10: Calendar skill - date extraction from messages
├── Task 11: Calendar skill - reminders via heartbeat
├── Task 12: Calendar skill - completion tracking
└── Task 13: Image generation skill (ComfyUI)

Wave 3 (Features + Integration):
├── Task 14: Memory system setup
├── Task 15: Full Bottus → NanoBot integration test
├── Task 16: Norwegian language prompts
└── Task 17: Documentation and runbook
```

---

## TODOs

- [ ] 1. Environment Setup - Python, vLLM, Ollama

  **What to do**:
  - Install Python 3.10+ if not present
  - Install vLLM: `pip install vllm`
  - Verify Ollama is running with models pulled
  - Test vLLM serve: `vllm serve llama3.2 --port 8000`

  **Must NOT do**:
  - Don't modify existing Ollama installation
  - Don't change Ollama default port (11434)

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Straightforward setup, mostly CLI commands
  > **Skills**: []
  > **Skills Evaluated but Omitted**:
  > - None needed for environment setup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:
  - vLLM docs: `https://docs.vllm.ai/en/latest/` - Installation and serving
  - Ollama models: `ollama list` - Check available models
  - NanoBot README: Local model section

  **Acceptance Criteria**:
  - [ ] python3 --version ≥ 3.10
  - [ ] vllm --version works
  - [ ] curl http://localhost:8000/v1/models returns models

  **QA Scenarios**:
  ```
  Scenario: vLLM serving local Ollama model
    Tool: Bash
    Preconditions: Ollama running with llama3.2 model
    Steps:
      1. Run: vllm serve llama3.2 --port 8000 &
      2. Wait 10s for server startup
      3. curl http://localhost:8000/v1/models
    Expected Result: JSON response listing llama3.2 model
    Failure Indicators: Connection refused, model not found
    Evidence: .sisyphus/evidence/task-1-vllm-models.json
  ```

  **Commit**: NO

---

- [ ] 2. NanoBot Installation and Initial Config

  **What to do**:
  - Clone NanoBot: `git clone https://github.com/HKUDS/nanobot.git`
  - Install: `pip install -e .` or `uv tool install nanobot-ai`
  - Run onboard: `nanobot onboard`
  - Create config at `~/.nanobot/config.json`

  **Must NOT do**:
  - Don't install from PyPI (use source for modifications)
  - Don't skip the onboard step

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Standard installation process
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 13
  - **Blocked By**: Task 1

  **References**:
  - NanoBot README: Install section
  - NanoBot docs: Configuration

  **Acceptance Criteria**:
  - [ ] `nanobot --version` works
  - [ ] `~/.nanobot/config.json` exists
  - [ ] `nanobot status` shows config loaded

  **QA Scenarios**:
  ```
  Scenario: NanoBot installation check
    Tool: Bash
    Preconditions: None
    Steps:
      1. nanobot --version
      2. nanobot status
    Expected Result: Version displayed, config found
    Failure Indicators: Command not found, config missing
    Evidence: .sisyphus/evidence/task-2-nanobot-status.txt
  ```

  **Commit**: NO

---

- [ ] 3. Verify Bottus Selfbot Still Works

  **What to do**:
  - Keep existing Bottus code in `src/relay/` (selfbot system)
  - Verify existing selfbot connects via Discord user token
  - Test that basic message handling still works
  - This preserves the critical selfbot functionality

  **Must NOT do**:
  - Don't modify the selfbot code unless necessary
  - Don't replace with bot account (MUST stay as user account)

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Verification of existing code
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4, 5)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:
  - Bottus src/relay/ - existing selfbot implementation
  - discord.js-selfbot-v13 documentation

  **Acceptance Criteria**:
  - [ ] Bottus selfbot connects using user token
  - [ ] Bot responds to messages
  - [ ] No errors in connection

  **QA Scenarios**:
  ```
  Scenario: Bottus selfbot connection test
    Tool: interactive_bash
    Preconditions: User token in .env
    Steps:
      1. npm run start:relay
      2. Check for connection success message
      3. Send test message in Discord
    Expected Result: Connected and responding
    Failure Indicators: Connection failed, token rejected
    Evidence: .sisyphus/evidence/task-3-selfbot-test.txt
  ```

  **Commit**: NO

---

- [ ] 4. vLLM + Ollama Integration

  **What to do**:
  - Configure vLLM provider in config.json
  - Set model to Ollama model (e.g., llama3.2)
  - Test: `nanobot agent -m "Hello"`
  - Verify it uses local model

  **Must NOT do**:
  - Don't use cloud providers (openrouter, anthropic)
  - Don't set wrong port for vLLM

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Configuration update
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:
  - NanoBot README: vLLM configuration section
  - vLLM serving command

  **Acceptance Criteria**:
  - [ ] config.json has vLLM provider
  - [ ] vLLM server running on port 8000
  - [ ] `nanobot status` shows vLLM connected
  - [ ] Test message returns response

  **QA Scenarios**:
  ```
  Scenario: NanoBot using local Ollama model
    Tool: interactive_bash
    Preconditions: vLLM running, config set
    Steps:
      1. nanobot agent -m "Say hello in one word"
    Expected Result: Response from local model (not cloud)
    Failure Indicators: API errors, wrong model used
    Evidence: .sisyphus/evidence/task-4-ollama-test.txt
  ```

  **Commit**: NO

---

- [ ] 5. Integrate NanoBot as Python Library

  **What to do**:
  - Install NanoBot as a Python dependency in Bottus project
  - Import and initialize `AgentLoop` directly in Bottus
  - Call `agent.process_direct(message)` from Bottus handlers
  - This avoids HTTP overhead and simplifies the architecture

  **Key Integration Code**:
  ```python
  # In Bottus (or as a subprocess)
  import asyncio
  from nanobot.agent.loop import AgentLoop
  from nanobot.providers.litellm_provider import LiteLLMProvider
  
  # Initialize once at startup
  provider = LiteLLMProvider(
      api_key="dummy",  # For local vLLM
      api_base="http://localhost:8000/v1",
      default_model="llama3.2"
  )
  agent = AgentLoop(
      bus=bus,
      provider=provider,
      workspace=Path("~/.nanobot/workspace"),
      model="llama3.2",
      max_iterations=20
  )
  
  # Call from Bottus handler
  response = await agent.process_direct(user_message, session_key=discord_channel_id)
  ```

  **Must NOT do**:
  - Don't run separate NanoBot gateway (use as library)
  - Don't expose NanoBot API over HTTP

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: Python library integration
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4)
  - **Blocks**: Task 6, Task 15
  - **Blocked By**: Task 3, Task 4

  **References**:
  - NanoBot source: `nanobot/agent/loop.py` - AgentLoop class
  - NanoBot docs: "Build Custom Agent Application" example
  - vLLM serving: `vllm serve llama3.2 --port 8000`

  **Acceptance Criteria**:
  - [ ] NanoBot imports successfully in Bottus
  - [ ] AgentLoop initializes with vLLM provider
  - [ ] `process_direct()` returns response
  - [ ] Response appears in Discord

  **QA Scenarios**:
  ```
  Scenario: Bottus integrates NanoBot library
    Tool: interactive_bash
    Preconditions: vLLM running, NanoBot installed
    Steps:
      1. Run Bottus selfbot
      2. Send message in Discord: "hei"
    Expected Result: Response from NanoBot (via Ollama/vLLM) in Discord
    Failure Indicators: Import error, no response, timeout
    Evidence: .sisyphus/evidence/task-5-library-integration.txt
  ```

  **Commit**: YES
  - Message: `feat(integration): embed NanoBot as Python library`
  - Files: `src/relay/nanobot-agent.ts` (Node wrapper), integration code

---

- [ ] 6. Calendar Storage System
    Failure Indicators: No response, API error, timeout
    Evidence: .sisyphus/evidence/task-5-api-bridge.txt
  ```

  **Commit**: YES
  - Message: `feat(integration): add Bottus → NanoBot API bridge`
  - Files: `src/relay/nanobot-client.ts`

---

- [ ] 6. Calendar Storage System

  **What to do**:
  - Create storage structure in workspace: `~/.nanobot/workspace/calendar/`
  - Use JSON file for events: `events.json`
  - Structure: `{ "events": [{ "id": "", "title": "", "datetime": "", "reminded": false, "completed": false }] }`
  - Create helper functions for CRUD operations

  **Must NOT do**:
  - Don't use external database (keep simple)
  - Don't mix with NanoBot's internal state

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple file operations
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-10)
  - **Blocks**: Tasks 6-10
  - **Blocked By**: Task 4

  **References**:
  - NanoBot workspace structure
  - JSON file operations in Python

  **Acceptance Criteria**:
  - [ ] Directory ~/.nanobot/workspace/calendar/ exists
  - [ ] events.json initialized as valid JSON
  - [ ] CRUD functions work

  **QA Scenarios**:
  ```
  Scenario: Calendar storage initialized
    Tool: Bash
    Preconditions: Workspace exists
    Steps:
      1. ls -la ~/.nanobot/workspace/calendar/
      2. cat ~/.nanobot/workspace/calendar/events.json
    Expected Result: Directory exists, file is valid JSON with empty events array
    Failure Indicators: Directory missing, invalid JSON
    Evidence: .sisyphus/evidence/task-5-storage.txt
  ```

  **Commit**: YES
  - Message: `feat(calendar): add storage system`
  - Files: `~/.nanobot/workspace/calendar/events.json`

---

- [ ] 10. Calendar Skill - Event Creation

  **What to do**:
  - Create skill file: `~/.nanobot/workspace/skills/calendar/SKILL.md`
  - Trigger: Norwegian phrases like "lag arrangement", "planlegg", "afternoon"
  - Extract: title, datetime from message
  - Store in events.json
  - Confirm to user with formatted message

  **Must NOT do**:
  - Don't create duplicate events
  - Don't accept empty titles

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: Skill development with LLM prompt engineering
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7-10)
  - **Blocks**: Task 13
  - **Blocked By**: Task 5

  **References**:
  - NanoBot skill format: SKILL.md with frontmatter
  - Norwegian date parsing examples
  - Existing calendar features in Bottus

  **Acceptance Criteria**:
  - [ ] Skill file created at correct path
  - [ ] "lag arrangement møte imorgen kl 14" creates event
  - [ ] Confirmation message returned
  - [ ] Event appears in events.json

  **QA Scenarios**:
  ```
  Scenario: Create calendar event via Discord
    Tool: dev-browser (Discord)
    Preconditions: NanoBot gateway running, Discord connected
    Steps:
      1. Send: "@bot lag arrangement møte imorgen kl 14"
      2. Wait for response
    Expected Result: Event created, confirmation shown
    Failure Indicators: No response, error message, event not saved
    Evidence: .sisyphus/evidence/task-6-create-event.png
  ```

  **Commit**: YES
  - Message: `feat(calendar): add event creation skill`
  - Files: `~/.nanobot/workspace/skills/calendar/SKILL.md`

---

- [ ] 11. Calendar Skill - Event Listing and Deletion

  **What to do**:
  - Add list functionality to skill
  - Trigger: "mine arrangementer", "hva har jeg", "list events"
  - Format: Nice list with dates/times
  - Add delete: "slett arrangement", "fjern event"
  - Confirm deletion

  **Must NOT do**:
  - Don't show completed events in active list (or mark them)
  - Don't allow deleting others' events

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: Skill extension
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8-10)
  - **Blocks**: Task 13
  - **Blocked By**: Task 5

  **References**:
  - Task 6 skill file

  **Acceptance Criteria**:
  - [ ] "mine arrangementer" shows all non-completed events
  - [ ] "slett møte" removes event
  - [ ] Confirmation shown

  **QA Scenarios**:
  ```
  Scenario: List calendar events
    Tool: dev-browser (Discord)
    Preconditions: Events exist
    Steps:
      1. Send: "@bot mine arrangementer"
    Expected Result: Formatted list of events
    Failure Indicators: Empty response, wrong events shown
    Evidence: .sisyphus/evidence/task-7-list-events.png
  ```

  **Commit**: YES
  - Message: `feat(calendar): add list/delete functionality`
  - Files: `~/.nanobot/workspace/skills/calendar/SKILL.md`

---

- [ ] 13. Calendar Skill - Date Extraction from Messages

  **What to do**:
  - Use LLM to extract dates from natural Norwegian
  - Handle: "imorgen", "i dag", "neste mandag", "kl 14", "15. feb"
  - Parse to ISO datetime
  - Handle relative dates correctly
  - Ask user for clarification if unclear

  **Must NOT do**:
  - Don't assume wrong dates
  - Don't create events with past dates without confirmation

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: LLM prompt engineering for date extraction
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-7, 9-10)
  - **Blocks**: Task 13
  - **Blocked By**: Task 5

  **References**:
  - Bottus date extraction logic (if available)
  - Python dateparser library

  **Acceptance Criteria**:
  - [ ] "imorgen kl 14" → tomorrow 14:00
  - [ ] "i formiddag" → today morning
  - [ ] "neste fredag" → next Friday date
  - [ ] Ambiguous dates trigger clarification

  **QA Scenarios**:
  ```
  Scenario: Date extraction various formats
    Tool: interactive_bash
    Preconditions: Skill loaded
    Steps:
      1. Test various Norwegian date phrases via nanobot
    Expected Result: Correct ISO datetime extracted each time
    Failure Indicators: Wrong parsing, crashes
    Evidence: .sisyphus/evidence/task-8-date-extraction.txt
  ```

  **Commit**: YES
  - Message: `feat(calendar): add Norwegian date extraction`
  - Files: `~/.nanobot/workspace/skills/calendar/SKILL.md`

---

- [ ] 12. Calendar Skill - Reminders via Heartbeat

  **What to do**:
  - Configure heartbeat/periodic check in NanoBot
  - Check events.json every 15 minutes
  - Find events where: now >= datetime - 15min AND not reminded
  - Send DM or channel message: "Reminder: [event] om 15 minutter!"
  - Mark as reminded: true

  **Must NOT do**:
  - Don't remind multiple times
  - Don't remind for completed events

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: Cron/heartbeat configuration
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-8, 10)
  - **Blocks**: Task 13
  - **Blocked By**: Task 5

  **References**:
  - NanoBot heartbeat/HEARTBEAT.md documentation
  - Cron syntax

  **Acceptance Criteria**:
  - [ ] HEARTBEAT.md configured with calendar check
  - [ ] Reminder sent 15 min before event
  - [ ] Only sent once per event

  **QA Scenarios**:
  ```
  Scenario: Event reminder triggered
    Tool: dev-browser (Discord)
    Preconditions: Event in 15 min
    Steps:
      1. Wait for heartbeat check (15 min)
      2. Check for reminder message
    Expected Result: Reminder message received
    Failure Indicators: No reminder, multiple reminders
    Evidence: .sisyphus/evidence/task-9-reminder.png
  ```

  **Commit**: YES
  - Message: `feat(calendar): add event reminders`
  - Files: `~/.nanobot/workspace/HEARTBEAT.md`

---

- [ ] 14. Calendar Skill - Completion Tracking

  **What to do**:
  - Add completion trigger: "ferdig med", "completed", "done"
  - Match event by name or show list to choose
  - Mark event.completed = true
  - Optionally ask: "Vil du slette den eller beholde den?"
  - Keep completed events for history

  **Must NOT do**:
  - Don't delete completed events (keep history)
  - Don't mark wrong events complete

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: Skill extension
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-9)
  - **Blocks**: Task 13
  - **Blocked By**: Task 5

  **References**:
  - Tasks 6-7 skill files

  **Acceptance Criteria**:
  - [ ] "ferdig med møte" marks event complete
  - [ ] Completed events shown differently in list
  - [ ] History preserved

  **QA Scenarios**:
  ```
  Scenario: Mark event complete
    Tool: dev-browser (Discord)
    Preconditions: Event exists
    Steps:
      1. Send: "@bot ferdig med møte"
    Expected Result: Event marked complete, confirmation
    Failure Indicators: Wrong event marked, error
    Evidence: .sisyphus/evidence/task-10-complete.png
  ```

  **Commit**: YES
  - Message: `feat(calendar): add completion tracking`
  - Files: `~/.nanobot/workspace/skills/calendar/SKILL.md`

---

- [ ] 11. Image Generation Skill (ComfyUI)

  **What to do**:
  - Create skill for ComfyUI integration
  - Trigger: "lag et bilde av", "generate image", "tegn"
  - Use LLM to enhance/translate prompt (Norwegian → English)
  - Call ComfyUI API (localhost:8188)
  - Return image URL to user

  **Must NOT do**:
  - Don't call ComfyUI without LLM prompt enhancement
  - Don't expose ComfyUI to outside

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: External API integration skill
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12-15)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 5-10

  **References**:
  - Bottus ComfyUI integration (if available)
  - ComfyUI API documentation

  **Acceptance Criteria**:
  - [ ] "lag et bilde av en katt" generates image
  - [ ] Norwegian prompts translated to English
  - [ ] Image returned to Discord

  **QA Scenarios**:
  ```
  Scenario: Generate image via Discord
    Tool: dev-browser (Discord)
    Preconditions: ComfyUI running
    Steps:
      1. Send: "@bot lag et bilde av en koselig katt"
    Expected Result: Image generated and shown
    Failure Indicators: No response, error, wrong image
    Evidence: .sisyphus/evidence/task-11-image-gen.png
  ```

  **Commit**: YES
  - Message: `feat(image): add ComfyUI skill`
  - Files: `~/.nanobot/workspace/skills/image/SKILL.md`

---

- [ ] 12. Memory System Setup

  **What to do**:
  - Configure per-group memory via CLAUDE.md or GROUP.md
  - Set up AGENTS.md for behavior
  - Configure IDENTITY.md/SOUL.md for personality
  - Enable long-term memory via MEMORY.md

  **Must NOT do**:
  - Don't leak private context between groups
  - Don't over-share user info

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Configuration files
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13-15)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 5-10

  **References**:
  - NanoBot workspace layout docs

  **Acceptance Criteria**:
  - [ ] AGENTS.md exists with Norwegian bot personality
  - [ ] IDENTITY.md has bot name (Ine)
  - [ ] Memory persists between sessions

  **QA Scenarios**:
  ```
  Scenario: Memory persistence
    Tool: dev-browser (Discord)
    Preconditions: Bot has context
    Steps:
      1. Tell bot something: "Jeg liker pizza"
      2. Restart bot
      3. Ask: "Hva liker jeg?"
    Expected Result: Remembers preference
    Failure Indicators: Forgets, wrong info
    Evidence: .sisyphus/evidence/task-12-memory.png
  ```

  **Commit**: YES
  - Message: `feat(memory): configure persistent memory`
  - Files: `~/.nanobot/workspace/AGENTS.md`, `~/.nanobot/workspace/IDENTITY.md`

---

- [ ] 13. Full Discord Integration Test

  **What to do**:
  - Start gateway: `nanobot gateway`
  - Test all features via Discord
  - Verify @mention works
  - Test error handling
  - Check logging

  **Must NOT do**:
  - Don't deploy untested
  - Don't skip error cases

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: Integration testing
  > **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12, 14-15)
  - **Blocks**: None
  - **Blocked By**: Tasks 4, 5-12

  **References**:
  - All previous tasks

  **Acceptance Criteria**:
  - [ ] Gateway starts without errors
  - [ ] @mention triggers response
  - [ ] Calendar CRUD works end-to-end
  - [ ] Image generation works
  - [ ] Errors handled gracefully

  **QA Scenarios**:
  ```
  Scenario: Full Discord integration
    Tool: dev-browser (Discord)
    Preconditions: Gateway running
    Steps:
      1. Test: "@bot hi"
      2. Test: "@bot lag arrangement test imorgen"
      3. Test: "@bot mine arrangementer"
      4. Test: "@bot ferdig med test"
      5. Test: "@bot lag et bilde av en hund"
    Expected Result: All commands work correctly
    Failure Indicators: Any command fails
    Evidence: .sisyphus/evidence/task-13-integration.txt
  ```

  **Commit**: YES
  - Message: `test: add Discord integration tests`
  - Files: `.sisyphus/evidence/` (test results)

---

- [ ] 14. Norwegian Language Prompts

  **What to do**:
  - Translate skill prompts to Norwegian
  - Ensure bot responds in Norwegian by default
  - Add Norwegian-specific date/time handling
  - Configure LLM to prefer Norwegian responses

  **Must NOT do**:
  - Don't break English fallback

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Prompt tuning
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-13, 15)
  - **Blocks**: None
  - **Blocked By**: Tasks 4, 5-12

  **References**:
  - Task 6-10 skill files

  **Acceptance Criteria**:
  - [ ] Bot responds in Norwegian
  - [ ] Norwegian dates parsed correctly
  - [ ] All trigger phrases in Norwegian work

  **QA Scenarios**:
  ```
  Scenario: Norwegian language
    Tool: dev-browser (Discord)
    Preconditions: None
    Steps:
      1. Send: "@bot hei, lag et arrangement idag kl 10"
    Expected Result: Norwegian response, correct date
    Failure Indicators: English response, wrong parsing
    Evidence: .sisyphus/evidence/task-14-norwegian.png
  ```

  **Commit**: YES
  - Message: `feat(i18n): add Norwegian language support`
  - Files: `~/.nanobot/workspace/skills/**/*.md`

---

- [ ] 15. Documentation and Runbook

  **What to do**:
  - Create README in workspace with commands
  - Document how to start/stop bot
  - Document how to add new skills
  - Document troubleshooting steps

  **Must NOT do**:
  - Don't include sensitive info (tokens)

  **Recommended Agent Profile**:
  > **Category**: `writing`
  > - Reason: Documentation
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-14)
  - **Blocks**: None
  - **Blocked By**: Tasks 4, 5-12

  **References**:
  - All previous work

  **Acceptance Criteria**:
  - [ ] README.md created in workspace
  - [ ] Start/stop commands documented
  - [ ] Troubleshooting section included

  **QA Scenarios**:
  ```
  Scenario: Documentation exists
    Tool: read
    Preconditions: None
    Steps:
      1. Read ~/.nanobot/workspace/README.md
    Expected Result: Complete documentation
    Failure Indicators: Missing sections
    Evidence: .sisyphus/evidence/task-15-readme.md
  ```

  **Commit**: YES
  - Message: `docs: add workspace runbook`
  - Files: `~/.nanobot/workspace/README.md`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`

  Read the plan and verify each Must Have is implemented. Check that no Must NOT Have items exist.
  Output: `Must Have [15/15] | Must NOT Have [0 found] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Integration Test** — `unspecified-high`

  Run full Discord test suite covering all features. Test edge cases and error conditions.
  Output: `Features [N/N working] | Edge Cases [N tested] | VERDICT`

- [ ] F3. **Performance Check** — `quick`

  Verify vLLM response times are acceptable. Check memory usage.
  Output: `Response Time: <Xs | Memory: <X MB | VERDICT`

---

## Commit Strategy

- **Batch 1** (after Task 4): `chore: initial NanoBot setup`
- **Batch 2** (after Task 5): `feat(calendar): add storage system`
- **Batch 3** (after Task 10): `feat(calendar): full calendar skill`
- **Batch 4** (after Task 12): `feat: add memory and image skills`
- **Batch 5** (after Task 15): `chore: documentation and final polish`

---

## Success Criteria

### Verification Commands
```bash
# Start vLLM
vllm serve llama3.2 --port 8000 &

# Start NanoBot
nanobot gateway

# Test in Discord
@bot mine arrangementer
@bot lag arrangement test imorgen kl 14
@bot ferdig med test
@bot lag et bilde av en katt
```

### Final Checklist
- [ ] NanoBot runs with local Ollama via vLLM
- [ ] Discord bot connected and responding
- [ ] Calendar: create, list, delete, complete all work
- [ ] Reminders trigger at correct time
- [ ] Image generation via ComfyUI works
- [ ] Norwegian language supported
- [ ] Documentation complete
