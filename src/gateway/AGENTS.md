# src/gateway/ - NanoGateway (Experimental)

## OVERVIEW
Experimental skill-based message dispatcher inspired by NanoClaw architecture. Alternative to relay system.

## FILES
| File | Purpose |
|------|---------|
| main.ts | Gateway bootstrap/entry |
| run.ts | Runner script |
| index.ts | Module re-exports |
| dispatcher.ts | Message dispatcher |
| adapters.ts | Skill adapters |
| discord.ts | Discord integration |
| ollama.ts | Ollama client |
| parser.ts | Message parser |
| memory.ts | In-memory store |
| event-bus.ts | Event bus |
| interfaces.ts | Type definitions |

## CONVENTIONS
- Mixed TS/JS (adapters.js, dispatcher.js, memory.js, parser.js in dist)
- ES modules
- NanoClaw-inspired skill pattern

## ANTI-PATTERNS
- Legacy .js files in runtime (should convert to .ts)
- No tests yet

## COMMANDS
```bash
npm run start:gateway  # tsx src/gateway/run.ts
```
