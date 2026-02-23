export declare class SkillAdapter {
  constructor(skill: any);
  name: string;
  canHandle(message: any, ctx: any): boolean;
  handle(message: any, ctx: any): Promise<any>;
  getMemory(channelId: string): any;
  setMemory(channelId: string, memory: any): void;
}
