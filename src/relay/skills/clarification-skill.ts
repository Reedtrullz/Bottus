import type { Skill, HandlerContext, SkillResponse } from './interfaces.js';
import { MemoryService } from '../../services/memory.js';
import { pendingClarifications } from './clarification-state.js';

export class ClarificationSkill implements Skill {
  readonly name = 'clarification';
  readonly description = 'Handles pending clarification responses';

  private memoryService: MemoryService;

  constructor() {
    this.memoryService = new MemoryService();
  }

  canHandle(message: string, ctx: HandlerContext): boolean {
    if (!message) return false;
    const pending = pendingClarifications.get(ctx.channelId);
    if (!pending) return false;
    const m = message.toLowerCase();
    return m === 'avtale' || m === 'minne' || m === 'avtale!' || m === 'minne!';
  }

  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
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
