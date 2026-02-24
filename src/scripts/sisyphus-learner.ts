import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { Interaction, Critique, rowToInteraction, rowToCritique } from '../db/interactions-schema.js';

const SISYPHUS_PATH = process.env.SISYPHUS_PATH || './.sisyphus';
const NOTEPADS_PATH = path.join(SISYPHUS_PATH, 'notepads');
const PREFERENCES_FILE = path.join(NOTEPADS_PATH, 'group-preferences.md');

interface LearnedInsight {
  category: 'tone' | 'preferences' | 'skills' | 'prompts';
  insight: string;
  confidence: number;
}

export class SisyphusLearner {
  private db: SqlJsDatabase | null = null;
  private ollamaUrl: string;
  private model: string;
  private batchSize: number;
  private initialized: boolean = false;

  constructor(
    _dbPath: string,
    ollamaUrl: string = 'http://localhost:11434',
    model: string = 'qwen2.5',
    batchSize: number = 50
  ) {
    this.ollamaUrl = ollamaUrl;
    this.model = model;
    this.batchSize = batchSize;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const SQL = await initSqlJs();
    this.db = new SQL.Database();
    this.initialized = true;
  }

  async run(): Promise<LearnedInsight[]> {
    await this.initialize();
    console.log('[SISYPHUS] Starting self-improvement cycle...');

    const interactions = this.getRecentInteractions();
    if (interactions.length === 0) {
      console.log('[SISYPHUS] No new interactions to learn from.');
      return [];
    }

    console.log(`[SISYPHUS] Analyzing ${interactions.length} interactions...`);

    const critiques = this.getCritiquesForInteractions(interactions.map(i => i.id));
    const insights = await this.analyzePatterns(interactions, critiques);

    await this.generateImprovements(insights);

    console.log(`[SISYPHUS] Completed. Generated ${insights.length} insights.`);
    return insights;
  }

  private getRecentInteractions(): Interaction[] {
    if (!this.db) return [];
    
    const results = this.db.exec(`
      SELECT id, messageId, channelId, userId, userMessage, botResponse, skillsUsed, timestamp, feedback, feedbackComment
      FROM interactions 
      ORDER BY timestamp DESC 
      LIMIT ${this.batchSize}
    `);

    if (!results.length || !results[0].values.length) {
      return [];
    }

    return results[0].values.map(rowToInteraction);
  }

  private getCritiquesForInteractions(interactionIds: string[]): Critique[] {
    if (!this.db || interactionIds.length === 0) return [];
    
    const placeholders = interactionIds.map(() => '?').join(',');
    const results = this.db.exec(`
      SELECT id, interactionId, critique, score, suggestions, timestamp
      FROM critiques 
      WHERE interactionId IN (${placeholders})
    `, interactionIds);

    if (!results.length || !results[0].values.length) {
      return [];
    }

    return results[0].values.map(rowToCritique);
  }

  private async analyzePatterns(
    interactions: Interaction[],
    critiques: Critique[]
  ): Promise<LearnedInsight[]> {
    const feedbackStats = {
      positive: interactions.filter(i => i.feedback === 'positive').length,
      negative: interactions.filter(i => i.feedback === 'negative').length,
      neutral: interactions.filter(i => !i.feedback).length,
    };

    const avgScore = critiques.length > 0
      ? critiques.reduce((sum, c) => sum + c.score, 0) / critiques.length
      : 5;

    const analysisPrompt = `You are analyzing a Discord bot's recent interactions to identify patterns and suggest improvements.

## Recent Statistics
- Total interactions: ${interactions.length}
- Positive feedback: ${feedbackStats.positive}
- Negative feedback: ${feedbackStats.negative}
- Average critique score: ${avgScore.toFixed(1)}/10

## Sample Interactions (last 5):
${interactions.slice(0, 5).map((i, idx) => `
${idx + 1}. User: "${i.userMessage}"
   Bot: "${i.botResponse.substring(0, 200)}"
   Feedback: ${i.feedback || 'none'}
`).join('\n')}

## Critique Suggestions:
${critiques.slice(0, 5).map(c => `- ${c.suggestions}`).join('\n') || 'None'}

## Your Task
Analyze these patterns and provide:
1. **Tone adjustments**: How should the bot adapt its tone?
2. **Preference updates**: What does the group prefer/avoid?
3. **Skill improvements**: What skills need refinement?
4. **Prompt suggestions**: What system prompt changes would help?

Output as JSON array of insights:
[{"category": "tone|preferences|skills|prompts", "insight": "...", "confidence": 0.0-1.0}]`;

    try {
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: analysisPrompt }],
          stream: false,
        }),
      });

      const data = await response.json() as any;
      const jsonMatch = data.message?.content?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[SISYPHUS] Analysis failed:', error);
    }

    return [];
  }

  private async generateImprovements(
    insights: LearnedInsight[]
  ): Promise<void> {
    await this.updatePreferences(insights);
    await this.checkSkillProposals(insights);
    await this.proposePromptChanges(insights);
  }

  private async updatePreferences(insights: LearnedInsight[]): Promise<void> {
    const toneInsights = insights.filter(i => i.category === 'tone' && i.confidence > 0.7);
    const prefInsights = insights.filter(i => i.category === 'preferences' && i.confidence > 0.7);

    if (toneInsights.length === 0 && prefInsights.length === 0) return;

    let currentContent = '';
    if (fs.existsSync(PREFERENCES_FILE)) {
      currentContent = fs.readFileSync(PREFERENCES_FILE, 'utf-8');
    }

    const timestamp = new Date().toISOString();
    const updates = [
      '\n## Updated by Sisyphus Learner',
      `**Date:** ${timestamp}`,
      '',
      ...toneInsights.map(i => `- **Tone:** ${i.insight}`),
      ...prefInsights.map(i => `- **Preference:** ${i.insight}`),
    ];

    const newContent = currentContent + '\n' + updates.join('\n');
    fs.writeFileSync(PREFERENCES_FILE, newContent);
    
    console.log(`[SISYPHUS] Updated group preferences.`);
  }

  private async checkSkillProposals(insights: LearnedInsight[]): Promise<void> {
    const skillInsights = insights.filter(i => i.category === 'skills' && i.confidence > 0.8);

    for (const insight of skillInsights) {
      console.log(`[SISYPHUS] Proposed skill: ${insight.insight}`);
      const proposalsPath = path.join(NOTEPADS_PATH, 'skill-proposals.md');
      const proposal = `\n## Proposed Skill\n**Date:** ${new Date().toISOString()}\n\n${insight.insight}\n`;
      
      fs.appendFileSync(proposalsPath, proposal);
    }
  }

  private async proposePromptChanges(insights: LearnedInsight[]): Promise<void> {
    const promptInsights = insights.filter(i => i.category === 'prompts' && i.confidence > 0.8);

    if (promptInsights.length === 0) return;

    const proposalsPath = path.join(NOTEPADS_PATH, 'prompt-improvements.md');
    const proposals = promptInsights.map(i => 
      `## Prompt Update\n**Date:** ${new Date().toISOString()}\n\n${i.insight}`
    ).join('\n\n---\n');

    fs.appendFileSync(proposalsPath, proposals);
    console.log(`[SISYPHUS] Added ${promptInsights.length} prompt improvement proposals.`);
  }
}
