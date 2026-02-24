const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b-instruct';

export interface OllamaClient {
  chat(prompt: string, context?: Record<string, unknown>): Promise<string>;
  isAvailable(): Promise<boolean>;
}

export class OllamaGateway implements OllamaClient {
  private url: string;
  private model: string;
  constructor(url?: string, model?: string) {
    this.url = url || OLLAMA_URL;
    this.model = model || OLLAMA_MODEL;
  }
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }
  async chat(prompt: string, context?: Record<string, unknown>): Promise<string> {
    let fullPrompt = prompt;
    if (context) {
      const contextStr = Object.entries(context)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      fullPrompt = `${contextStr}\n\nUser: ${prompt}`;
    }
    const res = await fetch(`${this.url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        stream: false
      })
    });
    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status}`);
    }
    const data: any = await res.json();
    return data.response || 'No response';
  }
}
