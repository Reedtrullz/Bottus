import type { Skill, HandlerContext, SkillResponse } from './interfaces.js';
import { ComfyUIClient } from '../../services/comfyui.js';

const IMAGE_PATTERNS = [
  'lag et bilde av',
  'generer et bilde av',
  'tegn',
  'generate image of',
  'lag bilde av',
  'tegn et bilde av'
];

export class ImageSkill implements Skill {
  readonly name = 'image';
  readonly description = 'Generate images using ComfyUI';

  private memories: Map<string, any> = new Map();
  private comfyui: ComfyUIClient = new ComfyUIClient();

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    return IMAGE_PATTERNS.some(p => m.includes(p));
  }

  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    const m = message.toLowerCase();
    for (const pattern of IMAGE_PATTERNS) {
      const idx = m.indexOf(pattern);
      if (idx !== -1) {
        const prompt = message.substring(idx + pattern.length).trim();
        if (prompt && ctx.discord && ctx.channelId) {
          try {
            await ctx.discord.sendMessage(ctx.channelId, '🎨 Genererer bilde...');
            
            // Actually generate the image
            const result = await this.comfyui.generateImage(prompt, ctx.userId);
            
            if (result.success && result.imageUrl) {
              await ctx.discord.sendMessage(ctx.channelId, '🎨 Bildet ditt:', { file: result.imageUrl });
              return {
                handled: true,
                response: `Bilde generert!`,
                shouldContinue: false
              };
            } else {
              return {
                handled: true,
                response: `Bildegenerering feilet: ${result.error}`,
                shouldContinue: false
              };
            }
          } catch (e) {
            return {
              handled: true,
              response: `Bildegenerering feilet: ${e}`,
              shouldContinue: false
            };
          }
        }
      }
    }
    return { handled: false, shouldContinue: true };
  }

  getMemory(channelId: string): any {
    return this.memories.get(channelId);
  }

  setMemory(channelId: string, memory: any): void {
    this.memories.set(channelId, memory);
  }
}
