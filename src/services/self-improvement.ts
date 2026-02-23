import { metricsDb, suggestionsDb } from '../db/index.js';
import { OllamaClient } from '../relay/ollama.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:14b';

export interface AnalysisResult {
  summary: string;
  suggestions: Array<{
    category: string;
    description: string;
    effort: string;
  }>;
}

export class SelfImprovementService {
  private ollama: OllamaClient;

  constructor() {
    this.ollama = new OllamaClient(OLLAMA_URL, OLLAMA_MODEL, 60000);
  }

  /**
   * Analyze recent metrics and generate improvement suggestions
   */
  async analyze(limit = 100): Promise<AnalysisResult> {
    const metrics = metricsDb.getRecent(limit);
    const stats = metricsDb.getStats();
    
    if (metrics.length === 0) {
      return {
        summary: 'Ingen metrics tilgjengelig ennå. Boten trenger litt tid til å samle data.',
        suggestions: []
      };
    }
    
    // Build a summary of the metrics for analysis
    const metricsSummary = this.buildMetricsSummary(metrics, stats);
    
    // Use Ollama to analyze and generate suggestions
    const prompt = `Du er en AI-assistent som analyserer Discord-bot performance og foreslår forbedringer.
    
Analyser følgende metrics fra botten:
${metricsSummary}

Basert på dette, identifiser:
1. Eventuelle mønstre i feil eller problemer
2. Respons-tid trender
3. Forbedringsområder

Svar på norsk med et kort sammendrag og konkrete forslag til forbedringer.

Formatér svaret som JSON med feltene:
{
  "summary": "kort sammendrag på norsk",
  "suggestions": [
    {"category": "kategori", "description": "beskrivelse", "effort": "lav/medium/høy"}
  ]
}`;

    try {
      const response = await this.ollama.chat([
        { role: 'user', content: prompt }
      ]);
      
      // Parse JSON from response
      const parsed = JSON.parse(response);
      
      // Store suggestions in database
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        for (const s of parsed.suggestions) {
          suggestionsDb.create({
            category: s.category || 'general',
            description: s.description || '',
            effortEstimate: s.effort || 'medium'
          });
        }
      }
      
      return {
        summary: parsed.summary || 'Analyse fullført.',
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      console.error('[SelfImprovement] Analysis failed:', error);
      return {
        summary: `Analyse feilet: ${error instanceof Error ? error.message : 'ukjent feil'}`,
        suggestions: []
      };
    }
  }
  
  /**
   * Get current bot stats
   */
  getStats() {
    return metricsDb.getStats();
  }
  
  /**
   * Get pending suggestions
   */
  getPendingSuggestions() {
    return suggestionsDb.getPending();
  }
  
  /**
   * Approve a suggestion
   */
  approveSuggestion(id: string, approvedBy: string) {
    suggestionsDb.approve(id, approvedBy);
  }
  
  /**
   * Reject a suggestion
   */
  rejectSuggestion(id: string) {
    suggestionsDb.reject(id);
  }
  
  /**
   * Mark suggestion as applied
   */
  markApplied(id: string) {
    suggestionsDb.markApplied(id);
  }
  
  /**
   * Get suggestion history
   */
  getHistory(limit = 50) {
    return suggestionsDb.getHistory(limit);
  }
  
  private buildMetricsSummary(metrics: any[], stats: any): string {
    const lines = [
      `Totalt antall requests: ${stats.total}`,
      `Gjennomsnittlig respons-tid: ${Math.round(stats.avgResponseTime)}ms`,
      `Feil-rate: ${Math.round((stats.errorRate || 0) * 100)}%`,
      '',
      'Siste metrics (siste 10):'
    ];
    
    for (const m of metrics.slice(0, 10)) {
      const time = new Date((m.created_at || 0) * 1000).toLocaleString('nb-NO');
      const errors = m.error_count || 0;
      const responseTime = m.response_time_ms || 0;
      lines.push(`- ${time}: ${responseTime}ms, ${errors} feil`);
    }
    
    return lines.join('\n');
  }
}

export const selfImprovement = new SelfImprovementService();
