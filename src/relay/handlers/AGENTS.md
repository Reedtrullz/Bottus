# src/relay/handlers - Message Handler System

## OVERVIEW
Modular message handler architecture for relay message processing. Implements a registry pattern where handlers are registered and dispatched based on `canHandle()` evaluation.

## FILES

| File | Purpose |
|------|---------|
| interfaces.ts | `MessageHandler`, `HandlerContext`, `HandlerResult` interfaces |
| registry.ts | `HandlerRegistry` class with `register()` and `dispatch()` |
| index.ts | Exports and handler registration |
| help.ts | Contextual help responses |
| image.ts | ComfyUI image generation (remaining handler) |
| calendar.ts | Calendar event handling |
| memory.ts | Memory store/recall |
| feedback.ts | Feedback handling |
| features.ts | Capabilities response |
| techstack.ts | Tech stack explanation |
| teach.ts | Teaching handler |

## HANDLER INTERFACE

```typescript
interface MessageHandler {
  readonly name: string;
  canHandle(message: string, ctx: HandlerContext): boolean;
  handle(message: string, ctx: HandlerContext): Promise<HandlerResult>;
}

interface HandlerContext {
  message: string;
  userId: string;
  channelId: string;
  discord: DiscordRelay;
}

interface HandlerResult {
  handled: boolean;
  response?: string;
  error?: string;
}
```

## REGISTRY PATTERN

```typescript
const globalHandlers = new HandlerRegistry();

globalHandlers.register(new ImageHandler(comfyui));
globalHandlers.register(new CalendarHandler(calendarService));
// ... register more handlers

// Dispatch via registry
const result = await globalHandlers.dispatch(message, ctx);
```

## CONVENTIONS

- Handlers implement `MessageHandler` interface
- `canHandle()` returns boolean for router eligibility
- `handle()` processes and returns `HandlerResult`
- Constructor injection for dependencies (e.g., `ComfyUIClient`)
- Unused params prefixed with underscore: `_ctx`, `_message`

## EXAMPLE HANDLER

```typescript
export class ImageHandler implements MessageHandler {
  readonly name = 'image';

  private comfyui: ComfyUIClient | null;

  constructor(comfyui: ComfyUIClient | null) {
    this.comfyui = comfyui;
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message || !this.comfyui) return false;
    const prompt = extractImagePrompt(message);
    return prompt !== null;
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    // ... implementation
  }
}
```

## NOTES

- Handler dispatch is sequential (first match wins)
- Handlers are composed in `relay/index.ts` at startup
- Uses `extractImagePrompt()` from `../utils/detectors.js`
- Bilingual support (Norwegian/English) in help handler

**NOTE:** Most handlers migrated to skills. Remaining: ImageHandler, HelpHandler, FeedbackHandler, TechStackHandler, FeaturesHandler
