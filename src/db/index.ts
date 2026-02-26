import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

let db: SqlJsDatabase;

const DB_PATH = './data/bot.db';

export async function initializeDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  db.run(`
    CREATE TABLE IF NOT EXISTS consents (
      user_id TEXT PRIMARY KEY,
      guild_id TEXT,
      channel_id TEXT,
      status TEXT DEFAULT 'pending',
      opted_in_at INTEGER,
      revoked_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message_id TEXT,
      channel_id TEXT,
      rating TEXT NOT NULL CHECK(rating IN ('positive', 'negative')),
      comment TEXT,
      bot_response_text TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      guild_id TEXT,
      channel_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      calendar_event_id TEXT,
      recurrence_rule TEXT,
      source_message_id TEXT,
      confirmation_message_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      ttl INTEGER DEFAULT 3600
    )
  `);

  // RSVP tracking for events
  db.run(`
    CREATE TABLE IF NOT EXISTS event_rsvps (
      event_id TEXT,
      user_id TEXT,
      status TEXT,
      PRIMARY KEY (event_id, user_id)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      guild_id TEXT,
      channel_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      due_time INTEGER,
      completed INTEGER DEFAULT 0,
      source_message_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      ttl INTEGER DEFAULT 3600
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS tone_profiles (
      user_id TEXT PRIMARY KEY,
      guild_id TEXT,
      tone_score REAL DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      last_updated INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      guild_id TEXT,
      proposer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      approvals TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      applied_at INTEGER,
      type TEXT DEFAULT 'feature',
      patch_content TEXT,
      test_results TEXT,
      github_pr_url TEXT,
      github_branch TEXT,
      approver_id TEXT,
      rejected_by TEXT,
      rejected_reason TEXT,
      updated_at INTEGER
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS google_tokens (
      user_id TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      fact TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // User timezone preferences
  db.run(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      timezone TEXT NOT NULL DEFAULT 'Europe/Oslo',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  // Channel user roles (RBAC)
  db.run(`
    CREATE TABLE IF NOT EXISTS channel_user_roles (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      assigned_by TEXT,
      assigned_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(channel_id, user_id)
    )
  `);

  // Per-user tone settings (NB default). If not set, default tone used by app logic.
  // Per-user tone settings (NB default). If not set, default tone used by app logic.
  db.run(`
    CREATE TABLE IF NOT EXISTS user_tone (
      user_id TEXT PRIMARY KEY,
      language TEXT DEFAULT 'nb-NO',
      tone TEXT DEFAULT 'friendly_nb',
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Metrics tracking for self-improvement
  db.run(`
    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      response_time_ms INTEGER,
      error_count INTEGER DEFAULT 0,
      feedback_score TEXT,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      model TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Improvement suggestions storage
  db.run(`
    CREATE TABLE IF NOT EXISTS improvement_suggestions (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      effort_estimate TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      approved_at INTEGER,
      approved_by TEXT,
      applied_at INTEGER
    )
  `);


  saveDb();
}

function saveDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, db.export());
}

function queryOne(sql: string, params: any[] = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function queryAll(sql: string, params: any[] = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql: string, params: any[] = []) {
  db.run(sql, params);
  saveDb();
  return { changes: db.getRowsModified() };
}

export const consentDb = {
  findByUserId: (userId: string) => queryOne('SELECT * FROM consents WHERE user_id = ?', [userId]),
  
  create: (userId: string, guildId?: string, channelId?: string) => {
    run('INSERT INTO consents (user_id, guild_id, channel_id, status, opted_in_at) VALUES (?, ?, ?, ?, ?)',
      [userId, guildId || null, channelId || null, 'consented', Math.floor(Date.now() / 1000)]);
  },
  
  revoke: (userId: string) => {
    run("UPDATE consents SET status = 'revoked', revoked_at = ? WHERE user_id = ?", 
      [Math.floor(Date.now() / 1000), userId]);
  },
  
  getConsentedUsers: () => queryAll("SELECT * FROM consents WHERE status = 'consented'")
};

export const eventDb = {
  create: (event: {
    id?: string;
    userId: string;
    guildId?: string;
    channelId?: string;
    title: string;
    description?: string;
    startTime: number;
    endTime?: number;
    calendarEventId?: string;
    sourceMessageId?: string;
    ttl?: number;
    recurrenceRule?: string;
  }) => {
    const id = event.id || uuidv4();
    run(`INSERT INTO events (id, user_id, guild_id, channel_id, title, description, start_time, end_time, calendar_event_id, recurrence_rule, source_message_id, ttl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, event.userId, event.guildId || null, event.channelId || null, event.title, event.description || null,
       event.startTime, event.endTime || null, event.calendarEventId || null, event.recurrenceRule || null, event.sourceMessageId || null, event.ttl || 3600]);
    return id;
  },
  
  findUpcoming: (limit = 10) => {
    const now = Math.floor(Date.now() / 1000);
    return queryAll('SELECT * FROM events WHERE start_time > ? ORDER BY start_time ASC LIMIT ?', [now, limit]);
  },
  
  findByUserId: (userId: string) => queryAll('SELECT * FROM events WHERE user_id = ? ORDER BY start_time ASC', [userId]),

  // Search events by title (exact match first, then partial matches)
  searchByTitle: (userId: string, titleQuery: string) => {
    if (!titleQuery) return [] as any[];
    // Try exact match (case-insensitive)
    const exact = queryOne('SELECT * FROM events WHERE user_id = ? AND LOWER(title) = LOWER(?)', [userId, titleQuery]);
    if (exact) return [exact];
    // Fallback to partial matches
    return queryAll('SELECT * FROM events WHERE user_id = ? AND LOWER(title) LIKE LOWER(?)', [userId, `%${titleQuery}%`]);
  },
  
  delete: (id: string) => run('DELETE FROM events WHERE id = ?', [id]),
  
  deleteExpired: () => {
    const now = Math.floor(Date.now() / 1000);
    return run('DELETE FROM events WHERE ttl > 0 AND created_at + ttl < ?', [now]);
  }
};

export const toneDb = {
  getTone: (userId: string) => queryOne('SELECT tone, language FROM user_tone WHERE user_id = ?', [userId]),
  setTone: (userId: string, tone: string, language?: string) => {
    run('INSERT OR REPLACE INTO user_tone (user_id, tone, language) VALUES (?, ?, ?)', [userId, tone, language ?? 'nb-NO']);
  }
};

// Channel user roles (RBAC)
export const roleDb = {
  getUserRole: (channelId: string, userId: string) => {
    const row = queryOne('SELECT role FROM channel_user_roles WHERE channel_id = ? AND user_id = ?', [channelId, userId]);
    return row?.role || 'member';
  },
  
  setUserRole: (channelId: string, userId: string, role: string, assignedBy?: string) => {
    const id = uuidv4();
    run('INSERT OR REPLACE INTO channel_user_roles (id, channel_id, user_id, role, assigned_by, assigned_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, channelId, userId, role, assignedBy || null, Math.floor(Date.now() / 1000)]);
  },
  
  removeUserRole: (channelId: string, userId: string) => {
    run('DELETE FROM channel_user_roles WHERE channel_id = ? AND user_id = ?', [channelId, userId]);
  },
  
  getChannelRoles: (channelId: string) => {
    return queryAll('SELECT * FROM channel_user_roles WHERE channel_id = ?', [channelId]);
  },
  
  getUserChannels: (userId: string) => {
    return queryAll('SELECT * FROM channel_user_roles WHERE user_id = ?', [userId]);
  }
};
// RSVP storage for events
export const rsvpDb = {
  upsert: (eventId: string, userId: string, status: string) => {
    const existing = queryOne('SELECT * FROM event_rsvps WHERE event_id = ? AND user_id = ?', [eventId, userId]);
    if (existing) {
      run('UPDATE event_rsvps SET status = ? WHERE event_id = ? AND user_id = ?', [status, eventId, userId]);
    } else {
      run('INSERT INTO event_rsvps (event_id, user_id, status) VALUES (?, ?, ?)', [eventId, userId, status]);
    }
  },
  findForEvent: (eventId: string) => queryAll('SELECT * FROM event_rsvps WHERE event_id = ?', [eventId]),
  remove: (eventId: string, userId: string) => run('DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?', [eventId, userId]),
  countForEvent: (eventId: string, status?: string) => {
    const sql = status
      ? 'SELECT COUNT(*) as count FROM event_rsvps WHERE event_id = ? AND status = ?'
      : 'SELECT COUNT(*) as count FROM event_rsvps WHERE event_id = ?';
    const rows = queryAll(sql, status ? [eventId, status] : [eventId]);
    const c = rows[0]?.count ?? 0;
    return Number(c);
  }
};

export const taskDb = {
  create: (task: {
    id?: string;
    userId: string;
    guildId?: string;
    channelId?: string;
    title: string;
    description?: string;
    dueTime?: number;
    sourceMessageId?: string;
    ttl?: number;
  }) => {
    const id = task.id || uuidv4();
    run(`INSERT INTO tasks (id, user_id, guild_id, channel_id, title, description, due_time, source_message_id, ttl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, task.userId, task.guildId || null, task.channelId || null, task.title, task.description || null,
       task.dueTime || null, task.sourceMessageId || null, task.ttl || 3600]);
    return id;
  },
  
  findPending: () => queryAll('SELECT * FROM tasks WHERE completed = 0 ORDER BY due_time ASC'),
  
  complete: (id: string) => run('UPDATE tasks SET completed = 1 WHERE id = ?', [id]),
  
  deleteExpired: () => {
    const now = Math.floor(Date.now() / 1000);
    return run('DELETE FROM tasks WHERE ttl > 0 AND completed = 1 AND created_at + ttl < ?', [now]);
  }
};

export const toneProfileDb = {
  upsert: (userId: string, guildId: string | undefined, toneScore: number) => {
    const existing = queryOne('SELECT * FROM tone_profiles WHERE user_id = ?', [userId]);
    if (existing) {
      run('UPDATE tone_profiles SET tone_score = tone_score + ?, message_count = message_count + 1, last_updated = ? WHERE user_id = ?',
        [toneScore, Math.floor(Date.now() / 1000), userId]);
    } else {
      run('INSERT INTO tone_profiles (user_id, guild_id, tone_score, message_count, last_updated) VALUES (?, ?, ?, 1, ?)',
        [userId, guildId || null, toneScore, Math.floor(Date.now() / 1000)]);
    }
  },
  
  get: (userId: string) => queryOne('SELECT * FROM tone_profiles WHERE user_id = ?', [userId])
};

export const proposalDb = {
  create: (proposal: {
    id?: string;
    guildId?: string;
    proposerId: string;
    title: string;
    description?: string;
  }) => {
    const id = proposal.id || uuidv4();
    run('INSERT INTO proposals (id, guild_id, proposer_id, title, description, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, proposal.guildId || null, proposal.proposerId, proposal.title, proposal.description || null, 'pending']);
    return id;
  },
  update: (id: string, updates: Partial<{title: string, description: string, status: string, patchContent: string, testResults: string, githubPrUrl: string, githubBranch: string, approverId: string, rejectedBy: string, rejectedReason: string}>) => {
    if (!updates || Object.keys(updates).length === 0) return false;
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    // Map camelCase input to snake_case DB columns
    if (updates.patchContent !== undefined) { fields.push('patch_content = ?'); values.push(updates.patchContent); }
    if (updates.testResults !== undefined) { fields.push('test_results = ?'); values.push(updates.testResults); }
    if (updates.githubPrUrl !== undefined) { fields.push('github_pr_url = ?'); values.push(updates.githubPrUrl); }
    if (updates.githubBranch !== undefined) { fields.push('github_branch = ?'); values.push(updates.githubBranch); }
    if (updates.approverId !== undefined) { fields.push('approver_id = ?'); values.push(updates.approverId); }
    if (updates.rejectedBy !== undefined) { fields.push('rejected_by = ?'); values.push(updates.rejectedBy); }
    if (updates.rejectedReason !== undefined) { fields.push('rejected_reason = ?'); values.push(updates.rejectedReason); }

    if (fields.length === 0) return false;

    const sql = `UPDATE proposals SET ${fields.join(', ')} WHERE id = ?`;
    run(sql, [...values, id]);
    return true;
  },
  
  addApproval: (id: string, approverId: string) => {
    const proposal = queryOne('SELECT * FROM proposals WHERE id = ?', [id]);
    if (!proposal) return false;
    
    const approvals = JSON.parse((proposal.approvals as string) || '[]');
    if (approvals.includes(approverId)) return false;
    
    approvals.push(approverId);
    const newStatus = approvals.length >= 2 ? 'approved' : 'pending';
    
    run('UPDATE proposals SET approvals = ?, status = ? WHERE id = ?', [JSON.stringify(approvals), newStatus, id]);
    return true;
  },
  
  findPending: () => queryAll("SELECT * FROM proposals WHERE status = 'pending'"),
  
  apply: (id: string) => run("UPDATE proposals SET status = 'applied', applied_at = ? WHERE id = ?", [Math.floor(Date.now() / 1000), id])
};

export const tokenDb = {
  save: (userId: string, tokens: { accessToken: string; refreshToken: string; expiresAt: number }) => {
    const existing = queryOne('SELECT * FROM google_tokens WHERE user_id = ?', [userId]);
    if (existing) {
      run('UPDATE google_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ? WHERE user_id = ?',
        [tokens.accessToken, tokens.refreshToken, tokens.expiresAt, Math.floor(Date.now() / 1000), userId]);
    } else {
      run('INSERT INTO google_tokens (user_id, access_token, refresh_token, expires_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [userId, tokens.accessToken, tokens.refreshToken, tokens.expiresAt, Math.floor(Date.now() / 1000)]);
    }
  },
  
  get: (userId: string) => queryOne('SELECT * FROM google_tokens WHERE user_id = ?', [userId])
};

export const memoryDb = {
  store: (userId: string, fact: string) => {
    const huskPattern = /(?:^|\s)(husk|husk at|husk jeg er)\b/i;
    let stored = fact;
    if (huskPattern.test(fact)) {
      stored = `Påminnelse: ${fact}`;
    }
    const id = uuidv4();
    run('INSERT INTO memories (id, user_id, fact, created_at) VALUES (?, ?, ?, ?)',
      [id, userId, stored, Math.floor(Date.now() / 1000)]);
    return id;
  },
  recall: (userId: string) => {
    return queryAll('SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  },
  search: (userId: string, queryStr: string) => {
    const q = `%${queryStr}%`;
    return queryAll('SELECT * FROM memories WHERE user_id = ? AND fact LIKE ? ORDER BY created_at DESC', [userId, q]);
  },
  delete: (id: string) => {
    run('DELETE FROM memories WHERE id = ?', [id]);
  }
};

export const feedbackDb = {
  store: (userId: string, messageId: string | undefined, channelId: string | undefined, rating: string, comment?: string, botResponseText?: string) => {
    const id = uuidv4();
    run('INSERT INTO feedback (id, user_id, message_id, channel_id, rating, comment, bot_response_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, messageId ?? null, channelId ?? null, rating, comment ?? null, botResponseText ?? null, Math.floor(Date.now() / 1000)]);
    return id;
  },
  getRecent: (limit?: number) => queryAll('SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?', [limit ?? 10]),
  getByUser: (userId: string, limit?: number) => queryAll('SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit ?? 10])
};
export const preferenceDb = {
  setTimezone: (userId: string, timezone: string) => {
    const existing = queryOne('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
    const now = Math.floor(Date.now() / 1000);
    if (existing) {
      run('UPDATE user_preferences SET timezone = ?, updated_at = ? WHERE user_id = ?', [timezone, now, userId]);
    } else {
      run('INSERT INTO user_preferences (id, user_id, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), userId, timezone, now, now]);
    }
  },
  getTimezone: (userId: string) => {
    const row = queryOne('SELECT timezone FROM user_preferences WHERE user_id = ?', [userId]);
    if (row && (row as any).timezone) return (row as any).timezone;
    return 'Europe/Oslo';
  }
};

export { db };

// Metrics tracking for self-improvement
export const metricsDb = {
  record: (entry: {
    userId?: string;
    responseTimeMs: number;
    errorCount?: number;
    feedbackScore?: string;
    promptTokens?: number;
    completionTokens?: number;
    model?: string;
  }) => {
    const id = uuidv4();
    run(`INSERT INTO metrics (id, user_id, response_time_ms, error_count, feedback_score, prompt_tokens, completion_tokens, model, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, entry.userId ?? null, entry.responseTimeMs, entry.errorCount ?? 0, entry.feedbackScore ?? null, 
       entry.promptTokens ?? null, entry.completionTokens ?? null, entry.model ?? null, Math.floor(Date.now() / 1000)]);
    return id;
  },
  
  getRecent: (limit = 100) => queryAll('SELECT * FROM metrics ORDER BY created_at DESC LIMIT ?', [limit]),
  
  getByUser: (userId: string, limit = 50) => queryAll('SELECT * FROM metrics WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]),
  
  getStats: () => {
    const total = queryOne('SELECT COUNT(*) as count FROM metrics');
    const avgResponseTime = queryOne('SELECT AVG(response_time_ms) as avg FROM metrics');
    const errorRate = queryOne('SELECT SUM(error_count) as errors, COUNT(*) as total FROM metrics');
    const byModel = queryAll('SELECT model, COUNT(*) as count, AVG(response_time_ms) as avg_time FROM metrics GROUP BY model');
    return {
      total: Number(total?.count) || 0,
      avgResponseTime: Number(avgResponseTime?.avg) || 0,
      errorRate: (() => { const t = Number(errorRate?.total) || 0; const e = Number(errorRate?.errors) || 0; return t > 0 ? e / t : 0; })(),
      byModel
    };
  },
  
  getTimeRange: (startTime: number, endTime: number) => 
    queryAll('SELECT * FROM metrics WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC', [startTime, endTime])
};

// Improvement suggestions storage
export const suggestionsDb = {
  create: (suggestion: {
    category: string;
    description: string;
    effortEstimate?: string;
  }) => {
    const id = uuidv4();
    run(`INSERT INTO improvement_suggestions (id, category, description, effort_estimate, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)`,
      [id, suggestion.category, suggestion.description, suggestion.effortEstimate ?? null, Math.floor(Date.now() / 1000)]);
    return id;
  },
  
  getPending: () => queryAll("SELECT * FROM improvement_suggestions WHERE status = 'pending' ORDER BY created_at DESC"),
  
  approve: (id: string, approvedBy: string) => {
    run("UPDATE improvement_suggestions SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ?",
      [Math.floor(Date.now() / 1000), approvedBy, id]);
  },
  
  reject: (id: string) => {
    run("UPDATE improvement_suggestions SET status = 'rejected' WHERE id = ?", [id]);
  },
  
  markApplied: (id: string) => {
    run("UPDATE improvement_suggestions SET status = 'applied', applied_at = ? WHERE id = ?",
      [Math.floor(Date.now() / 1000), id]);
  },
  
  getHistory: (limit = 50) => queryAll('SELECT * FROM improvement_suggestions ORDER BY created_at DESC LIMIT ?', [limit])
};
