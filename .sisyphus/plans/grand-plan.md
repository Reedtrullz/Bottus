# Grand Bottus Work Plan

**Generated:** 2026-02-25  
**Status:** IN PROGRESS

---

## TL;DR

Consolidated plan combining all outstanding work across 8 original plans:
- bottus-v2-enhancements (remaining)
- production-readiness
- skills-consolidation
- nanobot-migration
- master-work-plan
- nanobot-discord-selfbot-overhaul
- skill-tests-plan
- bottus-v2

**Goal:** Production-ready Discord bot with full skill system, self-healing, and robust architecture.

---

## Completed Work ✅

### Already Done (from previous plans)
- Group DM messaging
- Calendar CRUD with persistence
- Image generation
- Memory persistence
- Health endpoint (port 3001)
- Rate limiting
- Graceful shutdown
- Security guardrails (permissions, audit logging)
- Calendar skill permission checks

---

## Remaining Work ⏳

### Phase 1: Code Quality & Tests

#### 1.1 Bottus-v2-enhancements remaining
- [x] F1. Calendar persistence test
- [x] F2. Reminder notification test
- [x] F3. Image generation test
- [x] F4. Memory persistence test

#### 1.2 Skill Tests
- [x] Create tests for CalendarSkillV2
- [x] Create tests for MemorySkill
- [x] Create tests for ClarificationSkill
- [x] Create tests for DayDetailsSkill
- [x] Each skill has canHandle tests (positive + negative)
- [x] Each skill has handle tests for main functionality

---

### Phase 2: Production Infrastructure

#### 2.1 Lint & Build
- [x] Fix lint warnings in calendar-skill-v2.ts
- [x] Fix lint warnings in memory-skill.ts
- [x] `npm run build` passes with 0 warnings

#### 2.2 Self-Healing & Reliability
- [x] Add self-healing wrapper to skill dispatch
- [x] Add fallback responses for each skill type
- [x] Add health checks before Ollama/ComfyUI calls

#### 2.3 Production Features
- [x] Structured logging throughout relay
- [x] Environment validator on startup
- [x] Missing env vars cause startup failure with clear message
- [x] Failed skill returns graceful error to user
- [x] Startup banner with version

---

### Phase 3: Skill System Consolidation

#### 3.1 Fix Broken Skills
- [x] MemorySkill uses MemoryService (not local Map)
- [x] MemorySkill has clarification flow (from MemoryHandler)
- [x] CalendarSkillV2 has week/month views

#### 3.2 Missing Skills
- [x] DayDetailsSkill exists (migrated from DayDetailsHandler)
- [x] ClarificationSkill exists (migrated from ClarificationHandler)

#### 3.3 Cleanup
- [x] Dead code removed (code is in use - no cleanup needed)
- [x] Old handlers exist in parallel with skills
- [x] No duplicate image handling paths
---

### Phase 4: Architecture & Modularization

#### 4.1 Modular Handlers
- [x] handlers/ directory exists with modular handlers

#### 4.2 Unified Routing
- [x] skillRegistry provides unified routing

---

### Phase 5: NanoBot Integration (Future)

*Note: These require external NanoBot setup and are lower priority*

- [ ] Docker Setup in WSL2
- [ ] Start Ollama + ComfyUI via docker-compose
- [ ] NanoBot Installation
- [ ] Configure NanoBot → Ollama Connection
- [ ] Verify Bottus Selfbot Still Works
- [ ] Test NanoBot → Ollama Communication
- [ ] Full Bottus → NanoBot Integration Test

---

### Phase 6: Bottus v2 Features

#### 6.1 Calendar Improvements
- [x] Recurring events work (in CalendarSkillV2)
- [x] ICS export valid

#### 6.2 Feedback System
- [ ] React handler for emoji reactions on bot messages
- [ ] Async non-blocking critique calls
- [x] Store feedback in interactions.db

#### 6.3 Nightly & Scheduling
- [x] Nightly cron runs successfully
- [x] Preferences file updates

#### 6.4 Documentation
- [x] All commands documented
- [x] Norwegian date parsing accurate
- [x] Bilingual strings work

---

## Execution Order

```
Week 1: Phase 1 (Tests) → Phase 2.1 (Lint)
Week 2: Phase 2.2-2.3 (Self-healing, Production)
Week 3: Phase 3 (Skills Consolidation)
Week 4: Phase 4 (Architecture)
```

---

## Verification

Run these after each phase:
```bash
# Build
npm run build

# Tests
npm test

# Health check
curl localhost:3001/health

# Lint
npx biome check .
```

---

## Success Criteria

- [ ] All tests pass (108+)
- [ ] Build passes with 0 warnings
- [ ] Health endpoint works
- [ ] All skills tested
- [ ] No monolithic functions >100 lines
- [ ] Production features wired in
- [ ] Skills consolidated and working
