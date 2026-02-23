# src/ - Source Code

## OVERVIEW
TypeScript source code for the Ine-Discord bot.

## STRUCTURE
```
src/
├── index.ts         # Main entry (Eris client)
├── commands/        # Slash commands
│   └── index.ts
├── db/              # SQLite via sql.js (eventDb, taskDb)
│   └── index.ts
├── gateway/         # NanoGateway skill dispatcher (experimental)
│   ├── main.ts      # Gateway entry
│   ├── run.ts      # Runner script
│   ├── dispatcher.ts
│   ├── adapters.ts
│   ├── discord.ts
│   ├── ollama.ts
│   ├── parser.ts
│   ├── memory.ts
│   └── interfaces.ts
├── relay/           # Discord↔Ollama relay (selfbot)
│   ├── index.ts     # Main relay + digital almanac
│   ├── discord.ts   # Discord login
│   ├── ollama.ts   # Ollama API client
│   ├── openclaw-client.ts  # OpenClaw integration
│   ├── skills/     # NanoClaw-inspired skill system
│   │   ├── interfaces.ts
│   │   ├── registry.ts
│   │   ├── calendar-skill.ts
│   │   ├── image-skill.ts
│   │   ├── memory-skill.ts
│   │   └── extraction-skill.ts
│   ├── handlers/    # Message handlers
│   │   ├── help.ts
│   │   ├── features.ts
│   │   └── index.ts
│   ├── router/      # Plan router
│   └── utils/       # Relay utilities
│       ├── detectors.ts
│       └── rate-limit.ts
└── services/        # 12 domain services
    ├── extraction.ts
    ├── calendar.ts
    ├── calendar-display.ts
    ├── calendar-renderer.ts
    ├── memory.ts
    ├── timePoll.ts
    └── ...
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
| Skills system | relay/skills/*.ts | NanoClaw-inspired skill architecture |
| Utilities | relay/utils/*.ts | Detectors, rate limiting |

## CONVENTIONS
- ES modules (`type: "module"`)
- Class-based service DI
- All services imported in index.ts

## ANTI-PATTERNS
- No .env in git
- No .db files committed


## HOTSPOT FINDINGS

Periodic scans identify code areas requiring attention. Full briefs available in `.sisyphus/plans/hotspots/`.

| File | Lines | Level | Issue |
|------|-------|-------|-------|
| src/relay/index.ts | ~1015 | HIGH | Monolith, 20+ sequential if-checks in onMention handler |
| src/db/index.ts | ~533 | MEDIUM | Synchronous writes on every operation, no indexes |
| src/index.ts | ~286 | MEDIUM | PollingScheduler coupling |

### Hotspot Briefs
- `.sisyphus/plans/hotspots/relay-index.md` - Main relay analysis (message handler registry pattern opportunity)
- `.sisyphus/plans/hotspots/db-index.md` - Database analysis (indexes, async writes)