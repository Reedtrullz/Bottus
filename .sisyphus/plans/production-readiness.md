# Production Readiness Plan

## TL;DR

> **Quick Summary**: Wire self-healing into message pipeline, add graceful shutdown, structured logging, health endpoint, env validation, and rate limiting.
> 
> **Deliverables**:
> - Self-healing wrapper around skill execution
> - Structured logging throughout relay
> - Health check endpoint on port 3001
> - Environment validation on startup
> - Graceful shutdown handling
> - Per-user rate limiting (15 msg/min)
> - All lint warnings fixed
> 
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Lint fixes → Self-healing wrapper → Logging → Production infra → Rate limiting

---

## Context

### Original Request
User wants the bot "production ready" - everything wired in, not just services sitting there unused.

### Requirements Confirmed
- Self-healing wired into message pipeline
- Graceful shutdown handling
- Structured logging throughout
- Health check endpoint (port 3001)
- Environment validation on startup
- Rate limiting (15 msg/min per user)
- Logging format: Pretty (human-readable)

### Architecture Analysis

**Message Flow:**
1. `discord.on('mention')` → line ~597 in relay/index.ts
2. Help handler check → line ~625
3. Skill dispatch at line 637-642 via `skillRegistry.findHandler()`
4. Individual skill `.handle()` called directly WITHOUT error wrapping
5. Image handler → line 645
6. More fallback handlers...

**Error Handling Gaps:**
- Skills called directly without try/catch in relay
- No retry logic on skill failures
- No circuit breaker on external services
- No structured logging - just console.log everywhere

**Services Available (not wired):**
- `ErrorClassifier` - error categorization (src/services/error-classifier.ts)
- `HealthMonitor` - Ollama/ComfyUI health checks (src/services/health-monitor.ts)
- `SelfHealer` - executeWithHealing wrapper (src/services/self-healer.ts)
- `CircuitBreaker` - from utils/error-recovery.ts

---

## Work Objectives

### Core Objective
Transform the relay bot from "has components" to "production ready" by wiring everything together.

### Concrete Deliverables
- `src/utils/logger.ts` - Structured logger with levels
- `src/relay/health.ts` - Health endpoint on port 3001
- `src/relay/shutdown.ts` - Graceful SIGTERM/SIGINT handling
- `src/utils/env-validator.ts` - Required env vars check
- Skill wrapper in relay/index.ts with self-healing
- Rate limiter in relay/index.ts
- All lint warnings fixed

### Definition of Done
- [ ] `npm run build` passes with 0 warnings
- [ ] Health endpoint returns 200 on localhost:3001/health
- [ ] SIGTERM cleanly shuts down (no orphan processes)
- [ ] Missing env vars cause startup failure with clear message
- [ ] Failed skill returns graceful error to user
- [ ] Rate limited users see backoff message

### Must Have
- Self-healing on skill execution
- Health checks for Ollama/ComfyUI
- Graceful shutdown
- Environment validation

### Must NOT Have
- console.log statements (replaced with logger)
- Unhandled promise rejections
- Skills that crash the bot on external failure

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after (existing + new)
- **Framework**: vitest

### QA Policy
Every task includes agent-executed QA:
- **Build**: `npm run build` must pass
- **Type check**: `npx tsc --noEmit` must pass
- **Lint**: `npx biome check .` must pass (after fixes)
- **Health**: `curl localhost:3001/health` returns 200

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - can run in parallel):
├── Task 1: Fix lint warnings in calendar-skill-v2.ts
├── Task 2: Fix lint warnings in memory-skill.ts
├── Task 3: Create structured logger (src/utils/logger.ts)
└── Task 4: Create environment validator (src/utils/env-validator.ts)

Wave 2 (Core Integration - depends on Wave 1):
├── Task 5: Add self-healing wrapper to skill dispatch
├── Task 6: Add fallback responses for each skill type
├── Task 7: Add health checks before Ollama/ComfyUI calls
├── Task 8: Replace console.log with logger in relay
└── Task 9: Create health endpoint (port 3001)

Wave 3 (Production Polish - depends on Wave 2):
├── Task 10: Add graceful shutdown handler
├── Task 11: Add per-user rate limiting (15/min)
├── Task 12: Add startup banner with version
└── Task 13: Integration test - full flow works
```

### Dependency Matrix
- **1-4**: — — All depend on nothing
- **5-9**: 3, 4 — All depend on Wave 1 completing
- **10-13**: 5, 6, 7, 8, 9 — All depend on Wave 2 completing

---

## TODOs

- [ ] 1. Fix lint warnings in calendar-skill-v2.ts

  **What to do**:
  - Fix unused imports (use `import type` or remove)
  - Fix unused variables `e` at lines 140, 174 (use `_e` or remove)
  - Fix template literal suggestions at lines 167, 223
  - Fix optional chain suggestions at lines 132, 165

  **Must NOT do**:
  - Don't change business logic - only lint fixes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple lint fixes, no logic changes
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - N/A - straightforward fixes

  **Parallelization**:
  - **Can Run In Parallel**: YES (with tasks 2, 3, 4)
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 5, 6, 7, 8
  - **Blocked By**: None

  **References**:
  - `src/relay/skills/calendar-skill-v2.ts` - Lines with warnings from lsp_diagnostics

  **Acceptance Criteria**:
  - [ ] lsp_diagnostics shows 0 warnings for calendar-skill-v2.ts

  **Commit**: YES (group with 2)
  - Message: `fix(lint): resolve warnings in skill files`
  - Files: `src/relay/skills/calendar-skill-v2.ts`

- [ ] 2. Fix lint warnings in memory-skill.ts

  **What to do**:
  - Fix unused imports (use `import type` or remove)
  - Fix any types at lines 79, 96

  **Must NOT do**:
  - Don't change business logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: YES (with Tasks 1, 3, 4)
    - **Parallel Group**: Wave 1
    - **Blocks**: Task 5
    - **Blocked By**: None

  **References**:
  - `src/relay/skills/memory-skill.ts` - Lines with warnings from lsp_diagnostics

  **Acceptance Criteria**:
  - [ ] lsp_diagnostics shows 0 warnings for memory-skill.ts

  **Commit**: YES (group with 1)
  - Message: `fix(lint): resolve warnings in skill files`
  - Files: `src/relay/skills/memory-skill.ts`

- [ ] 3. Create structured logger

  **What to do**:
  - Create `src/utils/logger.ts`
  - Export functions: debug, info, warn, error
  - Each takes (context: string, message: string, meta?: object)
  - Format: `[TIMESTAMP] [LEVEL] [CONTEXT] MESSAGE {meta}`
  - Use chalk or ANSI colors for level (blue=debug, green=info, yellow=warn, red=error)
  - Add request ID support (optional param)

  **Must NOT do**:
  - Don't use JSON format (user wants pretty)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: YES (with Tasks 1, 2, 4)
    - **Parallel Group**: Wave 1
    - **Blocks**: Task 8
    - **Blocked By**: None

  **References**:
  - Existing console.log pattern in relay/index.ts - replace with logger.info
  - src/utils/error-recovery.ts - for context on existing patterns

  **Acceptance Criteria**:
  - [ ] File created: src/utils/logger.ts
  - [ ] logger.info('[Relay]', 'test') outputs formatted log

  **Commit**: YES (group with 4)
  - Message: `feat(logging): add structured logger`
  - Files: `src/utils/logger.ts`

- [ ] 4. Create environment validator

  **What to do**:
  - Create `src/utils/env-validator.ts`
  - Export function validateEnv(): Promise<void>
  - Check required vars: DISCORD_TOKEN, OLLAMA_URL
  - Warn (not fail) on optional: COMFYUI_URL, COMFYUI_MODEL
  - Throw clear error with list of missing vars
  - Call at startup in relay/index.ts

  **Must NOT do**:
  - Don't fail on optional vars

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: YES (with Tasks 1, 2, 3)
    - **Parallel Group**: Wave 1
    - **Blocked By**: None

  **References**:
  - Existing dotenv usage in relay/index.ts

  **Acceptance Criteria**:
  - [ ] File created: src/utils/env-validator.ts
  - [ ] Missing required vars throws error with message

  **Commit**: YES (group with 3)
  - Message: `feat(config): add environment validation`
  - Files: `src/utils/env-validator.ts`

- [ ] 5. Add self-healing wrapper to skill dispatch

  **What to do**:
  - In relay/index.ts around line 637-642
  - Wrap skill.handle() with selfHealer.executeWithHealing()
  - Import { selfHealer } from '../services/self-healer.js'
  - Add onRetry and onHeal callbacks that log
  - Import logger from '../utils/logger.js'

  **Must NOT do**:
  - Don't change skill logic - just wrap it

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration work, need to understand skill interface
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Blocks**: Task 13
    - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - src/relay/index.ts:637-642 - current skill dispatch
  - src/services/self-healer.ts:executeWithHealing - API to use

  **Acceptance Criteria**:
  - [ ] Failed skill logs error and returns gracefully
  - [ ] Bot doesn't crash on skill error

  **Commit**: YES (group with 6, 7)
  - Message: `feat(self-healing): wrap skill execution`
  - Files: `src/relay/index.ts`

- [ ] 6. Add fallback responses for each skill type

  **What to do**:
  - Create fallback function that sends user-friendly error
  - Calendar: "Kunne ikke hente kalenderen. Prøv igjen senere."
  - Memory: "Kunne ikke lagre minnet. Prøv igjen."
  - Image: "Kunne ikke generere bildet. Prøv igjen."
  - DayDetails: "Kunne ikke hente detaljer. Prøv igjen."
  - Connect to selfHealer fallback option

  **Must NOT do**:
  - Don't expose internal errors to users

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Blocks**: Task 13
    - **Blocked By**: Tasks 1, 2, 3

  **Acceptance Criteria**:
  - [ ] User sees friendly message on skill failure

  **Commit**: YES (group with 5, 7)
  - Message: `feat(self-healing): add skill fallbacks`

- [ ] 7. Add health checks before Ollama/ComfyUI calls

  **What to do**:
  - In relay/index.ts before calling Ollama
  - Import { healthMonitor } from '../services/health-monitor.js'
  - Check healthMonitor.checkOllama() before chat call
  - If unhealthy, return early with message
  - Same for ComfyUI before image generation
  - Use cached result (won't hit API every call)

  **Must NOT do**:
  - Don't block on health checks - use cached

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Blocks**: Task 9 (health endpoint uses this)
    - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - src/services/health-monitor.ts:checkOllama, checkComfyUI

  **Acceptance Criteria**:
  - [ ] Unhealthy Ollama returns message to user

  **Commit**: YES (group with 5, 6)
  - Message: `feat(health): check before external calls`

- [ ] 8. Replace console.log with logger in relay

  **What to do**:
  - In relay/index.ts
  - Replace all console.log with logger.info/debug
  - Replace console.error with logger.error
  - Keep user-facing messages as is (those go to Discord)
  - Add [Relay] context to all logs

  **Must NOT do**:
  - Don't remove user-facing console.log (the ones that send to Discord)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Blocked By**: Tasks 1, 2, 3

  **Acceptance Criteria**:
  - [ ] No console.log in relay except user messages

  **Commit**: YES (group with 9)
  - Message: `refactor(logging): use structured logger`

- [ ] 9. Create health endpoint

  **What to do**:
  - Create `src/relay/health.ts`
  - Use Express or native http (check if express available)
  - GET /health returns { status: 'ok', services: {...} }
  - GET /health/ready returns { ready: boolean }
  - Port: 3001
  - Import healthMonitor for service status

  **Must NOT do**:
  - Don't block on health checks - use cached

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Blocked By**: Tasks 3, 7

  **References**:
  - src/services/health-monitor.ts - for status data
  - package.json - check if express is dependency

  **Acceptance Criteria**:
  - [ ] curl localhost:3001/health returns 200
  - [ ] Response includes Ollama/ComfyUI status

  **Commit**: YES (group with 8)
  - Message: `feat(health): add health endpoint`

- [ ] 10. Add graceful shutdown handler

  **What to do**:
  - In relay/index.ts at bottom of main()
  - Add signal handlers for SIGTERM, SIGINT
  - On shutdown: close Discord connection, save DB, log "Shutting down gracefully"
  - Use process.on('SIGTERM') and process.on('SIGINT')
  - Call discord.disconnect() or similar

  **Must NOT do**:
  - Don't use process.exit() directly

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Blocked By**: Wave 2 complete

  **References**:
  - discord.js-selfbot-v13 docs for disconnect

  **Acceptance Criteria**:
  - [ ] SIGTERM logs shutdown message
  - [ ] No orphan processes after Ctrl+C

  **Commit**: YES (group with 11, 12)
  - Message: `feat(lifecycle): add graceful shutdown`

- [ ] 11. Add per-user rate limiting

  **What to do**:
  - In relay/index.ts near top or as middleware
  - Use existing rate-limit.ts or create new
  - Track per user: Map<userId, { count, windowStart }>
  - Window: 60 seconds, limit: 15 messages
  - If exceeded: send "Vennligst vent litt..." message
  - Return early, don't process message

  **Must NOT do**:
  - Don't block legitimate users

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Blocked By**: Wave 2 complete

  **References**:
  - src/relay/utils/rate-limit.ts - existing implementation

  **Acceptance Criteria**:
  - [ ] 16th message in 60s gets backoff message

  **Commit**: YES (group with 10, 12)
  - Message: `feat(rate-limit): add per-user limiting`

- [ ] 12. Add startup banner with version

  **What to do**:
  - In relay/index.ts at start of main()
  - Print banner with: Bot name, version (from package.json), port, environment
  - Use logger for output

  **Must NOT do**:
  - Don't expose secrets in banner

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Blocked By**: Wave 2 complete

  **Acceptance Criteria**:
  - [ ] Startup shows banner in logs

  **Commit**: YES (group with 10, 11)
  - Message: `feat(startup): add banner`

- [ ] 13. Integration test - full flow works

  **What to do**:
  - Run the relay bot (or test mode)
  - Send a test message via mock
  - Verify: skill dispatch → self-healing wrapper → response
  - Verify: health endpoint returns 200

  **Must NOT do**:
  - Don't break existing functionality

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Blocked By**: Wave 2 complete

  **Acceptance Criteria**:
  - [ ] npm run build passes
  - [ ] npm test passes
  - [ ] Health endpoint returns 200

  **Commit**: NO (or yes, group all)
  - Message: `chore: production readiness complete`

---

## Final Verification Wave

- [ ] F1. **Build Check** — Run `npm run build && npx tsc --noEmit`
  - Expected: 0 errors, 0 warnings

- [ ] F2. **Lint Check** — Run `npx biome check .` (or existing lint)
  - Expected: 0 warnings

- [ ] F3. **Health Endpoint** — `curl localhost:3001/health`
  - Expected: 200 OK with status

- [ ] F4. **Integration** — Start relay, send test message
  - Expected: Response received, no crashes

---

## Commit Strategy

- **Wave 1**: `fix(lint): resolve warnings in skill files` + `feat(logging): add structured logger` + `feat(config): add environment validation`
- **Wave 2**: `feat(self-healing): wrap skill execution` + `feat(health): add health endpoint` + `refactor(logging): use structured logger`
- **Wave 3**: `feat(lifecycle): add graceful shutdown + rate limiting` + `chore: production ready`

---

## Success Criteria

### Verification Commands
```bash
npm run build  # Must pass
npx tsc --noEmit  # Must pass
curl localhost:3001/health  # Must return 200
```

### Final Checklist
- [ ] All lint warnings resolved
- [ ] Self-healing wrapper around skills
- [ ] Health endpoint on port 3001
- [ ] Graceful shutdown works
- [ ] Environment validation on startup
- [ ] Rate limiting at 15/min per user
- [ ] Structured logging throughout
