import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { logger } from '../../utils/logger.js';
import { ToneService } from '../../services/tone.js';

export class FeaturesHandler implements MessageHandler {
  readonly name = 'features';
  private readonly FEATURES_RESPONSE = [
    'Jeg kan hjelpe deg med litt av hvert! Her er hva jeg kan:',
    '',
    '📅 **Kalender** - spør om "hva skjer" eller "når er X"',
    '💾 **Huske ting for deg** - bare si "husk at..."',
    '📊 **Lage avstemninger** - "finn en tid for møte"',
    '',
    'Vil du vite mer om hvordan jeg er bygget? Spør om "tech stack"! 🤓'
  ].join('\n');

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    const patterns = [
      'hva kan du',
      'hva kan jeg',
      'what can you do',
      'hvilke kommandoer',
      'which commands',
      'features',
      'funksjoner'
    ];
    return patterns.some(p => m.includes(p));
  }

  async handle(_message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const toned = ToneService.apply(this.FEATURES_RESPONSE, ctx.userId);
      await ctx.discord.sendMessage(ctx.channelId, toned);
      return { handled: true };
    } catch (e) {
      logger.error('[Relay] Features error:', { error: e as any });
      return { handled: true, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
