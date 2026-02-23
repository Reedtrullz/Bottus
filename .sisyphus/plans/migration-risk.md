# discord.js-selfbot-v13 Migration Risk Assessment

**Date:** 2026-02-22  
**Status:** Planning Document  
**Library:** discord.js-selfbot-v13 v3.7.1 (current in use)

---

## 1. Current Status

The discord.js-selfbot-v13 library was **archived on October 11, 2025** by its maintainer. The repository is now read-only and no longer receives updates, security patches, or bug fixes.

**Current usage in project:**
- Used in `src/relay/discord.ts` for the Discord↔Ollama relay
- Enables Group DM access (requires user token, not bot token)
- Provides message handling, DM sending, and channel management

**Last stable version:** 3.7.1 (npm shows 3.6.1 as latest, but 3.7.1 is in use)

---

## 2. Identified Risks

### 2.1 Security Risks

| Risk | Severity | Description |
|------|----------|-------------|
| No security patches | **High** | Any future Discord API changes or security vulnerabilities will not be patched |
| Token exposure | **High** | User tokens in selfbot code are high-value targets; archived repo means no security audits |
| Dependency vulnerabilities | **Medium** | Transitive dependencies may have unpatched CVEs |

### 2.2 Functional Risks

| Risk | Severity | Description |
|------|----------|-------------|
| API breakage | **High** | Discord periodically updates its API; unmaintained library may break without notice |
| Discord detection | **High** | Selfbots violate Discord ToS; detection methods evolve and unmaintained code lags behind |
| TypeScript compatibility | **Medium** | Future Node.js/TypeScript updates may cause type errors |
| Group DM API changes | **Medium** | Group DMs are a legacy feature; Discord may deprecate or restrict further |

### 2.3 Operational Risks

| Risk | Severity | Description |
|------|----------|-------------|
| No community support | **Medium** | Archived repo means no GitHub issues or discussions |
| Stale documentation | **Low** | README and docs may become outdated |
| Build/toolchain issues | **Low** | npm audit/lint tools may flag deprecated patterns |

---

## 3. Account Ban Risk Assessment

### 3.1 Discord ToS Violation

Using a selfbot (automating a user account) directly violates Discord's Terms of Service. The library's own README includes this warning:

> "I don't take any responsibility for blocked Discord accounts that used this module."

> "Using this on a user account is prohibited by the Discord TOS and can lead to the account block."

### 3.2 Risk Factors

| Factor | Risk Level | Notes |
|--------|-------------|-------|
| Automated messaging | **High** | Sending messages automatically triggers detection |
| High message volume | **High** | Rate limit hammering increases ban probability |
| Group DM usage | **Medium-High** | Group DMs are monitored for spam/automation |
| API request patterns | **Medium** | Human-like timing reduces detection; robotic patterns increase it |
| Account age | **Variable** | Older accounts have more trust; new accounts are scrutinized |
| Device fingerprinting | **Unknown** | Discord tracks client characteristics |

### 3.3 Mitigation Strategies (Current)

- Maintain minimal message history (5 messages)
- Use conversation context rather than bulk operations
- No explicit rate limiting implemented (risk factor)

---

## 4. Migration Options

### 4.1 Option A: Stay with discord.js-selfbot-v13

**Description:** Continue using the archived library with no changes.

| Pros | Cons |
|------|------|
| No code changes required | Increasing security and functional risk |
| Known working implementation | eventual API breakage inevitable |
| Zero migration effort | No support if issues arise |

**Recommendation:** Only acceptable as a short-term stopgap (3-6 months maximum).

---

### 4.2 Option B: Migrate to discord.py-self (Python)

**Description:** Rewrite the relay component in Python using discord.py-self.

| Pros | Cons |
|------|------|
| Actively maintained fork (dolfies/discord.py-self) | Requires complete rewrite in Python |
| Better rate limit handling | Adds Python dependency to Node.js project |
| More mature user account support | Separate process/maintenance |
| Active community (dolfies) | More complex deployment |

**Code comparison:**
```python
# discord.py-self example
import discord

class SelfClient(discord.Client):
    async def on_message(self, message):
        if message.guild is None:  # DM/Group DM
            await self.process_commands(message)

client = SelfClient()
await client.login(token)
```

**Recommendation:** Strong alternative if Python is acceptable. Requires significant refactoring.

---

### 4.3 Option C: Use Eris for Both Bots

**Description:** Replace discord.js-selfbot-v13 with Eris (already used for main bot) where possible.

| Pros | Cons |
|------|------|
| Single library to maintain | Eris does not officially support user accounts |
| No additional dependencies | Group DM support may be limited |
| Already in project | May not provide full selfbot functionality |

**Current state:** Main bot already uses Eris. Relay uses discord.js-selfbot-v13 specifically for Group DM access. Need to verify if Eris supports required features.

**Recommendation:** Investigate Eris capabilities for user accounts. If insufficient, proceed with other options.

---

### 4.4 Option D: Migrate to discord-user-bots (NOT RECOMMENDED)

**Description:** Use another selfbot library such as discord-user-bots or similar.

| Pros | Cons |
|------|------|
| May have active development | Same ToS violation concerns |
| Alternative implementations | Less mature than discord.js-selfbot-v13 |
| | Potential security risks from unknown sources |

**⚠️ NOT RECOMMENDED:** This option carries the same fundamental risks as the current solution (ToS violation, account ban) without the benefit of an established, well-audited library. The ecosystem for user account automation is inherently risky, and switching between unmaintained or poorly-maintained libraries does not reduce risk.

**Recommendation:** Do not pursue this option. If selfbot functionality is required, discord.py-self is a more trustworthy alternative.

---

### 4.5 Option E: Use Official Bot API (Long-term)

**Description:** Migrate from user account automation to a proper Discord bot with bot token.

| Pros | Cons |
|------|------|
| Complies with Discord ToS | Group DMs not accessible via bot API |
| No ban risk | Requires user re-invites to DMs |
| Official support | Different permission model |
| Stable API | May require UX changes |

**Feasibility:** Low for this use case. The relay specifically requires Group DM access, which is only available to user accounts. Bots cannot access Group DMs.

**Recommendation:** Not viable for current use case but should be reconsidered if Discord ever adds Group DM support for bots.

---

## 5. Rate Limiting Considerations

### 5.1 Current Implementation

The relay has **no explicit rate limiting**. This is a significant risk factor:

- Message sending: No delay between messages
- API requests: No backoff strategy
- Group DM access: May trigger rate limits quickly

### 5.2 Recommended Rate Limits

If staying with selfbot approach, implement:

| Action | Recommended Limit |
|--------|------------------|
| Messages per minute | 10-15 (conservative) |
| Messages per minute | 20-25 (moderate risk) |
| DM sends per minute | 5-10 |
| API retry backoff | Exponential, max 5 retries |
| Connection attempts | Max 3 per minute |

### 5.3 Implementation Strategy

```typescript
// Example rate limiter
class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
      this.process();
    });
  }
  
  private async process() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await fn();
      await this.delay(2000); // 2 seconds between actions
    }
    
    this.processing = false;
  }
  
  private delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }
}
```

---

## 6. Recommendation

### 6.1 Primary Recommendation: Stay Short-term, Migrate Long-term

**Immediate (0-3 months):**
- Stay with discord.js-selfbot-v13
- Add rate limiting to reduce ban risk
- Monitor for API breakage
- Document token handling security

**Medium-term (3-12 months):**
- Evaluate Eris capabilities for user account features
- If Eris insufficient, migrate to discord.py-self
- This requires Python integration but provides active maintenance

**Long-term (12+ months):**
- Explore official bot API changes
- Consider if Group DM access can be replaced with alternative design

### 6.2 Risk Tolerance Decision

The choice depends on risk tolerance:

| Tolerance | Recommended Path |
|-----------|------------------|
| Low (account critical) | Migrate to discord.py-self now, add rate limiting |
| Medium (account replaceable) | Stay + rate limit, monitor for issues |
| High (testing account) | Continue current approach with caution |

### 6.3 Action Items

1. Add rate limiting to relay (reduce ban risk immediately)
2. Investigate Eris user account capabilities
3. Prototype discord.py-self relay if Eris insufficient
4. Set calendar reminder to re-evaluate in 6 months

---

## 7. Summary Matrix

| Option | ToS Risk | Maintenance | Effort | Recommendation |
|--------|----------|-------------|--------|---------------|
| Stay (current) | High | None | None | Short-term only |
| discord.py-self | High | Active | High | Strong alternative |
| Eris | Low | Active | Medium | Investigate first |
| discord-user-bots | High | Unknown | Medium | NOT RECOMMENDED |
| Official Bot API | None | N/A | High | Not viable |

---

## Appendix A: Related Files

- `src/relay/discord.ts` - Current selfbot implementation
- `src/relay/index.ts` - Relay orchestration
- `package.json` - Dependencies (line 17)

## Appendix B: External References

- [discord.js-selfbot-v13 GitHub](https://github.com/aiko-chan-ai/discord.js-selfbot-v13) (Archived Oct 2025)
- [discord.py-self PyPI](https://pypi.org/project/discord.py-self/)
- [dolfies/discord.py-self](https://github.com/dolfies/discord.py-self) (Active fork)
- [Discord Developer Terms](https://discord.com/developers/docs/policies-and-agreements)
