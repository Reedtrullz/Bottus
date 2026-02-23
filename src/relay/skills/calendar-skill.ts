import type { Skill, HandlerContext, SkillResponse } from './interfaces.js';

const CALENDAR_PATTERNS = [
  'hva har vi planlagt',
  'når er',
  'hva skjer',
  'vis kalender',
  'kalender',
  'hva skjer i dag'
];

export class CalendarSkill implements Skill {
  readonly name = 'calendar';
  readonly description = 'Calendar events and scheduling';

  private memories: Map<string, any> = new Map();

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    return CALENDAR_PATTERNS.some(k => m.includes(k));
  }

  async handle(message: string, _ctx: HandlerContext): Promise<SkillResponse> {
    const m = message.toLowerCase();
    
    if (m.includes('hva skjer i dag')) {
      return {
        handled: true,
        response: 'Kalenderfunksjoner er under utvikling. Bruk "husk" for å lagre minner.',
        shouldContinue: false
      };
    }
    
    if (m.includes('kalender') || m.includes('hva har vi planlagt')) {
      return {
        handled: true,
        response: 'Kalender visning er tilgjengelig via /kalender kommandoen.',
        shouldContinue: false
      };
    }
    
    if (m.includes('når er')) {
      return {
        handled: true,
        response: 'Du kan spørre om spesifikke hendelser med "når er <tittel>?"',
        shouldContinue: false
      };
    }
    
    return { handled: false, shouldContinue: true };
  }

  getMemory(channelId: string): any {
    return this.memories.get(channelId);
  }

  setMemory(channelId: string, memory: any): void {
    this.memories.set(channelId, memory);
  }
}
