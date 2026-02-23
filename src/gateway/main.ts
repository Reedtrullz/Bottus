import { DiscordGateway } from './discord.js';
import { MessageParser } from './parser.js';
import { SkillDispatcher } from './dispatcher.js';
import { SqlMemoryStore } from './memory.js';
import { GatewayMessage, GatewayContext, OllamaClient, ExtractionService } from './discord.js';

/**
 * Main Gateway class - wires everything together
 */
export class NanoGateway {
  private discord: DiscordGateway;
  private parser: MessageParser;
  private dispatcher: SkillDispatcher;
  private memory: SqlMemoryStore;
  private ollama?: OllamaClient;
  private extraction?: ExtractionService;
  
  constructor() {
    this.discord = new DiscordGateway();
    this.parser = new MessageParser();
    this.dispatcher = new SkillDispatcher();
    this.memory = new SqlMemoryStore();
  }
  
  async init(): Promise<void> {
    console.log('[Gateway] Initializing...');
    await this.memory.init();
    this.discord.onMessage(async (msg: GatewayMessage) => {
      await this.handleMessage(msg);
    });
    console.log('[Gateway] Ready');
  }
  
  async start(token: string): Promise<void> {
    await this.init();
    await this.discord.login(token);
    console.log('[Gateway] Connected to Discord');
  }
  
  private async handleMessage(msg: GatewayMessage): Promise<void> {
    console.log(`[Gateway] INCOMING | ${msg.username}: ${msg.content}`);
    const parsed = this.parser.parse(msg);
    const ctx: GatewayContext = {
      message: parsed,
      discord: this.discord,
      memory: this.memory,
      ollama: this.ollama,
      extraction: this.extraction
    };
    const result = await this.dispatcher.dispatch(parsed, ctx);
    if (result.handled && result.response) {
      console.log(`[Gateway] OUTGOING (skill) | ${result.response.substring(0, 100)}...`);
      await this.discord.sendMessage(msg.channelId, result.response);
    } else if (!result.handled && this.ollama) {
      console.log(`[Gateway] OUTGOING (ollama fallback) | passing to LLM...`);
      const response = await this.ollama.chat(parsed.cleanedContent);
      console.log(`[Gateway] OUTGOING (ollama) | ${response.substring(0, 100)}...`);
      await this.discord.sendMessage(msg.channelId, response);
    } else {
      console.log(`[Gateway] OUTGOING (none) | No response generated`);
    }
  }
  
  registerSkill(skill: any): void {
    this.dispatcher.register(skill);
  }
  
  setOllama(client: OllamaClient): void {
    this.ollama = client;
  }
  
  setExtraction(service: ExtractionService): void {
    this.extraction = service;
  }
  
  getDispatcher(): SkillDispatcher {
    return this.dispatcher;
  }
}
