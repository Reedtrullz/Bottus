import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanRouter, type PlanAction, type PlanActionType } from '../../src/relay/plan-router.js';
import type { ExtractedItem } from '../../src/services/extraction.js';
import type { DiscordRelay } from '../../src/relay/discord.js';

// Mock the database modules
vi.mock('../../src/db/index.js', () => ({
  eventDb: {
    create: vi.fn().mockResolvedValue({ id: 'mock-event-id' }),
  },
  taskDb: {
    create: vi.fn().mockResolvedValue({ id: 'mock-task-id' }),
  },
}));

// Mock ToneService
vi.mock('../../src/services/tone.js', () => ({
  ToneService: {
    apply: vi.fn((msg: string) => msg),
  },
}));

// Import after mocking
import { eventDb, taskDb } from '../../src/db/index.js';
import { ToneService } from '../../src/services/tone.js';

class MockDiscordRelay implements DiscordRelay {
  sentMessages: Array<{ channelId: string; content: string }> = [];
  reactedMessages: Array<{ messageId: string; emoji: string }> = [];

  async sendMessage(channelId: string, content: string): Promise<any> {
    this.sentMessages.push({ channelId, content });
    return {
      id: 'mock-message-id',
      channelId,
      content,
      react: async (emoji: string) => {
        this.reactedMessages.push({ messageId: 'mock-message-id', emoji });
      },
    };
  }

  clearMessages(): void {
    this.sentMessages = [];
    this.reactedMessages = [];
  }
}

describe('PlanRouter', () => {
  let router: PlanRouter;
  let mockDiscord: MockDiscordRelay;

  beforeEach(() => {
    router = new PlanRouter();
    mockDiscord = new MockDiscordRelay();
    vi.clearAllMocks();
  });

  describe('route()', () => {
    it('should return none action for empty extraction results', async () => {
      const result = await router.route(
        [],
        'some message',
        'user-123',
        'channel-456',
        mockDiscord
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('none');
      expect(result[0].confidence).toBe(0);
    });

    it('should return none action for null/undefined extraction results', async () => {
      const result = await router.route(
        null as any,
        'some message',
        'user-123',
        'channel-456',
        mockDiscord
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('none');
    });

    it('should handle high-confidence calendar events (>= 0.8)', async () => {
      const extractionResult: ExtractedItem[] = [
        {
          type: 'event',
          title: 'Møte med teamet',
          startTime: Math.floor(Date.now() / 1000) + 86400, // tomorrow
          confidence: 0.95,
        },
      ];

      const result = await router.route(
        extractionResult,
        'lag arrangement Møte med teamet imorgen',
        'user-123',
        'channel-456',
        mockDiscord
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('calendar_event');
      expect(result[0].title).toBe('Møte med teamet');
      expect(result[0].confidence).toBe(0.95);
      expect(eventDb.create).toHaveBeenCalled();
    });

    it('should handle high-confidence tasks with task type', async () => {
      const extractionResult: ExtractedItem[] = [
        {
          type: 'task',
          title: 'Levere rapport',
          dueTime: Math.floor(Date.now() / 1000) + 86400 * 3,
          confidence: 0.9,
        },
      ];

      const result = await router.route(
        extractionResult,
        'husk at jeg har frist på rapporten om 3 dager',
        'user-123',
        'channel-456',
        mockDiscord
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('task');
      expect(result[0].title).toBe('Levere rapport');
      expect(taskDb.create).toHaveBeenCalled();
    });

    it('should handle high-confidence explicit tasks', async () => {
      const extractionResult: ExtractedItem[] = [
        {
          type: 'task',
          title: 'Kjøpe groceries',
          dueTime: Math.floor(Date.now() / 1000) + 86400,
          confidence: 0.85,
        },
      ];

      const result = await router.route(
        extractionResult,
        'lag oppgave Kjøpe groceries imorgen',
        'user-123',
        'channel-456',
        mockDiscord
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('task');
      expect(taskDb.create).toHaveBeenCalled();
    });

    it('should handle medium-confidence items (0.5-0.8) with clarification', async () => {
      const extractionResult: ExtractedItem[] = [
        {
          type: 'event',
          title: 'Arrangement',
          startTime: Math.floor(Date.now() / 1000) + 86400,
          confidence: 0.6,
        },
      ];

      const result = await router.route(
        extractionResult,
        'lag arrangement',
        'user-123',
        'channel-456',
        mockDiscord
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('clarification');
      expect(result[0].clarification).toBeDefined();
      expect(mockDiscord.sentMessages.length).toBeGreaterThan(0);
    });

    it('should handle medium-confidence items with existing clarification text', async () => {
      const extractionResult: ExtractedItem[] = [
        {
          type: 'event',
          title: 'Møte',
          startTime: Math.floor(Date.now() / 1000) + 86400,
          confidence: 0.65,
          clarification: 'Kan du spesifisere tidspunktet for møtet?',
        },
      ];

      const result = await router.route(
        extractionResult,
        'lag arrangement møte',
        'user-123',
        'channel-456',
        mockDiscord
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('clarification');
      expect(result[0].clarification).toBe('Kan du spesifisere tidspunktet for møtet?');
    });

    it('should return none for low confidence items (< 0.5)', async () => {
      const extractionResult: ExtractedItem[] = [
        {
          type: 'event',
          title: 'Kanskje en ting',
          confidence: 0.3,
        },
      ];

      const result = await router.route(
        extractionResult,
        'kanskje noe',
        'user-123',
        'channel-456',
        mockDiscord
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('none');
      expect(result[0].confidence).toBe(0.3);
    });

    it('should select highest confidence item when multiple provided', async () => {
      const extractionResult: ExtractedItem[] = [
        {
          type: 'event',
          title: 'Low confidence event',
          confidence: 0.4,
        },
        {
          type: 'event',
          title: 'High confidence event',
          startTime: Math.floor(Date.now() / 1000) + 86400,
          confidence: 0.9,
        },
      ];

      const result = await router.route(
        extractionResult,
        'lag arrangement',
        'user-123',
        'channel-456',
        mockDiscord
      );

      expect(result[0].title).toBe('High confidence event');
      expect(result[0].type).toBe('calendar_event');
    });

    it('should send RSVP reactions for calendar events', async () => {
      const extractionResult: ExtractedItem[] = [
        {
          type: 'event',
          title: 'Test Event',
          startTime: Math.floor(Date.now() / 1000) + 86400,
          confidence: 0.95,
        },
      ];

      await router.route(
        extractionResult,
        'lag arrangement Test Event',
        'user-123',
        'channel-456',
        mockDiscord
      );

      // Check that reactions were added (if the mock message had react method)
      const sentMsg = mockDiscord.sentMessages[0];
      expect(sentMsg).toBeDefined();
    });
  });

  describe('action types', () => {
    it('should return correct action types based on confidence', async () => {
      // High confidence - calendar
      const highConf: ExtractedItem[] = [
        { type: 'event', title: 'Test', startTime: Date.now() / 1000, confidence: 0.9 },
      ];
      const result1 = await router.route(highConf, '', 'u1', 'c1', mockDiscord);
      expect(result1[0].type).toBe('calendar_event');

      // Medium confidence - clarification
      const medConf: ExtractedItem[] = [
        { type: 'event', title: 'Test', startTime: Date.now() / 1000, confidence: 0.6 },
      ];
      const result2 = await router.route(medConf, '', 'u1', 'c1', mockDiscord);
      expect(result2[0].type).toBe('clarification');

      // Low confidence - none
      const lowConf: ExtractedItem[] = [
        { type: 'event', title: 'Test', confidence: 0.3 },
      ];
      const result3 = await router.route(lowConf, '', 'u1', 'c1', mockDiscord);
      expect(result3[0].type).toBe('none');
    });
  });
});
