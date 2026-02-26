// User profile loader for NanoBot USER.md integration
// Reads user profile from ~/.nanobot/workspace/USER.md

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface UserProfile {
  name: string;
  timezone: string;
  language: string;
  communicationStyle: string;
  responseLength: string;
  technicalLevel: string;
  primaryRole: string;
  mainProjects: string;
  toolsYouUse: string;
  topicsOfInterest: string[];
  specialInstructions: string;
  rawContent: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  timezone: 'Europe/Oslo',
  language: 'nb-NO',
  communicationStyle: 'casual',
  responseLength: 'adaptive',
  technicalLevel: 'intermediate',
  primaryRole: '',
  mainProjects: '',
  toolsYouUse: '',
  topicsOfInterest: [],
  specialInstructions: '',
  rawContent: '',
};

const NANOBOT_USER_PATH = path.join(os.homedir(), '.nanobot', 'workspace', 'USER.md');

class UserProfileService {
  private profile: UserProfile | null = null;
  private lastLoaded: number = 0;
  private cacheTTL = 60000;

  loadProfile(): UserProfile {
    const now = Date.now();
    if (this.profile && (now - this.lastLoaded) < this.cacheTTL) {
      return this.profile;
    }

    try {
      if (!fs.existsSync(NANOBOT_USER_PATH)) {
        this.profile = { ...DEFAULT_PROFILE };
        this.lastLoaded = now;
        return this.profile;
      }

      const rawContent = fs.readFileSync(NANOBOT_USER_PATH, 'utf-8');
      const profile = this.parseUserMarkdown(rawContent);
      profile.rawContent = rawContent;
      this.profile = profile;
      this.lastLoaded = now;
      return profile;
    } catch {
      this.profile = { ...DEFAULT_PROFILE };
      this.lastLoaded = now;
      return this.profile;
    }
  }

  private parseUserMarkdown(content: string): UserProfile {
    const profile: UserProfile = { ...DEFAULT_PROFILE };
    
    const nameMatch = content.match(/\*\*Name\*\*:\s*(.+)/i);
    if (nameMatch) profile.name = nameMatch[1].trim();

    const tzMatch = content.match(/\*\*Timezone\*\*:\s*(.+)/i);
    if (tzMatch) profile.timezone = tzMatch[1].trim();

    const langMatch = content.match(/\*\*Language\*\*:\s*(.+)/i);
    if (langMatch) profile.language = langMatch[1].trim();

    if (content.includes('- [x] Casual')) {
      profile.communicationStyle = 'casual';
    } else if (content.includes('- [x] Professional')) {
      profile.communicationStyle = 'professional';
    } else if (content.includes('- [x] Technical')) {
      profile.communicationStyle = 'technical';
    }

    if (content.includes('- [x] Brief')) {
      profile.responseLength = 'brief';
    } else if (content.includes('- [x] Detailed')) {
      profile.responseLength = 'detailed';
    }

    if (content.includes('- [x] Beginner')) {
      profile.technicalLevel = 'beginner';
    } else if (content.includes('- [x] Expert')) {
      profile.technicalLevel = 'expert';
    }

    const roleMatch = content.match(/\*\*Primary Role\*\*:\s*(.+)/i);
    if (roleMatch) profile.primaryRole = roleMatch[1].trim();

    const projectsMatch = content.match(/\*\*Main Projects\*\*:\s*(.+)/i);
    if (projectsMatch) profile.mainProjects = projectsMatch[1].trim();

    const specialMatch = content.match(/## Special Instructions([\s\S]*?)(?=---|$)/);
    if (specialMatch) {
      profile.specialInstructions = specialMatch[1].trim();
    }

    return profile;
  }

  buildContextString(channelId?: string, userId?: string): string {
    const profile = this.loadProfile();
    const parts: string[] = [];
    
    // Always include Discord role if available
    if (channelId && userId) {
      const discordRole = this.getDiscordRole(channelId, userId);
      if (discordRole) {
        parts.push(discordRole);
      }
    }
    
    // Add user profile info if available
    if (profile.name) {
      parts.push(`User: ${profile.name}`);
      parts.push(`Language: ${profile.language}`);
      parts.push(`Timezone: ${profile.timezone}`);
      parts.push(`Communication style: ${profile.communicationStyle}`);
      
      if (profile.primaryRole) {
        parts.push(`Work role: ${profile.primaryRole}`);
      }
      if (profile.mainProjects) {
        parts.push(`Projects: ${profile.mainProjects}`);
      }
      if (profile.specialInstructions) {
        parts.push(`Instructions: ${profile.specialInstructions}`);
      }
    }

    return parts.join('\n');
  }

  private getDiscordRole(channelId: string, userId: string): string {
    try {
      const { permissionService } = require('../relay/skills/permission.js');
      const role = permissionService.getUserRole(channelId, userId);
      if (role) {
        return `Discord role: ${role}`;
      }
    } catch {
      // Permission service not available
    }
    return '';
  }

  reload(): UserProfile {
    this.profile = null;
    this.lastLoaded = 0;
    return this.loadProfile();
  }

  hasProfile(): boolean {
    return !!this.loadProfile().name;
  }
}

export const userProfileService = new UserProfileService();
