import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { v4 as uuid } from 'uuid';
import { Interaction, Critique, createInteractionsDb } from '../../db/interactions-schema.js';
import * as fs from 'fs';
import { logger } from '../../utils/logger.js';

export class FeedbackHandler {
  private db: SqlJsDatabase | null = null;
  private criticPrompt: string;
  private ollamaUrl: string;
  private model: string;
  private initialized: boolean = false;

  constructor(
    _dbPath: string, 
    criticPromptPath: string,
    ollamaUrl: string = 'http://localhost:11434',
    model: string = 'qwen2.5'
  ) {
    this.ollamaUrl = ollamaUrl;
    this.model = model;
    
    if (fs.existsSync(criticPromptPath)) {
      this.criticPrompt = fs.readFileSync(criticPromptPath, 'utf-8');
    } else {
      this.criticPrompt = '';
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const SQL = await initSqlJs();
    this.db = new SQL.Database();
    createInteractionsDb(this.db);
    this.initialized = true;
  }

  async handleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    if (!this.db) await this.initialize();
    
    const feedback = emoji === '👍' ? 'positive' : 'negative';
    
    this.db!.run(`
      UPDATE interactions 
      SET feedback = ?, feedbackComment = ?
      WHERE messageId = ? AND userId = ?
    `, [feedback, `Reaction: ${emoji}`, messageId, userId]);
  }

  async handleFeedbackCommand(
    messageId: string,
    userId: string,
    comment: string
  ): Promise<void> {
    if (!this.db) await this.initialize();
    
    this.db!.run(`
      UPDATE interactions 
      SET feedback = 'negative', feedbackComment = ?
      WHERE messageId = ? AND userId = ?
    `, [comment, messageId, userId]);
  }

  async critiqueResponse(
    interaction: Interaction,
    context: string
  ): Promise<Critique | null> {
    if (!this.criticPrompt) return null;
    
    try {
      const prompt = this.criticPrompt
        .replace('{{BOT_RESPONSE}}', interaction.botResponse)
        .replace('{{USER_MESSAGE}}', interaction.userMessage)
        .replace('{{CONTEXT}}', context);
      
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });

      const data = await response.json() as any;
      const critiqueText = (data?.message?.content ?? '') as string;
      
      let parsed: any = {};
      try {
      const jsonMatch = critiqueText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0] as string;
        parsed = JSON.parse(jsonString);
      }
      } catch (e) {
        logger.error('[CRITIC] Failed to parse critique JSON:', { error: e as any });
      }
      
      const critique: Critique = {
        id: uuid(),
        interactionId: interaction.id,
        critique: parsed.strengths?.join('\n') || critiqueText,
        score: parsed.score || 5,
        suggestions: parsed.suggestions?.join('\n') || '',
        timestamp: Date.now(),
      };
      
      this.db!.run(`
        INSERT INTO critiques (id, interactionId, critique, score, suggestions, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        critique.id, critique.interactionId, critique.critique,
        critique.score, critique.suggestions, critique.timestamp
      ]);
      
      return critique;
    } catch (error) {
      logger.error('[CRITIC] Failed to critique response:', { error: error as any });
      return null;
    }
  }

  async logInteraction(
    messageId: string,
    channelId: string,
    userId: string,
    userMessage: string,
    botResponse: string,
    skillsUsed: string[]
  ): Promise<Interaction> {
    if (!this.db) await this.initialize();
    
    const interaction: Interaction = {
      id: uuid(),
      messageId,
      channelId,
      userId,
      userMessage,
      botResponse,
      skillsUsed: JSON.stringify(skillsUsed),
      timestamp: Date.now(),
      feedback: null,
      feedbackComment: null,
    };
    
    this.db!.run(`
      INSERT INTO interactions 
      (id, messageId, channelId, userId, userMessage, botResponse, skillsUsed, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      interaction.id, interaction.messageId, interaction.channelId,
      interaction.userId, interaction.userMessage, interaction.botResponse,
      interaction.skillsUsed, interaction.timestamp
    ]);
    
    return interaction;
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
