// Lightweight per-user tone helper (nb-NO default)
import { toneDb } from '../db/index.js';

export class ToneService {
  // Very small stub: simply prefixes text with a friendly nb-NO greeting for readability.
  // In a full implementation, this would look up per-user tone and language preferences.
  static apply(text: string, userId?: string): string {
    if (!text) return text;
    // Basic heuristic: if the text already starts with a greeting, don't prefix redundantly
    const trimmed = text.trim();
    const alreadyGreeted = /^(Hei|Hei there|Hallo|Hi|Hej|Hello|Hei!)/i.test(trimmed);
    // If user context provided, attempt to personalize language. Fallback to nb-NO by default.
    let language = 'nb-NO';
    if (userId) {
      try {
        const toneRow: any = toneDb.getTone(userId);
        if (toneRow?.language) language = toneRow.language;
      } catch {
        // ignore errors and keep default
      }
    }
    if (alreadyGreeted) return text;
    if (language.startsWith('nb')) {
      return `Hei! ${text}`;
    } else {
      return `Hi! ${text}`;
    }
  }
}

export default ToneService;

// ToneLearningService: learns user tone preferences from messages (stub for MVP)
export class ToneLearningService {
  updateTone(userId: string, _guildId: string | undefined, message: string): void {
    // Stub: In a full implementation, this would analyze message sentiment/tone
    // and update the user's tone profile in the database.
    // For now, we just acknowledge the message was processed.
    if (!message || !userId) return;
    // Future: analyze message, call toneProfileDb.upsert() with score
  }
}
