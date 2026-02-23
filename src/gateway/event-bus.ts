// Local fallback types for gateway message context
export type GatewayMessage = { content: string; [key: string]: any };
export interface GatewayContext { [key: string]: any }
export interface GatewayResult { handled?: boolean }

type EventHandler = (msg: GatewayMessage, ctx: GatewayContext) => Promise<GatewayResult>;

export class EventBus {
  private handlers: Map<string, EventHandler> = new Map();
  private defaultHandler?: EventHandler;
  
  
  on(event: string, handler: EventHandler): void {
    this.handlers.set(event, handler);
  }
  
  
  onDefault(handler: EventHandler): void {
    this.defaultHandler = handler;
  }
  
  
  async emit(event: string, msg: GatewayMessage, ctx: GatewayContext): Promise<GatewayResult> {
    const handler = this.handlers.get(event);
    
    if (handler) {
      return await handler(msg, ctx);
    }
    
    if (this.defaultHandler) {
      return await this.defaultHandler(msg, ctx);
    }
    
    return { handled: false };
  }
  
  
  off(event: string): void {
    this.handlers.delete(event);
  }
}
