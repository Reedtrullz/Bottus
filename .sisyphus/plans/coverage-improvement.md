# Bottus Test Coverage Improvement Plan

## TL;DR

> **Quick Summary**: Systematic test coverage improvement targeting 40%+ through prioritized testing of critical infrastructure, services, and handlers.
>
> **Coverage Achieved**: 27.91%
> **Target Coverage**: 40%+
> **Approach**: Phase-based testing of critical files with highest impact

---

## Context

### Current State (Post-Improvement)

| Module | Coverage | Status |
|--------|----------|--------|
| `src/utils` | 69.05% | ✅ Good |
| `src/relay/skills` | 55.03% | ✅ Good |
| `src/relay/utils` | 60.16% | ✅ Good |
| `src/services` | 14.67% | ⚠️ Needs work |
| `src/gateway` | 12.42% | ⚠️ Experimental |
| `src/relay` | 6.72% | ⚠️ Needs work |
| `src/db` | 18.1% | ⚠️ Needs work |

### Test Stats

- **Test Files**: 23 (+10 from baseline)
- **Tests**: 322 (+107 from baseline)
- **Line Coverage**: 27.91%
- **Branch Coverage**: 69.85%

## TL;DR

> **Quick Summary**: Systematic test coverage improvement targeting 40%+ through prioritized testing of critical infrastructure, services, and handlers.
> 
> **Current Coverage**: 23.94%
> **Target Coverage**: 40%+
> **Approach**: Phase-based testing of critical files with highest impact

---

## Context

### Current State

| Module | Coverage | Status |
|--------|----------|--------|
| src/relay/skills/ | 51.76% | Best covered |
| src/relay/handlers/ | 61.19% | Good |
| src/utils/ | 36.8% | Moderate |
| src/services/ | 10.98% | Critical gap |
| src/db/ | 18.1% | Critical gap |
| src/relay/ | 6.72% | Critical gap |

### Priority Files (0% or <20% Coverage)

| Priority | File | Lines | Why Critical |
|----------|------|-------|---------------|
| P1 | `src/relay/plan-router.ts` | 234 | Central action routing |
| P1 | `src/relay/index.ts` | 727 | Main relay entry |
| P1 | `src/db/index.ts` | 604 | Database layer |
| P2 | `src/services/calendar-v2.ts` | 442 | Primary calendar |
| P2 | `src/services/governance.ts` | 246 | Governance system |
| P3 | `src/relay/handlers/role.ts` | 210 | RBAC (17% covered) |
| P3 | `src/services/comfyui.ts` | 115 | Image generation |

---

### Tests Added

| File | Tests | Coverage Area |
|------|-------|---------------|
| `tests/services/consent.test.ts` | 19 | Opt-in/opt-out flow |
| `tests/services/feedback.test.ts` | 11 | Feedback formatting |
| `tests/services/reminders.test.ts` | 15 | Task management |
| `tests/services/memory.test.ts` | 7 | Memory storage |
| `tests/utils/i18n.test.ts` | 10 | Norwegian/English translations |
| `tests/utils/timezone.test.ts` | 6 | Date formatting |
| `tests/relay/detectors.test.ts` | 42 | Message detection patterns |
| `tests/relay/date-utils.test.ts` | 7 | Month utilities |
| `tests/gateway/event-bus.test.ts` | 8 | Event dispatch |
| `tests/utils/env-validator.test.ts` | 6 | Environment validation |

---

## Remaining Opportunities

### High Priority (Services)

| File | Lines | Why |
|------|-------|-----|
| `src/services/calendar-v2.ts` | 442 | Primary calendar, needs heavy mocking |
| `src/services/comfyui.ts` | 392 | Image generation, external API |
| `src/services/governance.ts` | 246 | Proposal system |
| `src/services/timePoll.ts` | 188 | Time polling |

### Medium Priority (Handlers)

| File | Lines | Notes |
|------|-------|-------|
| `src/relay/handlers/image.ts` | ~200 | Image generation |
| `src/relay/handlers/role.ts` | 210 | RBAC |
| `src/relay/handlers/calendar.ts` | ~150 | Calendar commands |

### Low Priority (By Design)

- `src/scripts/*` - CLI scripts, not unit-testable
- `src/index.ts` - Entry point with side effects
- `src/gateway/*` - Experimental module

### Core Objective
Increase test coverage from 23.94% to 40%+ through systematic testing of critical files.

### Must Have
- Tests for plan-router (action routing)
- Tests for database operations (calendar, events)
- Tests for calendar-v2 service (CRUD)
- Tests for role handler (RBAC enforcement)
- All existing tests continue to pass

### Must NOT Have
- No deletion of existing tests
- No breaking changes to existing functionality
- No mock-heavy tests that don't verify real behavior

---

## Execution Strategy

### Wave 1 - Quick Wins (High Impact, Low Effort)

| Task | File to Create | Target File | Lines |
|------|----------------|-------------|-------|
| 1 | tests/relay/plan-router.test.ts | src/relay/plan-router.ts | 234 |
| 2 | tests/relay/handlers/role.test.ts | src/relay/handlers/role.ts | 210 |
| 3 | tests/relay/health.test.ts | src/relay/health.ts | 122 |

### Wave 2 - Critical Services

| Task | File to Create | Target File | Lines |
|------|----------------|-------------|-------|
| 4 | tests/services/calendar-v2.test.ts | src/services/calendar-v2.ts | 442 |
| 5 | tests/services/governance.test.ts | src/services/governance.ts | 246 |
| 6 | tests/db/operations.test.ts | src/db/index.ts | 604 |

### Wave 3 - Handler Coverage

| Task | File to Create | Target File | Lines |
|------|----------------|-------------|-------|
| 7 | tests/relay/handlers/proposal.test.ts | src/relay/handlers/proposal.ts | 192 |
| 8 | tests/relay/handlers/feedback.test.ts | src/relay/handlers/feedback.ts | 170 |
| 9 | tests/relay/services/reminder.test.ts | src/relay/services/reminder.ts | 67 |

### Wave 4 - Additional Services

| Task | File to Create | Target File | Lines |
|------|----------------|-------------|-------|
| 10 | tests/services/comfyui.test.ts | src/services/comfyui.ts | 115 |
| 11 | tests/services/user-profile.test.ts | src/services/user-profile.ts | 174 |
| 12 | tests/relay/handlers/tone.test.ts | src/relay/handlers/tone.ts | ~80 |

---

## Verification Strategy

### Test Commands
```bash
npm run build        # Must pass
npm test            # All tests pass (322 tests)
npm test -- --coverage  # Verify coverage
```

### Acceptance Criteria
- [x] All existing tests continue to pass
- [x] 10+ new test files created
- [x] 100+ new tests added
- [x] Coverage improved from ~24% to ~28%
- [ ] Coverage ≥ 40% (remaining work)

### Test Commands
```bash
npm run build        # Must pass
npm test            # All tests pass
npm test -- --coverage  # Verify ≥40%
```

### Acceptance Criteria
- [ ] Wave 1 complete: 3 test files, ~30 tests
- [ ] Wave 2 complete: 3 test files, ~40 tests
- [ ] Wave 3 complete: 3 test files, ~25 tests
- [ ] Wave 4 complete: 3 test files, ~25 tests
- [ ] Coverage ≥ 40%
- [ ] All 190+ existing tests still pass

---

## Success Criteria

### Verification Commands
```bash
npm run build    # Passes
npm test        # All pass (expect ~310 tests)
npm test -- --coverage  # ≥40%
```

### Final Checklist
- [ ] 12 new test files created
- [ ] ~120 new tests added
- [ ] Coverage ≥ 40%
- [ ] Build passes
- [ ] No regressions

---

## Notes

- Test patterns follow existing vitest conventions in tests/ directory
- Mock dependencies where needed (db, external services)
- Focus on critical paths: routing decisions, permission checks, CRUD operations
- Some files (gateway/) are experimental - deprioritize unless specifically needed
