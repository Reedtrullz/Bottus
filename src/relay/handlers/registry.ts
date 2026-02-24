import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';

export class HandlerRegistry {
  private handlers: MessageHandler[] = [];

  register(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  async dispatch(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    for (const handler of this.handlers) {
      if (handler.canHandle(message, ctx)) {
        try {
          return await handler.handle(message, ctx);
        } catch (e) {
          return {
            handled: true,
            error: e instanceof Error ? e.message : String(e)
          };
        }
      }
    }
    return { handled: false };
  }
}

export const globalHandlers = new HandlerRegistry();
