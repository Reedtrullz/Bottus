# Relay Modularization Architecture

**Status:** DESIGN  
**Target:** Replace 1015-line monolith with EventEmitter-based modular architecture  
**Author:** Sisyphus-Junior  
**Generated:** 2026-02-22

---

## Executive Summary

This document defines the architecture for refactoring `src/relay/index.ts` (1015 lines) into a modular, EventEmitter-based system. The primary driver is the 335-line `discord.onMention()` callback containing 20+ sequential if-checks that handle different message types.

**Key Problem:** Sequential if-checks create a rigid, hard-to-maintain message handling pipeline where adding new handlers requires modifying the core callback.

**Solution:** Message Handler Registry pattern with EventEmitter for loose coupling between message detection, handling, and response delivery.

---

## 1. Architecture Overview

### 1.1 Module Boundaries

```
src/relay/
├── core/                    # Shared interfaces, EventBus, base classes
│   ├── index.ts            # Exports all core types
│   ├── event-bus.ts        # RelayEventBus implementation
│   ├── interfaces.ts       # IDiscordRelay, IOllamaBridge, IPlanRouter, IRelayService
│   └── types.ts            # Shared TypeScript types
├── discord/                # Discord relay implementation
│   ├── index.ts            # IDiscordRelay implementation
│   ├── message-parser.ts  # User message extraction
│   └── reaction-handler.ts # RSVP reaction handling
├── ollama/                 # Ollama bridge
│   ├── index.ts            # IOllamaBridge implementation
│   └── prompt-builder.ts   # Prompt construction with context
├── router/                 # Message routing and handler registry
│   ├── index.ts            # Handler registry + main router
│   ├── plan-router.ts      # PlanRouter (from existing ./plan-router.ts)
│   └── handlers/           # Individual message handlers
│       ├── index.ts        # Handler exports
│       ├── image.ts        # Image generation (ComfyUI)
│       ├── openclaw.ts     # OpenClaw tool execution
│       ├── tone.ts         # Per-user tone configuration
│       ├── feedback.ts     # Feedback storage/retrieval
│       ├── memory.ts       # Memory store/recall
│       ├── calendar.ts     # Calendar query handling
│       ├── query.ts        # General query answering
│       ├── features.ts     # Capabilities response
│       ├── tech-stack.ts  # Tech stack explanation
│       ├── self-analysis.ts # Bot performance analysis
│       ├── day-details.ts  # Day-specific event details
│       └── extraction.ts   # Default: extraction flow
└── utils/                  # Shared utilities (moved from monolith)
    ├── detectors.ts        # All is*() detection functions
    └── date-utils.ts       # Norwegian date/time helpers
```

### 1.2 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RELAY ENTRY (main.ts)                        │
│                    Initializes all services + starts                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RelayEventBus (core/event-bus.ts)                │
│         ┌─────────────────────────────────────────────────┐        │
│         │  emit(event, data) → notifies all listeners    │        │
│         │  on(event, handler) → register handler         │        │
│         └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌──────────────────────────┼──────────────────────────┐
                          ▼                          ▼        ▼
┌───────────────┐        ┌─────────────────┐        ┌────────────────┐
│ DiscordModule │        │  RouterModule   │        │ OllamaModule   │
│ (discord/)    │        │   (router/)     │        │  (ollama/)     │
├───────────────┤        ├─────────────────┤        ├────────────────┤
│ IDiscordRelay │        │ HandlerRegistry │        │ IOllamaBridge  │
│               │        │                 │        │                │
│ • login()     │        │ • register()    │        │ • sendMessage()│
│ • sendMessage │        │ • dispatch()     │        │ • healthCheck()│
│ • onMention() │        │ • route()        │        │                │
└───────────────┘        └─────────────────┘        └────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Message Handlers      │
                    │    (router/handlers/)   │
                    ├─────────────────────────┤
                    │ ImageGenerationHandler  │
                    │ OpenClawHandler         │
                    │ ToneHandler             │
                    │ FeedbackHandler         │
                    │ MemoryHandler           │
                    │ CalendarHandler        │
                    │ QueryHandler           │
                    │ ... (extensible)       │
                    └─────────────────────────┘
```

---

## 2. Interface Definitions

### 2.1 Core Interfaces (`core/interfaces.ts`)

```typescript
// RelayEventBus - Event-driven communication between modules
export interface RelayEventBus {
  emit<T>(event: RelayEvent, data: T): void;
  on<T>(event: RelayEvent, handler: EventHandler<T>): void;
  off<T>(event: RelayEvent, handler: EventHandler<T>): void;
}

export type RelayEvent = 
  | 'message.received'
  | 'message.detected'
  | 'message.handled'
  | 'message.error'
  | 'extraction.started'
  | 'extraction.completed'
  | 'ollama.request'
  | 'ollama.response'
  | 'calendar.updated'
  | 'reminder.triggered';

export type EventHandler<T> = (data: T) => void | Promise<void>;
```

### 2.2 IDiscordRelay Interface

```typescript
// Discord relay contract
export interface IDiscordRelay {
  // Lifecycle
  login(): Promise<void>;
  disconnect(): void;
  
  // Messaging
  sendMessage(channelId: string, content: string, options?: MessageOptions): Promise<void>;
  sendDMToUser(userId: string, content: string): Promise<boolean>;
  
  // Event subscription (notifies router of incoming mentions)
  onMention(handler: MentionHandler): void;
  
  // Context
  getUserId(): string;
  getClient(): any; // Eris client
}

export interface MentionHandler {
  (message: DiscordMessage): Promise<void>;
}

export interface DiscordMessage {
  id: string;
  channel: { id: string };
  content: string;
  author: { id: string; bot: boolean };
  reference?: { message_id?: string; messageId?: string };
}

export interface MessageOptions {
  embed?: any;
  components?: any[];
}
```

### 2.3 IOllamaBridge Interface

```typescript
// Ollama LLM bridge contract
export interface IOllamaBridge {
  // Send a prompt and get a response
  sendMessage(prompt: string): Promise<string>;
  
  // Health check
  healthCheck(): Promise<boolean>;
  
  // Configuration
  getModel(): string;
  getUrl(): string;
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}
```

### 2.4 IPlanRouter Interface

```typescript
// Plan routing contract - decides how to handle extracted items
export interface IPlanRouter {
  // Route extraction results through planning
  route(
    extractedItems: ExtractedItem[],
    userMessage: string,
    userId: string,
    channelId: string,
    relay: IDiscordRelay
  ): Promise<RouterAction[]>;
}

export interface ExtractedItem {
  type: 'event' | 'task' | 'reminder' | 'query';
  title: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  confidence: number;
}

export interface RouterAction {
  type: 'none' | 'create_event' | 'create_task' | 'set_reminder' | 'respond';
  result?: string;
  error?: string;
}
```

### 2.5 IRelayService Interface

```typescript
// Base interface for all message handlersRelayService {
  // Service identifier
  readonly
export interface I name: string;
  readonly priority: number; // Lower = checked first
  
  // Check if this handler can process the message
  canHandle(context: HandlerContext): HandleResult;
  
  // Process the message
  handle(context: HandlerContext): Promise<HandleResponse>;
}

export interface HandlerContext {
  message: DiscordMessage;
  rawContent: string;
  userMessage: string;
  userId: string;
  channelId: string;
  relay: IDiscordRelay;
  eventBus: RelayEventBus;
  services: ServiceContainer;
}

export interface ServiceContainer {
  ollama: IOllamaBridge;
  planRouter: IPlanRouter;
  extraction: ExtractionService;
  memory: MemoryService;
  feedback: FeedbackService;
  tone: ToneService;
  calendar: CalendarDisplayService;
  // ... other services
}

export interface HandleResult {
  canHandle: boolean;
  confidence: number; // 0-1, used for handler selection
  reason?: string;
}

export interface HandleResponse {
  handled: boolean;
  response?: string;
  error?: string;
  next?: 'continue' | 'stop'; // Continue to next handler or stop
}
```

---

## 3. Message Handler Registry Pattern

### 3.1 Problem: Sequential If-Checks

**Current State (Lines 597-932 in monolith):**

```typescript
// 20+ sequential if-checks - rigid and hard to extend
discord.onMention(async (msg) => {
  const userMessage = extractUserMessage(msg.content);
  
  // Handler 1: Image generation
  if (_imagePrompt && comfyui) { handleImage(); return; }
  
  // Handler 2: OpenClaw
  if (USE_OPENCLAW && openclaw) { handleOpenClaw(); return; }
  
  // Handler 3: Tone set
  if (userMessage.startsWith('tone set')) { handleTone(); return; }
  
  // Handler 4: Feedback
  if (userMessage.includes('tilbakemelding')) { handleFeedback(); return; }
  
  // ... 15 more handlers in sequence
  
  // Default: extraction flow
  handleExtraction();
});
```

### 3.2 Solution: Handler Registry

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    MessageHandlerRegistry                    │
├─────────────────────────────────────────────────────────────┤
│  handlers: IRelayService[]                                  │
│                                                              │
│  register(handler: IRelayService): void                     │
│  dispatch(ctx: HandlerContext): Promise<HandleResponse>    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │     Handler Selection Logic     │
            ├─────────────────────────────────┤
            │ 1. Filter: canHandle=true       │
            │ 2. Sort: priority ASC           │
            │ 3. Select: highest confidence    │
            │ 4. Execute: call handle()       │
            │ 5. If !handled, try next       │
            └─────────────────────────────────┘
```

### 3.3 Registry Implementation

```typescript
// router/registry.ts
export class MessageHandlerRegistry {
  private handlers: IRelayService[] = [];
  private eventBus: RelayEventBus;
  
  constructor(eventBus: RelayEventBus) {
    this.eventBus = eventBus;
  }
  
  register(handler: IRelayService): void {
    this.handlers.push(handler);
    // Sort by priority (lower = higher priority)
    this.handlers.sort((a, b) => a.priority - b.priority);
  }
  
  async dispatch(ctx: HandlerContext): Promise<HandleResponse> {
    // Emit event for logging/monitoring
    this.eventBus.emit('message.received', {
      userId: ctx.userId,
      channelId: ctx.channelId,
      message: ctx.userMessage
    });
    
    // Try each handler in priority order
    for (const handler of this.handlers) {
      const result = handler.canHandle(ctx);
      
      if (result.canHandle) {
        this.eventBus.emit('message.detected', {
          handler: handler.name,
          confidence: result.confidence,
          reason: result.reason
        });
        
        try {
          const response = await handler.handle(ctx);
          
          if (response.handled) {
            this.eventBus.emit('message.handled', {
              handler: handler.name,
              response: response.response
            });
            return response;
          }
          // If not handled, continue to next handler
        } catch (error) {
          this.eventBus.emit('message.error', {
            handler: handler.name,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue to next handler on error
        }
      }
    }
    
    // No handler claimed the message
    return { handled: false };
  }
}
```

### 3.4 Example Handler Implementation

```typescript
// router/handlers/image.ts
export class ImageGenerationHandler implements IRelayService {
  readonly name = 'ImageGenerationHandler';
  readonly priority = 10; // Very high - check early
  
  constructor(private comfyui: ComfyUIClient) {}
  
  canHandle(ctx: HandlerContext): HandleResult {
    const prompt = extractImagePrompt(ctx.userMessage);
    return {
      canHandle: prompt !== null && this.comfyui !== null,
      confidence: prompt ? 0.95 : 0,
      reason: prompt ? `Image prompt detected: ${prompt.substring(0, 30)}...` : undefined
    };
  }
  
  async handle(ctx: HandlerContext): Promise<HandleResponse> {
    const prompt = extractImagePrompt(ctx.userMessage);
    if (!prompt) return { handled: false };
    
    try {
      const result = await this.comfyui.generateImage(prompt, ctx.userId);
      
      if (result.success && result.imageUrl) {
        await ctx.relay.sendMessage(
          ctx.channelId,
          '🖼️ Bildet ditt:\n' + result.imageUrl
        );
        return { handled: true, response: result.imageUrl };
      }
      
      return {
        handled: true,
        response: '',
        error: result.error || 'Image generation failed'
      };
    } catch (error) {
      return {
        handled: true,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
```

### 3.5 Handler Priority Map

| Handler | Priority | Detection Method |
|---------|----------|------------------|
| ImageGenerationHandler | 10 | `extractImagePrompt()` pattern match |
| OpenClawHandler | 20 | `USE_OPENCLAW` flag + message |
| ToneHandler | 30 | Message starts with 'tone set' |
| ClarificationHandler | 40 | Pending clarification in context |
| ReplyContextHandler | 50 | Message is a reply to bot |
| FeedbackHandler | 60 | Contains 'tilbakemelding'/'feedback' |
| FeaturesHandler | 70 | `isFeaturesQuery()` |
| TechStackHandler | 80 | `isTechStackQuery()` |
| SelfAnalysisHandler | 90 | `isSelfAnalysisQuery()` |
| MemoryHandler | 100 | `isMemoryStore()`/`isMemoryQuery()` |
| DayDetailsHandler | 110 | Matches 'detaljer om' pattern |
| CalendarHandler | 120 | `isCalendarQuery()` |
| QueryHandler | 130 | `isQueryMessage()` |
| ExtractionHandler | 200 | Default fallback |

---

## 4. Event Bus Implementation

### 4.1 RelayEventBus

```typescript
// core/event-bus.ts
type EventHandler<T> = (data: T) => void | Promise<void>;

export class RelayEventBus {
  private listeners: Map<RelayEvent, Set<EventHandler<any>>> = new Map();
  
  emit<T>(event: RelayEvent, data: T): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    
    for (const handler of handlers) {
      try {
        const result = handler(data);
        if (result instanceof Promise) {
          result.catch(err => console.error(`[EventBus] Handler error:`, err));
        }
      } catch (err) {
        console.error(`[EventBus] Handler error:`, err);
      }
    }
  }
  
  on<T>(event: RelayEvent, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }
  
  off<T>(event: RelayEvent, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler);
  }
}
```

### 4.2 Event Flow Diagram

```
User Message
     │
     ▼
┌────────────────┐
│ DiscordRelay   │
│ onMention()    │
└────────────────┘
     │
     │ emit('message.received', ctx)
     ▼
┌────────────────┐
│ RelayEventBus  │
└────────────────┘
     │
     ├─────────────────────────────────────────────┐
     ▼                                             ▼
┌─────────────┐                           ┌─────────────────┐
│ Logger      │                           │ Metrics         │
│ (console)   │                           │ (stats)         │
└─────────────┘                           └─────────────────┘
     │
     ▼
┌─────────────────────────┐
│ MessageHandlerRegistry  │
│ dispatch(ctx)           │
└─────────────────────────┘
     │
     │ emit('message.detected', {handler, confidence})
     ▼
┌─────────────────────────┐
│ Handler Selection      │
│ (priority + confidence)│
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ Selected Handler        │
│ handle(ctx)             │
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ Response sent           │
│ emit('message.handled')│
└─────────────────────────┘
```

---

## 5. Migration Path

### Phase 1: Extract Utilities (Low Risk)

**Goal:** Move scattered utility functions to dedicated modules

```
Steps:
1. Create src/relay/utils/detectors.ts
   - Move: isQueryMessage(), extractImagePrompt(), isMemoryStore(),
           isMemoryQuery(), isCalendarQuery(), isTechStackQuery(),
           isFeaturesQuery(), isSelfAnalysisQuery()

2. Create src/relay/utils/date-utils.ts
   - Move: getDateTimeContext(), norskMonthNameToIndex(),
           norskMonthIndexToName()

3. Update imports in monolith (relay/index.ts)
   - Still points to utils, but functions are now isolated
```

**Verification:**
- All existing tests pass
- No changes to behavior

### Phase 2: Create Core Infrastructure (Low Risk)

**Goal:** Establish the interface contracts and EventBus

```
Steps:
1. Create src/relay/core/types.ts
   - Define HandlerContext, HandleResult, HandleResponse

2. Create src/relay/core/interfaces.ts
   - Define IDiscordRelay, IOllamaBridge, IPlanRouter, IRelayService

3. Create src/relay/core/event-bus.ts
   - Implement RelayEventBus

4. Create src/relay/core/index.ts
   - Export all core types
```

**Verification:**
- Core modules compile without errors
- Interfaces correctly typed

### Phase 3: Create Handler Skeletons (Medium Risk)

**Goal:** Create handler classes without migrating logic yet

```
Steps:
1. Create src/relay/router/handlers/base.ts
   - Abstract base class implementing IRelayService

2. Create src/relay/router/handlers/image.ts (skeleton)
   - Same interface, delegate to monolith temporarily

3. Repeat for all 12 handlers:
   - openclaw.ts, tone.ts, feedback.ts, memory.ts,
   - calendar.ts, query.ts, features.ts, tech-stack.ts,
   - self-analysis.ts, day-details.ts, extraction.ts

4. Create src/relay/router/registry.ts
   - MessageHandlerRegistry class
```

**Verification:**
- All handlers instantiate without errors
- No runtime behavior change yet

### Phase 4: Wire Handlers to Registry (Medium Risk)

**Goal:** Replace sequential if-checks with registry dispatch

```
Steps:
1. Modify relay/index.ts (monolith):
   - Import MessageHandlerRegistry
   - Create registry instance with all handlers
   - Replace onMention body with:
   
   discord.onMention(async (msg) => {
     const ctx = buildHandlerContext(msg);
     const result = await registry.dispatch(ctx);
     if (!result.handled) {
       // Fallback to extraction flow
     }
   });

2. Remove sequential if-checks from onMention
```

**Verification:**
- All message types still handled correctly
- No regression in existing functionality

### Phase 5: Migrate Handler Logic (Medium Risk)

**Goal:** Move logic from monolith to individual handler files

```
For each handler (in priority order):
1. ImageGenerationHandler
   - Move lines 603-616 from monolith
   - Test image generation still works

2. OpenClawHandler
   - Move lines 618-633
   - Verify tool execution

3. Continue through all handlers...
   - Test each handler in isolation
   - Remove migrated code from monolith
```

**Verification:**
- Each handler works independently
- Remove corresponding code from monolith after verification

### Phase 6: Final Cleanup (Low Risk)

**Goal:** Remove monolith, finalize module structure

```
Steps:
1. Delete old relay/index.ts
2. Create new relay/index.ts as thin entry point:
   - Initialize all services
   - Create registry with handlers
   - Register event listeners
   - Start Discord client

3. Update package.json exports if needed

4. Run full integration tests
```

---

## 6. Module Dependencies

### Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │         relay/index.ts              │
                    │         (Entry Point)               │
                    └─────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  core/event-bus │    │  core/interfaces│    │ core/types      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ discord/        │    │  ollama/        │    │  router/        │
│ (IDiscordRelay)│    │ (IOllamaBridge) │    │ (IPlanRouter)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  router/handlers/       │
                    │  (12 handler modules)   │
                    └─────────────────────────┘
```

### Import Hierarchy

```typescript
// What each module can import (safe dependency direction)

// core/         → No external relay dependencies (pure TypeScript)
// discord/      → core/interfaces
// ollama/       → core/interfaces  
// router/       → core/, discord/, ollama/
// router/handlers/ → core/, router/, services/
// utils/        → No relay dependencies
// index.ts      → All modules
```

---

## 7. Testing Strategy

### Unit Tests

| Module | Test File | Coverage Target |
|--------|-----------|-----------------|
| event-bus.test.ts | core/event-bus.ts | 90%+ |
| registry.test.ts | router/registry.ts | 90%+ |
| detectors.test.ts | utils/detectors.ts | 90%+ |
| handlers/image.test.ts | router/handlers/image.ts | 85%+ |
| handlers/memory.test.ts | router/handlers/memory.ts | 85%+ |

### Integration Tests

- `tests/relay/message-flow.test.ts` - Full message lifecycle
- `tests/relay/handler-priority.test.ts` - Handler selection logic
- `tests/relay/event-bus.test.ts` - Event propagation

### Migration Validation

- Run existing E2E tests after each phase
- Compare before/after response times
- Verify no behavioral regression

---

## 8. Metrics & Targets

| Metric | Current (Monolith) | Target (Modular) |
|--------|-------------------|------------------|
| Total lines | 1015 | ~300 (entry + config) |
| Max function size | 635 (main) | 50 |
| Message handlers | 20+ in one callback | 1 per file |
| Detection functions | 10 scattered | 1 utils file |
| Testability | Low | High (mockable) |
| Add new handler | Modify monolith | Add new file + register |

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Run full test suite after each phase |
| EventBus performance overhead | Use sync handlers where possible, batch emit |
| Handler priority conflicts | Document priority values, add validation |
| Circular dependencies | Enforce import hierarchy, lint rule |
| Missing handler coverage | Add default ExtractionHandler at priority 200 |

---

## 10. Files to Create

```
src/relay/
├── core/
│   ├── index.ts            # 15 lines - exports
│   ├── event-bus.ts        # 50 lines - EventBus implementation
│   ├── interfaces.ts       # 80 lines - all interfaces
│   └── types.ts            # 40 lines - shared types
├── discord/
│   ├── index.ts            # 100 lines - IDiscordRelay impl
│   ├── message-parser.ts   # 30 lines - user message extraction
│   └── reaction-handler.ts # 40 lines - RSVP handling
├── ollama/
│   ├── index.ts            # 60 lines - IOllamaBridge impl
│   └── prompt-builder.ts   # 40 lines - prompt construction
├── router/
│   ├── index.ts            # 30 lines - registry export + setup
│   ├── registry.ts         # 60 lines - MessageHandlerRegistry
│   ├── plan-router.ts      # (move from ./plan-router.ts)
│   └── handlers/
│       ├── index.ts        # 20 lines - handler exports
│       ├── base.ts         # 30 lines - abstract base
│       ├── image.ts        # 40 lines
│       ├── openclaw.ts     # 45 lines
│       ├── tone.ts         # 30 lines
│       ├── feedback.ts     # 40 lines
│       ├── memory.ts       # 50 lines
│       ├── calendar.ts     # 80 lines
│       ├── query.ts        # 60 lines
│       ├── features.ts    # 25 lines
│       ├── tech-stack.ts   # 25 lines
│       ├── self-analysis.ts # 35 lines
│       ├── day-details.ts  # 35 lines
│       └── extraction.ts   # 50 lines
├── utils/
│   ├── detectors.ts        # 60 lines - moved from monolith
│   └── date-utils.ts       # 30 lines - moved from monolith
└── index.ts                # 80 lines - new thin entry point

Total new/modified files: ~30
Lines moved from monolith: ~800
Lines remaining in new entry: ~80
```

---

## 11. Summary

This architecture replaces the 1015-line monolith with a clean, extensible system:

1. **EventBus** provides loose coupling between modules
2. **Handler Registry** replaces 20+ sequential if-checks with priority-based dispatch
3. **Interface contracts** enable testing and future替换
4. **Clear boundaries** between Discord, Ollama, and routing concerns
5. **Migration path** with 6 phases, each with verifiable milestones

The modular design allows:
- Adding new message handlers without touching core code
- Testing handlers in isolation
- Swapping implementations (e.g., different LLM backends)
- Parallel development on different handlers

**Estimated migration effort:** 2-3 focused work sessions (6-9 hours)

---

*Generated: 2026-02-22*
*Related: .sisyphus/plans/hotspots/relay-index.md*
