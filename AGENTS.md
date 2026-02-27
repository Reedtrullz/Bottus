# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-27
**Commit:** 86927d9
**Branch:** main
**Commit:** 86927d9
**Branch:** main

## OVERVIEW

AI Discord bot with local LLM (Ollama), image generation (ComfyUI), shared calendar, and role-based access control (RBAC). Two running modes: Relay Bot (selfbot) and NanoBot Gateway.

## STRUCTURE

```
./
├── src/                    # TypeScript source (100+ files)
│   ├── index.ts           # Main entry (Eris client)
│   ├── relay/             # Discord↔Ollama relay (selfbot)
│   │   ├── skills/        # Skill system (calendar, memory, permissions)
│   │   └── handlers/      # Message handlers (role, help, image)
│   ├── services/          # 21 domain services
│   ├── gateway/           # Experimental skill dispatcher
│   ├── db/                # SQLite via sql.js
│   └── utils/             # Shared utilities
├── tests/                 # Vitest test suite
├── docs/                  # Documentation
├── skills/                # External skill integrations
├── docker-compose.yml      # Ollama + ComfyUI + relay
└── package.json           # Node.js 18+, ES modules
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Bot entry | `src/index.ts` | Eris client |
| Relay bot | `src/relay/index.ts` | Selfbot, 727 lines (MODULARIZED) |
| Services | `src/services/*.ts` | 21 domain services |
| Database | `src/db/index.ts` | sql.js |
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

## RBAC SYSTEM

Bottus has role-based access control for channel-level permissions:

- **Roles**: member → contributor → admin → owner
- **Storage**: SQLite `channel_user_roles` table
- **Enforcement**: Calendar skill, proposal engine, role commands, LLM prompts

Key files:
- `src/relay/skills/permission.ts` - Permission service
- `src/relay/handlers/role.ts` - Role management commands
- `src/db/index.ts` - roleDb functions
- `docs/rbac.md` - Full documentation

## NANOBOT INTEGRATION

Bottus reads NanoBot config from `~/.nanobot/workspace/`:
- `USER.md` - User profile (name, language, timezone, role)
- `SOUL.md` - Bot persona and permission behavior

Role is injected into every LLM prompt via `[User Context]`.

## ANTI-PATTERNS (THIS PROJECT)

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
| src/relay/index.ts | 727 | MEDIUM | Modularized - handler registry now used |
| src/db/index.ts | 604 | MEDIUM | Sync writes, needs indexes |
| src/index.ts | 286 | MEDIUM | PollingScheduler coupling |

## NOTES

- Selfbot uses archived library - migration recommended
- Group DM access requires user token, not bot token
- Ollama model: `bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning`
- Handler registry pattern now implemented in relay

---

## AGENT INSTRUCTIONS

You are a helpful AI assistant. Be concise, accurate, and friendly.

### Guidelines

- Before calling tools, briefly state your intent
- Use precise tense: "I will run X" before the call
- NEVER claim success before tool result confirms it
- Ask for clarification when request is ambiguous

### Known Tool Issues

- **read tool bug**: Injects fake LINE#ID hashes in display. Use `bash cat` to verify.
- **edit tool bug**: May create duplicated content. Verify with `bash cat` after edits.
