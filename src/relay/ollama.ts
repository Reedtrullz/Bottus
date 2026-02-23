// Direct Ollama client - simpler than OpenClaw for basic Q&A

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(baseUrl: string, model: string, timeoutMs: number = 60000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.timeout = timeoutMs;
  }

  async sendMessage(message: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const systemPrompt = `Du er inebot, en vennlig norsk chatbot. SVAR ALLTID PÅ NORSK. Bruk norsk språk og norske ord. Ikke bruk danske eller svenske ord. Svar kort og naturlig som en vanlig samtale.`;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          stream: false,
          options: {
            num_predict: 1500,
            temperature: 0.5,
            top_p: 0.9,
          }
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as OllamaChatResponse;
      return data.message?.content || 'No response from model';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async chat(messages: Array<{role: string, content: string}>): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          stream: false,
          options: {
            num_predict: 1500,
            temperature: 0.7,
          }
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as OllamaChatResponse;
      return data.message?.content || 'No response from model';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
