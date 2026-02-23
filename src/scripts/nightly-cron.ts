import cron from 'node-cron';
import { SisyphusLearner } from './sisyphus-learner.js';

export function startNightlyCron(
  learner: SisyphusLearner,
  hour: number = 3,
  minute: number = 0
): void {
  const cronExpression = `${minute} ${hour} * * *`;
  
  cron.schedule(cronExpression, async () => {
    console.log('[CRON] Running nightly Sisyphus cycle...');
    try {
      await learner.run();
      console.log('[CRON] Nightly cycle completed successfully.');
    } catch (error) {
      console.error('[CRON] Nightly cycle failed:', error);
    }
  }, {
    timezone: 'Europe/Oslo'
  });

  console.log(`[CRON] Scheduled nightly Sisyphus cycle at ${hour}:${minute.toString().padStart(2, '0')} Europe/Oslo`);
}
