# Bottus v2 - Consolidated Implementation Plan

**Status**: Active Implementation
**Generated**: 2026-02-23
**Last Updated**: 2026-02-23

---

## Current Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 (Google Removal) | ✅ Complete | Deleted calendar.ts, migrated to CalendarServiceV2 |
| Phase 1 (Calendar Core) | ✅ Complete | sql.js implementation, recurring events, ICS export |
| Phase 2 (Feedback/Critic) | ✅ Integrated | feedback.ts wired into relay |
| Phase 3 (Sisyphus Learner) | ✅ Integrated | nightly-cron wired, learner ready |
| Phase 4 (i18n) | ✅ Complete | i18n expanded, Norwegian + English |
| Phase 5 (Resilience) | ✅ Complete | Circuit breaker added, rate limiting improved |

---

## Remaining Work (Consolidated from all plans)

### Priority 1: Fix Blocking Issues

- [x] Fix unused `CalendarDisplayService` import in calendar-v2.ts
- [x] Fix relay/index.ts image sending (`file` property error)
- [x] Initialize CalendarServiceV2 on startup

### Priority 2: Integrate Existing Components

- [x] Wire FeedbackHandler into relay message flow
  - Import feedback.ts in relay/index.ts
  - Call `logInteraction()` after each bot response
  - Call `critiqueResponse()` asynchronously after response
  
- [x] Wire Nightly Cron into main bot
  - Import nightly-cron.ts in index.ts
  - Initialize and start cron on bot ready

### Priority 3: Phase 4-5 Enhancements

- [x] Expand i18n usage for all user-facing strings
- [x] Add circuit breaker for Ollama calls
- [x] Improve rate limiting configuration

---

## Verification

```bash
npm run build  # Should pass with 0 errors
npm test       # Run existing tests
```

---

## References

- Full Bottus v2 details: `.sisyphus/plans/bottus-v2.md`
- Current AGENTS.md: `AGENTS.md`
- Feedback Handler: `src/relay/handlers/feedback.ts`
- Sisyphus Learner: `src/scripts/sisyphus-learner.ts`

---

## Deleted/Obsolete Plans

The following plans have been consolidated or are no longer relevant:
- unified-master-plan.md (superseded by this plan)
- comfyui-fix.md (all tasks complete)
- git-setup.md (repo already exists)
- help-handler-fix.md (older work)
- help-handler-ux.md (older work)
- All Bottus v1 precursor plans (superseded by bottus-v2.md)
