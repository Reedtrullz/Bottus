# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-23  
**Language:** TypeScript (ESM)  
**Remote:** https://github.com/Reedtrullz/Bottus

## OVERVIEW

AI Discord bot ("inebotten") for group chat monitoring, calendar management, and task extraction. Features: bidirectional Discord↔Ollama relay, digital almanac, local SQLite storage, reminder system. Uses Eris + discord.js-selfbot-v13, Ollama LLM via Docker.

## STRUCTURE

```
src/
├── index.ts           # Main entry (Eris client)
├── commands/          # Slash commands
├── db/                # SQLite via sql.js
├── relay/             # Discord↔Ollama relay (selfbot)
│   ├── skills/        # Skill system (image, calendar, memory, extraction)
│   ├── handlers/     # Message handlers (modular)
│   └── utils/        # Utilities
├── gateway/           # NanoGateway (experimental)
└── services/          # Domain services
tests/                 # Vitest tests
data/                  # SQLite database files
```

## COMMANDS

### Build & Run
```bash
npm run dev            # Watch mode (tsx)
npm run build          # Compile to dist/
npm run build:relay    # Compile relay only
npm run start          # Run dist/index.js
npm run start:relay    # Run relay bot (src/relay/index.ts)
npm run start:gateway  # Run gateway (src/gateway/run.ts)
```

### Testing
```bash
npm test               # Run all vitest tests
npm run test:watch     # Watch mode

# Single test file
npx vitest run tests/relay/image-skill.test.ts

# Single test by name
npx vitest run -t "should handle extraction"

# Single test in watch mode  
npx vitest run --watch tests/relay/ollama.test.ts
```

### Type Check
```bash
npx tsc --noEmit              # Type check only
npx tsc --noEmit --watch      # Watch mode
```

---

## CODE STYLE

### TypeScript
- **Target:** ES2022 | **Module:** ESNext | **Strict mode:** Enabled
- **No `any` or `@ts-ignore`** - use `unknown` if needed

### Imports
```typescript
// Use .js extensions for ESM
import { ConsentManager } from '../services/consent.js';

// Relative paths for local, package names for external
import initSqlJs from 'sql.js';

// Prefer named exports
export class ConsentManager { }
```

### Naming
| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `CalendarServiceV2` |
| Interfaces | PascalCase (no I prefix) | `HandlerContext` |
| Functions/variables | camelCase | `getEvents()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Private members | `_prefix` | `private _db` |

### Type Annotations
```typescript
// Explicit types for function parameters
async function handleOptIn(interaction: any): Promise<void> {
  const userId: string = interaction.user.id;
}

// Use type inference for local variables
const events = await this.getEvents();

// Use ? for optional, avoid null
interface SkillResponse {
  handled: boolean;
  response?: string;
}
```

### Error Handling
```typescript
// Always use try/catch for async
async function initialize(): Promise<void> {
  try {
    const SQL = await initSqlJs();
  } catch (error) {
    console.error(`[DB] Initialization failed: ${error}`);
    throw error;
  }
}

// Early returns to avoid nesting
async handleCommand(interaction: any): Promise<void> {
  if (!interaction) return;
  // ... rest
}

// Prefix unused parameters with underscore
constructor(_dbPath: string) { }
```

### Formatting
- 2-space indentation
- Single quotes for strings
- Trailing commas for multi-line objects

---

## HANDLER PATTERN

### Handler Interface
```typescript
import type { HandlerContext, HandlerResult } from './interfaces.js';

export interface MessageHandler {
  canHandle(message: string, ctx: HandlerContext): boolean;
  handle(message: string, ctx: HandlerContext): Promise<HandlerResult>;
}
```

### Handler Registry
```typescript
import { HandlerRegistry, globalHandlers } from './registry.js';

// Register handlers at startup
globalHandlers.register(new ImageHandler(comfyui));
globalHandlers.register(new CalendarHandler(calendarService));

// Dispatch via registry
const result = await globalHandlers.dispatch(message, ctx);
```

---

## SKILLS SYSTEM

### Skill Interface
```typescript
export interface Skill {
  readonly name: string;
  readonly description: string;
  canHandle(message: string, ctx: HandlerContext): boolean;
  handle(message: string, ctx: HandlerContext): Promise<SkillResponse>;
  getMemory?(channelId: string): any;
  setMemory?(channelId: string, memory: any): void;
}
```

### Skill Registry
```typescript
import { skillRegistry } from './skills/registry.js';

// Register skills at startup
skillRegistry.register(new ImageSkill(comfyui));
skillRegistry.register(new CalendarSkillV2(calendarService));

// Find handler
const handler = skillRegistry.findHandler(message, ctx);
```

---

## DATABASE (sql.js)

```typescript
// Always check DB before operations
async createEvent(...): Promise<CalendarEvent> {
  if (!this.db) await this.initialize();
}

// Parameterized queries (?, not template literals)
this.db!.run(`INSERT INTO events (id) VALUES (?)`, [event.id]);
```

---

## ANTI-PATTERNS

| Pattern | Rule |
|---------|------|
| Type suppression | ❌ Never use `as any`, `@ts-ignore`, `@ts-expect-error` |
| Empty catches | ❌ Never leave catch blocks empty |
| Secrets | ❌ Never commit `.env` or `*.db` files |
| Native modules | ❌ Never use `better-sqlite3` (use sql.js) |
| Console logging | ❌ Avoid `console.log` in production code |

---

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Bot entry | src/index.ts |
| Relay bot | src/relay/index.ts |
| Skills | src/relay/skills/*.ts |
| Handlers | src/relay/handlers/*.ts |
| Services | src/services/*.ts |
| Tests | tests/**/*.test.ts |
| Database | src/db/index.ts |

---

## BOOT MODES

| Mode | Command | Entry Point |
|------|---------|-------------|
| Dev | `npm run dev` | src/index.ts |
| Main bot | `npm run start` | dist/index.js |
| Relay bot | `npm run start:relay` | src/relay/index.ts |
| Gateway | `npm run start:gateway` | src/gateway/run.ts |

---

## TESTING

| Type | Location | Run |
|------|----------|------|
| Unit | tests/relay/, tests/gateway/ | `npm test` |
| Integration | test/integration/ | `npm test` |
| E2E | (env-gated) | `TEST_E2E=true npm test` |
| ComfyUI | (env-gated) | `TEST_COMFYUI=true npm test` |

---

## NOTES

- **Timezone:** Europe/Oslo (hardcoded)
- **Language:** Norwegian/English bilingual
- **Docker:** Required for Ollama
- **Node:** >=18.0.0
- **Discord:** Uses selfbot (discord.js-selfbot-v13) for group DM access
