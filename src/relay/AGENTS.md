# src/relay/ - Discord↔Ollama Relay

## OVERVIEW
Bidirectional relay between Discord DMs/Group DMs and Ollama LLM. Uses selfbot to access Group DMs. Also handles digital almanac (extraction, confirmation, reminders, query answering).

## FILES
| File | Purpose |
|------|---------|
| index.ts | Main relay entry + digital almanac flow |
| discord.ts | Discord login (selfbot) |
| ollama.ts | Direct Ollama API client |
| skills/ | Skill system (interfaces, registry, 5 skills) |

## SKILLS SYSTEM
NanoClaw-inspired modular skill architecture:

| Skill | Purpose |
|-------|---------|
| calendar-skill-v2 | Calendar events (CRUD, ICS export, week/month views) |
| memory-skill | User memory with clarification flow |
| clarification-skill | Pending response handling (avtale/minne) |
| day-details-skill | Day-specific event details |

### Skill Interface
```typescript
interface Skill {
  readonly name: string;
  readonly description: string;
  canHandle(message: string, ctx: HandlerContext): boolean;
  handle(message: string, ctx: HandlerContext): Promise<SkillResponse>;
  getMemory?(channelId: string): any;
  setMemory?(channelId: string, memory: any): void;
}
```

| utils/ | Detectors, rate limiting |

## CONVENTIONS
- Selfbot (discord.js-selfbot-v13) for Group DM access
- Direct Ollama API (not OpenClaw)
- Minimal conversation history (5 messages)

## NOTES
- Group DM access requires user token, not bot token
- Ollama model: bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning (high reasoning)
- Digital almanac: extraction runs on @mention, confidence-based confirmation, follow-ups, reminders

## HOTSPOT ANALYSIS

**File:** `src/relay/index.ts` (1015 lines)
**Severity:** HIGH - Multiple responsibilities in single file

### Key Findings

| Area | Lines | Issue |
|------|-------|-------|
| `discord.onMention()` callback | 597-932 | 335 lines, 20+ sequential if-checks |
| `handleQuery()` | 249-364 | 115 lines, nested conditionals |
| `main()` | 381-1015 | 634 lines, entire entry point |
| `handleExtractionFlow()` | 490-561 | 71 lines, sequential async |

### Critical Issue

The main message handler contains 20+ independent message type handlers checked sequentially with early returns. This makes the code:
- Hard to test (can't test individual handlers in isolation)
- Difficult to modify (changing one handler risks breaking others)
- Error-prone (duplicated error handling per handler)
- Hard to navigate (335 lines of branching logic)

### Detection Functions

10+ scattered `is*()` functions that should be consolidated:
- `isQueryMessage()`, `extractImagePrompt()`, `isMemoryStore()`, `isMemoryQuery()`
- `isCalendarQuery()`, `isTechStackQuery()`, `isFeaturesQuery()`, `isSelfAnalysisQuery()`

---

## MODULARIZATION PLAN

### Phase 1: Extract Utilities (Low Risk)

```
src/relay/utils/
├── detectors.ts     # All is*() functions
└── date-utils.ts   # Date/time helpers
```

### Phase 2: Extract Handlers (Medium Risk)

```
src/relay/handlers/
├── index.ts         # Handler registry + interface
├── image.ts         # ComfyUI image generation
├── tone.ts          # Tone configuration
├── feedback.ts      # Feedback handling
├── clarification.ts # Pending clarification
├── reply-context.ts # Build context from replies
├── features.ts      # Capabilities response
├── techstack.ts     # Tech stack explanation
├── self-analysis.ts # Bot performance analysis
├── memory.ts        # Memory store/recall
├── day-details.ts   # Day-specific event details
├── calendar.ts      # Calendar embed building
└── extraction.ts    # Extraction flow
```

### Phase 3: Extract Services (Medium Risk)

```
src/relay/services/
├── query-handler.ts  # handleQuery() logic
└── reminder.ts       # runReminders() scheduling
```

### Phase 4: Orchestration (Low Risk)

Refactor `discord.onMention()` to use handler registry:

```typescript
// Proposed pattern:
const handlers: MessageHandler[] = [
  new ImageGenerationHandler(comfyui),
  // ... etc
];

for (const handler of handlers) {
  if (handler.canHandle(userMessage)) {
    return handler.handle(msg, ctx);
  }
}
```

**Target metrics:**
- Total lines: 1015 → ~300
- Max function size: 635 → 50
- Message handlers: 20+ in one callback → 1 per file

---

## MIGRATION RISK

**Library:** discord.js-selfbot-v13 v3.7.1 (archived October 2025)

### Current Risks

| Risk | Severity | Description |
|------|----------|-------------|
| No security patches | High | Discord API changes won't be patched |
| Token exposure | High | User tokens are high-value targets |
| API breakage | High | Unmaintained library may break without notice |
| Discord detection | High | Selfbots violate Discord ToS |
| Rate limiting | High | No explicit rate limiting implemented |

### Account Ban Risk

Using a selfbot violates Discord ToS. Mitigation (current):
- Minimal message history (5 messages)
- No explicit rate limiting (risk factor)

### Recommended Path

| Timeline | Action |
|----------|--------|
| Immediate | Add rate limiting (10-15 msg/min) |
| 3-6 months | Investigate Eris user account capabilities |
| 6-12 months | Migrate to discord.py-self if needed |

### Migration Options

| Option | ToS Risk | Maintenance | Effort |
|--------|----------|-------------|--------|
| Stay (current) | High | None | None |
| discord.py-self | High | Active | High |
| Eris | Low | Active | Medium |
| Official Bot API | None | N/A | High |

See `.sisyphus/plans/migration-risk.md` for full details.