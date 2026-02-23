import fetch from 'node-fetch';
import { OllamaClient } from '../relay/ollama.js';

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const COMFYUI_MODEL = process.env.COMFYUI_MODEL || 'v1-5-pruned-emaonly.safetensors';
const COMFYUI_FALLBACK_MODEL = process.env.COMFYUI_FALLBACK_MODEL || 'sd15_default.yaml';

export interface ImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export class ComfyUIClient {
  private baseUrl: string;
  private queue: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT = 5;
  private readonly RATE_WINDOW_MS = 3600000;
  // Circuit breaker state
  private failureCount: number = 0;
  private circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  private circuitOpenedAt: number = 0;
  private readonly CIRCUIT_FAILURE_THRESHOLD = 3;
  private readonly CIRCUIT_RESET_TIMEOUT_MS = 60000;

  // Cached recent image
  private lastSuccessfulImageUrl: string | null = null;
  private lastImageTimestamp: number = 0;
  private readonly CACHE_DURATION_MS = 300000;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || COMFYUI_URL;
  }

  checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userQueue = this.queue.get(userId);

    if (!userQueue || now > userQueue.resetTime) {
      this.queue.set(userId, { count: 1, resetTime: now + this.RATE_WINDOW_MS });
      return true;
    }

    if (userQueue.count >= this.RATE_LIMIT) {
      return false;
    }

    userQueue.count++;
    return true;
  }

  getRemainingQuota(userId: string): number {
    const userQueue = this.queue.get(userId);
    if (!userQueue || Date.now() > userQueue.resetTime) {
      return this.RATE_LIMIT;
    }
    return Math.max(0, this.RATE_LIMIT - userQueue.count);
  }

  async generateImage(prompt: string, userId: string): Promise<ImageResult> {
    // Check circuit breaker before attempting generation
    if (this.circuitState === 'open') {
      const now = Date.now();
      if (now - this.circuitOpenedAt >= this.CIRCUIT_RESET_TIMEOUT_MS) {
        this.circuitState = 'half-open';
        console.log(`[ComfyUI] Circuit breaker half-open, allowing test request`);
      } else {
        const retryAfter = Math.ceil((this.circuitOpenedAt + this.CIRCUIT_RESET_TIMEOUT_MS - now) / 1000);
        return {
          success: false,
          error: `ComfyUI er midlertidig utilgjengelig på grunn av gjentatte feil. Prøv igjen om ${retryAfter} sekunder.\n\nDu kan også prøve å:\n• Restart ComfyUI-tjenesten\n• Sjekk at ComfyUI kjører på ${this.baseUrl}\n• Bruk /bildeforklaring for å analysere et eksisterende bilde i stedet`
        };
      }
    }
    // Health check first
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      this.recordFailure();
      return {
        success: false,
        error: `ComfyUI er ikke tilgjengelig. Sjekk at ComfyUI kjører på ${this.baseUrl}`
      };
    }
    if (!this.checkRateLimit(userId)) {
      const remaining = this.getRemainingTime(userId);
      return {
        success: false,
        error: `Rate limit exceeded. ${remaining}`
      };
    }
    // Try primary workflow first
    let primaryFailed = false;
    try {
      const workflow = this.buildWorkflow(prompt);
      const response = await fetch(`${this.baseUrl}/prompt`, {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: workflow
        })
      });
      if (!response.ok) {
        // Try fallback workflow on error
        console.log(`[ComfyUI] Primary workflow failed (${response.status}), trying fallback...`);
        const errorText = await response.text();
        console.log(`[ComfyUI] Error response body:`, errorText);
        primaryFailed = true;
      } else {
        const data = await response.json() as { prompt_id: string };
        const imageUrl = await this.waitForCompletion(data.prompt_id);
        // Cache successful result
        this.lastSuccessfulImageUrl = imageUrl;
        this.lastImageTimestamp = Date.now();
        this.recordSuccess();

        return {
          success: true,
          imageUrl
        };
      }
    } catch (error) {
      console.log(`[ComfyUI] Primary workflow exception:`, error);
      primaryFailed = true;
    }

    // Try fallback workflow
    if (primaryFailed) {
      try {
        const fallbackWorkflow = this.buildSimpleWorkflow(prompt);
        const fallbackResponse = await fetch(`${this.baseUrl}/prompt`, {
          method: 'POST',

          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: fallbackWorkflow
          })
        });
        if (!fallbackResponse.ok) {
          this.recordFailure();
          return this.handleBothWorkflowsFailed();
        }
        const fallbackData = await fallbackResponse.json() as { prompt_id: string };
        const imageUrl = await this.waitForCompletion(fallbackData.prompt_id);
        // Cache successful result
        this.lastSuccessfulImageUrl = imageUrl;
        this.lastImageTimestamp = Date.now();
        this.recordSuccess();

        return {
          success: true,
          imageUrl
        };
      } catch (fallbackError) {
        console.log(`[ComfyUI] Fallback workflow exception:`, fallbackError);
        this.recordFailure();
        return this.handleBothWorkflowsFailed();
      }
    }

    // Should not reach here but just in case
    this.recordFailure();
    return this.handleBothWorkflowsFailed();
  }

  private handleBothWorkflowsFailed(): ImageResult {
    // Try to return cached recent image
    const now = Date.now();
    if (this.lastSuccessfulImageUrl && (now - this.lastImageTimestamp) < this.CACHE_DURATION_MS) {
      console.log(`[ComfyUI] Returning cached recent image`);
      return {
        success: true,
        imageUrl: this.lastSuccessfulImageUrl,
        error: 'Bruker nylig generert bilde (mindre enn 5 minutter gammelt)'
      };
    }

    // Return friendly Norwegian error with retry instructions
    const retryInstructions = this.getRetryInstructions();
    return {
      success: false,
      error: `Beklager, bildegenereringen feilet. Begge arbeidsflyter (primær og fallback) mislyktes.\n\n${retryInstructions}`
    };
  }

  private getRetryInstructions(): string {
    return `Slik kan du prøve igjen:\n• Vent 1-2 minutter og prøv på nytt (ComfyUI kan være overbelastet)\n• Sjekk at ComfyUI kjører: ${this.baseUrl}/system_stats\n• Restart ComfyUI hvis den ikke svarer\n• Prøv å endre beskrivelsen din (kortere eller enklere tekst)\n• Bruk /bildeforklaring for å analysere et eksisterende bilde i stedet\n\nHvis problemet vedvarer, kontakt administrator.`;
  }

  private recordFailure(): void {
    this.failureCount++;
    console.log(`[ComfyUI] Failure recorded. Count: ${this.failureCount}/${this.CIRCUIT_FAILURE_THRESHOLD}`);

    if (this.failureCount >= this.CIRCUIT_FAILURE_THRESHOLD) {
      this.circuitState = 'open';
      this.circuitOpenedAt = Date.now();
      console.log(`[ComfyUI] Circuit breaker OPEN for ${this.CIRCUIT_RESET_TIMEOUT_MS / 1000} seconds`);
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    if (this.circuitState === 'half-open') {
      this.circuitState = 'closed';
      console.log(`[ComfyUI] Circuit breaker CLOSED (success after half-open)`);
    }
  }

  private getRemainingTime(userId: string): string {
    const userQueue = this.queue.get(userId);
    if (!userQueue) return '1 time';
    const remaining = Math.max(0, userQueue.resetTime - Date.now());
    const minutes = Math.ceil(remaining / 60000);
    return `${minutes} minutter`;
  }

  private buildWorkflow(prompt: string): any {
    // Working workflow for ComfyUI-CPU
    return {
      "3": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000000),
          "steps": 15,
          "cfg": 7,
          "sampler_name": "euler",
          "scheduler": "normal",
          "positive": ["5", 0],
          "negative": ["6", 0],
          "latent_image": ["7", 0],
          "denoise": 1.0,
          "model": ["4", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": COMFYUI_MODEL
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "text": prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "6": {
        "inputs": {
          "text": "low quality, blurry, distorted, ugly, text, watermark",
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "width": 512,
          "height": 512,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "inebotten",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }

  private buildSimpleWorkflow(prompt: string): any {
    // Simpler fallback workflow - uses common model names
    return {
      "1": {
        "inputs": {
          "text": prompt,
          "clip": ["2", 0]
        },
        "class_type": "CLIPTextEncode"
      },
      "2": {
        "inputs": {
          "ckpt_name": COMFYUI_FALLBACK_MODEL
        },
        "class_type": "CheckpointLoader"
      },
      "3": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000000),
          "steps": 15,
          "cfg": 7,
          "sampler_name": "euler",
          "scheduler": "normal",
          "positive": ["1", 0],
          "negative": ["1", 0],
          "model": ["2", 0],
          "vae": ["2", 1]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["2", 1]
        },
        "class_type": "VAEDecode"
      },
      "5": {
        "inputs": {
          "filename_prefix": "inebotten_fallback",
          "images": ["4", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }

  private async waitForCompletion(promptId: string): Promise<string> {
    const maxAttempts = 60;
    const interval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));

      try {
        const response = await fetch(`${this.baseUrl}/history/${promptId}`);
        if (response.ok) {
          const data = await response.json() as Record<string, any>;
          if (data[promptId]?.outputs) {
            const outputs = data[promptId].outputs;
            for (const nodeId of Object.keys(outputs)) {
              const node = outputs[nodeId];
              if (node.images) {
                const image = node.images[0];
                return `${this.baseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder}`;
              }
            }
          }
        }
      } catch {
        // Continue polling
      }
    }

    throw new Error('Image generation timeout');
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/system_stats`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async enhancePrompt(prompt: string): Promise<string> {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
    const timeoutMs = 10000;

    const ollama = new OllamaClient(ollamaUrl, ollamaModel, timeoutMs);

    const systemPrompt = `Convert this Norwegian text to a concise English prompt suitable for Stable Diffusion. Add quality keywords like 'detailed, high quality, 4k, beautiful'. Return ONLY the enhanced prompt, nothing else.`;

    try {
      const response = await ollama.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]);

      const enhanced = response.trim();

      if (enhanced && enhanced.length > 0) {
        return enhanced;
      }

      return prompt;
    } catch (error) {
      console.log(`[ComfyUI] enhancePrompt error: ${error instanceof Error ? error.message : error}`);
      return prompt;
    }
  }
}

export const comfyuiClient = new ComfyUIClient();
