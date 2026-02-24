import { Client } from 'discord.js-selfbot-v13';

// Local gateway types to avoid external type module dependencies
export interface GatewayMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  isDM: boolean;
  isGroupDM: boolean;
  timestamp: number;
  raw: unknown;
}

interface DiscordConnector {
  login(token: string): Promise<void>;
  sendMessage(channelId: string, content: string): Promise<void>;
  sendDM(userId: string, content: string): Promise<void>;
  onMessage(callback: (msg: GatewayMessage) => Promise<void>): void;
  getUserId(): string;
  isConnected(): boolean;
}

export interface GatewayContext {
  message: any;
  discord: DiscordConnector;
  memory: any;
  ollama?: any;
  extraction?: any;
}

export interface GatewayResult {
  handled: boolean;
  response?: string;
  error?: string;
}

export interface OllamaClient {
  chat(prompt: string, context?: Record<string, unknown>): Promise<string>;
  isAvailable(): Promise<boolean>;
}

export interface ExtractionService {
  extract(text: string): Promise<any[]>;
}

export class DiscordGateway implements DiscordConnector {
  private client: Client;
  private userId: string = '';
  private messageCallback?: (msg: GatewayMessage) => Promise<void>;
  
  constructor() {
    this.client = new Client();
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    this.client.on('error', (err: Error) => {
      console.error('[Gateway] Discord error:', err.message);
    });
    
    this.client.on('ready', () => {
      const user = (this.client as any).user;
      this.userId = user?.id ?? '';
      console.log(`[Gateway] Logged in as ${user?.username} (${this.userId})`);
    });
    
    this.client.on('message', async (msg: any) => {
      // Ignore bots
      if (msg.author?.bot) return;
      
      // Only handle DMs and Group DMs
      if (!this.isDM(msg) && !this.isGroupDM(msg)) return;
      
      const message: GatewayMessage = {
        id: msg.id,
        channelId: msg.channel?.id,
        userId: msg.author?.id,
        username: msg.author?.username,
        content: msg.content || '',
        isDM: this.isDM(msg),
        isGroupDM: this.isGroupDM(msg),
        timestamp: msg.createdAt?.getTime() ?? Date.now(),
        raw: msg
      };
      
      if (this.messageCallback) {
        await this.messageCallback(message);
      }
    });
  }
  
  private isDM(msg: any): boolean {
    return msg.channel?.type === 'dm';
  }
  
  private isGroupDM(msg: any): boolean {
    return msg.channel?.type === 'group_dm';
  }
  
  async login(token: string): Promise<void> {
    await this.client.login(token);
  }
  
  async sendMessage(channelId: string, content: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    if (channel) {
      await (channel as any).send(content);
    }
  }
  
  async sendDM(userId: string, content: string): Promise<void> {
    const user = await this.client.users.fetch(userId);
    if (user) {
      await (user as any).send(content);
    }
  }
  
  onMessage(callback: (msg: GatewayMessage) => Promise<void>): void {
    this.messageCallback = callback;
  }
  
  getUserId(): string {
    return this.userId;
  }
  
  isConnected(): boolean {
    // discord.js-selfbot-v13 uses readyAt instead of ready in newer versions
    const readyAt = (this.client as any).readyAt;
    return !!readyAt && !!this.userId;
  }
}
