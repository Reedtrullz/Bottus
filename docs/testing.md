# Testing Strategy

This document outlines the testing approach for the Bottus project.

## Overview

The project uses **Vitest** for testing. Tests are located in the `tests/` directory.

## Test Stats

- **Test Files**: 34
- **Tests**: 522
- **Line Coverage**: ~40%
- **Branch Coverage**: ~77%

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/relay/calendar-skill-v2.test.ts

# Run with coverage
npm test -- --coverage
```

## Test Structure

### Directory Layout

```
tests/
├── relay/
│   ├── calendar-skill-v2.test.ts
│   ├── memory-skill.test.ts
│   ├── clarification-skill.test.ts
│   ├── day-details-skill.test.ts
│   ├── image-skill.test.ts
│   ├── help-handler.test.ts
│   ├── permission.test.ts
│   ├── detectors.test.ts
│   ├── date-utils.test.ts
│   ├── discord.test.ts
│   ├── ollama.test.ts
│   └── handlers/
│       ├── proposal.test.ts
│       ├── role.test.ts
│       └── tone.test.ts
├── services/
│   ├── proposal-engine.test.ts
│   ├── extraction.test.ts
│   ├── consent.test.ts
│   ├── feedback.test.ts
│   ├── reminders.test.ts
│   ├── memory.test.ts
│   ├── calendar-v2.test.ts
│   ├── governance.test.ts
│   ├── user-profile.test.ts
│   └── comfyui.test.ts
├── gateway/
│   ├── adapter-context.test.ts
│   └── event-bus.test.ts
├── utils/
│   ├── i18n.test.ts
│   ├── timezone.test.ts
│   └── env-validator.test.ts
├── db/
│   └── operations.test.ts
└── integration/
    └── relay.integration.test.ts
```

### Test File Naming

- Test files: `*.test.ts`
- Pattern: `{module}.test.ts`

## Writing Tests

### Basic Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourService } from '../../src/services/your-service.js';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    service = new YourService();
  });

  it('should do something', async () => {
    const result = await service.doSomething();
    expect(result).toBe('expected');
  });
});
```

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  const result = await service.asyncOperation();
  expect(result).toEqual(expected);
});
```

### Testing with Mocks

```typescript
import { vi } from 'vitest';

it('should call external service', async () => {
  const mockFetch = vi.fn().mockResolvedValue({ ok: true });
  global.fetch = mockFetch;

  await service.fetchData();

  expect(mockFetch).toHaveBeenCalledWith('http://example.com');
});
```

## Test Patterns

### Unit Tests

Test individual functions or classes in isolation:

```typescript
describe('PlanRouter', () => {
  it('should route high confidence items', async () => {
    const router = new PlanRouter();
    const result = await router.route(
      [{ title: 'Test', confidence: 0.9, type: 'event', startTime: Date.now() }],
      'user message',
      'userId',
      'channelId',
      mockDiscord
    );
    expect(result[0].type).toBe('calendar_event');
  });
});
```

### Integration Tests

Test multiple components working together:

```typescript
describe('Calendar Integration', () => {
  it('should create and retrieve event', async () => {
    const created = await calendarService.create({ title: 'Test' });
    const retrieved = await calendarService.get(created.id);
    expect(retrieved.title).toBe('Test');
  });
});
```

### Handler Tests

Test message handlers with various inputs:

```typescript
describe('Help Handler', () => {
  it('should respond to help requests', async () => {
    const response = await helpHandler.handle('help', mockContext);
    expect(response.handled).toBe(true);
    expect(response.response).toContain('help');
  });
});
```

## Mock Utilities

### Test Utilities

Use shared test utilities in `tests/relay/test-utils.ts`:

```typescript
import { createMockContext, createMockMessage } from './test-utils.js';

const mockCtx = createMockContext({
  userId: '123',
  channelId: '456',
  message: 'test message'
});
```

### Mocking Discord

```typescript
const mockDiscord = {
  sendMessage: vi.fn().mockResolvedValue({ id: '123' }),
  react: vi.fn().mockResolvedValue(undefined),
};
```

## Current Coverage Areas

| Module | Coverage | Notes |
|--------|----------|-------|
| `src/utils` | ~69% | i18n, timezone, env-validator |
| `src/relay/skills` | ~55% | Calendar, memory, clarification |
| `src/relay/utils` | ~60% | Detectors, date-utils |
| `src/services` | ~15% | Low - needs more tests |
| `src/gateway` | ~12% | Experimental module |
| `src/db` | ~18% | Database layer |
| `src/relay` | ~7% | Core relay logic |

## Improving Coverage

1. Add tests for new features
2. Add regression tests for bugs
3. Test edge cases
4. Test error handling paths

## Best Practices

### DO

- Use descriptive test names
- Test one thing per test
- Use meaningful assertions
- Clean up after tests (teardown)
- Test both success and error paths

### DON'T

- Don't test implementation details
- Don't use overly generic assertions
- Don't forget to test edge cases
- Don't leave commented-out tests

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Push to main branch

```yaml
# .github/workflows/ci.yml
- name: Run tests
  run: npm test

- name: Build
  run: npm run build
```

## Debugging Tests

### Watch Mode

```bash
# Run tests in watch mode
npm test -- --watch
```

### Verbose Output

```bash
npm test -- --reporter=verbose
```

### Single Test

```bash
npm test -- -t "should do something"
```

## References

- [Vitest Documentation](https://vitest.dev/)
- [Existing Tests](https://github.com/Reedtrullz/Bottus/tree/main/tests)
- [Test Utils](tests/relay/test-utils.ts)
