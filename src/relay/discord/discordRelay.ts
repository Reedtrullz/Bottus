import { DiscordRelayClient } from './interfaces';

// Lightweight placeholder Discord relay client
export class DiscordRelay implements DiscordRelayClient {
  async connect(): Promise<void> {
    // placeholder connect logic
  }

  async disconnect(): Promise<void> {
    // placeholder disconnect logic
  }
}
