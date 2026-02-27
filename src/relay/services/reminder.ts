// Reminder service - extracted from relay/index.ts
import { eventDb } from '../../db/index.js';
import { ExtractionService } from '../../services/extraction.js';
import { DiscordRelay } from '../discord.js';
import { logger } from '../utils/logger.js';

// In-memory cache to avoid duplicate reminders within the same runtime
const remindedEventIds = new Set<string>();

const extraction = new ExtractionService();

let discordInstance: DiscordRelay | null = null;

export function setDiscord(discord: DiscordRelay): void {
  discordInstance = discord;
}

export const runReminders = async () => {
  try {
    // Fetch upcoming events (limited to the next 10 by start_time)
    const upcoming: any[] = eventDb.findUpcoming(10);
    if (!upcoming || upcoming.length === 0) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const twoHoursSec = 2 * 60 * 60;

    for (const ev of upcoming) {
      // event rows use snake_case as returned by sqlite, but be tolerant
      const id = ev.id;
      const channelId = ev.channel_id ?? ev.channelId ?? ev?.channel?.id;
      const title = ev.title ?? '';
      const startTime = ev.start_time ?? ev.startTime ?? ev?.start?.time ?? undefined;
      if (!id || !startTime) continue;

      const diff = Number(startTime) - nowSec;
      // Within 2 hours window, and within next hour to remind (<= 3600 seconds)
      if (diff > 0 && diff <= twoHoursSec) {
        // Only remind once per runtime
        if (diff <= 3600 && !remindedEventIds.has(id)) {
          const formattedTime = extraction.formatTimestamp(Number(startTime));
          const message = `⏰ Påminnelse: ${title} starter ${formattedTime}`;
          if (channelId && discordInstance) {
            try {
              await discordInstance.sendMessage(channelId, message);
            } catch (err) {
              // If we fail to send, log but keep trying on next tick
              logger.error('[Relay] Reminder send failed:', { context: 'Relay', error: err as any });
            }
          } else {
            console.warn('[Relay] Reminder skipped: missing channel_id for event', id);
          }
          remindedEventIds.add(id);
        }
      }
    }
  } catch (err) {
    logger.error('[Relay] Reminder timer error:', { context: 'Relay', error: err as any });
  }
};

export function startReminderInterval(): void {
  // Run every 60 seconds
  setInterval(() => {
    // Fire and forget; errors are handled inside runReminders
    runReminders();
  }, 60 * 1000);
}
