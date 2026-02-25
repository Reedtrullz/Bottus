# Self-Healing System

The self-healing system provides automatic error recovery with configurable retry strategies.

## Overview

The system consists of two main components:

1. **Error Classifier** - Categorizes errors and determines recovery strategies
2. **Self Healer** - Executes operations with automatic retry and fallback logic

## Architecture

```
src/services/
├── error-classifier.ts    # Error categorization
└── self-healer.ts        # Recovery execution
```

## Error Classification

### Error Categories

The system classifies errors into 9 categories:

```typescript
type ErrorCategory = 
  | 'network'      // Connection issues
  | 'auth'         // Authentication failures
  | 'parsing'      // JSON/parse errors
  | 'skill'        // Skill execution errors
  | 'external'     // External API errors
  | 'rate_limit'   // Rate limiting
  | 'timeout'      // Operation timeouts
  | 'validation'   // Input validation
  | 'unknown';     // Unclassified errors
```

### Classification Logic

Errors are classified using pattern matching:

```typescript
const ERROR_PATTERNS: Record<ErrorCategory, RegExp[]> = {
  network: [
    /ECONNREFUSED/,
    /ENOTFOUND/,
    /ETIMEDOUT/,
    /connection\s+(refused|reset|timeout)/i,
  ],
  auth: [
    /401\s+Unauthorized/,
    /403\s+Forbidden/,
    /authentication\s+failed/i,
    /invalid\s+token/i,
  ],
  // ... other patterns
};
```

## Recovery Strategies

### Default Strategies

Each error category has a default recovery strategy:

| Category | Max Retries | Base Delay | Backoff | Jitter | Should Retry |
|----------|-------------|------------|---------|--------|--------------|
| network | 3 | 1000ms | 2x | Yes | Yes |
| auth | 2 | 500ms | 1.5x | No | Yes |
| rate_limit | 5 | 1000ms | 1x | No | Yes |
| timeout | 2 | 2000ms | 2x | Yes | Yes |
| parsing | 0 | 0 | 1x | No | No |
| skill | 2 | 0 | 1x | No | Yes |
| external | 3 | 1000ms | 2x | Yes | Yes |
| validation | 0 | 0 | 1x | No | No |
| unknown | 1 | 1000ms | 2x | Yes | Yes |

### Strategy Interface

```typescript
interface RecoveryStrategy {
  maxRetries: number;       // Maximum retry attempts
  baseDelayMs: number;      // Initial delay in milliseconds
  backoffMultiplier: number; // Delay multiplier per retry
  useJitter: boolean;       // Add randomness to delay
  shouldRetry: boolean;     // Whether to retry at all
}
```

## Using the Self-Healer

### Basic Usage

```typescript
import { selfHealer } from './services/self-healer.js';

const result = await selfHealer.executeWithHealing(
  () => fetch('http://api.example.com/data'),
  {
    context: 'Fetching user data',
    onRetry: (error, attempt, category) => {
      console.log(`Retry ${attempt} for ${category}: ${error.message}`);
    },
    onHeal: (error, category) => {
      console.log(`Recovered from ${category}`);
    }
  }
);

if (result.success) {
  console.log('Data:', result.data);
} else {
  console.error('Failed:', result.error);
}
```

### With Fallback

```typescript
const result = await selfHealer.executeWithHealing(
  () => fetchPrimarySource(),
  {
    fallback: () => fetchBackupSource(),
  }
);
```

### Health Check Before Execution

```typescript
const { healthy, status } = await selfHealer.checkHealthBeforeExecute('ollama');

if (!healthy) {
  console.log(`Ollama is ${status.status}: ${status.error}`);
  // Handle degraded state
}
```

## Result Types

### HealingResult

```typescript
interface HealingResult<T> {
  success: boolean;
  data?: T;           // Result data if successful
  error?: Error;       // Error if failed
  category?: ErrorCategory;
  attempts: number;    // Number of attempts made
  healed: boolean;     // Whether recovery succeeded
}
```

## Metrics and Monitoring

### Recovery Metrics

Track recovery performance:

```typescript
const metrics = selfHealer.getMetrics();
// Returns array of RecoveryMetric objects

const stats = selfHealer.getRecoveryStats();
// Returns:
// {
//   network: { total: 10, success: 8, rate: 0.8 },
//   auth: { total: 5, success: 4, rate: 0.8 },
//   ...
// }
```

### Example: Prometheus Export

```typescript
// Export metrics for Prometheus
app.get('/metrics', (req, res) => {
  const stats = selfHealer.getRecoveryStats();
  
  const lines = Object.entries(stats).map(([category, data]) => 
    `selfhealing_recovery_total{category="${category}"} ${data.total}`
  );
  
  res.set('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});
```

## Custom Error Handling

### Custom Classification

```typescript
const classifier = new ErrorClassifier();

// Add custom patterns
classifier.addPattern('custom', /my-custom-error/i);

// Get strategy
const strategy = classifier.getStrategy('custom');
```

### Custom Retry After

For rate limit errors with Retry-After header:

```typescript
const retryAfterMs = classifier.getRetryAfterMs(error);
// Parses: "Retry-After: 60" or "retry-after: 60 seconds"
// Returns milliseconds or null
```

## Best Practices

### DO

- Use meaningful context in `executeWithHealing()`
- Log retry attempts for debugging
- Set appropriate timeouts
- Use fallbacks for critical operations

### DON'T

- Don't retry validation errors
- Don't retry parsing errors without fixing input
- Don't set maxRetries too high for user-facing operations
- Don't forget to handle partial failures

## Integration Examples

### With Ollama

```typescript
const result = await selfHealer.executeWithHealing(
  () => ollama.chat({ model, messages }),
  {
    context: 'Ollama chat',
    fallback: () => ({ message: { content: 'Sorry, I'm having trouble thinking right now.' } })
  }
);
```

### With ComfyUI

```typescript
const result = await selfHealer.executeWithHealing(
  () => comfyui.queuePrompt(workflow),
  {
    context: 'Image generation',
    onRetry: (err, attempt) => {
      console.log(`Image gen retry ${attempt}: ${err.message}`);
    }
  }
);
```

### With Discord

```typescript
const result = await selfHealer.executeWithHealing(
  () => discord.sendMessage(channelId, message),
  {
    context: 'Discord message',
    fallback: () => console.log('Failed to send, will retry later')
  }
);
```

## Configuration

### Adjusting Strategies

Modify `DEFAULT_STRATEGIES` in `src/services/error-classifier.ts`:

```typescript
const DEFAULT_STRATEGIES: Record<ErrorCategory, RecoveryStrategy> = {
  network: {
    maxRetries: 5,        // Increase for unreliable networks
    baseDelayMs: 2000,    // Longer initial delay
    backoffMultiplier: 2,
    useJitter: true,
    shouldRetry: true,
  },
  // ...
};
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { selfHealer } from './self-healer.js';

describe('SelfHealer', () => {
  it('should retry on network failure', async () => {
    let attempts = 0;
    
    const result = await selfHealer.executeWithHealing(
      () => {
        attempts++;
        if (attempts < 3) throw new Error('ECONNREFUSED');
        return 'success';
      },
      { context: 'test' }
    );
    
    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
  });
  
  it('should not retry validation errors', async () => {
    const result = await selfHealer.executeWithHealing(
      () => { throw new Error('Invalid input'); },
      { context: 'test' }
    );
    
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });
});
```

## References

- [Error Classifier Source](src/services/error-classifier.ts)
- [Self Healer Source](src/services/self-healer.ts)
- [Health Monitor](health-monitoring.md)
