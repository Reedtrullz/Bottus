# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-26
**Commit:** 139158a
**Branch:** main

## OVERVIEW

AI Discord bot with local LLM (Ollama), image generation (ComfyUI), and shared calendar for group chats. Two running modes: Relay Bot (selfbot) and NanoBot Gateway.

## STRUCTURE

```
./
├── src/                    # TypeScript source (95 files)
│   ├── index.ts           # Main entry (Eris client)
│   ├── relay/             # Discord↔Ollama relay (selfbot)
│   ├── services/          # 21 domain services
│   ├── gateway/           # Experimental skill dispatcher
│   ├── commands/          # Slash commands
│   ├── db/                # SQLite via sql.js
│   └── utils/             # Shared utilities
├── tests/                 # Vitest test suite
├── docs/                  # Documentation
├── skills/                # External skill integrations
├── docker-compose.yml     # Ollama + ComfyUI + relay
└── package.json           # Node.js 18+, ES modules
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Bot entry | `src/index.ts` | Eris client |
| Relay bot | `src/relay/index.ts` | Selfbot, 1015 lines (HOTSPOT) |
| Services | `src/services/*.ts` | 21 domain services |
| Database | `src/db/index.ts` | sql.js, 533 lines (HOTSPOT) |
| Skills | `src/relay/skills/` | Modular skill system |
| Tests | `tests/` | Vitest |

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| CalendarService | class | services/calendar.ts | 12 | Event CRUD |
| ComfyUIClient | class | services/comfyui.ts | 8 | Image gen |
| ExtractionService | class | services/extraction.ts | 6 | Date parsing |
| PlanRouter | class | relay/plan-router.ts | 4 | Action routing |
| SkillRegistry | class | relay/skills/registry.ts | 5 | Skill management |

## CONVENTIONS (THIS PROJECT)

- ES modules (`"type": "module"`)
- Class-based services with constructor DI
- Norwegian/English bilingual commands
- Timezone: Europe/Oslo hardcoded

## ANTI-PATTERNS

- **No .env in git** - Use .env.example
- **No .db files committed** - sql.js in-memory
- **discord.js-selfbot-v13 is archived** (Oct 2025) - See migration risk in src/relay/AGENTS.md
- **No rate limiting in relay** - Ban risk

## COMMANDS

```bash
npm run dev           # Watch mode (main bot)
npm run start:relay  # Relay bot
npm run start:gateway # Experimental gateway
npm run build        # TypeScript compile
npm test             # Vitest run
```

## HOTSPOTS

| File | Lines | Level | Issue |
|------|-------|-------|-------|
| src/relay/index.ts | 1015 | HIGH | Monolith, 20+ sequential if-checks |
| src/db/index.ts | 533 | MEDIUM | Sync writes, no indexes |
| src/index.ts | 286 | MEDIUM | PollingScheduler coupling |

## NOTES

- Selfbot uses archived library - migration recommended
- Group DM access requires user token, not bot token
- Ollama model: `bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning`

---

## AGENT INSTRUCTIONS

You are a helpful AI assistant. Be concise, accurate, and friendly.

### Guidelines

- Before calling tools, briefly state your intent
- Use precise tense: "I will run X" before the call
- NEVER claim success before tool result confirms it
- Ask for clarification when request is ambiguous

### Scheduled Reminders

When user asks for reminder, use BOTH:
1. Cron: `nanobot cron add --name "reminder" ...`
2. Google Calendar: Create event via Maton API

### Known Tool Issues

- **read tool bug**: Injects fake LINE#ID hashes in display. Use `bash cat` to verify.
- **edit tool bug**: May create duplicated content. Verify with `bash cat` after edits.
