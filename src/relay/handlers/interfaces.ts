/**
 * Message handler interface for relay message processing.
 * Each handler can check if it can handle a message and process it.
 */

export interface HandlerContext {
  message: string;
  userId: string;
  channelId: string;
  discord: any; // DiscordRelay instance
}

export interface HandlerResult {
  handled: boolean;
  response?: string;
  error?: string;
}

export interface MessageHandler {
  /** Unique handler name */
  readonly name: string;
  
  /** Check if this handler can process the message */
  canHandle(message: string, ctx: HandlerContext): boolean;
  
  /** Process the message and return result */
  handle(message: string, ctx: HandlerContext): Promise<HandlerResult>;
}
