# Plan Router

The Plan Router determines what action to take based on extracted information from user messages.

## Overview

The Plan Router sits between the extraction service and the action handlers:

```
User Message
     ↓
Extraction Service (chrono-node)
     ↓
Plan Router (confidence-based routing)
     ↓
Action Handler (calendar/task/memory)
```

## How It Works

### Confidence Thresholds

The router uses confidence scores from the extraction service:

| Confidence | Action |
|------------|--------|
| >= 0.8 | **Direct dispatch** - Create event/task/memory |
| >= 0.5 | **Clarification** - Ask user for more info |
| < 0.5 | **None** - Let LLM handle it |

### Action Types

```typescript
type PlanActionType = 
  | 'calendar_event'  // Create calendar event
  | 'task'           // Create task/reminder
  | 'memory'         // Store in memory
  | 'clarification'  // Ask user for info
  | 'none';          // No action (LLM handles)
```

## API Reference

### PlanRouter.route()

```typescript
async route(
  extractionResult: ExtractedItem[],
  userMessage: string,
  userId: string,
  channelId: string,
  discord: DiscordRelay
): Promise<PlanAction[]>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| extractionResult | ExtractedItem[] | Results from extraction service |
| userMessage | string | Original user message |
| userId | string | Discord user ID |
| channelId | string | Discord channel ID |
| discord | DiscordRelay | Discord client for sending messages |

**Returns:** Array of PlanAction objects

### PlanAction Interface

```typescript
interface PlanAction {
  type: PlanActionType;
  title?: string;           // Event/task title
  startTime?: number;       // Unix timestamp
  endTime?: number;         // Unix timestamp
  dueTime?: number;         // For tasks
  description?: string;     // Event description
  clarification?: string;   // Clarification message
  confidence: number;       // Extraction confidence
}
```

## High Confidence (>= 0.8)

When confidence is high, the router directly dispatches to the appropriate handler:

### Calendar Events

```typescript
// Extract title and time, create event
await eventDb.create({
  userId,
  channelId,
  title,
  startTime,
  endTime
});

// Send confirmation with RSVP reactions
await discord.sendMessage(channelId, confirmationMessage);
await confMsg.react('✅');
await confMsg.react('❌');
await confMsg.react('🤔');
```

### Tasks

Tasks are identified by:
- Explicit type: `item.type === 'task'`
- Keywords in title: "frist", "deadline"

```typescript
// Create task with due date
await taskDb.create({
  userId,
  channelId,
  title,
  dueTime
});
```

### Memory

For memory items without time:

```typescript
// Store in memory
await memoryDb.store({
  userId,
  channelId,
  fact: title
});
```

## Medium Confidence (0.5 - 0.8)

When confidence is medium, the router asks for clarification:

### Clarification Messages

| Scenario | Message |
|----------|---------|
| Has time, no title | "Fant dato (${time}), men hva skal vi møtes om?" |
| Has title, no time | "Når skal du huske på '${title}'?" |
| Both missing | "Kan du gi meg mer info om dette?" |

### Clarification Flow

1. Bot sends clarification question
2. User responds
3. Message is re-processed through extraction
4. If confidence improves, action is taken

## Low Confidence (< 0.5)

No automatic action. The message is passed to the LLM for natural response.

```typescript
actions.push({ type: 'none', confidence: conf });
```

## Extension Points

### Custom Confidence Thresholds

Modify thresholds in `src/relay/plan-router.ts`:

```typescript
// Current thresholds (lines 64-80)
if (conf >= 0.8) {
  // High confidence - dispatch
}
if (conf >= 0.5) {
  // Medium confidence - clarify
}
// Low confidence - let LLM handle
```

### Custom Action Types

Add new action types:

```typescript
// 1. Define type
type PlanActionType = 
  | 'calendar_event'
  | 'task'
  | 'memory'
  | 'clarification'
  | 'notification'  // New type
  | 'none';

// 2. Handle in route()
if (conf >= 0.8) {
  const action = await this.handleHighConfidence(...);
  if (item.category === 'notification') {
    return this.handleNotification(item, ...);
  }
}
```

### Custom Clarification

Override clarification messages:

```typescript
private handleMediumConfidence(
  item: ExtractedItem,
  userMessage: string,
  channelId: string,
  discord: DiscordRelay
): Promise<PlanAction | null> {
  // Custom logic
  const customMessage = this.buildCustomClarification(item);
  await discord.sendMessage(channelId, customMessage);
  
  return { type: 'clarification', clarification: customMessage, ... };
}
```

## Error Handling

The router includes error handling with fallbacks:

```typescript
try {
  // Create event/task
} catch (err) {
  // Fallback: notify user but don't fail
  await discord.sendMessage(channelId, `Lagt til: ${title} ${formattedTime}`);
  
  // Return partial action
  return { type: isTask ? 'task' : 'calendar_event', title, confidence };
}
```

## Integration

### With Extraction Service

```typescript
import { ExtractionService } from '../services/extraction.js';

const extractionResult = await extractionService.extract(userMessage);
const actions = await planRouter.route(
  extractionResult,
  userMessage,
  userId,
  channelId,
  discord
);
```

### With Tone Service

```typescript
import { ToneService } from '../services/tone.js';

// Apply tone to confirmation messages
const tonedMessage = ToneService.apply(confirmationMessage, userId);
await discord.sendMessage(channelId, tonedMessage);
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { PlanRouter } from './plan-router.js';

describe('PlanRouter', () => {
  const router = new PlanRouter();
  
  it('should route high confidence to calendar', async () => {
    const result = await router.route(
      [{ title: 'Møte', confidence: 0.9, type: 'event', startTime: Date.now() }],
      'lag arrangement møte imorgen kl 14',
      'user123',
      'channel456',
      mockDiscord
    );
    
    expect(result[0].type).toBe('calendar_event');
  });
  
  it('should ask for clarification on medium confidence', async () => {
    const result = await router.route(
      [{ title: '', confidence: 0.6, type: 'event', startTime: Date.now() }],
      'lag arrangement imorgen',
      'user123',
      'channel456',
      mockDiscord
    );
    
    expect(result[0].type).toBe('clarification');
  });
});
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| None | - | No specific env vars for router |

The router uses hardcoded thresholds. Modify in source for custom behavior.

## References

- [Source Code](src/relay/plan-router.ts)
- [Extraction Service](src/services/extraction.ts)
- [Tone Service](src/services/tone.ts)
