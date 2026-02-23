import type { Skill, HandlerContext, SkillResponse } from './interfaces.js';
import { ComfyUIClient } from '../../services/comfyui.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
              // Download image to temp file and send to Discord
              const tempFilePath = await this.downloadToTempFile(result.imageUrl);
              if (tempFilePath) {
                await ctx.discord.sendMessage(ctx.channelId, '🎨 Bildet ditt:', { file: tempFilePath });
                // Clean up temp file after sending
                try {
                  fs.unlinkSync(tempFilePath);
                } catch { /* ignore cleanup errors */ }
              } else {
                // Fallback: send URL as text if download fails
                await ctx.discord.sendMessage(ctx.channelId, `🎨 Bildet ditt: ${result.imageUrl}`);
              }
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

  private async downloadToTempFile(imageUrl: string): Promise<string | null> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error(`[ImageSkill] Failed to download image: ${response.status}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate unique temp filename
      const tempDir = os.tmpdir();
      const filename = `inebot_image_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      const tempFilePath = path.join(tempDir, filename);

      fs.writeFileSync(tempFilePath, buffer);
      console.log(`[ImageSkill] Saved image to temp file: ${tempFilePath}`);

      return tempFilePath;
    } catch (error) {
      console.error(`[ImageSkill] Error downloading image:`, error);
      return null;
    }
  }
}
