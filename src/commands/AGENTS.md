# src/commands/ - Slash Commands

## OVERVIEW
Discord slash commands for the main bot.

## FILES
| File | Purpose |
|------|---------|
| index.ts | Command registration |
| v2-commands.ts | Calendar and feedback commands |

## COMMANDS

### Calendar Commands
| Command | Description |
|---------|-------------|
| `/kalender` | Show calendar view |
| `/kalender today` | Today's events |
| `/event <title> <date>` | Create event |
| `/event <title> weekly <days>` | Create recurring event |
| `/export` | Export to ICS |
| `/delete event <title>` | Delete event |

### Feedback Commands
| Command | Description |
|---------|-------------|
| `/feedback <message-id> <comment>` | Leave feedback |
| `/improve` | Request improvement suggestion |

## CONVENTIONS
- Register all commands in index.ts
- Use Discord.js interaction handlers
- Norwegian/English bilingual

## REGISTRATION
```typescript
import { registerCommands } from './index.js';

await registerCommands(client);
```
