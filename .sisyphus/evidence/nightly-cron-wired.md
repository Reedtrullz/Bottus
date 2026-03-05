# Task: Wire up Nightly Cron Job

## Summary
Successfully wired up the nightly Sisyphus cron job to run in the main relay bot application.

## Changes Made

### src/relay/index.ts
1. **Added imports** (line 45-46):
   ```typescript
   import { startNightlyCron } from '../scripts/nightly-cron.js';
   import { SisyphusLearner } from '../scripts/sisyphus-learner.js';
   ```

2. **Added cron initialization** in `main()` function (lines 90-96):
   ```typescript
   // Start nightly cron for Sisyphus self-improvement
   if (!process.env.DISABLE_NIGHTLY_CRON) {
     const learner = new SisyphusLearner('./data/interactions.db', OLLAMA_URL, OLLAMA_MODEL);
     await learner.initialize();
     startNightlyCron(learner);
   }
   ```

## Implementation Details

- **Conditional**: Only starts if `DISABLE_NIGHTLY_CRON` environment variable is NOT set
- **Database Path**: Uses `'./data/interactions.db'` (consistent with FeedbackHandler)
- **Ollama Config**: Uses existing `OLLAMA_URL` and `OLLAMA_MODEL` environment variables
- **Timing**: Cron runs at 3:00 AM Europe/Oslo (configured in `nightly-cron.ts`)
- **Location**: Initialized after database setup, before health endpoint

## Verification

- ✅ Build passes: `npm run build` completes without errors
- ✅ No TypeScript errors
- ✅ Cron scheduling message will appear in logs: `[CRON] Scheduled nightly Sisyphus cycle at 3:00 Europe/Oslo`

## Files Modified
- `/Users/reidar/Documents/Lobster/Ine-bot/src/relay/index.ts` - Added imports and initialization logic

## Environment Variables
- `DISABLE_NIGHTLY_CRON` - Set to any value to disable the cron job
- `OLLAMA_URL` - Ollama endpoint (default: http://localhost:11434)
- `OLLAMA_MODEL` - Ollama model for Sisyphus learning (default: mistral:7b-instruct)
