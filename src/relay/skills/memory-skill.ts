import type { Skill, HandlerContext, SkillResponse } from './interfaces.js';

const MEMORY_STORE_PATTERNS = [
  /\b(husk|husk at|husk jeg er)\b/i
];

const MEMORY_QUERY_PATTERNS = [
  /\b(hva husker du|husker du)\b/i
];

export class MemorySkill implements Skill {
  readonly name = 'memory';
  readonly description = 'Store and recall user memories';

  private memories: Map<string, any[]> = new Map();

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    return MEMORY_STORE_PATTERNS.some(p => p.test(m)) || 
           MEMORY_QUERY_PATTERNS.some(p => p.test(m));
  }

  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    const m = message.toLowerCase();
    
    if (MEMORY_STORE_PATTERNS.some(p => p.test(m))) {
      const match = message.match(/(?:^|\s)(husk|husk at|husk jeg er)\b\s*(.*)/i);
      const textToStore = match?.[2]?.trim() ?? message;
      
      const userMemories = this.memories.get(ctx.userId) || [];
      userMemories.push({ text: textToStore, timestamp: Date.now() });
      this.memories.set(ctx.userId, userMemories);
      
      return {
        handled: true,
        response: `Lagret minne: ${textToStore}`,
        shouldContinue: false
      };
    }
    
    if (MEMORY_QUERY_PATTERNS.some(p => p.test(m))) {
      const userMemories = this.memories.get(ctx.userId) || [];
      if (userMemories.length > 0) {
        const items = userMemories.slice(0, 5).map((mm, idx) => `${idx + 1}. ${mm.text}`);
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

  getMemory(channelId: string): any[] {
    return this.memories.get(channelId) || [];
  }

  setMemory(channelId: string, memory: any[]): void {
    this.memories.set(channelId, memory);
  }
}
