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
  
  clear(): void {
    this.memories.clear();
  }
}

const mockMemoryService = new MockMemoryService();

class TestableMemorySkill {
  readonly name = 'memory';
  readonly description = 'Store and recall user memories';
  private memoryService: MockMemoryService;
  private datePatterns = [
    'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag',
    'i dag', 'i morgen', 'imorgen', 'neste uke',
    'kl ', 'klokken', 'tidspunkt',
    'dato', 'januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'
  ];

  constructor() {
    this.memoryService = mockMemoryService;
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    return /\b(husk|husk at|husk jeg er)\b/i.test(m) || 
           /\b(hva husker du|husker du)\b/i.test(m);
  }

  async handle(message: string, ctx: HandlerContext): Promise<{ handled: boolean; response?: string; shouldContinue?: boolean }> {
    const m = message.toLowerCase();
    
    if (/\b(husk|husk at|husk jeg er)\b/i.test(m)) {
      const match = message.match(/(?:^|\s)(husk|husk at|husk jeg er)\b\s*(.*)/i);
      const textToStore = match?.[2]?.trim() ?? message;
      
      const hasDatePattern = this.datePatterns.some(p => textToStore.toLowerCase().includes(p));
      const hasTimePattern = /\d{1,2}:\d{2}/.test(textToStore);
      
      if (hasDatePattern || hasTimePattern) {
        pendingClarifications.set(ctx.channelId, { 
          text: textToStore, 
          timestamp: Date.now(),
          userId: ctx.userId
        });
        const responseMsg = 'Jeg ser at dette kan være en avtale eller et minne. Vil du:\n' +
          '• 🗓️ **Opprett som kalenderhendelse**\n' +
          '• 💾 **Lagre som et minne**\n\n' +
          'Svar med "avtale" eller "minne", så ordner jeg det!';
        if (ctx.discord?.sendMessage) {
          await ctx.discord.sendMessage(ctx.channelId, responseMsg);
        }
        return {
          handled: true,
          response: responseMsg,
          shouldContinue: false
        };
      }
      
      await this.memoryService.store(ctx.userId, textToStore);
      
      return {
        handled: true,
        response: `Lagret minne: ${textToStore}`,
        shouldContinue: false
      };
    }
    
    if (/\b(hva husker du|husker du)\b/i.test(m)) {
      const memories = await this.memoryService.recall(ctx.userId);
      if (memories.length > 0) {
        const items = memories.slice(0, 5).map((mm: any, idx: number) => `${idx + 1}. ${mm.fact}`);
        return {
          handled: true,
          response: `Husker jeg:\n${items.join('\n')}`,
          shouldContinue: false
        };
      }
      return {
        handled: true,
        response: 'Ingen minner funnet.',
        shouldContinue: false
      };
    }
    
    return { handled: false, shouldContinue: true };
  }

  async getMemory(userId: string): Promise<any[]> {
    return this.memoryService.recall(userId);
  }

  async setMemory(userId: string, fact: string): Promise<void> {
    await this.memoryService.store(userId, fact);
  }
}

describe('MemorySkill', () => {
  let skill: TestableMemorySkill;
  let mockDiscord: MockDiscordClient;
  let ctx: HandlerContext;

  beforeEach(() => {
    pendingClarifications.delete(TEST_CONFIG.channelId);
    mockMemoryService.clear();
    skill = new TestableMemorySkill();
    mockDiscord = new MockDiscordClient();
    ctx = {
      userId: TEST_CONFIG.userId,
      channelId: TEST_CONFIG.channelId,
      message: '',
      discord: mockDiscord,
    };
  });

  describe('canHandle', () => {
    it('should handle "husk" pattern', () => {
      expect(skill.canHandle('husk at jeg liker katter', ctx)).toBe(true);
    });

    it('should handle "husk at" pattern', () => {
      expect(skill.canHandle('husk at jeg er allergisk mot gluten', ctx)).toBe(true);
    });

    it('should handle "husk jeg er" pattern', () => {
      expect(skill.canHandle('husk jeg er fra Norge', ctx)).toBe(true);
    });

    it('should handle "hva husker du" query', () => {
      expect(skill.canHandle('hva husker du?', ctx)).toBe(true);
    });

    it('should handle "husker du" query', () => {
      expect(skill.canHandle('husker du noe om meg?', ctx)).toBe(true);
    });

    it('should return false for unrelated messages', () => {
      expect(skill.canHandle('hei, hvordan går det?', ctx)).toBe(false);
    });

    it('should return false for empty message', () => {
      expect(skill.canHandle('', ctx)).toBe(false);
    });
  });

  describe('handle - store memory', () => {
    it('should store simple memory', async () => {
      const result = await skill.handle('husk at jeg liker katter', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Lagret minne');
    });

    it('should store memory with "husk at"', async () => {
      const result = await skill.handle('husk at jeg er vegetarianer', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Lagret minne');
    });

    it('should store memory with "husk jeg er"', async () => {
      const result = await skill.handle('husk jeg er utvikler', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Lagret minne');
    });
  });

  describe('handle - clarification flow', () => {
    it('should trigger clarification for messages with date pattern', async () => {
      const result = await skill.handle('husk imorgen kl 14 møte', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('avtale');
      expect(result.response).toContain('minne');
      expect(pendingClarifications.has(TEST_CONFIG.channelId)).toBe(true);
    });

    it('should trigger clarification for messages with weekday', async () => {
      const result = await skill.handle('husk mandag møte', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('avtale');
      expect(pendingClarifications.has(TEST_CONFIG.channelId)).toBe(true);
    });

    it('should trigger clarification for messages with time', async () => {
      const result = await skill.handle('husk kl 15:30', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('avtale');
    });

    it('should trigger clarification for messages with month names', async () => {
      const result = await skill.handle('husk januar ferie', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('avtale');
    });
  });

  describe('handle - query memory', () => {
    it('should return memories when they exist', async () => {
      await skill.setMemory(TEST_CONFIG.userId, 'jeg liker katter');
      
      const result = await skill.handle('hva husker du?', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Husker jeg');
      expect(result.response).toContain('liker katter');
    });

    it('should return "ingen minner" when no memories', async () => {
      const result = await skill.handle('hva husker du?', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Ingen minner');
    });

    it('should limit to 5 memories', async () => {
      for (let i = 0; i < 7; i++) {
        await skill.setMemory(TEST_CONFIG.userId, `minne ${i}`);
      }
      
      const result = await skill.handle('hva husker du?', ctx);
      expect(result.handled).toBe(true);
      const memoryCount = (result.response?.match(/\d+\./g) || []).length;
      expect(memoryCount).toBe(5);
    });
  });

  describe('getMemory and setMemory', () => {
    it('should get memory', async () => {
      await skill.setMemory(TEST_CONFIG.userId, 'test fact');
      const memories = await skill.getMemory(TEST_CONFIG.userId);
      expect(memories.length).toBeGreaterThan(0);
    });

    it('should set memory', async () => {
      await skill.setMemory(TEST_CONFIG.userId, 'new fact');
      const memories = await skill.getMemory(TEST_CONFIG.userId);
      const found = memories.some((m: any) => m.fact === 'new fact');
      expect(found).toBe(true);
    });
  });
});
