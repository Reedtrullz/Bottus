# AGENTS.md - Project Knowledge Base

**Generated:** 2026-02-24  
**Commit:** 55a6007  
**Branch:** main  
**Language:** TypeScript (ESM) | **Node:** >=18.0.0

---

## COMMANDS

### Build & Test
```bash
npm run build          # Compile to dist/
npm run dev            # Watch mode (tsx)
npm test               # Run all vitest tests
npm run test:watch    # Watch mode

# Single test file
npx vitest run tests/relay/calendar-skill-v2.test.ts

# Test by name pattern
npx vitest run -t "should handle"

# Test specific file with name
npx vitest run tests/relay/ollama.test.ts -t "should timeout"

# Grep pattern across tests
npx vitest run --grep "calendar"

# Run test directory
npx vitest run tests/relay/
```

### Type Check
```bash
npx tsc --noEmit       # Type check only
```

---

## CODE STYLE

### TypeScript
- **Target:** ES2022 | **Module:** ESNext | **Strict:** Enabled
- **Never:** `as any`, `@ts-ignore`, `@ts-expect-error` — use `unknown`

### Imports (ESM)
```typescript
import { ConsentManager } from '../services/consent.js';
import type { HandlerContext } from './interfaces.js';
```

### Naming
| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `CalendarServiceV2` |
| Interfaces | PascalCase | `HandlerContext` |
| Functions/variables | camelCase | `getEvents()` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Private members | `_prefix` | `private _db` |
| Test files | `{name}.test.ts` | `calendar-skill.test.ts` |

### Type Annotations
```typescript
// Explicit params, infer locals
async function handleOptIn(interaction: any): Promise<void> {
  const userId: string = interaction.user.id;
}
const events = await this.getEvents();

// Optional with ?, avoid null
interface SkillResponse {
  handled: boolean;
  response?: string;
}
```

### Error Handling
```typescript
// Try/catch with logging
async function initialize(): Promise<void> {
  try {
    await initSqlJs();
  } catch (error) {
    console.error(`[DB] Init failed: ${error}`);
    throw error;
  }
}

// Early returns
async function handleCommand(interaction: any): Promise<void> {
  if (!interaction) return;
}

// Unused params
constructor(_dbPath: string) { }

// Never empty catch
} catch (error) {
  console.error('[Handler] Error:', error);
}
```

### Formatting
- 2-space indentation
- Single quotes for strings
- Trailing commas for multi-line objects
- Max line length: 100 characters

---

## SELF-HEALING SERVICES

### Error Classifier
```typescript
import { ErrorClassifier } from './services/error-classifier.js';
const classifier = new ErrorClassifier();
const category = classifier.classify(error, 'optional context');
// Categories: network, auth, parsing, skill, external, rate_limit, timeout, validation, unknown
```

### Self-Healer
```typescript
import { selfHealer } from './services/self-healer.js';
const result = await selfHealer.executeWithHealing(
  () => ollama.chat(prompt),
  { context: 'ollama chat', fallback: () => simpleResponse() }
);
```

### Health Monitor
```typescript
import { healthMonitor } from './services/health-monitor.js';
const report = await healthMonitor.getOverallHealth();
// report.overall: 'healthy' | 'degraded' | 'unhealthy'
```

---

## PATTERNS

### Skill Interface
```typescript
export interface Skill {
  readonly name: string;
  readonly description: string;
  canHandle(message: string, ctx: HandlerContext): boolean;
  handle(message: string, ctx: HandlerContext): Promise<SkillResponse>;
}
```

### Skill Registry
```typescript
import { skillRegistry } from './skills/registry.js';
skillRegistry.register(new CalendarSkillV2(calendarService));
const handler = skillRegistry.findHandler(message, ctx);
```

### Database (sql.js)
```typescript
// Always check DB before operations
async function createEvent(...): Promise<CalendarEvent> {
  if (!this.db) await this.initialize();
}

// Parameterized queries
this.db!.run(`INSERT INTO events (id) VALUES (?)`, [event.id]);
```

---

## ANTI-PATTERNS

| Pattern | Rule |
|---------|------|
| Type suppression | ❌ Never use `as any`, `@ts-ignore` |
| Empty catches | ❌ Never leave catch blocks empty |
| Secrets | ❌ Never commit `.env` or `*.db` files |
| Console.log | ❌ Use `console.error` for errors, prefix with `[Module]` |
| Real services in tests | ❌ Mock external services (Ollama, ComfyUI, Discord) |

---

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Bot entry | src/index.ts |
| Relay bot | src/relay/index.ts |
| Skills | src/relay/skills/*.ts |
| Services | src/services/*.ts |
| Self-healing | src/services/{error-classifier,health-monitor,self-healer}.ts |
KB|| Tests | tests/**/*.test.ts |
RD|| Database | src/db/index.ts |
JQ|| Scripts | scripts/*.js, scripts/*.py |
QM|| Docs | docs/*.md |

---

## BOOT MODES

| Mode | Command |
|------|---------|
| Dev | `npm run dev` |
| Main bot | `npm run start` |
| Relay bot | `npm run start:relay` |
| Gateway | `npm run start:gateway` |

---

## NOTES

- **Timezone:** Europe/Oslo (hardcoded)
- **Language:** Norwegian/English bilingual
- **Discord:** Uses selfbot (discord.js-selfbot-v13) for group DM access
- **Runtime:** WSL2 with native Ollama (no Docker)
- **Testing:** Vitest only (no Jest)
