// Interfaces for the Discord relay placeholder
export interface DiscordRelayClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export type DiscordEventHandler = (type: string, payload?: any) => void;
