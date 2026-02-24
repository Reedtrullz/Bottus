// Local fallback type for gateway messages when discord.js export isn't available
export type GatewayMessage = { content: string; [key: string]: any };

export class MessageParser {
  private mentionPatterns = [
    /<@!?\d+>/g,
    /@inebotten/gi,
    /@inebot/gi,
  ];
  
  parse(msg: GatewayMessage): ParsedMessage {
    const rawContent = msg.content;
    const cleanedContent = this.removeMentions(rawContent);
    const isMention = this.isBotMention(rawContent);
    
    return {
      ...msg,
      rawContent,
      cleanedContent,
      isMention,
      words: this.tokenize(cleanedContent),
    };
  }
  
  private removeMentions(content: string): string {
    let result = content;
    for (const pattern of this.mentionPatterns) {
      result = result.replace(pattern, '');
    }
    return result.trim();
  }
  
  private isBotMention(content: string): boolean {
    return this.mentionPatterns.some(p => p.test(content));
  }
  
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\sæøåÆØÅ]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }
}

export interface ParsedMessage extends GatewayMessage {
  rawContent: string;
  cleanedContent: string;
  isMention: boolean;
  words: string[];
}
