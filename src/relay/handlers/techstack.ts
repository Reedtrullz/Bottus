import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { logger } from '../../utils/logger.js';

export class TechStackHandler implements MessageHandler {
  readonly name = 'techstack';

  private readonly TECHSTACK_RESPONSE = [
    'Ah, du vil vite hvordan jeg fungerer? 😊',
    '',
    'Jeg er bygget med **TypeScript** og kjører på **Node.js**.',
    'For Discord bruker jeg **Eris** og en selfbot-ting for å kunne lese gruppechatter.',
    '',
    'Den "hjernen" min er **Ollama** med mistral:7b-instruct modellen - den er ganske flink til norsk!',
    'Alt lagres lokalt i **SQLite**, så ingen data forlater maskinen din.',
    '',
    'Hele greia kjører i **Docker** konteinere for å holde det ryddig. 🐳'
  ].join('\n');

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    const patterns = [
      'tech stack',
      'teknologi',
      'teknologistack',
      'hva kjører du på',
      'what technology',
      'which libraries',
      'which tech',
      'hvilke biblioteker'
    ];
    return patterns.some(p => m.includes(p));
  }

  async handle(_message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      await ctx.discord.sendMessage(ctx.channelId, this.TECHSTACK_RESPONSE);
      return { handled: true };
    } catch (e) {
      logger.error('[Relay] Tech stack error:', { error: (e as any) });
      return { handled: true, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
