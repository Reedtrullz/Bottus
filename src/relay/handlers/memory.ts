import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { isMemoryStore, isMemoryQuery } from '../utils/detectors.js';
import { MemoryService } from '../../services/memory.js';
import { ToneService } from '../../services/tone.js';
import { logger } from '../../utils/logger.js';

const datePatterns = [
  'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag',
  'i dag', 'i morgen', 'imorgen', 'neste uke',
  'kl ', 'klokken', 'tidspunkt',
  'dato', 'januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'
];

export class MemoryHandler implements MessageHandler {
  readonly name = 'memory';

  private memory: MemoryService;
  private pendingClarifications: Map<string, { text: string; timestamp: number }>;

  constructor(memory: MemoryService, pendingClarifications: Map<string, { text: string; timestamp: number }>) {
    this.memory = memory;
    this.pendingClarifications = pendingClarifications;
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    return isMemoryStore(message) || isMemoryQuery(message);
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      if (isMemoryStore(message)) {
        const m = message.match(/(?:^|\s)(husk|husk at|husk jeg er)\b\s*(.*)/i);
        const textToStore = m?.[2]?.trim() ?? message;
        
        const hasDatePattern = datePatterns.some(p => textToStore.toLowerCase().includes(p));
        const hasTimePattern = /\d{1,2}:\d{2}/.test(textToStore);
        
        if (hasDatePattern || hasTimePattern) {
          this.pendingClarifications.set(ctx.channelId, { text: textToStore, timestamp: Date.now() });
          await ctx.discord.sendMessage(ctx.channelId,
            'Jeg ser at dette kan være en avtale eller et minne. Vil du:\n' +
            '• 🗓️ **Opprett som kalenderhendelse**\n' +
            '• 💾 **Lagre som et minne**\n\n' +
            'Svar med "avtale" eller "minne", så ordner jeg det!'
          );
          return { handled: true };
        }
        
        await this.memory.store(ctx.userId, textToStore);
        const memoryMsg = `Lagret minne: ${textToStore}`;
        const tonedMemory = ToneService.apply(memoryMsg, ctx.userId);
        await ctx.discord.sendMessage(ctx.channelId, tonedMemory);
        return { handled: true };
      }
      if (isMemoryQuery(message)) {
        const mems: any[] = await this.memory.recall(ctx.userId);
        if (Array.isArray(mems) && mems.length > 0) {
          const items = mems.slice(0, 5).map((mm: any, idx: number) => `${idx + 1}. ${mm?.fact ?? ''}`);
          await ctx.discord.sendMessage(ctx.channelId, `Husker jeg:\n${items.join('\n')}`);
        } else {
          await ctx.discord.sendMessage(ctx.channelId, 'Ingen minner funnet.');
        }
        return { handled: true };
      }
    } catch (e) {
      logger.error('[Relay] Memory handling error:', { error: (e as Error)?.message ?? e });
      return { handled: true, error: e instanceof Error ? e.message : String(e) };
    }
    return { handled: false };
  }
}

export class ClarificationHandler implements MessageHandler {
  readonly name = 'clarification';

  private memory: MemoryService;
  private pendingClarifications: Map<string, { text: string; timestamp: number }>;

  constructor(memory: MemoryService, pendingClarifications: Map<string, { text: string; timestamp: number }>) {
    this.memory = memory;
    this.pendingClarifications = pendingClarifications;
  }

  canHandle(message: string, ctx: HandlerContext): boolean {
    const pending = this.pendingClarifications.get(ctx.channelId);
    if (!pending) return false;
    const m = message.toLowerCase();
    return m === 'avtale' || m === 'minne' || m === 'avtale!' || m === 'minne!';
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    const pending = this.pendingClarifications.get(ctx.channelId);
    if (!pending) return { handled: false };
    
    this.pendingClarifications.delete(ctx.channelId);
    const m = message.toLowerCase();
    
    if (m.startsWith('avtale')) {
      await ctx.discord.sendMessage(ctx.channelId, `Får ikke opprettet kalenderhendelse ennå. Kan du prøve /kalender kommandoen?`);
    } else {
      await this.memory.store(ctx.userId, pending.text);
      await ctx.discord.sendMessage(ctx.channelId, `Lagret minne: ${pending.text}`);
    }
    return { handled: true };
  }
}
