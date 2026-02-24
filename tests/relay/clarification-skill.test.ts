import { describe, it, expect, beforeEach } from 'vitest';
import type { HandlerContext } from '../../src/relay/skills/interfaces.js';
import { MockDiscordClient, TEST_CONFIG } from './test-utils.js';
import { pendingClarifications } from '../../src/relay/skills/clarification-state.js';

class MockMemoryService {
  private memories: Map<string, any[]> = new Map();
  
  async initialize(): Promise<void> {}
  
  async store(userId: string, fact: string): Promise<string> {
    const userMemories = this.memories.get(userId) || [];
    const memory = {
      id: `memory-${Date.now()}`,
      userId,
      fact,
      createdAt: Date.now()
    };
    userMemories.push(memory);
    this.memories.set(userId, userMemories);
    return memory.id;
  }
  
  async recall(userId: string): Promise<any[]> {
    return this.memories.get(userId) || [];
  }
  
  async search(userId: string, query: string): Promise<any[]> {
    const userMemories = this.memories.get(userId) || [];
    return userMemories.filter(m => m.fact.toLowerCase().includes(query.toLowerCase()));
  }
  
  async delete(id: string): Promise<void> {
    for (const [userId, memories] of this.memories.entries()) {
      const idx = memories.findIndex(m => m.id === id);
      if (idx !== -1) {
        memories.splice(idx, 1);
        return;
      }
    }
  }
  
  async getAll(): Promise<any[]> {
    const all: any[] = [];
    for (const memories of this.memories.values()) {
      all.push(...memories);
    }
    return all;
  }
}

const mockMemoryService = new MockMemoryService();

class TestableClarificationSkill {
  readonly name = 'clarification';
  readonly description = 'Handles pending clarification responses';
  private memoryService: MockMemoryService;

  constructor() {
    this.memoryService = mockMemoryService;
  }

  canHandle(message: string, ctx: HandlerContext): boolean {
    if (!message) return false;
    const pending = pendingClarifications.get(ctx.channelId);
    if (!pending) return false;
    const m = message.toLowerCase();
    return m === 'avtale' || m === 'minne' || m === 'avtale!' || m === 'minne!';
  }

  async handle(message: string, ctx: HandlerContext): Promise<{ handled: boolean; response?: string; shouldContinue?: boolean }> {
    const pending = pendingClarifications.get(ctx.channelId);
    if (!pending) {
      return { handled: false, shouldContinue: true };
    }
    
    pendingClarifications.delete(ctx.channelId);
    const m = message.toLowerCase();
    
    if (m.startsWith('avtale')) {
      const response = 'Får ikke opprettet kalenderhendelse ennå. Prøv /kalender kommandoen eller lag et arrangement med "lag arrangement".';
      if (ctx.discord?.sendMessage) {
        await ctx.discord.sendMessage(ctx.channelId, response);
      }
      return {
        handled: true,
        response,
        shouldContinue: false
      };
    } else {
      await this.memoryService.store(pending.userId, pending.text);
      const response = `Lagret minne: ${pending.text}`;
      if (ctx.discord?.sendMessage) {
        await ctx.discord.sendMessage(ctx.channelId, response);
      }
      return {
        handled: true,
        response,
        shouldContinue: false
      };
    }
  }
}

describe('ClarificationSkill', () => {
  let skill: TestableClarificationSkill;
  let mockDiscord: MockDiscordClient;
  let ctx: HandlerContext;

  beforeEach(() => {
    pendingClarifications.delete(TEST_CONFIG.channelId);
    skill = new TestableClarificationSkill();
    mockDiscord = new MockDiscordClient();
    ctx = {
      userId: TEST_CONFIG.userId,
      channelId: TEST_CONFIG.channelId,
      message: '',
      discord: mockDiscord,
    };
  });

  describe('canHandle', () => {
    it('should return false when no pending clarification', () => {
      expect(skill.canHandle('avtale', ctx)).toBe(false);
      expect(skill.canHandle('minne', ctx)).toBe(false);
    });

    it('should handle "avtale" when clarification pending', () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'test text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });
      expect(skill.canHandle('avtale', ctx)).toBe(true);
    });

    it('should handle "minne" when clarification pending', () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'test text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });
      expect(skill.canHandle('minne', ctx)).toBe(true);
    });

    it('should handle "avtale!" with exclamation', () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'test text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });
      expect(skill.canHandle('avtale!', ctx)).toBe(true);
    });

    it('should handle "minne!" with exclamation', () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'test text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });
      expect(skill.canHandle('minne!', ctx)).toBe(true);
    });

    it('should return false for unrelated messages', () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'test text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });
      expect(skill.canHandle('ja', ctx)).toBe(false);
      expect(skill.canHandle('nei', ctx)).toBe(false);
    });

    it('should return false for empty message', () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'test text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });
      expect(skill.canHandle('', ctx)).toBe(false);
    });
  });

  describe('handle - avtale response', () => {
    it('should respond that calendar creation is not available', async () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'test text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });

      const result = await skill.handle('avtale', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('kalenderhendelse');
      expect(pendingClarifications.has(TEST_CONFIG.channelId)).toBe(false);
    });

    it('should delete pending clarification after handling', async () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'test text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });

      await skill.handle('avtale', ctx);
      expect(pendingClarifications.has(TEST_CONFIG.channelId)).toBe(false);
    });
  });

  describe('handle - minne response', () => {
    it('should store memory and confirm', async () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'viktig møte imorgen',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });

      const result = await skill.handle('minne', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Lagret minne');
      expect(result.response).toContain('viktig møte imorgen');
    });

    it('should delete pending clarification after handling', async () => {
      pendingClarifications.set(TEST_CONFIG.channelId, {
        text: 'test text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });

      await skill.handle('minne', ctx);
      expect(pendingClarifications.has(TEST_CONFIG.channelId)).toBe(false);
    });
  });

  describe('handle - no pending clarification', () => {
    it('should return handled: false when no pending', async () => {
      const result = await skill.handle('avtale', ctx);
      expect(result.handled).toBe(false);
      expect(result.shouldContinue).toBe(true);
    });
  });

  describe('handle - different channel', () => {
    it('should not see clarification from different channel', async () => {
      pendingClarifications.set('different-channel', {
        text: 'other text',
        timestamp: Date.now(),
        userId: TEST_CONFIG.userId
      });

      const result = await skill.handle('avtale', ctx);
      expect(result.handled).toBe(false);
    });
  });
});
