import type { Skill, HandlerContext, SkillResponse, MemoryItem } from './interfaces.js';
import { MemoryService } from '../../services/memory.js';
import { pendingClarifications } from './clarification-state.js';

const MEMORY_STORE_PATTERNS = [
  /\b(husk|husk at|husk jeg er)\b/i
];

const MEMORY_QUERY_PATTERNS = [
  /\b(hva husker du|husker du)\b/i
];

const DATE_PATTERNS = [
  'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag',
  'i dag', 'i morgen', 'imorgen', 'neste uke',
  'kl ', 'klokken', 'tidspunkt',
  'dato', 'januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'
];

export class MemorySkill implements Skill {
  readonly name = 'memory';
  readonly description = 'Store and recall user memories';

  private memoryService: MemoryService;

  constructor() {
    this.memoryService = new MemoryService();
  }

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
      
      const hasDatePattern = DATE_PATTERNS.some(p => textToStore.toLowerCase().includes(p));
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
    
    if (MEMORY_QUERY_PATTERNS.some(p => p.test(m))) {
      const memories = await this.memoryService.recall(ctx.userId);
      if (memories.length > 0) {
        const items = memories.slice(0, 5).map((mm: MemoryItem, idx: number) => `${idx + 1}. ${mm.fact}`);
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

  async getMemory(userId: string): Promise<unknown[]> {
    return this.memoryService.recall(userId);
  }

  async setMemory(userId: string, fact: string): Promise<void> {
    await this.memoryService.store(userId, fact);
  }
}
