# Skills System

The skills system is a modular architecture for handling different types of user requests. Each skill is responsible for a specific domain (calendar, memory, images, etc.).

## Architecture

```
src/relay/skills/
├── interfaces.ts    # Skill interface definitions
├── registry.ts      # Skill registration and lookup
├── index.ts         # Skill exports
├── calendar-skill-v2.ts    # Calendar operations
├── memory-skill.ts         # User memory
├── clarification-skill.ts   # Pending responses
├── day-details-skill.ts    # Day-specific queries
├── image-skill.ts          # Image generation
├── extraction-skill.ts     # Extraction handling
└── permission.ts           # Permission checking
```

## Skill Interface

All skills implement the `Skill` interface:

```typescript
interface Skill {
  readonly name: string;
  readonly description: string;
  
  canHandle(message: string, ctx: HandlerContext): boolean;
  handle(message: string, ctx: HandlerContext): Promise<SkillResponse>;
  
  // Optional methods
  getMemory?(channelId: string): any;
  setMemory?(channelId: string, memory: any): void;
}
```

### Interface Methods

| Method | Description |
|--------|-------------|
| `name` | Unique identifier for the skill |
| `description` | Human-readable description |
| `canHandle` | Determine if this skill can handle the message |
| `handle` | Process the message and return response |
| `getMemory` | (Optional) Retrieve skill-specific memory |
| `setMemory` | (Optional) Store skill-specific memory |

### Handler Context

```typescript
interface HandlerContext {
  userId: string;
  channelId: string;
  message: string;
  discord: DiscordRelay;
  ollama?: OllamaClient;
  extraction?: ExtractionService;
  memory?: MemoryService;
  security?: SecurityContext;
}
```

### Skill Response

```typescript
interface SkillResponse {
  handled: boolean;
  response?: string;
  shouldContinue?: boolean;
}
```

## Creating a New Skill

### 1. Create the Skill File

```typescript
// src/relay/skills/my-skill.ts
import type { Skill, SkillResponse, HandlerContext } from './interfaces.js';

export class MySkill implements Skill {
  readonly name = 'my-skill';
  readonly description = 'Handles my custom requests';

  canHandle(message: string, ctx: HandlerContext): boolean {
    return message.toLowerCase().includes('my trigger');
  }

  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    // Process the message
    return {
      handled: true,
      response: 'Response message'
    };
  }
}
```

### 2. Register the Skill

```typescript
// src/relay/skills/index.ts
import { skillRegistry } from './registry.js';
import { MySkill } from './my-skill.js';

skillRegistry.register(new MySkill());
```

## Built-in Skills

### Calendar Skill

Handles calendar event operations:

```typescript
// Capabilities:
- Create events: "lag arrangement Dinner imorgen kl 18"
- List events: "hva skjer"
- RSVP: "rsvp Dinner yes"
- Delete: "slett Dinner"
- Export: "eksport kalender"
```

### Memory Skill

Stores and retrieves user memories:

```typescript
// Capabilities:
- Store: "husk at jeg liker pizza"
- Query: "hva liker jeg?"
- Update: "endre favoritten min til sushi"
```

### Image Skill

Generates images via ComfyUI:

```typescript
// Capabilities:
- Generate: "lag et bilde av en katt"
- Enhance prompts using Ollama
- Return image URL or attachment
```

### Clarification Skill

Handles pending responses:

```typescript
// Capabilities:
- Process avtale (appointment) clarifications
- Process minne (memory) clarifications
- Ask follow-up questions
```

### Day Details Skill

Provides day-specific information:

```typescript
// Capabilities:
- "hva skjer på mandag"
- List events for specific days
- Show event details
```

## Skill Registry

The registry manages skill registration and lookup:

```typescript
interface SkillRegistry {
  register(skill: Skill): void;
  unregister(name: string): boolean;
  getSkill(name: string): Skill | undefined;
  getAllSkills(): Skill[];
  findHandler(message: string, ctx: HandlerContext): Skill | undefined;
}
```

### Usage

```typescript
// Find handler for message
const skill = skillRegistry.findHandler('lag et bilde av en katt', ctx);
if (skill) {
  const response = await skill.handle('lag et bilde av en katt', ctx);
}
```

## Security

Skills can use the security context for permission checking:

```typescript
interface SecurityContext {
  permissionService: PermissionService;
  auditLogger: AuditLogger;
  confirmationService: ConfirmationService;
}
```

## Best Practices

### DO

- Keep skills focused on a single responsibility
- Use the `canHandle` method for efficient filtering
- Return `handled: false` if skill can't process
- Use the security context for permissions

### DON'T

- Don't make skills dependent on each other
- Don't handle errors silently - return proper responses
- Don't store sensitive data without encryption
- Don't block the event loop - use async/await

## Testing Skills

```typescript
import { describe, it, expect } from 'vitest';
import { CalendarSkill } from './calendar-skill-v2.js';

describe('CalendarSkill', () => {
  const skill = new CalendarSkill();
  
  it('should handle calendar requests', () => {
    expect(skill.canHandle('lag arrangement test', mockCtx)).toBe(true);
  });
});
```

## Extension Points

### Custom Memory Storage

Implement `getMemory` and `setMemory` for custom storage:

```typescript
class MySkill implements Skill {
  getMemory(channelId: string): MyData {
    return memoryStore.get(channelId);
  }
  
  setMemory(channelId: string, memory: MyData): void {
    memoryStore.set(channelId, memory);
  }
}
```

### Pre/Post Handlers

Use the registry for pre/post processing:

```typescript
skillRegistry.register({
  name: 'pre-processor',
  canHandle: () => true,
  handle: async (msg, ctx) => {
    // Pre-processing
    const result = await nextHandler(msg, ctx);
    // Post-processing
    return result;
  }
});
```

## References

- [Skill Interfaces](src/relay/skills/interfaces.ts)
- [Skill Registry](src/relay/skills/registry.ts)
- [Calendar Skill](src/relay/skills/calendar-skill-v2.ts)
- [Memory Skill](src/relay/skills/memory-skill.ts)
