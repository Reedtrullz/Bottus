# Selfbot Migration Strategy: Comprehensive Plan

**Generated:** 2026-03-05  
**Status:** FINAL RECOMMENDATION  
**Scope:** Risk mitigation for archived discord.js-selfbot-v13 dependency

---

## Executive Summary

After comprehensive research, **no viable JavaScript alternative exists** for discord.js-selfbot-v13. The only migration path is a **2-3 month rewrite to Python** (discord.py-self).

**Recommendation:** **STAY WITH CURRENT + ACTIVE MONITORING**

---

## Research Findings

### Option Analysis Matrix

| Option | User Tokens | Group DMs | Maintenance | Effort | Viable? |
|--------|-------------|-----------|-------------|--------|---------|
| **Eris (standard)** | ❌ No | ❌ No | Active | Low | ❌ NO |
| **Eris selfbot fork** | ✅ Yes | Unknown | ❌ Dead (4 years) | Low | ❌ NO |
| **discord.py-self** | ✅ Yes | ✅ Yes | ✅ Active | **HIGH** | ✅ YES |
| **Official Bot API** | N/A | ❌ No | N/A | N/A | ❌ NO |
| **Stay Current** | ✅ Yes | ✅ Yes | ❌ Archived | None | 🟡 YES (short-term) |

### Key Findings

1. **Eris is bot-only**: Standard Eris library only supports bot tokens, not user tokens
2. **Eris selfbot fork abandoned**: @assasans/eris-selfbot has 1 weekly download, last updated 4 years ago
3. **discord.py-self is active**: Latest release Jan 18, 2026, 1,058 stars, actively maintained
4. **No JS alternatives**: The Node.js ecosystem has no maintained selfbot libraries
5. **Discord hasn't broken API**: Current system still works 4 months after archival

---

## Risk Assessment

### Current Risk Level: 🟡 MEDIUM-HIGH

| Risk Factor | Severity | Likelihood | Impact |
|-------------|----------|------------|--------|
| Discord API breakage | HIGH | LOW | Catastrophic |
| Security vulnerability | MEDIUM | MEDIUM | High |
| Account ban | MEDIUM | LOW | High |
| Dependency rot | MEDIUM | HIGH | Medium |

### Risk Mitigation Priority

1. **Monitor Discord API changes** (HIGH priority)
2. **Implement circuit breakers** (HIGH priority)
3. **Create emergency migration plan** (MEDIUM priority)
4. **Strengthen rate limiting** (MEDIUM priority)

---

## Recommended Strategy: "Stay + Shield"

### Phase 1: Harden Current System (Week 1-2)

**Goal:** Make current system as resilient as possible

#### 1.1 Monitoring Infrastructure
- [ ] Add Discord API version monitoring
- [ ] Create health check endpoint for Discord connection
- [ ] Alert on connection failures
- [ ] Log all Discord API errors with context

#### 1.2 Rate Limiting Improvements
- [ ] Implement per-channel rate limiting
- [ ] Add exponential backoff with jitter
- [ ] Create circuit breaker for Discord API calls
- [ ] Add graceful degradation (queue messages if rate limited)

#### 1.3 Error Handling
- [ ] Replace empty catch blocks with logging
- [ ] Add retry logic for transient failures
- [ ] Implement fallback responses

### Phase 2: Emergency Preparedness (Week 3-4)

**Goal:** Be ready to migrate quickly if Discord breaks API

#### 2.1 Documentation
- [ ] Document all Discord API features used
- [ ] Create API endpoint inventory
- [ ] Write migration runbook
- [ ] Document data migration strategy

#### 2.2 Proof of Concept
- [ ] Create spike branch with discord.py-self
- [ ] Test user token authentication
- [ ] Verify Group DM access works
- [ ] Test message sending/receiving
- [ ] Validate feature parity

#### 2.3 Decision Matrix
Create decision tree:
- IF Discord announces API deprecation → Start migration immediately
- IF minor breakage → Attempt local patching
- IF major breakage → Full Python migration

### Phase 3: Long-term Contingency (Month 2-3)

**Goal:** Have migration ready if needed

#### 3.1 Architecture Preparation
- [ ] Design Python service architecture
- [ ] Plan inter-service communication (JS main ↔ Python relay)
- [ ] Design data migration strategy
- [ ] Create testing strategy

#### 3.2 Parallel Implementation
- [ ] Begin Python relay implementation (spare time)
- [ ] Create feature parity checklist
- [ ] Set up Python testing infrastructure

---

## Detailed Work Plan

### Wave 1: Immediate Hardening (Tasks 1-5)

- [ ] **Task 1: Add Discord connection monitoring**
  - What: Health check for Discord gateway connection
  - Where: src/relay/discord.ts, src/relay/health.ts
  - Acceptance: Alert fires if disconnected >5 minutes

- [ ] **Task 2: Implement circuit breaker**
  - What: Stop calling Discord API after repeated failures
  - Where: src/relay/discord.ts
  - Acceptance: Circuit opens after 5 failures, closes after 60s

- [ ] **Task 3: Strengthen rate limiting**
  - What: Per-channel limits, exponential backoff
  - Where: src/relay/utils/rate-limit.ts
  - Acceptance: No 429 errors from Discord

- [ ] **Task 4: Fix error handling**
  - What: Replace empty catch blocks
  - Where: src/relay/plan-router.ts, src/relay/discord.ts
  - Acceptance: All errors logged

- [ ] **Task 5: Create API inventory**
  - What: Document all Discord API features used
  - Where: docs/discord-api-inventory.md
  - Acceptance: Complete list of endpoints, events, methods

### Wave 2: Emergency Preparedness (Tasks 6-10)

- [ ] **Task 6: Create spike branch**
  - What: Python proof of concept
  - Where: spike/python-relay branch
  - Acceptance: Can connect with user token

- [ ] **Task 7: Test Group DM access**
  - What: Verify discord.py-self supports Group DMs
  - Where: spike/python-relay
  - Acceptance: Can send/receive Group DM messages

- [ ] **Task 8: Create migration runbook**
  - What: Step-by-step migration guide
  - Where: docs/migration-runbook.md
  - Acceptance: Can follow to migrate in emergency

- [ ] **Task 9: Set up monitoring alerts**
  - What: Discord API changelog monitoring
  - Where: GitHub Actions or external service
  - Acceptance: Alert when Discord announces API changes

- [ ] **Task 10: Create decision matrix**
  - What: Clear criteria for when to migrate
  - Where: docs/migration-decision-matrix.md
  - Acceptance: Binary decisions for each scenario

### Wave 3: Contingency (Tasks 11-15)

- [ ] **Task 11: Design Python architecture**
  - What: Service architecture for Python relay
  - Where: docs/python-architecture.md
  - Acceptance: Clear component diagram

- [ ] **Task 12: Plan data migration**
  - What: Strategy for moving data to Python
  - Where: docs/data-migration-plan.md
  - Acceptance: Zero-downtime migration possible

- [ ] **Task 13: Create feature parity checklist**
  - What: All features to replicate in Python
  - Where: docs/feature-parity.md
  - Acceptance: Complete list with priorities

- [ ] **Task 14: Set up Python testing**
  - What: pytest infrastructure
  - Where: python-relay/tests/
  - Acceptance: Can run tests

- [ ] **Task 15: Quarterly review process**
  - What: Recurring evaluation
  - Where: Calendar reminder + checklist
  - Acceptance: Review happens every 3 months

---

## Success Criteria

### Phase 1 Complete When:
- [ ] No empty catch blocks remain
- [ ] Circuit breaker implemented and tested
- [ ] Rate limiting prevents all 429 errors
- [ ] Discord API inventory complete
- [ ] Monitoring alerts working

### Phase 2 Complete When:
- [ ] Python spike can connect and send messages
- [ ] Group DM access verified in Python
- [ ] Migration runbook written and tested
- [ ] Decision matrix documented
- [ ] Emergency contacts identified

### Phase 3 Complete When:
- [ ] Python architecture designed
- [ ] Feature parity checklist complete
- [ ] Data migration strategy ready
- [ ] Testing infrastructure ready
- [ ] Quarterly review scheduled

---

## Risk Acceptance

**Residual Risks (after mitigation):**
1. Discord could break API with no notice → Mitigation: Monitoring + emergency plan
2. Security vulnerability in archived library → Mitigation: Limited exposure, no sensitive data
3. Account ban → Mitigation: Rate limiting, human-like behavior

**Accepted Risk Level:** MEDIUM  
**Review Date:** 2026-06-05 (3 months)  
**Escalation Trigger:** Discord API deprecation announcement

---

## Resource Requirements

| Phase | Time | Complexity | Risk |
|-------|------|------------|------|
| Phase 1: Hardening | 1-2 weeks | Low | Low |
| Phase 2: Preparedness | 2-4 weeks | Medium | Medium |
| Phase 3: Contingency | 2-3 months | High | High (if activated) |

**Total if no migration needed:** 1 month of work  
**Total if migration activated:** 3-4 months of work

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Approve Phase 1** implementation
3. **Schedule weekly check-ins** during Phase 1
4. **Set calendar reminder** for 3-month review
5. **Create spike branch** when Phase 1 complete

---

## Plan Compliance

This plan follows Prometheus planning standards:
- ✅ Clear objectives
- ✅ Sequential waves with dependencies
- ✅ Concrete acceptance criteria
- ✅ Risk assessment
- ✅ Resource estimates
- ✅ Review schedule
