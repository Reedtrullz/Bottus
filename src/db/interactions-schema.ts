import { Database as SqlJsDatabase } from 'sql.js';

export interface Interaction {
  id: string;
  messageId: string;
  channelId: string;
  userId: string;
  userMessage: string;
  botResponse: string;
  skillsUsed: string;
  timestamp: number;
  feedback: string | null;
  feedbackComment: string | null;
}

export interface Critique {
  id: string;
  interactionId: string;
  critique: string;
  score: number;
  suggestions: string;
  timestamp: number;
}

export function createInteractionsDb(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      messageId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      userId TEXT NOT NULL,
      userMessage TEXT NOT NULL,
      botResponse TEXT NOT NULL,
      skillsUsed TEXT DEFAULT '[]',
      timestamp INTEGER NOT NULL,
      feedback TEXT,
      feedbackComment TEXT
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_time ON interactions(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_channel ON interactions(channelId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_feedback ON interactions(feedback)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS critiques (
      id TEXT PRIMARY KEY,
      interactionId TEXT NOT NULL,
      critique TEXT NOT NULL,
      score INTEGER NOT NULL,
      suggestions TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (interactionId) REFERENCES interactions(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_critiques_time ON critiques(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_critiques_interaction ON critiques(interactionId)`);
}

export function rowToInteraction(row: any[]): Interaction {
  return {
    id: row[0],
    messageId: row[1],
    channelId: row[2],
    userId: row[3],
    userMessage: row[4],
    botResponse: row[5],
    skillsUsed: row[6],
    timestamp: row[7],
    feedback: row[8] || null,
    feedbackComment: row[9] || null,
  };
}

export function rowToCritique(row: any[]): Critique {
  return {
    id: row[0],
    interactionId: row[1],
    critique: row[2],
    score: row[3],
    suggestions: row[4] || '',
    timestamp: row[5],
  };
}
