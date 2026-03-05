# Discord Selfbot Migration Decision Matrix

**Version:** 1.0  
**Last Updated:** 2026-03-05  
**Purpose:** Clear decision framework for Discord selfbot migration

---

## Quick Decision Tree

```
Discord API Change Detected?
├── YES → Is it breaking?
│   ├── YES → Can we patch quickly?
│   │   ├── YES → Apply patch
│   │   └── NO → Start emergency migration
│   └── NO → Monitor and document
└── NO → Continue normal operations
    └── Quarterly review (every 3 months)
```

---

## Detailed Decision Matrix

### Scenario 1: Discord Announces API Deprecation

**Trigger:** Discord officially deprecates user token or Group DM APIs

**Assessment:**
- Timeline: Usually 6 months notice
- Impact: **CRITICAL**

**Decision:**
| Can Migrate in Time? | Action | Owner | Timeline |
|---------------------|--------|-------|----------|
| Yes (6+ months) | Start planned migration | Dev Team | 3-4 months |
| No (<3 months) | Emergency migration + bridge | Dev + Ops | Immediate |

**Steps:**
1. Confirm deprecation timeline
2. Assess migration effort
3. Decision within 48 hours
4. Execute per migration runbook

---

### Scenario 2: Discord API Breaks (No Warning)

**Trigger:** Bot suddenly stops working, Discord API returns errors

**Assessment:**
- Timeline: Immediate
- Impact: **CRITICAL**

**Decision Tree:**
```
Error Type?
├── Auth Error (401/403)
│   ├── Token revoked → Issue: Account ban
│   │   └── Decision: New account + migrate
│   └── Auth method changed → Issue: API change
│       └── Decision: Can we patch?
│           ├── YES → Patch in 24h
│           └── NO → Emergency migration
├── Gateway Error
│   ├── Connection refused → Issue: Discord outage
│   │   └── Decision: Wait
│   └── Invalid intents → Issue: API change
│       └── Decision: Patch required
└── Unknown Error
    └── Decision: Investigate 2h, then decide
```

**Decision Matrix:**

| Error | Cause | Patchable | Decision |
|-------|-------|-----------|----------|
| 401 Unauthorized | Token invalid | No | New token / Migrate |
| 403 Forbidden | API blocked | No | Migrate |
| 429 Rate Limited | Too many requests | Yes | Fix rate limiting |
| 500 Server Error | Discord issue | N/A | Wait |
| Gateway close 4004 | Authentication failed | No | Migrate |
| Gateway close 4014 | Disallowed intent | Maybe | Patch or migrate |

---

### Scenario 3: Security Vulnerability Discovered

**Trigger:** CVE or security advisory for discord.js-selfbot-v13

**Assessment:**
- Severity: Varies
- Impact: High

**Decision:**
| Severity | Exploitable | Decision | Timeline |
|----------|-------------|----------|----------|
| Critical | Yes | Emergency migration | 24-48h |
| High | Yes | Patch if possible, else migrate | 1 week |
| Medium | No | Document risk, plan migration | 1 month |
| Low | No | Accept risk, monitor | Next review |

---

### Scenario 4: Account Ban Risk Increases

**Trigger:** Discord announces stricter enforcement, mass bans reported

**Assessment:**
- Risk Level: Medium-High
- Timeline: Weeks to months

**Decision Matrix:**
| Our Risk Level | Action | Timeline |
|----------------|--------|----------|
| High (recent warnings) | Reduce activity + plan migration | 2 weeks |
| Medium (no warnings) | Monitor + document | Monthly review |
| Low (stable for months) | Continue monitoring | Quarterly review |

**Mitigation Steps:**
1. Reduce message frequency
2. Add more human-like delays
3. Avoid spammy patterns
4. Document all activity

---

### Scenario 5: Quarterly Review

**Trigger:** Scheduled 3-month review

**Decision Matrix:**

| Factor | Status | Action |
|--------|--------|--------|
| Current library | Working well | Continue monitoring |
| Alternative library | Tested OK | Consider migration |
| Discord policy | No changes | Maintain status quo |
| Team capacity | Available | Plan Phase 3 |
| Team capacity | Limited | Maintain status quo |

**Review Checklist:**
- [ ] Current system still working?
- [ ] Any Discord policy changes?
- [ ] Alternative libraries updated?
- [ ] Test spike still valid?
- [ ] Migration runbook current?
- [ ] Team capacity available?

---

### Scenario 6: Team Wants to Proactively Migrate

**Trigger:** Team has capacity and wants to migrate before forced

**Decision Matrix:**

| Factor | Favor Migration | Against Migration |
|--------|----------------|-------------------|
| Current stability | Unstable | Stable |
| Team capacity | High | Low |
| Business priority | High | Low |
| Risk tolerance | Low | High |
| Alternative quality | Better | Same/Worse |

**Decision Rule:**
- 4+ factors favor migration → Start migration
- 2-3 factors favor migration → Plan for next quarter
- 0-1 factors favor migration → Maintain status quo

---

## Decision Criteria Reference

### When to Patch (Quick Fix)
- Simple configuration change
- Rate limit adjustment
- Intent flag change
- Can be done in <1 day
- Low risk

### When to Migrate (Full Rewrite)
- Authentication method changes
- Major API endpoint removal
- Library completely broken
- Security vulnerability
- Account ban wave

### When to Wait (Monitor)
- Discord announces future change (>6 months)
- Minor API deprecation
- Alternative library not ready
- Team capacity constrained
- Current system stable

---

## Emergency Decision Protocol

**If Critical Issue (API broken, account banned):**

**Hour 0-1: Assess**
- Identify error type
- Check Discord status
- Determine if widespread

**Hour 1-2: Decide**
- Can we patch? (2h max to decide)
- If no: Trigger emergency migration
- Alert stakeholders

**Hour 2-24: Execute**
- Follow migration runbook
- Or apply patch
- Test thoroughly

**Hour 24-48: Stabilize**
- Monitor closely
- Fix any issues
- Document learnings

---

## Decision Escalation

**Level 1: Developer**
- Can patch
- Clear decision from matrix
- No business impact

**Level 2: Tech Lead**
- Unclear decision
- Migration required
- Business impact minimal

**Level 3: Engineering Manager**
- Major migration
- Significant business impact
- Resource allocation needed

**Level 4: Executive**
- Service shutdown risk
- Major resource requirements
- Strategic implications

---

## Pre-Approved Decisions

These decisions can be made immediately without escalation:

✅ **APPROVED:**
- Apply security patches
- Increase rate limiting
- Update monitoring
- Run quarterly review
- Test spike branch

❌ **REQUIRES APPROVAL:**
- Start migration project
- Change architecture
- Add new dependencies
- Modify production data
- Disable features

---

## Contact for Decisions

**Emergency (API broken):**
- Slack: #engineering-alerts
- Phone: [Emergency number]

**Non-Emergency (Planning):**
- GitHub Issues
- Weekly standup
- Quarterly review

---

## Appendix: Decision Log

| Date | Scenario | Decision | Outcome | Notes |
|------|----------|----------|---------|-------|
| 2026-03-05 | Phase 1 complete | Continue to Phase 2 | - | Spike branch created |
| | | | | |
| | | | | |
| | | | | |

---

**Next Review:** 2026-06-05
