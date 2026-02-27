import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsentManager } from '../../src/services/consent.js';

vi.mock('../../src/db/index.js', () => ({
  consentDb: {
    findByUserId: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
    getConsentedUsers: vi.fn()
  }
}));

import { consentDb } from '../../src/db/index.js';

describe('ConsentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleOptIn', () => {
    it('should reply already consented if user has consented', async () => {
      (consentDb.findByUserId as any).mockReturnValue({ status: 'consented' });
      
      const manager = new ConsentManager();
      const mockReply = vi.fn().mockResolvedValue({});
      const interaction = { 
        user: { id: 'user-123' }, 
        guildId: 'guild-456',
        channelId: 'channel-789',
        reply: mockReply
      };
      
      await manager.handleOptIn(interaction as any);
      
      expect(mockReply).toHaveBeenCalledWith({
        content: 'Du har allerede samtykket! Botten leser allerede meldingene dine.',
        ephemeral: true
      });
    });

    it('should create consent if none exists', async () => {
      (consentDb.findByUserId as any).mockReturnValue(null);
      
      const manager = new ConsentManager();
      const mockReply = vi.fn().mockResolvedValue({});
      const interaction = { 
        user: { id: 'user-new' }, 
        guildId: 'guild-456',
        channelId: 'channel-789',
        reply: mockReply
      };
      
      await manager.handleOptIn(interaction as any);
      
      expect(consentDb.create).toHaveBeenCalledWith('user-new', 'guild-456', 'channel-789');
      expect(mockReply).toHaveBeenCalledWith({
        content: 'Takk! Samtykke registrert. Botten vil nå lese meldingene dine og hjelpe med kalender og oppgaver.',
        ephemeral: true
      });
    });

    it('should recreate consent if previously revoked', async () => {
      (consentDb.findByUserId as any).mockReturnValue({ status: 'revoked' });
      
      const manager = new ConsentManager();
      const mockReply = vi.fn().mockResolvedValue({});
      const interaction = { 
        user: { id: 'user-revoked' }, 
        guildId: 'guild-456',
        channelId: 'channel-789',
        reply: mockReply
      };
      
      await manager.handleOptIn(interaction as any);
      
      expect(consentDb.create).toHaveBeenCalledWith('user-revoked', 'guild-456', 'channel-789');
    });
  });

  describe('handleRevocation', () => {
    it('should reply no consent if user has not consented', async () => {
      (consentDb.findByUserId as any).mockReturnValue(null);
      
      const manager = new ConsentManager();
      const mockReply = vi.fn().mockResolvedValue({});
      const interaction = { 
        user: { id: 'user-no-consent' }, 
        reply: mockReply
      };
      
      await manager.handleRevocation(interaction as any);
      
      expect(mockReply).toHaveBeenCalledWith({
        content: 'Du har ikke gitt samtykke enda. Bruk /jeg-samtykker først.',
        ephemeral: true
      });
    });

    it('should revoke consent if user has consented', async () => {
      (consentDb.findByUserId as any).mockReturnValue({ status: 'consented' });
      
      const manager = new ConsentManager();
      const mockReply = vi.fn().mockResolvedValue({});
      const interaction = { 
        user: { id: 'user-consented' }, 
        reply: mockReply
      };
      
      await manager.handleRevocation(interaction as any);
      
      expect(consentDb.revoke).toHaveBeenCalledWith('user-consented');
      expect(mockReply).toHaveBeenCalledWith({
        content: 'Samtykke tilbakekalt. Botten slutter å lese meldingene dine og vil slette dataene dine.',
        ephemeral: true
      });
    });
  });

  describe('hasConsent', () => {
    it('should return true if user has consented', () => {
      (consentDb.findByUserId as any).mockReturnValue({ status: 'consented' });
      
      const manager = new ConsentManager();
      expect(manager.hasConsent('user-123')).toBe(true);
    });

    it('should return false if user has not consented', () => {
      (consentDb.findByUserId as any).mockReturnValue(null);
      
      const manager = new ConsentManager();
      expect(manager.hasConsent('user-123')).toBe(false);
    });

    it('should return false if consent was revoked', () => {
      (consentDb.findByUserId as any).mockReturnValue({ status: 'revoked' });
      
      const manager = new ConsentManager();
      expect(manager.hasConsent('user-123')).toBe(false);
    });
  });

  describe('getConsentedUsers', () => {
    it('should return array of user IDs', () => {
      (consentDb.getConsentedUsers as any).mockReturnValue([
        { user_id: 'user-1' },
        { user_id: 'user-2' }
      ]);
      
      const manager = new ConsentManager();
      const result = manager.getConsentedUsers();
      
      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('should return empty array if no users', () => {
      (consentDb.getConsentedUsers as any).mockReturnValue([]);
      
      const manager = new ConsentManager();
      const result = manager.getConsentedUsers();
      
      expect(result).toEqual([]);
    });
  });
});
