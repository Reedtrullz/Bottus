// Interfaces for the Ollama relay placeholder
export interface OllamaClientInterface {
  startServer(): Promise<void>;
  stopServer(): Promise<void>;
  sendMessage(input: string): Promise<string>;
}

export type OllamaModelConfig = {
  modelName: string;
  maxTokens?: number;
};
