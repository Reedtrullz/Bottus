# Hotspot Brief: src/relay/index.ts

**File:** `src/relay/index.ts`  
**Lines:** 1015  
**Status:** COMPLEX - Multiple responsibilities in single file  

---

## Executive Summary

The relay file is the central hub for the Discord↔Ollama relay with digital almanac features. It handles message routing, extraction, image generation, calendar management, memory, feedback, reminders, and more—all in a single 1015-line file. The primary hotspot is the massive `discord.onMention()` callback (335 lines) which contains 20+ independent message handlers.

---

## Large Functions (>50 lines)

| Function | Lines | Location | Purpose |
|----------|-------|----------|---------|
| `main()` | 634 | 381-1015 | Entire application entry point |
| `discord.onMention()` callback | 335 | 597-932 | Main message handler (CRITICAL) |
| `handleQuery()` | 115 | 249-364 | Calendar/task query answering |
| `createOpenClawToolExecutor()` | 77 | 28-105 | Calendar tool execution factory |
| `handleExtractionFlow()` | 71 | 490-561 | Extraction → PlanRouter → Ollama flow |
| `runReminders()` | 41 | 959-1000 | Periodic reminder checker |

---

## Complex Logic Areas

### 1. Main Message Handler (`discord.onMention()`) - Lines 597-932

**Severity:** CRITICAL  
**Pattern:** 20+ sequential if-checks with early returns

The callback handles these message types in sequence:
1. Image generation trigger (ComfyUI)
2. OpenClaw with tools
3. Tone set command
4. Feedback handling
5. Pending clarification responses
6. Reply context building
7. Features query
8. Tech stack query
9. Self-analysis query
10. Memory store/recall
11. Day details query
12. Calendar query
13. Default: extraction flow → Ollama

**Issues:**
- 335 lines of sequential branching
- No clear separation between detection and handling
- State mutations scattered throughout
- Error handling duplicated per handler

### 2. Query Handling (`handleQuery()`) - Lines 249-364

**Severity:** HIGH  
**Pattern:** Nested conditionals with multiple formatting helpers

Handles Norwegian calendar queries including:
- "hvem kommer" (RSVP queries)
- Specific event queries ("når er X?")
- General event listing
- Task listing

**Issues:**
- 115 lines for query logic
- Mixed formatting helpers inline
- Nested function `maybeHandleSpecificEventQuery()` (lines 285-309)
- Multiple array transformations

### 3. Extraction Flow (`handleExtractionFlow()`) - Lines 490-561

**Severity:** MEDIUM  
**Pattern:** Sequential async operations with fallback

Flow:
1. Fetch memory context
2. Check if query message → direct answer
3. Route through PlanRouter
4. If no action, enhance prompt with extraction results
5. Send to Ollama → apply tone → respond

**Issues:**
- 71 lines for what could be a pipeline
- Memory fetch happens even when not needed for queries
- PlanRouter routing mixed with response handling

---

## Event-Driven Pattern Opportunities

### Current State: Sequential If-Checks

```typescript
// Current pattern - every handler checked sequentially
if (isImagePrompt(msg)) { handleImage(); return; }
if (isOpenClawEnabled()) { handleOpenClaw(); return; }
if (isToneSet(msg)) { handleTone(); return; }
if (isFeedback(msg)) { handleFeedback(); return; }
// ... 15 more
```

### Opportunity: Message Handler Registry

Extract each handler into its own module and register:

```typescript
// Proposed: handlers/message-registry.ts
interface MessageHandler {
  canHandle(msg: string): boolean;
  handle(msg: Message, ctx: HandlerContext): Promise<void>;
}

const handlers: MessageHandler[] = [
  new ImageGenerationHandler(comfyui),
  new OpenClawHandler(openclaw, executor),
  new ToneSetHandler(toneDb),
  new FeedbackHandler(feedback),
  new MemoryHandler(memory),
  new CalendarQueryHandler(calendar),
  // ... etc
];

// Main handler becomes:
for (const handler of handlers) {
  if (handler.canHandle(userMessage)) {
    return handler.handle(msg, ctx);
  }
}
```

### Specific Extractions

| Module | Current Location | Responsibility |
|--------|------------------|----------------|
| `ImageGenerationHandler` | Lines 603-616 | ComfyUI image generation |
| `OpenClawHandler` | Lines 618-633 | OpenClaw tool execution |
| `ToneHandler` | Lines 635-648 | Per-user tone configuration |
| `FeedbackHandler` | Lines 651-673 | Store/view feedback |
| `ClarificationHandler` | Lines 676-686 | Pending clarification responses |
| `ReplyContextBuilder` | Lines 688-712 | Build context from replies |
| `FeaturesHandler` | Lines 714-732 | Capabilities response |
| `TechStackHandler` | Lines 734-752 | Tech stack explanation |
| `SelfAnalysisHandler` | Lines 754-781 | Bot performance analysis |
| `MemoryHandler` | Lines 783-828 | Store/recall memories |
| `DayDetailsHandler` | Lines 830-856 | Day-specific event details |
| `CalendarHandler` | Lines 858-921 | Calendar embed building |

---

## Extraction Opportunities

### 1. Detection Functions → `utils/detectors.ts`

All `is*()` functions can be extracted:
- `isQueryMessage()` (line 113)
- `extractImagePrompt()` (line 126)
- `isMemoryStore()` (line 153)
- `isMemoryQuery()` (line 160)
- `isCalendarQuery()` (line 168)
- `isTechStackQuery()` (line 183)
- `isFeaturesQuery()` (line 200)
- `isSelfAnalysisQuery()` (line 215)

### 2. Date Helpers → `utils/date-utils.ts`

- `getDateTimeContext()` (line 15)
- `norskMonthNameToIndex()` (line 222)
- `norskMonthIndexToName()` (line 242)

### 3. Tool Executor Factory → `handlers/openclaw-handler.ts`

The `createOpenClawToolExecutor()` (lines 28-105) is 77 lines of switch-case logic. Extract to dedicated module.

### 4. Query Handler → `handlers/query-handler.ts`

The `handleQuery()` function with its nested helpers should become its own service.

### 5. Reminder Service → `services/reminder-service.ts`

The `runReminders()` logic (lines 959-1000) is already 41 lines and could be a proper scheduled service.

### 6. Message Handler Orchestrator → `handlers/message-router.ts`

The main `discord.onMention()` callback should become a thin orchestrator that delegates to registered handlers.

---

## Recommended Refactoring Path

### Phase 1: Extract Utilities (Low Risk)
1. Move all `is*()` detectors to `src/relay/utils/detectors.ts`
2. Move date helpers to `src/relay/utils/date-utils.ts`

### Phase 2: Extract Handlers (Medium Risk)
1. Create `src/relay/handlers/` directory
2. Extract each message handler to its own file
3. Create `MessageHandler` interface
4. Build registry in main file

### Phase 3: Extract Services (Medium Risk)
1. Extract `handleQuery()` to `src/relay/services/query-handler.ts`
2. Extract `runReminders()` to proper scheduled service
3. Extract `createOpenClawToolExecutor()` to handler module

### Phase 4: Orchestration (Low Risk)
1. Refactor `discord.onMention()` to use handler registry
2. Main file becomes ~200 lines of setup + orchestration

---

## Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total lines | 1015 | ~300 |
| Max function size | 635 (main) | 50 |
| Message handlers | 20+ in one callback | 1 per file |
| Detection functions | 10 scattered | 1 utils file |
| Testability | Low | High |

---

## Files to Create

```
src/relay/
├── utils/
│   ├── detectors.ts      # All is*() functions
│   └── date-utils.ts    # Date/time helpers
├── handlers/
│   ├── index.ts         # Handler registry
│   ├── image.ts         # Image generation
│   ├── openclaw.ts      # OpenClaw tool execution
│   ├── tone.ts          # Tone configuration
│   ├── feedback.ts      # Feedback handling
│   ├── memory.ts        # Memory store/recall
│   ├── calendar.ts      # Calendar queries
│   ├── query.ts         # General query handling
│   └── extraction.ts    # Extraction flow
└── services/
    └── reminder.ts      # Reminder scheduling
```

---

*Generated: 2026-02-22*
*Analyzer: Sisyphus-Junior*
