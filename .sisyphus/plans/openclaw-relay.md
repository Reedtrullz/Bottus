# Plan: OpenClaw Relay for Ine-Discord

## TL;DR

> Build a bidirectional relay between a Discord Group DM and OpenClaw running in Docker. The relay forwards messages (triggered by @mention) from Discord to OpenClaw, then posts responses back to Discord. Replace the existing AI Discord bot plan entirely.

> **Deliverables**:
> - Docker Compose setup with OpenClaw + Ine relay service
> - Ine relay bot using a user account (not bot API) for Group DM access
> - Message relay logic with mention-only trigger
> - Minimal conversation history handling
> - Error handling with user-facing messages

> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential (4 tasks)
> **Critical Path**: Docker setup → OpenClaw config → Relay bot → Integration

---

## Context

### Original Request
User wants to run OpenClaw in Docker with the Ine-Discord bot acting as a relay layer between a Discord Group DM and OpenClaw.

### Key Decisions from Interview
- **Relay Direction**: Bidirectional (Discord ↔ OpenClaw)
- **Trigger**: @mention only in Group DM
- **Bot Identity**: Named "Ine", using user account (not bot API) for Group DM access
- **AI Provider**: Ollama (local) - model to be decided later
- **History**: Minimal - amount to be decided
- **Error Handling**: User-facing error message when OpenClaw unavailable
- **Scope**: Replace existing AI Discord bot plan entirely

### Research Findings
- **OpenClaw Gateway**: Port 18789, HTTP endpoint `/v1/responses`, WebSocket API
- **Authentication**: Bearer token required
- **Configuration**: `/v1/responses` endpoint needs enabling in config
- **Docker**: OpenClaw provides official Docker Compose setup

### Metis Review
**Critical Finding (addressed)**:
- Discord bots have limited access to Group DMs
- **Resolution**: User will use a user account instead of bot API

---

## Work Objectives

### Core Objective
Deliver a working Docker-based relay that forwards @mention messages from a Discord Group DM to OpenClaw and posts responses back to Discord.

### Concrete Deliverables
- [x] 1. Docker Compose configuration with OpenClaw + Ine relay
- [x] 2. OpenClaw configured with Ollama provider (model deferred)
- [x] 3. Ine relay service using user account authentication
- [x] 4. Message relay with @mention trigger
- [x] 5. Basic conversation history (minimal)
- [x] 6. Error handling when OpenClaw unavailable

### Definition of Done
- [ ] Docker Compose starts both services successfully
- [ ] Messages with @Ine in Group DM are forwarded to OpenClaw
- [ ] OpenClaw responses are posted back to the Group DM
- [ ] Error message shown when OpenClaw is unreachable
- [ ] No messages forwarded unless @Ine is mentioned

### Must Have
- OpenClaw running in Docker with gateway accessible
- Relay service can connect to Discord using user account
- Messages trigger only on @mention
- Clean error handling with user feedback

### Must NOT Have
- No messages forwarded without explicit @mention
- No exposure of internal tokens in logs
- No blocking on slow OpenClaw responses (timeout handling)

---

## Verification Strategy

### Test Strategy
- No formal test framework for this short project
- Manual testing via Discord Group DM
- curl tests for OpenClaw API connectivity

### QA Policy
Every task includes manual verification steps (Agent-Executed QA via direct testing).
- Evidence files will be created during task execution (not pre-existing)

---

## Execution Strategy

### Sequential Execution (4 tasks)

**Task 1: Docker Compose Setup**
- Configure Docker Compose with OpenClaw + Ine relay service
- Set up networking between services
- Configure environment variables

**Task 2: OpenClaw Configuration**
- Set up OpenClaw with Ollama provider
- Enable HTTP endpoint for relay access
- Configure authentication token

**Task 3: Ine Relay Bot**
- Implement relay bot using Discord user account
- Add @mention detection
- Add message forwarding to OpenClaw
- Add response posting back to Discord
- Add minimal history handling

**Task 4: Integration & Testing**
- End-to-end relay testing
- Error handling verification

---

## TODOs

- [x] 1. Docker Compose Setup

  **What to do**:
  - Create docker-compose.yml with two services: openclaw and ine-relay
  - Configure shared network for internal communication
  - Set up volume mounts for OpenClaw workspace and config
  - Configure environment variables for ports and tokens
  - Add healthcheck for OpenClaw gateway

  **Acceptance Criteria**:
  - [ ] docker-compose config is valid (docker compose config)
  - [ ] Both services start without errors (docker compose up -d)
  - [ ] OpenClaw gateway reachable on port 18789

  **QA Scenarios**:
  - Happy Path: `docker compose up -d` starts both containers; `curl http://localhost:18789/health` returns 200
  - Negative: Port 18789 already in use - proper error message

  **Evidence**: .sisyphus/evidence/task-1-docker-compose.md

- [x] 2. OpenClaw Configuration with Ollama

  **What to do**:
  - Configure OpenClaw to use Ollama as AI provider
  - Enable `/v1/responses` HTTP endpoint
  - Set up authentication token
  - Document configuration for future model selection

  **Acceptance Criteria**:
  - [ ] OpenClaw can connect to local Ollama instance
  - [ ] HTTP endpoint responds to test requests
  - [ ] Authentication token configured and working

  **QA Scenarios**:
  - Happy Path: `curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:18789/v1/responses -d '{"input":"hello"}'` returns valid response
  - Negative: Ollama not running - error in OpenClaw logs

  **Evidence**: .sisyphus/evidence/task-2-openclaw-config.md

- [x] 3. Ine Relay Bot Implementation

  **What to do**:
  - Create relay bot using Discord user account authentication
  - Implement Group DM message listener
  - Add @Ine mention detection (case-insensitive)
  - Forward mentioned messages to OpenClaw via HTTP
  - Post OpenClaw responses back to the Group DM
  - Add minimal conversation history (last 5 messages)
  - Add timeout handling (30 second max wait)
  - Add error message reply when OpenClaw unavailable

  **Acceptance Criteria**:
  - [ ] Relay bot connects to Discord using user credentials
  - [ ] Messages with @Ine trigger relay to OpenClaw
  - [ ] Responses from OpenClaw are posted to the Group DM
  - [ ] Error message shown when OpenClaw times out or is unavailable
  - [ ] Non-mentioned messages are ignored

  **QA Scenarios**:
  - Happy Path: Send message "@Ine hello" in Group DM; bot forwards to OpenClaw; response posted back
  - Negative: Send message without @mention; nothing happens (no relay)
  - Negative: OpenClaw down; error message posted to Group DM

  **Evidence**: .sisyphus/evidence/task-3-relay-bot.md

- [x] 4. Integration Testing

  **What to do**:
  - Full end-to-end relay test
  - Verify error scenarios work correctly
  - Document any remaining issues

  **Acceptance Criteria**:
  - [ ] Complete message flow works: Discord → OpenClaw → Discord
  - [ ] Error handling works for unavailable OpenClaw
  - [ ] @mention trigger works reliably

  **QA Scenarios**:
  - Full flow test with multiple messages
  - Error recovery test

  **Evidence**: .sisyphus/evidence/task-4-integration.md

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — Verify all acceptance criteria met
- [ ] F2. **Code Quality Review** — Check for hardcoded tokens, proper error handling
- [ ] F3. **Real Manual QA** — Full end-to-end test in Discord Group DM

---

## Technical Notes

### OpenClaw Gateway API
- **Port**: 18789 (default)
- **HTTP Endpoint**: POST `/v1/responses` (needs enabling in config)
- **Auth**: Bearer token in Authorization header
- **WebSocket**: Available for streaming responses

### Docker Network
- Both services on shared `openclaw-network`
- Ine relay accesses OpenClaw via `http://openclaw-gateway:18789`

### History Handling
- Minimal: Last 5 messages per conversation thread
- Stored in memory (not persisted)
- Cleared on bot restart

---

## Commit Strategy

- Single commit after all tasks complete
- Message: `feat: add OpenClaw relay for Ine-Discord`
- Files: docker-compose.yml, relay bot code, config

---

## Success Criteria

### Verification Commands
```bash
docker compose config                           # Valid config
docker compose up -d                           # Services start
curl http://localhost:18789/health             # OpenClaw healthy
```

### Final Checklist
- [ ] Docker Compose starts successfully
- [ ] OpenClaw gateway accessible
- [ ] Relay forwards @mentioned messages
- [ ] Responses posted back to Discord
- [ ] Error handling works
