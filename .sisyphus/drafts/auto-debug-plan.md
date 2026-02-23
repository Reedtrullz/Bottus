# Auto-Debug & Self-Healing System

## Context

### User Request
Research how to make the bot automatically debug and bugfix issues when execution fails.

### Current State
- **Error Recovery**: CircuitBreaker + withRetry utilities exist in `src/utils/error-recovery.ts`
- **Error Handling**: Per-handler try/catch with console.error logging
- **Gap**: No automatic error categorization, no self-healing, no intelligent retry

---

## Research Findings

### Industry Best Practices (2024-2025)

**From Web Research:**

1. **Error Recovery Patterns in AI Agents** (Grizzly Peak Software)
   - Checkpoint/resume - save state before risky operations
   - Automatic retry with exponential backoff
   - Rollback capabilities
   - Self-healing with supervision patterns
   - Key insight: "67% of AI system failures stem from improper error handling"

2. **Self-Healing AI Agents** (Zylos Research)
   - Average 60% reduction in system downtime with self-healing
   - Heartbeat systems for health monitoring
   - Circuit breakers for cascading failure prevention
   - Graceful degradation strategies

3. **LLM API Error Handling**
   - Retry with exponential backoff + jitter
   - Circuit breaker patterns
   - Fallback chains (try primary → try backup → graceful failure)
   - Idempotency for tool calls

4. **Self-Healing Node.js APIs**
   - Error boundary wrappers
   - Health check endpoints
   - Automatic container restarts (Docker healthchecks)
   - Observable metrics (error rates, retry counts)

---

## Plan Objectives

### Core Features
1. **Error Classifier** - Categorize errors by type
2. **Auto-Retry with Intelligence** - Different strategies per error type
3. **Self-Healing Actions** - Automatic remediation for common errors
4. **Error Context Gathering** - Collect relevant context when errors occur
5. **Recovery Metrics** - Track what works vs what doesn't
6. **Health Monitoring** - Heartbeat for external services (Ollama, ComfyUI)

---

## Technical Design

### Error Categories

```typescript
type ErrorCategory = 
  | 'network'      // Connection failures, timeouts
  | 'auth'         // Token issues, permissions
  | 'parsing'      // JSON/date parsing failures
  | 'skill'        // Skill execution errors
  | 'external'     // Ollama, ComfyUI, Discord API
  | 'rate_limit'   // Discord 429, API throttling
  | 'timeout'      // Long-running operations
  | 'validation'   // Input validation failures
  | 'unknown';     // Unclassified
```

### Recovery Strategies by Category

| Category | Strategy | Max Retries | Backoff |
|----------|----------|-------------|----------|
| network | Retry same request | 3 | exponential + jitter |
| auth | Refresh token + retry | 2 | linear |
| rate_limit | Wait + retry | 5 | Discord retry-after header |
| timeout | Reduce complexity + retry | 2 | exponential |
| parsing | Log error, fail fast | 0 | - |
| skill | Try fallback skill | 2 | immediate |
| external | Retry with circuit breaker | 3 | exponential |
| validation | Fail fast, report to user | 0 | - |

### Auto-Remediation Actions

1. **Network errors**: Wait + retry with backoff
2. **Ollama timeout**: Reduce prompt complexity, then fail gracefully
3. **ComfyUI failure**: Report inability, suggest manual retry
4. **Skill not found**: Fall back to LLM with context
5. **Rate limiting**: Auto-wait using Retry-After header
6. **JSON parse error**: Attempt repair, log for debugging

### Implementation Components

#### 1. Error Classifier Service
- Location: `src/services/error-classifier.ts`
- Class: `ErrorClassifier`
- Methods: `classify(error, context)`, `getRecoveryStrategy(category)`

#### 2. Self-Healing Executor
- Location: `src/services/self-healer.ts`
- Class: `SelfHealer`
- Methods: `executeWithHealing(fn, options)`, `executeWithRetry(fn, strategy)`

#### 3. Health Monitor
- Location: `src/services/health-monitor.ts`
- Class: `HealthMonitor`
- Methods: `checkOllama()`, `checkComfyUI()`, `getOverallHealth()`

#### 4. Error Context Collector
- Location: `src/services/error-context.ts`
- Interface: `ErrorContext`
- Tracks: error, category, attemptedRecovery, finalOutcome, relevantLogs

---

## Scope

### IN
- Error classification system
- Intelligent retry logic with category-specific strategies
- Common auto-remediation actions
- Error context gathering
- Recovery metrics
- Health monitoring for Ollama/ComfyUI
- Docker healthcheck integration

### OUT
- Automatic code fixing (requires LLM)
- Self-modifying code
- Full autonomous debugging (too complex)
- Runtime code injection

---

## Execution Strategy

### Wave 1: Foundation (Priority: HIGH)
1. Create ErrorClassifier service with all error categories
2. Add error category detection based on error message patterns
3. Create HealthMonitor for Ollama/ComfyUI

### Wave 2: Recovery Logic (Priority: HIGH)
4. Enhance SelfHealer with category-specific strategies
5. Add Discord rate limit handling (parse Retry-After)
6. Add circuit breaker integration

### Wave 3: Integration (Priority: HIGH)
7. Wrap skill execution in relay/index.ts
8. Add error context to logs
9. Add /health endpoint

### Wave 4: Metrics (Priority: MEDIUM)
10. Track recovery success rates
11. Add observability (error counts, retry counts)
12. Update AGENTS.md with patterns

---

## Key Metrics to Track
- Error rate by category
- Recovery success rate
- Average retry attempts per failure
- Time to recovery
- External service uptime
