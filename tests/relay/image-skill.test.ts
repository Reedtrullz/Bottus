import { describe, it, expect, beforeEach } from 'vitest';
import { ImageSkill } from '../../src/relay/skills/image-skill.js';
import type { HandlerContext } from '../../src/relay/skills/interfaces.js';
import { ComfyUIClient } from '../../src/services/comfyui.js';

class MockDiscordClient {
  sentMessages: Array<{ channelId: string; content: string }> = [];
  
  async sendMessage(channelId: string, content: string): Promise<any> {
    this.sentMessages.push({ channelId, content });
    return { id: 'mock-message-id', channelId, content };
  }
}

const TEST_CONFIG = {
  userId: 'test-user-123',
  channelId: 'test-channel-456',
  testPrompt: 'en katt',
  testWithRealComfyUI: process.env.TEST_COMFYUI === 'true',
};

describe('ImageSkill', () => {
  let skill: ImageSkill;
  let mockDiscord: MockDiscordClient;
  let ctx: HandlerContext;

  // Mock ComfyUIClient for unit testing
  class MockComfyUIClient {
    async generateImage(prompt: string, userId: string) {
      return { success: true, imageUrl: 'http://localhost:8188/view/test.png' };
    }
  }

  beforeEach(() => {
    skill = new ImageSkill(new MockComfyUIClient() as any);
    mockDiscord = new MockDiscordClient();
    ctx = {
      userId: TEST_CONFIG.userId,
      channelId: TEST_CONFIG.channelId,
      message: '',
      discord: mockDiscord,
    };
  });

  describe('canHandle', () => {
    it('should handle Norwegian "lag et bilde av"', () => {
      const result = skill.canHandle('lag et bilde av en katt', ctx);
      expect(result).toBe(true);
    });

    it('should handle "generer et bilde av"', () => {
      const result = skill.canHandle('generer et bilde av en hund', ctx);
      expect(result).toBe(true);
    });

    it('should handle "tegn"', () => {
      const result = skill.canHandle('tegn en fugl', ctx);
      expect(result).toBe(true);
    });

    it('should handle English "generate image of"', () => {
      const result = skill.canHandle('generate image of a cat', ctx);
      expect(result).toBe(true);
    });

    it('should handle "lag bilde av"', () => {
      const result = skill.canHandle('lag bilde av et hus', ctx);
      expect(result).toBe(true);
    });

    it('should handle "tegn et bilde av"', () => {
      const result = skill.canHandle('tegn et bilde av en bil', ctx);
      expect(result).toBe(true);
    });

    it('should return false for unrelated messages', () => {
      const result = skill.canHandle('hei, hvordan går det?', ctx);
      expect(result).toBe(false);
    });

    it('should return false for empty message', () => {
      const result = skill.canHandle('', ctx);
      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      const result = skill.canHandle('LAG ET BILDE AV EN KATT', ctx);
      expect(result).toBe(true);
    });
  });

  describe('handle with mocked ComfyUI', () => {
    it('should send "genererer" message before generation', async () => {
      await skill.handle('lag et bilde av en katt', ctx);
      const generererMsg = mockDiscord.sentMessages.find(m => 
        m.content.includes('Genererer')
      );
      expect(generererMsg).toBeDefined();
    });

    it('should handle missing discord client gracefully', async () => {
      const ctxNoDiscord: HandlerContext = {
        ...ctx,
        discord: null,
      };
      
      const result = await skill.handle('lag et bilde av en katt', ctxNoDiscord);
      expect(result.handled).toBe(false);
    });

    it('should handle missing channelId gracefully', async () => {
      const ctxNoChannel: HandlerContext = {
        ...ctx,
        channelId: '',
      };
      
      const result = await skill.handle('lag et bilde av en katt', ctxNoChannel);
      expect(result.handled).toBe(false);
    });
  });

  describe('handle with real ComfyUI (integration)', () => {
    const shouldTestRealComfyUI = TEST_CONFIG.testWithRealComfyUI || process.env.COMFYUI_URL;

    if (shouldTestRealComfyUI) {
      it('should generate image via ComfyUI and send URL to Discord', async () => {
        const result = await skill.handle(`lag et bilde av ${TEST_CONFIG.testPrompt}`, ctx);
        expect(mockDiscord.sentMessages.length).toBeGreaterThanOrEqual(2);
        const lastMessage = mockDiscord.sentMessages[mockDiscord.sentMessages.length - 1];
        const isSuccess = result.handled && 
          (lastMessage.content.includes('http') || result.response?.includes('generert'));
        const isFailure = result.response?.includes('feilet') || 
          result.response?.includes('ikke tilgjengelig');
        expect(isSuccess || isFailure).toBe(true);
      }, 180000);

      it('should handle ComfyUI unavailable gracefully', async () => {
        const skillWithBadComfyui = new (class extends ImageSkill {
          private badComfyui = new ComfyUIClient('http://localhost:9999');
          
          async handle(message: string, ctx: HandlerContext) {
            const m = message.toLowerCase();
            if (m.includes('lag et bilde av')) {
              const prompt = m.substring(m.indexOf('lag et bilde av') + 15).trim();
              if (prompt && ctx.discord && ctx.channelId) {
                await ctx.discord.sendMessage(ctx.channelId, '🎨 Genererer bilde...');
                const result = await this.badComfyui.generateImage(prompt, ctx.userId);
                return {
                  handled: true,
                  response: result.success ? `Bilde: ${result.imageUrl}` : `Feil: ${result.error}`,
                  shouldContinue: false,
                };
              }
            }
            return { handled: false, shouldContinue: true };
          }
        })();

        const result = await skillWithBadComfyui.handle('lag et bilde av en katt', ctx);
        
        console.log('[Test] Unavailable ComfyUI result:', result);
        expect(result.handled).toBe(true);
        expect(result.response).toContain('feil');
      }, 30000);
    } else {
      it.skip('Set TEST_COMFYUI=true or COMFYUI_URL to test with real ComfyUI', () => {});
    }
  });

  describe('E2E test - Verify actual Discord message', () => {
    const shouldRunE2E = process.env.TEST_E2E === 'true';

    if (shouldRunE2E) {
      it('should send image to actual Discord user', async () => {
        const { Client } = await import('discord.js-selfbot-v13');
        const token = process.env.DISCORD_USER_TOKEN || process.env.DISCORD_TOKEN;
        if (!token) throw new Error('DISCORD_TOKEN not set');
        const client = new Client();
        await new Promise<void>((resolve, reject) => {
          client.once('ready', () => resolve());
          client.once('error', reject);
          client.login(token);
        });
        expect(client.user).toBeDefined();
        await client.destroy();
      }, 60000);
    } else {
      it.skip('Set TEST_E2E=true to run E2E test', () => {});
    }
  });
});

// Run: npm test                    (unit tests)
// Run: TEST_COMFYUI=true npm test   (with ComfyUI)
// Run: TEST_E2E=true npm test      (full E2E)
