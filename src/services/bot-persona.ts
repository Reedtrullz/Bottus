// Bot persona loader for NanoBot SOUL.md integration
// Reads bot persona from ~/.nanobot/workspace/SOUL.md

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface BotPersona {
  name: string;
  description: string;
  personality: string[];
  values: string[];
  communicationStyle: string[];
  rawContent: string;
}

const DEFAULT_PERSONA: BotPersona = {
  name: 'Ine',
  description: 'AI assistant',
  personality: ['Helpful and friendly'],
  values: ['Accuracy over speed', 'User privacy and safety'],
  communicationStyle: ['Be clear and direct', 'Explain reasoning when helpful'],
  rawContent: '',
};

const NANOBOT_SOUL_PATH = path.join(os.homedir(), '.nanobot', 'workspace', 'SOUL.md');

class BotPersonaService {
  private persona: BotPersona | null = null;
  private lastLoaded: number = 0;
  private cacheTTL = 300000; // 5 minute cache

  /**
   * Load bot persona from NanoBot workspace
   */
  loadPersona(): BotPersona {
    const now = Date.now();
    
    if (this.persona && (now - this.lastLoaded) < this.cacheTTL) {
      return this.persona;
    }

    try {
      if (!fs.existsSync(NANOBOT_SOUL_PATH)) {
        console.log('[BotPersona] No SOUL.md found, using defaults');
        this.persona = { ...DEFAULT_PERSONA };
        this.lastLoaded = now;
        return this.persona;
      }

      const rawContent = fs.readFileSync(NANOBOT_SOUL_PATH, 'utf-8');
      const persona = this.parseSoulMarkdown(rawContent);
      persona.rawContent = rawContent;
      
      this.persona = persona;
      this.lastLoaded = now;
      
      console.log(`[BotPersona] Loaded persona: ${persona.name}`);
      return persona;
    } catch (error) {
      console.error('[BotPersona] Error loading persona:', error);
      this.persona = { ...DEFAULT_PERSONA };
      this.lastLoaded = now;
      return this.persona;
    }
  }

  /**
   * Parse SOUL.md markdown into structured persona
   */
  private parseSoulMarkdown(content: string): BotPersona {
    const persona: BotPersona = { ...DEFAULT_PERSONA };
    
    // Extract name from first line (e.g., "# Soul" or "# Name")
    const nameMatch = content.match(/^#\s+(.+)$/m);
    if (nameMatch) {
      persona.name = nameMatch[1].trim();
    }

    // Extract description (first paragraph after title)
    const descMatch = content.match(/^#\s+.+\n\n(.+)/m);
    if (descMatch) {
      persona.description = descMatch[1].trim();
    }

    // Extract personality traits
    const personalitySection = content.match(/## Personality([\s\S]*?)(?=##|$)/);
    if (personalitySection) {
      persona.personality = this.extractListItems(personalitySection[1]);
    }

    // Extract values
    const valuesSection = content.match(/## Values([\s\S]*?)(?=##|$)/);
    if (valuesSection) {
      persona.values = this.extractListItems(valuesSection[1]);
    }

    // Extract communication style
    const commSection = content.match(/## Communication Style([\s\S]*?)(?=##|$)/);
    if (commSection) {
      persona.communicationStyle = this.extractListItems(commSection[1]);
    }

    return persona;
  }

  /**
   * Extract bullet points from markdown section
   */
  private extractListItems(section: string): string[] {
    return section
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line && !line.startsWith('['));
  }

  /**
   * Build a system prompt prefix from persona
   */
  buildSystemPrompt(): string {
    const persona = this.loadPersona();
    
    const parts: string[] = [];
    
    // Identity
    if (persona.description) {
      parts.push(`You are ${persona.name} 🐈, ${persona.description}.`);
    }

    // Personality traits
    if (persona.personality.length > 0) {
      parts.push(`Personality: ${persona.personality.join(', ')}.`);
    }

    // Communication style
    if (persona.communicationStyle.length > 0) {
      parts.push(`Communication: ${persona.communicationStyle.join('. ')}.`);
    }

    // Values (as guidance)
    if (persona.values.length > 0) {
      parts.push(`Values: ${persona.values.join(', ')}.`);
    }

    return parts.join(' ');
  }

  /**
   * Force reload persona (bypass cache)
   */
  reload(): BotPersona {
    this.persona = null;
    this.lastLoaded = 0;
    return this.loadPersona();
  }
}

export const botPersonaService = new BotPersonaService();
