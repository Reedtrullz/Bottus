# Skill Tests Work Plan

## Context

### Test Infrastructure
- **Framework**: vitest v1.2.2
- **Run**: `npm test` or `npx vitest run`
- **Location**: `tests/` directory
- **Pattern**: `tests/relay/{skill-name}.test.ts`

### Existing Test Pattern (from image-skill.test.ts)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ImageSkill } from '../../src/relay/skills/image-skill.js';
import type { HandlerContext } from '../../src/relay/skills/interfaces.js';

class MockDiscordClient {
  sentMessages: Array<{ channelId: string; content: string }> = [];
  async sendMessage(channelId: string, content: string): Promise<any> {
    this.sentMessages.push({ channelId, content });
    return { id: 'mock-message-id', channelId, content };
  }
}

describe('SkillName', () => {
  let skill: SkillName;
  let mockDiscord: MockDiscordClient;
  let ctx: HandlerContext;

  beforeEach(() => {
    skill = new SkillName(/* dependencies */);
    mockDiscord = new MockDiscordClient();
    ctx = { userId, channelId, message, discord: mockDiscord };
  });

  describe('canHandle', () => {
    it('should handle X', () => { /* ... */ });
  });

  describe('handle', () => {
    it('should do Y', () => { /* ... */ });
  });
});
```

## Skills Needing Tests

| Skill | File | Priority |
|-------|------|----------|
| CalendarSkillV2 | `src/relay/skills/calendar-skill-v2.ts` | HIGH |
| MemorySkill | `src/relay/skills/memory-skill.ts` | HIGH |
| ClarificationSkill | `src/relay/skills/clarification-skill.ts` | HIGH |
| DayDetailsSkill | `src/relay/skills/day-details-skill.ts` | MEDIUM |

## Test Files to Create

### 1. tests/relay/calendar-skill-v2.test.ts

**What to test**:

| Scenario | Test Cases |
|----------|------------|
| canHandle patterns | calendar, event, remind, møte, avtale, kalender |
| Create event | "lag arrangement møte imorgen kl 14" |
| List events | "hva skjer", "list events", "what's coming" |
| Week view | "kalender uke", "calendar week" |
| Month view | "kalender måned", "calendar month", specific month |
| Today | "i dag", "today" |
| Export | "eksport kalender", "export ics" |
| Delete | "slett møte", "delete meeting" |
| Edge cases | No date in message, invalid date, no match |

**Mock dependencies**:
- CalendarServiceV2 (mock createEvent, getEvents, deleteEvent, parseNaturalDate, generateICS)
- CalendarDisplayService (mock buildWeekEmbed, getDayDetails)

### 2. tests/relay/memory-skill.test.ts

**What to test**:

| Scenario | Test Cases |
|----------|------------|
| canHandle patterns | husk, husk at, husk jeg er, hva husker du |
| Store memory | "husk at jeg liker katter" |
| Store with date (clarification) | "husk imorgen kl 14 møte" triggers clarification |
| Query memory | "hva husker du" returns memories |
| Clarification flow | Date pattern triggers pendingClarifications |
| MemoryService integration | Verify store/recall called |

**Mock dependencies**:
- MemoryService (mock store, recall)

### 3. tests/relay/clarification-skill.test.ts

**What to test**:

| Scenario | Test Cases |
|----------|------------|
| canHandle | Only when pending clarification exists |
| Handle "avtale" | Should suggest calendar, delete pending |
| Handle "minne" | Should store memory, delete pending |
| No pending | Should return handled: false |
| Edge cases | "avtale!", "minne!" with exclamation |

**Mock dependencies**:
- MemoryService (mock store)
- pendingClarifications module

### 4. tests/relay/day-details-skill.test.ts

**What to test**:

| Scenario | Test Cases |
|----------|------------|
| canHandle patterns | "detaljer om mandag", "vis dag imorgen" |
| Get details | Should call getDayDetails |
| Valid date | Returns event details |
| No events | Returns "ingen hendelser" |
| Invalid date | Returns handled: false |

**Mock dependencies**:
- CalendarDisplayService (mock getDayDetails)

## Test Structure

### Shared Test Utilities

Create `tests/relay/test-utils.ts`:
```typescript
// MockDiscordClient
// createMockContext(helpers)
// mockCalendarService
// mockMemoryService
```

## Execution Strategy

### Wave 1: Foundation (1 task)
- Create `tests/relay/test-utils.ts` with shared mocks

### Wave 2: Core Skills (3 tasks parallel)
- CalendarSkillV2 tests
- MemorySkill tests  
- ClarificationSkill tests

### Wave 3: Secondary (1 task)
- DayDetailsSkill tests

### Wave 4: Integration (1 task)
- Test skill registry dispatch

## Acceptance Criteria

- [ ] All 4 skills have test files in tests/relay/
- [ ] Each skill has canHandle tests (positive + negative cases)
- [ ] Each skill has handle tests for main functionality
- [ ] Mock patterns follow existing image-skill.test.ts style
- [ ] Tests run with `npm test`
- [ ] No external service calls (all mocked)
