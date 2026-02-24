# src/scripts/ - Automation Scripts

## OVERVIEW
Standalone scripts for automation, backups, and self-improvement.

## FILES
| File | Purpose |
|------|---------|
| nightly-cron.ts | Nightly self-improvement cron job |
| sisyphus-learner.ts | AI-powered learning from interactions |
| backup.ts | Database backup utility |

## nightly-cron.ts
Scheduled job that runs daily at 3:00 AM (Europe/Oslo).

```typescript
import { startNightlyCron } from './nightly-cron.js';
import { SisyphusLearner } from './sisyphus-learner.js';

const learner = new SisyphusLearner();
await learner.initialize();
startNightlyCron(learner, 3, 0); // 3:00 AM
```

## sisyphus-learner.ts
Self-improvement engine that reads interactions and proposes prompt improvements.

**Flow:**
1. Fetch recent interactions from DB
2. Analyze feedback patterns
3. Generate improvement suggestions
4. Update prompts/files as needed

## backup.ts
Database backup utility for SQLite files.

```bash
npx tsx src/scripts/backup.ts
```

## CONVENTIONS
- Standalone execution (not imported by main app)
- Use tsx for direct execution
- Log with console.log/[MODULE] prefix
