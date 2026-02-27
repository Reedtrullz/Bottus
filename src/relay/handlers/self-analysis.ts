import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { isSelfAnalysisQuery } from '../utils/detectors.js';
import { SelfImprovementService } from '../../services/self-improvement.js';
import { t } from '../../utils/i18n.js';
import { logger } from '../utils/logger.js';

export class SelfAnalysisHandler implements MessageHandler {
  readonly name = 'selfAnalysis';

  private selfImprovement: SelfImprovementService;

  constructor(selfImprovement: SelfImprovementService) {
    this.selfImprovement = selfImprovement;
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    return isSelfAnalysisQuery(message);
  }

  async handle(_message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      await ctx.discord.sendMessage(ctx.channelId, t('selfAnalysis.start'));
      const result = await this.selfImprovement.analyze(50);
      const stats = this.selfImprovement.getStats();
      const lines = [
        `📊 **Analyseresultater**`,
        '',
        `Totalt: ${stats.total} requests`,
        `Gj.snitt respons-tid: ${Math.round(Number(stats.avgResponseTime))}ms`,
        `Feil-rate: ${Math.round((stats.errorRate || 0) * 100)}%`,
        '',
        result.summary,
        ''
      ];
      if (result.suggestions.length > 0) {
        lines.push('💡 **Forslag til forbedringer:**');
        for (const s of result.suggestions.slice(0, 3)) {
          lines.push(`- [${s.category}] ${s.description} (${s.effort})`);
        }
      }
      await ctx.discord.sendMessage(ctx.channelId, lines.join('\n'));
      return { handled: true };
    } catch (err) {
      logger.error('[Relay] Self-analysis error:', { error: err as any });
      await ctx.discord.sendMessage(ctx.channelId, t('selfAnalysis.error'));
      return { handled: true, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
