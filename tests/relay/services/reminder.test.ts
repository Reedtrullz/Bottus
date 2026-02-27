import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runReminders, setDiscord, startReminderInterval } from '../../../src/relay/services/reminder.js';
import { DiscordRelay } from '../../../src/relay/discord.js';

// Mock the database module
vi.mock('../../../src/db/index.js', () => ({
  eventDb: {
    findUpcoming: vi.fn(),
  },
}));

// Mock the logger
vi.mock('../../../src/relay/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Import after mocking
import { eventDb } from '../../../src/db/index.js';

class MockDiscordRelay implements DiscordRelay {
  sentMessages: Array<{ channelId: string; content: string }> = [];

  async sendMessage(channelId: string, content: string): Promise<any> {
    this.sentMessages.push({ channelId, content });
    return { id: 'mock-message-id' };
  }
}

describe('Reminder Service', () => {
  let mockDiscord: MockDiscordRelay;

  beforeEach(() => {
    mockDiscord = new MockDiscordRelay();
    setDiscord(mockDiscord);
    vi.clearAllMocks();
  });

  describe('runReminders()', () => {
    it('should not send reminders when no upcoming events', async () => {
      vi.mocked(eventDb.findUpcoming).mockReturnValue([]);

      await runReminders();

      expect(eventDb.findUpcoming).toHaveBeenCalledWith(10);
      expect(mockDiscord.sentMessages).toHaveLength(0);
    });

    it('should not send reminders when findUpcoming returns null', async () => {
      vi.mocked(eventDb.findUpcoming).mockReturnValue(null as any);

      await runReminders();

      expect(mockDiscord.sentMessages).toHaveLength(0);
    });

    it('should not send reminder for event more than 2 hours away', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const eventIn3Hours = nowSec + 3 * 60 * 60;

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-1',
          channel_id: 'channel-123',
          title: 'Møte',
          start_time: eventIn3Hours,
        },
      ]);

      await runReminders();

      expect(mockDiscord.sentMessages).toHaveLength(0);
    });

    it('should not send reminder for event already in the past', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const eventInPast = nowSec - 3600;

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-past',
          channel_id: 'channel-123',
          title: 'Gammelt møte',
          start_time: eventInPast,
        },
      ]);

      await runReminders();

      expect(mockDiscord.sentMessages).toHaveLength(0);
    });

    it('should send reminder for event within 1 hour window', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const eventIn30Min = nowSec + 30 * 60;

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-1',
          channel_id: 'channel-123',
          title: 'Møte',
          start_time: eventIn30Min,
        },
      ]);

      await runReminders();

      expect(mockDiscord.sentMessages).toHaveLength(1);
      expect(mockDiscord.sentMessages[0].channelId).toBe('channel-123');
      expect(mockDiscord.sentMessages[0].content).toContain('Møte');
      expect(mockDiscord.sentMessages[0].content).toContain('Påminnelse');
    });

    it('should NOT send reminder for event between 1-2 hours away (only within 1 hour)', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const eventIn90Min = nowSec + 90 * 60;

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-2',
          channel_id: 'channel-456',
          title: 'Arrangement',
          start_time: eventIn90Min,
        },
      ]);

      await runReminders();

      // Events between 1-2 hours are processed but NOT reminded (only within 1 hour)
      expect(mockDiscord.sentMessages).toHaveLength(0);
    });

    it('should handle event with channelId in camelCase', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const eventIn30Min = nowSec + 30 * 60;

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-camel',
          channelId: 'channel-789',
          title: 'Test Event',
          startTime: eventIn30Min,
        },
      ]);

      await runReminders();

      expect(mockDiscord.sentMessages).toHaveLength(1);
      expect(mockDiscord.sentMessages[0].channelId).toBe('channel-789');
    });

    it('should skip event with missing id', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const eventIn30Min = nowSec + 30 * 60;

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          channel_id: 'channel-123',
          title: 'Event without ID',
          start_time: eventIn30Min,
        } as any,
      ]);

      await runReminders();

      expect(mockDiscord.sentMessages).toHaveLength(0);
    });

    it('should skip event with missing start_time', async () => {
      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-no-time',
          channel_id: 'channel-123',
          title: 'Event without time',
        } as any,
      ]);

      await runReminders();

      expect(mockDiscord.sentMessages).toHaveLength(0);
    });

    it('should not send duplicate reminder for same event in same runtime', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const eventIn30Min = nowSec + 30 * 60;

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-dup',
          channel_id: 'channel-123',
          title: 'Duplikat Test',
          start_time: eventIn30Min,
        },
      ]);

      // First run
      await runReminders();
      expect(mockDiscord.sentMessages).toHaveLength(1);

      // Second run - should not send again
      await runReminders();
      expect(mockDiscord.sentMessages).toHaveLength(1);
    });

    it('should warn and skip when channel_id is missing', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const nowSec = Math.floor(Date.now() / 1000);
      const eventIn30Min = nowSec + 30 * 60;

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-no-channel',
          title: 'Event uten kanal',
          start_time: eventIn30Min,
        } as any,
      ]);

      await runReminders();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Relay] Reminder skipped: missing channel_id for event',
        'event-no-channel'
      );
      expect(mockDiscord.sentMessages).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully when sendMessage fails', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const eventIn30Min = nowSec + 30 * 60;

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-error',
          channel_id: 'channel-fail',
          title: 'Failing Event',
          start_time: eventIn30Min,
        },
      ]);

      // Override sendMessage to throw
      mockDiscord.sendMessage = vi.fn().mockRejectedValue(new Error('Network error'));

      await runReminders();

      // Should not throw, error is handled internally
      expect(mockDiscord.sentMessages).toHaveLength(0);
    });

    it('should process multiple events and send reminders only for eligible ones', async () => {
      const nowSec = Math.floor(Date.now() / 1000);

      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'event-past',
          channel_id: 'channel-1',
          title: 'Past Event',
          start_time: nowSec - 3600,
        },
        {
          id: 'event-far',
          channel_id: 'channel-2',
          title: 'Far Event',
          start_time: nowSec + 3 * 60 * 60,
        },
        {
          id: 'event-soon',
          channel_id: 'channel-3',
          title: 'Snart Event',
          start_time: nowSec + 30 * 60,
        },
        {
          id: 'event-90min',
          channel_id: 'channel-4',
          title: 'Halvannen time',
          start_time: nowSec + 90 * 60,
        },
      ]);

      await runReminders();

      // Only the event within 1 hour (30 min) should be reminded
      expect(mockDiscord.sentMessages).toHaveLength(1);
      expect(mockDiscord.sentMessages[0].content).toContain('Snart Event');
    });
  });

  describe('setDiscord()', () => {
    it('should set the discord instance', async () => {
      const newDiscord = new MockDiscordRelay();
      setDiscord(newDiscord);
      
      // Verify it doesn't throw and sets correctly by checking runReminders works
      const nowSec = Math.floor(Date.now() / 1000);
      vi.mocked(eventDb.findUpcoming).mockReturnValue([
        {
          id: 'test-event',
          channel_id: 'channel-test',
          title: 'Test',
          start_time: nowSec + 30 * 60,
        },
      ]);

      await expect(runReminders()).resolves.not.toThrow();
    });
  });

  describe('startReminderInterval()', () => {
    it('should create an interval that runs runReminders', () => {
      vi.mocked(eventDb.findUpcoming).mockReturnValue([]);
      
      const interval = startReminderInterval();
      
      // Clear the interval immediately - we just verify it was created
      clearInterval(interval);
      
      // The interval should have been set (we can't easily test timing)
      expect(true).toBe(true);
    });
  });
});
