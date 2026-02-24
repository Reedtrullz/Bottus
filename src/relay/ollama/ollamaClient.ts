import { OllamaClientInterface } from './interfaces';

// Lightweight placeholder Ollama client
export class OllamaClient implements OllamaClientInterface {
  async startServer(): Promise<void> {
    // placeholder
  }
  async stopServer(): Promise<void> {
    // placeholder
  }
  async sendMessage(input: string): Promise<string> {
    // placeholder response
    return `echo: ${input}`;
  }
}
