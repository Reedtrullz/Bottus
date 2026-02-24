export class SkillAdapter {
  constructor(skill) {
    this.skill = skill;
    this.name = skill && skill.name ? skill.name : 'UnnamedSkill';
  }

  /**
   * Convert GatewayContext to HandlerContext format for relay handlers.
   * GatewayContext: { message: GatewayMessage, discord, memory, ollama, extraction }
   * HandlerContext: { message: string, userId, channelId, discord }
   */
  adaptContext(ctx) {
    // Check if this is a GatewayContext (has message object with channelId)
    if (ctx.message && ctx.message.channelId) {
      return {
        message: typeof ctx.message === 'string' ? ctx.message : ctx.message.content || '',
        userId: ctx.message.userId || '',
        channelId: ctx.message.channelId || '',
        discord: ctx.discord
      };
    }
    // Already in HandlerContext format
    return ctx;
  }

  canHandle(message, ctx) {
    const adaptedCtx = this.adaptContext(ctx);
    return typeof this.skill.canHandle === 'function'
      ? this.skill.canHandle(message, adaptedCtx)
      : true;
  }

  async handle(message, ctx) {
    const adaptedCtx = this.adaptContext(ctx);
    if (typeof this.skill.handle === 'function') {
      return await this.skill.handle(message, adaptedCtx);
    }
    return null;
  }

  getMemory(channelId) {
    if (typeof this.skill.getMemory === 'function') {
      return this.skill.getMemory(channelId);
    }
    return undefined;
  }

  setMemory(channelId, memory) {
    if (typeof this.skill.setMemory === 'function') {
      this.skill.setMemory(channelId, memory);
    }
  }
}

export default { SkillAdapter };
