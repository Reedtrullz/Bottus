import * as fs from 'fs';
import * as path from 'path';

const SISYPHUS_PATH = process.env.SISYPHUS_PATH || './.sisyphus';

interface TeachEntry {
  type: 'fact' | 'preference' | 'rule' | 'skill';
  content: string;
  source: string;
  timestamp: number;
}

export class TeachHandler {
  private adminIds: Set<string>;
  private teachLogPath: string;

  constructor(adminIds: string[]) {
    this.adminIds = new Set(adminIds);
    this.teachLogPath = path.join(SISYPHUS_PATH, 'notepads', 'teach-log.md');
  }

  canHandle(message: string): boolean {
    return message.toLowerCase().startsWith('!teach') || 
           message.toLowerCase().startsWith('/teach');
  }

  async handle(message: string, userId: string): Promise<string> {
    if (!this.adminIds.has(userId)) {
      return '⛔ Only admins can use !teach.';
    }

    const parts = message.split(' ');
    parts.shift();
    
    const type = parts[0] as TeachEntry['type'];
    if (!['fact', 'preference', 'rule', 'skill'].includes(type)) {
      return 'Usage: !teach <fact|preference|rule|skill> <content>';
    }

    parts.shift();
    const content = parts.join(' ');

    if (!content) {
      return 'Please provide content to teach.';
    }

    const entry: TeachEntry = {
      type,
      content,
      source: userId,
      timestamp: Date.now(),
    };

    await this.logTeaching(entry);

    if (type === 'skill') {
      return `📝 Skill proposal logged for review: "${content}"\nAdmins can approve with !approve-skill`;
    }

    return `✅ Learned: ${type} — "${content}"`;
  }

  private async logTeaching(entry: TeachEntry): Promise<void> {
    const timestamp = new Date(entry.timestamp).toISOString();
    const content = `\n## ${entry.type.toUpperCase()} (${timestamp})\n${entry.content}\n*Source: ${entry.source}*`;

    const dir = path.dirname(this.teachLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.teachLogPath)) {
      fs.writeFileSync(this.teachLogPath, '# Teach Log\n' + content);
    } else {
      fs.appendFileSync(this.teachLogPath, content);
    }
  }
}
