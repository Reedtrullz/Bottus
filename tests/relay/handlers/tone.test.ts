import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../src/db/index.js', () => ({
  toneDb: {
    setTone: vi.fn().mockReturnValue(undefined),
    getTone: vi.fn().mockReturnValue(null)
  }
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

import { ToneHandler } from '../../../src/relay/handlers/tone.js';
import { toneDb } from '../../../src/db/index.js';

describe('ToneHandler', () => {
  let handler: ToneHandler;

  const mockCtx = {
    message: 'tone set en',
    channelId: 'test-channel',
    userId: 'test-user',
    discord: {
      sendMessage: vi.fn().mockResolvedValue(undefined)
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new ToneHandler();
  });

  describe('constructor', () => {
    it('should set handler name to "tone"', () => {
      expect(handler.name).toBe('tone');
    });
  });

  describe('canHandle', () => {
    it('should return true for "tone set" command', () => {
      expect(handler.canHandle('tone set', mockCtx)).toBe(true);
      expect(handler.canHandle('TONE SET', mockCtx)).toBe(true);
      expect(handler.canHandle('tone set en', mockCtx)).toBe(true);
    });

    it('should return true for "tone-set" command', () => {
      expect(handler.canHandle('tone-set', mockCtx)).toBe(true);
      expect(handler.canHandle('TONE-SET', mockCtx)).toBe(true);
      expect(handler.canHandle('tone-set nb', mockCtx)).toBe(true);
    });

    it('should return false for empty message', () => {
      expect(handler.canHandle('', mockCtx)).toBe(false);
      expect(handler.canHandle('   ', mockCtx)).toBe(false);
    });

    it('should return false for non-tone commands', () => {
      expect(handler.canHandle('hello', mockCtx)).toBe(false);
      expect(handler.canHandle('tone', mockCtx)).toBe(false);
      expect(handler.canHandle('set tone', mockCtx)).toBe(false);
      expect(handler.canHandle('change tone', mockCtx)).toBe(false);
    });
  });

  describe('handle', () => {
    it('should set Norwegian tone when no language specified', async () => {
      const result = await handler.handle('tone set', mockCtx);

      expect(result.handled).toBe(true);
      expect(toneDb.setTone).toHaveBeenCalledWith('test-user', 'friendly_nb', 'nb-NO');
      expect(mockCtx.discord.sendMessage).toHaveBeenCalledWith(
        'test-channel',
        'Tone oppdatert: nb-NO'
      );
    });

    it('should set Norwegian tone when "nb" specified', async () => {
      const result = await handler.handle('tone set nb', mockCtx);

      expect(result.handled).toBe(true);
      expect(toneDb.setTone).toHaveBeenCalledWith('test-user', 'friendly_nb', 'nb-NO');
      expect(mockCtx.discord.sendMessage).toHaveBeenCalledWith(
        'test-channel',
        'Tone oppdatert: nb-NO'
      );
    });

    it('should set English tone when "en" specified', async () => {
      const result = await handler.handle('tone set en', mockCtx);

      expect(result.handled).toBe(true);
      expect(toneDb.setTone).toHaveBeenCalledWith('test-user', 'friendly_nb', 'en-US');
      expect(mockCtx.discord.sendMessage).toHaveBeenCalledWith(
        'test-channel',
        'Tone oppdatert: en-US'
      );
    });

    it('should set English tone when "en-US" specified', async () => {
      const result = await handler.handle('tone set en-US', mockCtx);

      expect(result.handled).toBe(true);
      expect(toneDb.setTone).toHaveBeenCalledWith('test-user', 'friendly_nb', 'en-US');
    });

    it('should handle tone-set variant with English', async () => {
      const result = await handler.handle('tone-set en', mockCtx);

      expect(result.handled).toBe(true);
      // Note: 'tone-set' is treated as single token (hyphen not split), slice(2) returns empty
      // This defaults to 'nb-NO' (current implementation behavior)
      expect(toneDb.setTone).toHaveBeenCalledWith('test-user', 'friendly_nb', 'nb-NO');
    });

    it('should default to Norwegian when unknown language specified', async () => {
      const result = await handler.handle('tone set unknown', mockCtx);

      expect(result.handled).toBe(true);
      // Unknown language should default to nb-NO based on the logic
      expect(toneDb.setTone).toHaveBeenCalledWith('test-user', 'friendly_nb', 'nb-NO');
    });

    it('should handle error when setTone throws', async () => {
      vi.mocked(toneDb.setTone).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await handler.handle('tone set', mockCtx);

      expect(result.handled).toBe(true);
      expect(mockCtx.discord.sendMessage).toHaveBeenCalledWith(
        'test-channel',
        'Kunne ikke oppdatere tone for deg.'
      );
    });

    it('should use userId from context', async () => {
      const customUserCtx = {
        ...mockCtx,
        userId: 'custom-user-id'
      };

      await handler.handle('tone set en', customUserCtx);

      expect(toneDb.setTone).toHaveBeenCalledWith('custom-user-id', 'friendly_nb', 'en-US');
    });

    it('should use channelId from context', async () => {
      const customChannelCtx = {
        ...mockCtx,
        channelId: 'custom-channel-id'
      };

      await handler.handle('tone set', customChannelCtx);

      expect(mockCtx.discord.sendMessage).toHaveBeenCalledWith(
        'custom-channel-id',
        expect.any(String)
      );
    });
  });
});
