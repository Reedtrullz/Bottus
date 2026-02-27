# src/ - Source Code

## OVERVIEW

TypeScript source code for the Ine-Discord bot.

## STRUCTURE

```
src/
├── index.ts           # Main entry (Eris client)
├── commands/          # Slash commands
│   └── index.ts
├── db/                # SQLite via sql.js (eventDb, taskDb)
│   └── index.ts
├── gateway/           # NanoGateway skill dispatcher (experimental)
│   ├── main.ts        # Gateway entry
│   ├── run.ts        # Runner script
│   ├── dispatcher.ts
│   ├── adapters.ts
│   ├── discord.ts
│   ├── ollama.ts
│   ├── parser.ts
│   ├── memory.ts
│   └── interfaces.ts
├── relay/             # Discord↔Ollama relay (selfbot)
│   ├── index.ts       # Main relay + digital almanac (564 lines)
│   ├── discord.ts     # Discord login
│   ├── ollama.ts      # Ollama API client
│   ├── health.ts      # Health monitoring endpoint
│   ├── plan-router.ts # Action routing
│   ├── skills/        # Skill system
│   │   ├── interfaces.ts
│   │   ├── registry.ts
│   │   ├── calendar-skill-v2.ts
│   │   ├── memory-skill.ts
│   │   ├── clarification-skill.ts
│   │   └── day-details-skill.ts
│   ├── handlers/      # Message handlers (modular)
│   │   ├── index.ts
│   │   ├── help.ts
│   │   ├── features.ts
│   │   ├── calendar.ts
│   │   ├── memory.ts
│   │   ├── feedback.ts
│   │   ├── image.ts
│   │   ├── role.ts
│   │   ├── techstack.ts
│   │   ├── tone.ts
│   │   ├── self-analysis.ts
│   │   ├── proposal.ts
│   │   └── clarification.ts
│   ├── services/      # Extracted services
│   │   ├── query-handler.ts
│   │   └── reminder.ts
│   └── utils/         # Detectors, rate limiting, date-utils
│   ├── index.ts       # Main relay + digital almanac (727 lines)
│   ├── discord.ts     # Discord login
│   ├── ollama.ts      # Ollama API client
│   ├── skills/        # Skill system
│   │   ├── interfaces.ts
│   │   ├── registry.ts
│   │   ├── calendar-skill-v2.ts
│   │   ├── memory-skill.ts
│   │   ├── clarification-skill.ts
│   │   └── day-details-skill.ts
│   ├── handlers/      # Message handlers
│   │   ├── index.ts
│   │   ├── help.ts
│   │   ├── features.ts
│   │   ├── calendar.ts
│   │   ├── memory.ts
│   │   ├── feedback.ts
│   │   ├── image.ts
│   │   ├── role.ts
│   │   ├── techstack.ts
│   │   ├── tone.ts
│   │   └── self-analysis.ts
│   ├── plan-router.ts
│   └── utils/         # Detectors, rate limiting, date-utils
├── services/          # 21 domain services
│   ├── extraction.ts
│   ├── calendar.ts
│   ├── calendar-display.ts
│   ├── calendar-v2.ts
│   ├── memory.ts
│   ├── timePoll.ts
│   ├── comfyui.ts
│   └── ...
└── utils/             # Shared utilities
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Bot entry | index.ts |
| Slash commands | commands/index.ts |
| Database | db/index.ts |
| Services | services/*.ts |
| Relay bot | relay/index.ts |
| Extraction | services/extraction.ts |
| Skills system | relay/skills/*.ts |

## HOTSPOT FINDINGS

| File | Lines | Level | Issue |
|------|-------|-------|-------|
| relay/index.ts | 727 | MEDIUM | Modularized - handler registry now used |
| db/index.ts | 604 | MEDIUM | Sync writes, needs indexes |
| index.ts | 286 | MEDIUM | PollingScheduler coupling |

## CONVENTIONS

- ES modules (`type: "module"`)
- Class-based service DI
- All services imported in index.ts

## ANTI-PATTERNS

- No .env in git
- No .db files committed
- Selfbot archived - migration recommended

## NOTES

- Relay uses handler registry pattern (globalHandlers.dispatch)
- Skills use skillRegistry.findHandler() for routing
- Norwegian/English bilingual commands
- Timezone: Europe/Oslo
