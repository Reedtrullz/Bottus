import { feedbackDb } from '../db/index.js';

export class FeedbackService {
  async store(userId: string, messageId: string, channelId: string, rating: 'positive' | 'negative', comment?: string, botResponseText?: string): Promise<string> {
    return feedbackDb.store(userId, messageId, channelId, rating, comment, botResponseText);
  }

  async getRecent(limit?: number): Promise<any[]> {
    return feedbackDb.getRecent(limit);
  }

  async getByUser(userId: string, limit?: number): Promise<any[]> {
    return feedbackDb.getByUser(userId, limit);
  }

  formatFeedbackList(feedback: any[]): string {
    if (!feedback?.length) return 'Ingen tilbakemeldinger funnet.';
    return feedback.map((f, i) => {
      const emoji = f.rating === 'positive' ? '👍' : '👎';
      const ts = f.created_at ?? f.createdAt ?? f.timestamp ?? 0;
      const date = new Date(ts * 1000).toLocaleDateString('no-NO');
      const comment = f.comment ? `\nKommentar: ${f.comment}` : '';
      const botText = f.bot_response_text ?? f.response_text ?? '';
      const summary = botText.substring(0, 50) || '(ingen tekst)';
      return `${i + 1}. ${emoji} ${date}: ${summary}${comment}`;
    }).join('\n');
  }
}
