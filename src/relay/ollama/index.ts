export interface OllamaRelay {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(text: string): Promise<string>;
}

export class OllamaRelayStub implements OllamaRelay {
  async connect(): Promise<void> {
    return;
  }
  async disconnect(): Promise<void> {
    return;
  }
  async send(_text: string): Promise<string> {
    return "";
  }
}
export const OLLAMA_RELAY_STUB = true;
