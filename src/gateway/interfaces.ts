/**
 * Core interfaces for the NanoClaw Discord Gateway
 */

// Normalized message from Discord
export interface GatewayMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  isDM: boolean;
  isGroupDM: boolean;
  timestamp: number;
  raw: unknown; // Original Discord message
}

// Context passed to skills/handlers
export interface GatewayContext {
  message: GatewayMessage;
  discord: DiscordConnector;
  memory: MemoryStore;
  ollama?: OllamaClient;
  extraction?: ExtractionService;
}

// Result from processing
export interface GatewayResult {
  handled: boolean;
  response?: string;
  error?: string;
}

// Discord connector interface
export interface DiscordConnector {
  login(token: string): Promise<void>;
  sendMessage(channelId: string, content: string): Promise<void>;
  sendDM(userId: string, content: string): Promise<void>;
  onMessage(callback: (msg: GatewayMessage) => Promise<void>): void;
  getUserId(): string;
  isConnected(): boolean;
}

// Memory store interface
export interface MemoryStore {
  get(channelId: string, userId?: string): Promise<MemoryEntry[]>;
  add(channelId: string, userId: string, content: string): Promise<void>;
  clear(channelId: string, userId?: string): Promise<void>;
}

export interface MemoryEntry {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: number;
}

// Ollama client interface
export interface OllamaClient {
  chat(prompt: string, context?: Record<string, unknown>): Promise<string>;
  isAvailable(): Promise<boolean>;
}

// Extraction service interface  
export interface ExtractionService {
  extract(text: string): Promise<ExtractedItem[]>;
}

export interface ExtractedItem {
  type: string;
  value: string;
  confidence: number;
}

// Skill interface for gateway
export interface GatewaySkill {
  readonly name: string;
  readonly description: string;
  canHandle(message: GatewayMessage, ctx: GatewayContext): boolean;
  handle(message: GatewayMessage, ctx: GatewayContext): Promise<GatewayResult>;
}
