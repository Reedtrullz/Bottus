import type { Skill, SkillRegistry, HandlerContext } from './interfaces.js';
import { logger } from '../../utils/logger.js';
export type { HandlerContext };

export class InMemorySkillRegistry implements SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  register(skill: Skill): void {
    if (this.skills.has(skill.name)) {
      logger.warn(`[SkillRegistry] Skill "${skill.name}" already registered, replacing`);
    }
    this.skills.set(skill.name, skill);
    logger.info(`[SkillRegistry] Registered skill: ${skill.name}`);
  }

  unregister(name: string): boolean {
    const deleted = this.skills.delete(name);
    if (deleted) {
      logger.info(`[SkillRegistry] Unregistered skill: ${name}`);
    }
    return deleted;
  }

  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  findHandler(message: string, ctx: HandlerContext): Skill | undefined {
    for (const skill of this.skills.values()) {
      if (skill.canHandle(message, ctx)) {
        return skill;
      }
    }
    return undefined;
  }
}

export const skillRegistry = new InMemorySkillRegistry();
