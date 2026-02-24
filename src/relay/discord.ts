
import { Client } from 'discord.js-selfbot-v13';

interface MessageHistory {
  content: string;
  author: string;
  timestamp: number;
}

export class DiscordRelay {
  private client: any;
  private userId: string = '';
  private username: string = '';
  private history: Map<string, MessageHistory[]> = new Map();
  private maxHistory: number;
  private token: string;
  private mentionCallback: ((msg: any) => Promise<void>) | null = null;

  constructor(token: string, maxHistory: number = 5) {
    this.token = token;
    this.maxHistory = maxHistory;
    this.client = new Client();

    this.client.on('error', (err: Error) => {
      console.error('[Discord] Client error:', err.message);
    });

    this.client.on('disconnect', () => {
      console.log('[Discord] Client disconnected');
    });

    this.client.on('ready', () => {
      // Safely capture user details when ready
      const u = (this.client as any).user;
      this.userId = u?.id ?? '';
      this.username = u?.username ?? '';
      const disc = u?.discriminator ?? '';
      console.log(`[Discord] Logged in as ${this.username}#${disc} (ID: ${this.userId})`);
    });

    this.client.on('message', async (msg: any) => {
      if (msg.author.bot) return;
      if (!this.isDeletableChannel(msg)) return;

      const channelId = msg.channel.id;
      const content = msg.content || '';
      const author = msg.author.username;
      const isDM = this.isDM(msg);

      this.addToHistory(channelId, { content, author, timestamp: Date.now() });

      if (this.isMentioned(content) || (isDM && content.length > 0)) {
        console.log(`[Discord] ${isDM ? 'DM' : 'Group DM'} from ${author}: ${content.substring(0, 50)}...`);
        if (this.mentionCallback) {
          await this.mentionCallback(msg);
        }
      }
    });
  }

  private isDeletableChannel(msg: any): boolean {
    return msg.guild === null;
  }

  private isDM(msg: any): boolean {
    return msg.channel.recipients !== undefined && msg.channel.type === 1;
  }


  private isMentioned(content: string): boolean {
    if (!this.userId) return false;
    const mentionPattern = new RegExp(`<@!?${this.userId}>|@${this.username}`, 'i');
    return mentionPattern.test(content);
  }

  private addToHistory(channelId: string, message: MessageHistory): void {
    const channelHistory = this.history.get(channelId) || [];
    channelHistory.push(message);
    if (channelHistory.length > this.maxHistory) {
      channelHistory.shift();
    }
    this.history.set(channelId, channelHistory);
  }

  getHistory(channelId: string): string[] {
    const channelHistory = this.history.get(channelId) || [];
    return channelHistory.map(m => `${m.author}: ${m.content}`);
  }

  clearHistory(channelId: string): void {
    this.history.delete(channelId);
  }

  // Send a DM to a user by their username
  async sendDMToUser(username: string, content: string): Promise<boolean> {
    try {
      // First try to find user in cache
      let user = this.client.users.cache.find((u: any) => 
        u.username?.toLowerCase() === username.toLowerCase() ||
        u.username === username
      );
      
      // If not in cache, try to fetch by username
      if (!user) {
        try {
          user = await (this.client.users as any).fetch(username).catch(() => null);
        } catch (e) {
          // Fetch failed, continue to fallback
        }
      }
      
      // Fallback: search cache again by partial match
      if (!user) {
        user = this.client.users.cache.find((u: any) => 
          u.username?.toLowerCase().includes(username.toLowerCase())
        );
      }
      
      if (user) {
        const dmChannel = await user.createDM();
        await dmChannel.send(content);
        console.log(`[Discord] Sent DM to ${username}`);
        return true;
      } else {
        console.warn(`[Discord] User not found: ${username}`);
        return false;
      }
    } catch (err) {
      console.error(`[Discord] Failed to send DM to ${username}:`, err);
      return false;
    }
  }

  async sendMessage(channelId: string, content: string, options?: { embed?: any, components?: any[], file?: string }): Promise<any> {
    const channel = this.client.channels.cache.get(channelId);
    if (channel) {
      const chanAny: any = channel as any;
      const payload: any = { content };
      
      // Attach file if provided
      if (options?.file) {
        payload.file = options.file;
      }
      if (options?.embed) {
        payload.embed = options.embed;
      }
      if (options?.components) {
        payload.components = options.components;
      }
      
      const sent = await chanAny.send(payload);
      console.log(`[Discord] Sent message to channel ${channelId}${options?.file ? ' with file' : ''}`);
      return sent;
    }
  }

  async login(): Promise<void> {
    console.log('[Discord] Attempting login...');
    try {
      await this.client.login(this.token);
      console.log('[Discord] Login successful');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Discord] Login failed: ${errMsg}`);
      throw error;
    }
  }

  onMention(callback: (msg: any) => Promise<void>): void {
    this.mentionCallback = callback;
  }

  getClient(): any {
    return this.client;
  }

  getUserId(): string {
    return this.userId;
  }

  disconnect(): void {
    this.client.destroy();
  }
}

export function handleDiscordMessage(_msg: any): void {
  // no-op handler for tests
}

export function handleMessage(_msg: any): void {
  // no-op generic message handler for tests
}
