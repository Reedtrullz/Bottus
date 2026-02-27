import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { toneDb } from '../../db/index.js';

export class ToneHandler implements MessageHandler {
  readonly name = 'tone';

  private toneDb: typeof toneDb;

  constructor() {
    this.toneDb = toneDb;
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    return m.startsWith('tone set') || m.startsWith('tone-set');
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    const tokens = message.split(/\s+/).slice(2);
    let language = 'nb-NO';
    tokens.forEach((t: string) => {
      if (t.startsWith('en')) language = 'en-US';
    });

    try {
      this.toneDb?.setTone?.(ctx.userId, 'friendly_nb', language);
      await ctx.discord.sendMessage(ctx.channelId, `Tone oppdatert: ${language}`);
      return { handled: true };
    } catch {
      await ctx.discord.sendMessage(ctx.channelId, `Kunne ikke oppdatere tone for deg.`);
      return { handled: true };
    }
  }
}
