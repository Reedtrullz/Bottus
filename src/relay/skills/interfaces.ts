export interface HandlerContext {
  userId: string;
  channelId: string;
  message: string;
  discord: any;
  ollama?: any;
  extraction?: any;
  memory?: any;
}

export interface SkillResponse {
  handled: boolean;
  response?: string;
  shouldContinue?: boolean;
}

export interface Skill {
  readonly name: string;
  readonly description: string;
  canHandle(message: string, ctx: HandlerContext): boolean;
  handle(message: string, ctx: HandlerContext): Promise<SkillResponse>;
  getMemory?(channelId: string): any;
  setMemory?(channelId: string, memory: any): void;
}

export interface SkillRegistry {
  register(skill: Skill): void;
  unregister(name: string): boolean;
  getSkill(name: string): Skill | undefined;
  getAllSkills(): Skill[];
  findHandler(message: string, ctx: HandlerContext): Skill | undefined;
}

export interface MemoryItem {
  id: string;
  userId: string;
  fact: string;
  createdAt: number;
}
