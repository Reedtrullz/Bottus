import type { Skill, HandlerContext, SkillResponse } from './interfaces.js';

export class ExtractionSkill implements Skill {
  readonly name = 'extraction';
  readonly description = 'Extract dates, events, and tasks from messages';

  private memories: Map<string, any> = new Map();

  canHandle(message: string, ctx: HandlerContext): boolean {
    // Only handle if extraction service is available and message has potential dates/events
    if (!ctx.extraction || typeof ctx.extraction.extract !== 'function') {
      return false;
    }
    // Look for potential date/event patterns
    const datePatterns = /\d{1,2}[\/.\-]\d{1,2}|\d{4}|januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember|mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag|kl\s*\d/i;
    return datePatterns.test(message);
  }

  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    if (ctx.extraction && typeof ctx.extraction.extract === 'function') {
      try {
        const result = ctx.extraction.extract(message);
        if (result && result.length > 0) {
          const snippets = result.map((item: any) => 
            `${item.type}: ${item.title} (${Math.round(item.confidence * 100)}%)`
          ).join(', ');
          return {
            handled: true,
            response: `Extracted: ${snippets}`,
            shouldContinue: true
          };
        }
      } catch (e) {
        return {
          handled: true,
          response: `Extraction error: ${e}`,
          shouldContinue: true
        };
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
