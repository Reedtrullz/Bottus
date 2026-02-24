export interface DiscordRelay {
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(_payload: any): void;
}

export class DiscordRelayStub implements DiscordRelay {
  async start(): Promise<void> {
    return;
  }
  async stop(): Promise<void> {
    return;
  }
  onMessage(_payload: any): void {
  }
}
export const DISCORD_RELAY_STUB = true;
