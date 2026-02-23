import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HelpHandler } from '../../src/relay/handlers/help.js';

describe('HelpHandler', () => {
  const handler = new HelpHandler();
  
  const mockCtx = {
    message: 'test message',
    channelId: 'test-channel',
    userId: 'test-user',
    discord: {
      sendMessage: vi.fn().mockResolvedValue(undefined)
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canHandle', () => {
    it('should return true for "help"', () => {
      expect(handler.canHandle('help', mockCtx)).toBe(true);
    });

    it('should return true for "hjelp"', () => {
      expect(handler.canHandle('hjelp', mockCtx)).toBe(true);
    });

    it('should return true for "who are you"', () => {
      expect(handler.canHandle('who are you', mockCtx)).toBe(true);
    });

    it('should return true for "hvem er du"', () => {
      expect(handler.canHandle('hvem er du', mockCtx)).toBe(true);
    });

    it('should return true for "hva kan du"', () => {
      expect(handler.canHandle('hva kan du', mockCtx)).toBe(true);
    });

    it('should return true for "what can you do"', () => {
      expect(handler.canHandle('what can you do', mockCtx)).toBe(true);
    });

    it('should return true for "calendar" query', () => {
      expect(handler.canHandle('how to schedule a meeting', mockCtx)).toBe(true);
    });

    it('should return true for "kalender" query', () => {
      expect(handler.canHandle('hvordan lage en avtale', mockCtx)).toBe(true);
    });

    it('should return true for "memory" query', () => {
      expect(handler.canHandle('husk at jeg liker kaffe', mockCtx)).toBe(true);
    });

    it('should return true for "commands" query', () => {
      expect(handler.canHandle('hvilke kommandoer har du', mockCtx)).toBe(true);
    });

    it('should return false for non-help messages', () => {
      expect(handler.canHandle('hello how are you', mockCtx)).toBe(false);
      expect(handler.canHandle('what is the weather', mockCtx)).toBe(false);
    });

    it('should return false for empty message', () => {
      expect(handler.canHandle('', mockCtx)).toBe(false);
    });
  });

  describe('handle', () => {
    it('should send help response for "help"', async () => {
      const result = await handler.handle('help', mockCtx);
      
      expect(result.handled).toBe(true);
      expect(mockCtx.discord.sendMessage).toHaveBeenCalledWith(
        'test-channel',
        expect.stringContaining('Help Overview')
      );
    });

    it('should send identity response for "who are you"', async () => {
      const result = await handler.handle('who are you', mockCtx);
      
      expect(result.handled).toBe(true);
      expect(mockCtx.discord.sendMessage).toHaveBeenCalledWith(
        'test-channel',
        expect.any(String)
      );
    });

    it('should send capabilities for "hva kan du"', async () => {
      const result = await handler.handle('hva kan du', mockCtx);
      
      expect(result.handled).toBe(true);
      expect(mockCtx.discord.sendMessage).toHaveBeenCalledWith(
        'test-channel',
        expect.any(String)
      );
    });
  });
});
