# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-22
**Language:** TypeScript (ESM)

## OVERVIEW
AI Discord bot ("inebotten") for group chat monitoring, calendar management, and task extraction. Features: bidirectional Discord↔Ollama relay, digital almanac (date/event extraction), local SQLite storage, reminder system. Uses Eris + discord.js-selfbot-v13, Ollama LLM via Docker.

## STRUCTURE
```
./
├── src/
│   ├── index.ts           # Main entry (Eris client)
│   ├── commands/          # Slash commands
│   ├── db/                # SQLite via sql.js (eventDb, taskDb)
│   ├── relay/             # Discord↔Ollama relay (selfbot)
│   │   ├── skills/        # NanoClaw-inspired skill system
│   │   │   ├── interfaces.ts
│   │   │   ├── registry.ts
│   │   │   ├── calendar-skill.ts
│   │   │   ├── image-skill.ts
│   │   │   ├── memory-skill.ts
│   │   │   └── extraction-skill.ts
│   │   └── utils/         # Relay utilities
│   │       ├── detectors.ts
│   │       └── rate-limit.ts
│   └── services/          # 12 domain services
├── .sisyphus/             # Planning docs
├── docker-compose.yml     # Ollama + relay services
├── Dockerfile.relay       # Relay container
└── data/                  # SQLite database (bot.db)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Bot entry | src/index.ts | Main Eris client |
| Slash commands | src/commands/index.ts | All commands |
| Services | src/services/*.ts | 12 services |
| Relay bot | src/relay/index.ts | Ollama selfbot, digital almanac |
| Database | src/db/index.ts | sql.js SQLite |
| Extraction | src/services/extraction.ts | chrono-node date parsing |

## CODE MAP
| Symbol | Type | Location |
|--------|------|----------|
| client | Eris.Client | src/index.ts |
| DiscordRelay | class | src/relay/discord.ts |
| OllamaClient | class | src/relay/ollama.ts |
| ExtractionService | class | src/services/extraction.ts |
| ConsentManager | class | services/consent.ts |
| CalendarService | class | services/calendar.ts |
| CalendarDisplayService | class | services/calendar-display.ts |
| ReminderService | class | services/reminders.ts |
| GovernanceService | class | services/governance.ts |
| MemoryService | class | services/memory.ts |
| TimePollService | class | services/timePoll.ts |

## SKILLS SYSTEM
NanoClaw-inspired modular skill architecture for message handling:

| Skill | File | Description |
|-------|------|-------------|
| calendar-skill | src/relay/skills/calendar-skill.ts | Calendar events and scheduling |
| image-skill | src/relay/skills/image-skill.ts | ComfyUI image generation |
| memory-skill | src/relay/skills/memory-skill.ts | Persistent user memory |
| extraction-skill | src/relay/skills/extraction-skill.ts | Date/event extraction |

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

## RELAY UTILITIES
| Utility | File | Purpose |
|---------|------|---------|
| detectors | src/relay/utils/detectors.ts | Message pattern detection |
| rate-limit | src/relay/utils/rate-limit.ts | Discord rate limiting (15 req/min) |


## CONVENTIONS
- ES modules (`type: "module"`)
- TS with tsx for dev (`npm run dev`)
- Vitest for testing (default config, no local file)
- Services use class-based DI

## HOTSPOTS
Codebase areas requiring attention:

| File | Lines | Level | Issue |
|------|-------|-------|-------|
| src/relay/index.ts | ~1015 | HIGH | Monolith, 20+ sequential if-checks in onMention handler |
| src/db/index.ts | ~533 | MEDIUM | Synchronous writes on every operation, no indexes |
| src/index.ts | ~286 | MEDIUM | PollingScheduler coupling |

### Hotspot Briefs
- `.sisyphus/plans/hotspots/relay-index.md` - Main relay analysis
- `.sisyphus/plans/hotspots/db-index.md` - Database analysis
- `.sisyphus/plans/hotspots/*.md` - Additional file briefs

### Migration Risk
- `.sisyphus/plans/migration-risk.md` - discord.js-selfbot-v13 archive risk

### Governance
Run hotspot scans periodically:
```bash
./scripts/scan-hotspots.sh  # Excludes package-lock.json
```


## ANTI-PATTERNS (THIS PROJECT)
- No committed .env files
- No database files in git

## COMMANDS
```bash
npm run dev          # Watch mode (tsx)
npm run build        # Compile to dist/
npm run start        # Run dist/index.js
npm run start:relay  # Run relay bot
npm test             # Run vitest
```

## NOTES
- Timezone: Europe/Oslo
- Norwegian/English bilingual
- Docker required for Ollama
- Ollama model: bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning (set via OLLAMA_MODEL env)
- Digital almanac: extraction runs on @mention, confidence-based confirmation, follow-ups, reminders
