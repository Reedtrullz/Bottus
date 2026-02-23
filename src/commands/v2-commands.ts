type CommandCategory = Record<string, string>;

export const V2_COMMANDS: Record<string, CommandCategory> = {
  calendar: {
    '!kalender': 'Show this week\'s events',
    '!kalender today': 'Show today\'s events',
    '!event <title> <date>': 'Create calendar event',
    '!event <title> weekly <days>': 'Create recurring event',
    '!export': 'Export calendar as ICS file',
    '!delete event <title>': 'Delete event',
  },
  feedback: {
    '!feedback <message-id> <comment>': 'Give feedback on a bot response',
    '!improve': 'Run Sisyphus improvement cycle (admin)',
  },
  learning: {
    '!teach <type> <content>': 'Teach the bot (admin: fact/preference/rule/skill)',
    '!preferences': 'Show current group preferences',
    '!stats': 'Show bot usage statistics',
  },
  general: {
    '!help': 'Show all commands',
    '!ping': 'Health check',
  },
};

export function getCommandHelp(command: string): string | undefined {
  for (const category of Object.values(V2_COMMANDS)) {
    if (command in category) {
      return category[command];
    }
  }
  return undefined;
}

export function getAllCommands(): Record<string, string> {
  const all: Record<string, string> = {};
  for (const category of Object.values(V2_COMMANDS)) {
    Object.assign(all, category);
  }
  return all;
}
