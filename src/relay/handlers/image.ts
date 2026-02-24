/**
 * Image Generation Handler for Inebotten
 * 
 * Handles ComfyUI-based image generation from natural language prompts.
 */

import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { extractImagePrompt } from '../utils/detectors.js';
import { ComfyUIClient } from '../../services/comfyui.js';
import { logger } from '../../utils/logger.js';

export class ImageHandler implements MessageHandler {
  readonly name = 'image';

  private comfyui: ComfyUIClient | null;

  constructor(comfyui: ComfyUIClient | null) {
    this.comfyui = comfyui;
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message || !this.comfyui) return false;
    const prompt = extractImagePrompt(message);
    return prompt !== null;
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    const prompt = extractImagePrompt(message);
    if (!prompt || !this.comfyui) {
      return { handled: false };
    }

    try {
      const result = await this.comfyui.generateImage(prompt, ctx.userId);
      if (result.success && result.imageUrl) {
        await ctx.discord.sendMessage(ctx.channelId, `${result.imageUrl}`);
        return { handled: true };
      } else {
        logger.warn('[Relay] Image generation failed:', { error: result.error });
        await ctx.discord.sendMessage(
          ctx.channelId,
          'Beklager, bildegenerering feilet: ' + (result.error || 'ukjent feil')
        );
        return { handled: true };
      }
    } catch (err) {
      logger.error('[Relay] ComfyUI image generation failed:', { error: err instanceof Error ? err.message : String(err) });
      return { handled: true, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
