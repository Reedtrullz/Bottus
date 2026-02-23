import fetch from 'node-fetch';

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';

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
    // Health check first
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      return {
        success: false,
        error: `ComfyUI is ikke tilgjengelig. Sjekk at ComfyUI kjører på ${this.baseUrl}`
      };
    }

    if (!this.checkRateLimit(userId)) {
      const remaining = this.getRemainingRemainingTime(userId);
      return {
        success: false,
        error: `Rate limit exceeded. ${remaining}`
      };
    }

    // Try primary workflow first
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
        const fallbackWorkflow = this.buildSimpleWorkflow(prompt);
        
        const fallbackResponse = await fetch(`${this.baseUrl}/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: fallbackWorkflow
          })
        });

        if (!fallbackResponse.ok) {
          return {
            success: false,
            error: `Begge bildegenereringsforsøk feilet. Primær: ${response.status}, Fallback: ${fallbackResponse.status}`
          };
        }

        const fallbackData = await fallbackResponse.json() as { prompt_id: string };
        const imageUrl = await this.waitForCompletion(fallbackData.prompt_id);
        
        return {
          success: true,
          imageUrl
        };
      }

      const data = await response.json() as { prompt_id: string };
      const imageUrl = await this.waitForCompletion(data.prompt_id);
      
      return {
        success: true,
        imageUrl
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate image: ${error}`
      };
    }
  }

  private getRemainingRemainingTime(userId: string): string {
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
          "ckpt_name": "v1-5-pruned-emaonly.safetensors"
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
          "ckpt_name": "sd15_default.yaml"
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
}

export const comfyuiClient = new ComfyUIClient();
