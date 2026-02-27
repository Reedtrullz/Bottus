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
| image.ts | ComfyUI image generation |
| calendar.ts | Calendar event handling |
| memory.ts | Memory store/recall |
| feedback.ts | Feedback handling |
| features.ts | Capabilities response |
| techstack.ts | Tech stack explanation |
| tone.ts | Tone configuration commands |
| self-analysis.ts | Bot performance analysis |
| role.ts | Role management |
| proposal.ts | Proposal approve/reject commands |
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
import { globalHandlers } from './handlers/index.js';

// Register handlers in main()
globalHandlers.register(featuresHandler);
globalHandlers.register(techStackHandler);
globalHandlers.register(helpHandler);
globalHandlers.register(imageHandler);
globalHandlers.register(new ToneHandler(toneDb));
globalHandlers.register(new SelfAnalysisHandler(selfImprovement));

// Dispatch in onMention callback
const result = await globalHandlers.dispatch(message, ctx);
if (result.handled) return;
```

## CONVENTIONS

- Handlers implement `MessageHandler` interface
- `canHandle()` returns boolean for router eligibility
- `handle()` processes and returns `HandlerResult`
- Constructor injection for dependencies
- Unused params prefixed with underscore: `_ctx`, `_message`

## HANDLER EXECUTION ORDER

1. Rate limiting check (first)
2. Image generation (special case - ComfyUI health check)
3. skillRegistry (for complex skills)
4. globalHandlers.dispatch() (for simple handlers)

## NOTES

- Handler dispatch is sequential (first match wins)
- Handlers registered in `relay/index.ts` at startup
- Uses `extractImagePrompt()` from `../utils/detectors.js`
- Bilingual support (Norwegian/English) in help handler
- All handlers now wired to globalHandlers registry
