// Core relay module interfaces and lightweight types
// Modularized relay contracts between Discord, Ollama, and planning modules

import type { ExtractedItem } from '../../services/extraction.js';

// ============================================================================
// IDiscordRelay - Discord selfbot client interface
// ============================================================================

export interface MessageHistory {
  content: string;
  author: string;
  timestamp: number;
}

export interface SendMessageOptions {
  embed?: unknown;
  components?: unknown[];
}

export interface IDiscordRelay {
  /**
   * Connect to Discord using the provided token
   */
  login(): Promise<void>;

  /**
   * Disconnect from Discord
   */
  disconnect(): void;

  /**
   * Send a message to a channel
   * @param channelId - Target channel ID
   * @param content - Message content
   * @param options - Optional embed/components
   */
  sendMessage(channelId: string, content: string, options?: SendMessageOptions): Promise<unknown>;

  /**
   * Send a DM to a user by username
   * @param username - Target username
   * @param content - DM content
   */
  sendDMToUser(username: string, content: string): Promise<boolean>;

  /**
   * Register callback for @mention or DM events
   * @param callback - Handler function
   */
  onMention(callback: (msg: unknown) => Promise<void>): void;

  /**
   * Get the underlying Discord client instance
   */
  getClient(): unknown;

  /**
   * Get the authenticated user's ID
   */
  getUserId(): string;

  /**
   * Get message history for a channel
   * @param channelId - Channel ID
   */
  getHistory(channelId: string): string[];

  /**
   * Clear history for a channel
   * @param channelId - Channel ID
   */
  clearHistory(channelId: string): void;
}

// ============================================================================
// IOllamaBridge - Ollama LLM client interface
// ============================================================================

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  model?: string;
  stream?: boolean;
  options?: {
    num_predict?: number;
    temperature?: number;
    top_p?: number;
  };
}

export interface OllamaResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

export interface IOllamaBridge {
  /**
   * Send a single message and get a response
   * @param message - User message
   */
  sendMessage(message: string): Promise<string>;

  /**
   * Send a chat with message history
   * @param messages - Array of chat messages
   */
  chat(messages: OllamaChatMessage[]): Promise<string>;

  /**
   * Check if Ollama server is reachable
   */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// IPlanRouter - Routing for extraction results
// ============================================================================

export type PlanActionType = 'calendar_event' | 'task' | 'memory' | 'clarification' | 'none';

export interface PlanAction {
  type: PlanActionType;
  title?: string;
  startTime?: number;
  endTime?: number;
  dueTime?: number;
  description?: string;
  clarification?: string;
  confidence: number;
}

export interface IPlanRouter {
  /**
   * Route extraction results to appropriate handlers
   * @param extractionResult - Extracted items from message
   * @param userMessage - Original user message
   * @param userId - Discord user ID
   * @param channelId - Discord channel ID
   * @param discord - Discord relay instance
   */
  route(
    extractionResult: ExtractedItem[],
    userMessage: string,
    userId: string,
    channelId: string,
    discord: IDiscordRelay
  ): Promise<PlanAction[]>;
}

// Minimal core relay module type for compatibility with existing relayCore.ts
export interface CoreRelayModule {
  name: string;
  init(): Promise<void>;
}

// ============================================================================
// IRelayService - Main relay orchestration interface
// ============================================================================

export interface RelayConfig {
  discordToken: string;
  ollamaUrl: string;
  ollamaModel: string;
  relayTimeoutMs: number;
  historyMaxMessages: number;
}

export interface IRelayService {
  /**
   * Initialize all relay components
   */
  initialize(): Promise<void>;

  /**
   * Start the relay service
   */
  start(): Promise<void>;

  /**
   * Stop the relay service
   */
  stop(): void;

  /**
   * Get the Discord relay instance
   */
  getDiscordRelay(): IDiscordRelay;

  /**
   * Get the Ollama bridge instance
   */
  getOllamaBridge(): IOllamaBridge;

  /**
   * Get the plan router instance
   */
  getPlanRouter(): IPlanRouter;
}

// ============================================================================
// RelayEventBus - Event emission for relay modules
// ============================================================================

export type RelayEventType =
  | 'message.received'
  | 'message.sent'
  | 'extraction.complete'
  | 'plan.routed'
  | 'ollama.request'
  | 'ollama.response'
  | 'ollama.error'
  | 'discord.connected'
  | 'discord.disconnected'
  | 'discord.error';

export interface RelayEvent {
  type: RelayEventType;
  timestamp: number;
  payload?: unknown;
  source?: string;
}

export type RelayEventHandler = (event: RelayEvent) => void | Promise<void>;

export interface RelayEventBus {
  /**
   * Subscribe to a specific event type
   * @param eventType - Event to subscribe to
   * @param handler - Event handler
   */
  subscribe(eventType: RelayEventType, handler: RelayEventHandler): () => void;

  /**
   * Subscribe to all events
   * @param handler - Event handler
   */
  subscribeAll(handler: RelayEventHandler): () => void;

  /**
   * Emit an event
   * @param event - Event to emit
   */
  emit(event: RelayEvent): void;

  /**
   * Clear all subscriptions
   */
  clear(): void;
}

// ============================================================================
// StreamManager - Streaming response management
// ============================================================================

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

export interface StreamManagerConfig {
  maxConcurrentStreams: number;
  chunkTimeoutMs: number;
  bufferSize?: number;
}

export interface StreamHandle {
  id: string;
  channelId: string;
  userId: string;
  startedAt: number;
  chunks: StreamChunk[];
  isComplete: boolean;
  cancel(): void;
}

export interface StreamManager {
  /**
   * Create a new stream
   * @param channelId - Target channel
   * @param userId - Requesting user
   */
  createStream(channelId: string, userId: string): StreamHandle;

  /**
   * Get stream by ID
   * @param id - Stream ID
   */
  getStream(id: string): StreamHandle | undefined;

  /**
   * Add a chunk to an existing stream
   * @param id - Stream ID
   * @param chunk - Chunk to add
   */
  addChunk(id: string, chunk: StreamChunk): void;

  /**
   * Cancel a stream
   * @param id - Stream ID
   */
  cancelStream(id: string): void;

  /**
   * Get all active streams
   */
  getActiveStreams(): StreamHandle[];

  /**
   * Clean up completed/cancelled streams
   */
  cleanup(): void;
}
