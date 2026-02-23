// OpenClaw Gateway Client with tool support
// For relay → OpenClaw → Ollama integration

interface OpenClawTool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenClawMessage {
  type: 'message' | 'function_call' | 'function_call_output';
  role?: 'user' | 'assistant';
  content?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
}

interface OpenClawResponse {
  output?: string[];
  error?: string;
}

export class OpenClawClient {
  private baseUrl: string;
  private token: string;
  private timeout: number;
  private model: string;

  constructor(
    baseUrl: string, 
    token: string, 
    model: string = 'openclaw',
    timeoutMs: number = 60000
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.model = model;
    this.timeout = timeoutMs;
  }

  /**
   * Send a message to OpenClaw with optional tools
   * @param message - The user's message
   * @param tools - Optional array of tool definitions for function calling
   * @param conversationHistory - Optional previous messages for context
   */
  async sendMessage(
    message: string, 
    tools?: OpenClawTool[],
    conversationHistory?: OpenClawMessage[]
  ): Promise<{ response: string; toolCalls?: Array<{ name: string; args: string }> }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Build messages array with history
    const messages: OpenClawMessage[] = [];
    
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }
    
    messages.push({ type: 'message', role: 'user', content: message });

    const requestBody: Record<string, unknown> = {
      input: messages.length === 1 ? message : messages,
      model: this.model,
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenClaw error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as OpenClawResponse;
      
      // Extract text response and any tool calls
      const outputs = data.output || [];
      const textResponse = outputs
        .filter((o: unknown) => typeof o === 'string')
        .join('\n');
      
      const toolCalls: Array<{ name: string; args: string }> = [];
      for (const o of outputs) {
        if (typeof o === 'object' && o !== null && 'type' in o) {
          const obj = o as Record<string, unknown>;
          if (obj.type === 'function_call' && obj.name && obj.arguments) {
            toolCalls.push({ 
              name: String(obj.name), 
              args: String(obj.arguments) 
            });
          }
        }
      }

      return {
        response: textResponse || 'No response from OpenClaw',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenClaw request timed out after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send a message and handle tool execution in a loop
   * @param message - The user's message
   * @param tools - Tool definitions
   * @param toolExecutor - Function to execute tool calls and return results
   * @param maxIterations - Max tool call loops (default 3)
   */
  async sendMessageWithTools(
    message: string,
    tools: OpenClawTool[],
    toolExecutor: (name: string, args: string) => Promise<string>,
    maxIterations: number = 3
  ): Promise<string> {
    const conversationHistory: OpenClawMessage[] = [];
    
    for (let i = 0; i < maxIterations; i++) {
      const result = await this.sendMessage(message, tools, conversationHistory);
      
      // Add user message to history
      conversationHistory.push({ type: 'message', role: 'user', content: message });
      
      // If there are tool calls, execute them
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          try {
            const toolResult = await toolExecutor(toolCall.name, toolCall.args);
            
            // Add tool call and result to history
            conversationHistory.push({
              type: 'function_call',
              call_id: `call_${Date.now()}`,
              name: toolCall.name,
              arguments: toolCall.args
            });
            conversationHistory.push({
              type: 'function_call_output',
              call_id: `call_${Date.now()}`,
              output: toolResult
            });
          } catch (error) {
            // Add error to conversation
            conversationHistory.push({
              type: 'function_call_output',
              call_id: `call_${Date.now()}`,
              output: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
            });
          }
        }
        
        // Continue loop to let model process tool results
        message = ''; // No new message, just processing tool results
        continue;
      }
      
      // No more tool calls, return the response
      return result.response;
    }
    
    return 'Max tool iterations reached';
  }

  /**
   * Simple message send without tools (backward compatible)
   */
  async chat(message: string): Promise<string> {
    const result = await this.sendMessage(message);
    return result.response;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Calendar tool schemas for Norwegian language
 */
export const calendarTools: OpenClawTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Opprett en kalenderhendelse. Bruk denne når brukeren nevner en dato eller tidspunkt for en avtale.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Tittel på hendelsen' },
          start_time: { type: 'string', description: 'Starttidspunkt (ISO 8601 format: YYYY-MM-DDTHH:mm:ss)' },
          end_time: { type: 'string', description: 'Sluttidspunkt (valgfritt, ISO 8601)' },
          description: { type: 'string', description: 'Beskrivelse av hendelsen (valgfritt)' },
          reminder: { type: 'integer', description: 'Påminnelse i minutter før (standard: 15)' }
        },
        required: ['title', 'start_time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: 'List kalenderhendelser for en periode. Bruk denne når brukeren spør om hva som skjer eller har planlagt.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Startdato (YYYY-MM-DD, valgfritt)' },
          end_date: { type: 'string', description: 'Sluttdato (YYYY-MM-DD, valgfritt)' },
          days_ahead: { type: 'integer', description: 'Antall dager fremover (valgfritt, erstatter datoer)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_event',
      description: 'Hent detaljer om en spesifikk kalenderhendelse.',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'ID til hendelsen' }
        },
        required: ['event_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_event',
      description: 'Oppdater en eksisterende kalenderhendelse.',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'ID til hendelsen' },
          title: { type: 'string', description: 'Ny tittel (valgfritt)' },
          start_time: { type: 'string', description: 'Nytt starttidspunkt (valgfritt)' },
          end_time: { type: 'string', description: 'Nytt sluttidspunkt (valgfritt)' },
          description: { type: 'string', description: 'Ny beskrivelse (valgfritt)' }
        },
        required: ['event_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Slett en kalenderhendelse.',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'ID til hendelsen som skal slettes' }
        },
        required: ['event_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_reminder',
      description: 'Sett en påminnelse for en hendelse eller et tidspunkt.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Melding å bli påminnet om' },
          reminder_time: { type: 'string', description: 'Tidspunkt for påminnelse (ISO 8601)' },
          minutes_before: { type: 'integer', description: 'Antall minutter før et tidspunkt (valgfritt)' }
        },
        required: ['message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_reminders',
      description: 'List alle aktive påminnelser.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancel_reminder',
      description: 'Avbryt en påminnelse.',
      parameters: {
        type: 'object',
        properties: {
          reminder_id: { type: 'string', description: 'ID til påminnelsen som skal avbrytes' }
        },
        required: ['reminder_id']
      }
    }
  }
];
