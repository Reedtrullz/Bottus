import initSqlJs, { Database } from 'sql.js';
// Local lightweight interfaces to avoid cross-file export mismatches
export interface MemoryEntry {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: number;
}
export interface MemoryStore {
  init(): Promise<void>;
  get(channelId: string, userId?: string): Promise<MemoryEntry[]>;
  add(channelId: string, userId: string, content: string): Promise<void>;
  clear(channelId: string, userId?: string): Promise<void>;
}
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.GATEWAY_DB || './data/gateway-memory.db';

export class SqlMemoryStore implements MemoryStore {
  private db: Database | null = null;
  private initialized = false;
  
  async init(): Promise<void> {
    if (this.initialized) return;
    
    const SQL = await initSqlJs();
    // Load existing DB or create new
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(data);
    } else {
      this.db = new SQL.Database();
    }
    
    // Create tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
    
    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_channel ON memories(channel_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_user ON memories(user_id)`);
    
    this.initialized = true;
    console.log('[Gateway] Memory store initialized');
  }
  
  private ensureInit(): void {
    if (!this.db || !this.initialized) {
      throw new Error('Memory store not initialized. Call init() first.');
    }
  }
  
  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data as any);
    
    // Ensure directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  }
  
  async get(channelId: string, userId?: string): Promise<MemoryEntry[]> {
    this.ensureInit();
    
    let query = 'SELECT id, channel_id, user_id, content, timestamp FROM memories WHERE channel_id = ?';
    const params: any[] = [channelId];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 50';
    
    const result = this.db!.exec(query, params as any);
    if (!result.length) return [];
    const rows = (result[0] as any).values as any[][];
    if (!rows || rows.length === 0) return [];
    return rows.map((row: any[]) => ({
      id: row[0],
      channelId: row[1],
      userId: row[2],
      content: row[3],
      timestamp: row[4]
    })) as MemoryEntry[];
  }
  
  async add(channelId: string, userId: string, content: string): Promise<void> {
    this.ensureInit();
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();
    this.db!.run(
      'INSERT INTO memories (id, channel_id, user_id, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      [id, channelId, userId, content, timestamp]
    );
    this.save();
  }
  
  async clear(channelId: string, userId?: string): Promise<void> {
    this.ensureInit();
    
    if (userId) {
      this.db!.run('DELETE FROM memories WHERE channel_id = ? AND user_id = ?', [channelId, userId]);
    } else {
      this.db!.run('DELETE FROM memories WHERE channel_id = ?', [channelId]);
    }
    
    this.save();
  }
}
