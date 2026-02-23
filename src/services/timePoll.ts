// Time poll service: detects Norwegian time-poll prompts, creates a poll,
// tracks votes via reactions, and creates an event on close (optional calendar hook).
// This is implemented as an in-memory prototype and is designed to integrate with
// a calendar service if provided.

import { ToneService } from './tone.js';

type TimePoll = {
  id: string;
  channelId: string;
  messageId?: string;
  options: string[];
  votes: Map<string, string>;
  endTime: number;
  closed?: boolean;
};

export class TimePollService {
  private client: any;
  private calendarService?: any;
  private polls: Map<string, TimePoll> = new Map();

  constructor(client: any, calendarService?: any) {
    this.client = client;
    this.calendarService = calendarService;
    this.initListeners();
  }

  private initListeners() {
    const c = this.client;
    if (!c || !c.on) return;
    // Message creation triggers poll prompts
    c.on?.('messageCreate', (message: any) => this.onMessage(message));
    // Reactions to vote
    c.on?.('messageReactionAdd', (message: any, emoji: any, user: any) => this.onReactionAdd(message, emoji, user));
    c.on?.('messageReactionRemove', (message: any, emoji: any, user: any) => this.onReactionRemove(message, emoji, user));
  }

  private onMessage(message: any) {
    try {
      if (!message || !message.content) return;
      if (message.author?.bot) return;
      const content = String(message.content).toLowerCase();
      const triggers = /(finn en tid|hvilken tid passer|finn tid)/i;
      if (!triggers.test(content)) return;
      const options = this.generateSlots();
      const pollText = this.buildPollText(options);
      // Send poll message
      const pollTextToSend = ToneService.apply(pollText, message?.author?.id);
      message.channel?.send?.(pollTextToSend).then((pollMsg: any) => {
        const emojis = this.emojiList(options.length);
        // Add reactions for voting
        Promise.all(emojis.map((e) => pollMsg.react?.(e))).then(() => {
          const endTime = Date.now() + 1000 * 60 * 60 * 2; // 2 hours
          const poll: TimePoll = {
            id: pollMsg.id,
            channelId: message.channel?.id,
            messageId: pollMsg.id,
            options,
            votes: new Map<string, string>(),
            endTime,
          };
          this.polls.set(pollMsg.id, poll);
          // Schedule close
          const delay = Math.max(0, endTime - Date.now());
          setTimeout(() => this.closePoll(poll), delay);
        });
      }).catch((err: any) => {
        message.channel?.send?.(`Klarte ikke opprette avstemning. Feil: ${err?.message ?? err}`);
      });
    } catch (e) {
      // Ignore errors to avoid breaking existing flows
    }
  }

  private onReactionAdd(message: any, emoji: any, user: any) {
    if (!user || user.bot) return;
    const poll = this.polls.get(message?.id);
    if (!poll) return;
    const idx = this.emojiIndex(emoji?.name ?? emoji?.id ?? '');
    if (idx >= 0 && idx < poll.options.length) {
      poll.votes.set(user.id, poll.options[idx]);
    }
  }

  private onReactionRemove(message: any, emoji: any, user: any) {
    if (!user || user.bot) return;
    const poll = this.polls.get(message?.id);
    if (!poll) return;
    const idx = this.emojiIndex(emoji?.name ?? emoji?.id ?? '');
    if (idx >= 0 && idx < poll.options.length) {
      const chosen = poll.options[idx];
      if (poll.votes.get(user.id) === chosen) {
        poll.votes.delete(user.id);
      }
    }
  }

  private closePoll(poll: TimePoll) {
    if (!poll || poll.closed) return;
    poll.closed = true;

    // Tally votes
    const counts: Map<string, number> = new Map();
    for (const v of poll.votes.values()) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    let winner = poll.options[0];
    let max = -1;
    for (const [opt, c] of counts.entries()) {
      if (c > max) {
        max = c;
        winner = opt;
      }
    }

    // Create event if calendar service is available
    if (this.calendarService?.createEvent) {
      try {
        this.calendarService.createEvent({ title: 'Neste trefftid', time: winner, description: `Avstemning avsluttet. Velg tidspunkt: ${winner}`, sourcePoll: poll.id });
      } catch (_) {
        // ignore calendar errors
      }
    }

    // Notify channel about the result
    const channel = this.client?.channels?.get?.(poll.channelId) || null;
    const resultText = `Avstemning avsluttet. Vinner: ${winner}.`; // Norwegian UI text
    if (channel && channel.send) {
      channel.send(resultText).catch(() => {});
    }
    this.polls.delete(poll.messageId || poll.id);
  }

  private generateSlots(): string[] {
    // Generate 5 upcoming weekday slots at 18:00
    const slots: string[] = [];
    const now = new Date();
    let dayOffset = 1;
    while (slots.length < 5) {
      const d = new Date(now);
      d.setDate(now.getDate() + dayOffset);
      const dow = d.getDay(); // 0=Sun, 6=Sat
      if (dow !== 0 && dow !== 6) {
        const label = d.toLocaleDateString(undefined, { weekday: 'short' });
        slots.push(`${label} 18:00`);
      }
      dayOffset++;
    }
    return slots;
  }

  private buildPollText(options: string[]): string {
    let s = '**Tidspunktforslag** Velg ett tidspunkt ved å reagere med tallet som tilsvarer alternativet:';
    s += '\n\n';
    options.forEach((opt, idx) => {
      s += `${idx + 1}. ${opt}\n`;
    });
    s += '\nPoll avsluttes om ca 2 timer.';
    return s;
  }

  private emojiList(n: number): string[] {
    const base = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
    return base.slice(0, n);
  }

  private emojiIndex(name: string): number {
    const map: Record<string, number> = {
      '1️⃣': 0,
      '2️⃣': 1,
      '3️⃣': 2,
      '4️⃣': 3,
      '5️⃣': 4,
      '6️⃣': 5,
      '7️⃣': 6,
      '8️⃣': 7,
      '9️⃣': 8,
    };
    return (map as any)[name] ?? -1;
  }
}

export const initTimePollService = (client: any, calendarService?: any) => {
  // Pass through the calendar service for integration flexibility
  // The TimePollService will attach its own listeners on construction.
  return new TimePollService(client, calendarService);
};
