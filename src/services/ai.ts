import { config } from 'dotenv';

config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export class AIService {
  private systemPrompt: string;

  constructor() {
    // Read AI style from environment (default to 'balanced')
    const styleRaw = (process.env.AI_STYLE ?? 'balanced').toLowerCase();
    const basePrompt = `Du er IneBot, en vennlig og hjelpsom AI-assistent i en Discord-gruppe. Du svarer på norsk eller engelsk. Du er en del av en gruppechat med venner. Vær naturlig, vennlig og konkret i svarene dine. Ikke vær for formell.`;
    let extra = '';
    if (styleRaw === 'concise') {
      extra = ' Husk å holde svarene korte, direkte og uten hedging.';
    } else if (styleRaw === 'verbose') {
      extra = ' Gi mer detaljer og avklarende spørsmål når det er nyttig for å hjelpe brukeren bedre.';
    } else if (styleRaw !== 'balanced') {
      // Invalid value - fall back to balanced with a warning
      console.warn(`AI_STYLE='${styleRaw}' is not a valid value. Falling back to 'balanced'.`);
    }
    this.systemPrompt = basePrompt + (extra ? ' ' + extra : '');
  }

  async generateResponse(userMessage: string, username: string): Promise<string> {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
      return `Hei! Jeg er en AI-bot, men jeg trenger en API-nøkkel for å svare intelligent. Si ifra til eieren av botten!`;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: `${username} sier: ${userMessage}` }
          ],
          max_tokens: 200,
          temperature: 0.7
        })
      });

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || 'Beklager, jeg kunne ikke generere et svar.';
    } catch (error) {
      console.error('AI Error:', error);
      return 'Noe gikk galt med AI-en. Prøv igjen!';
    }
  }
}
