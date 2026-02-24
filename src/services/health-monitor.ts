export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthStatus {
  service: string;
  status: ServiceStatus;
  responseTimeMs?: number;
  lastChecked: number;
  error?: string;
}

export interface HealthReport {
  overall: ServiceStatus;
  services: HealthStatus[];
  timestamp: number;
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';

class HealthMonitor {
  private ollamaLastCheck = 0;
  private comfyuiLastCheck = 0;
  private ollamaStatus: HealthStatus = { service: 'ollama', status: 'unknown', lastChecked: 0 };
  private comfyuiStatus: HealthStatus = { service: 'comfyui', status: 'unknown', lastChecked: 0 };
  private checkIntervalMs = 30000;

  async checkOllama(force = false): Promise<HealthStatus> {
    const now = Date.now();
    if (!force && now - this.ollamaLastCheck < this.checkIntervalMs && this.ollamaStatus.status !== 'unknown') {
      return this.ollamaStatus;
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${OLLAMA_URL}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.ollamaStatus = {
          service: 'ollama',
          status: 'healthy',
          responseTimeMs: responseTime,
          lastChecked: now,
        };
      } else {
        this.ollamaStatus = {
          service: 'ollama',
          status: 'degraded',
          responseTimeMs: responseTime,
          lastChecked: now,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      this.ollamaStatus = {
        service: 'ollama',
        status: 'unhealthy',
        lastChecked: now,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }

    this.ollamaLastCheck = now;
    return this.ollamaStatus;
  }

  async checkComfyUI(force = false): Promise<HealthStatus> {
    const now = Date.now();
    if (!force && now - this.comfyuiLastCheck < this.checkIntervalMs && this.comfyuiStatus.status !== 'unknown') {
      return this.comfyuiStatus;
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${COMFYUI_URL}/system_stats`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.comfyuiStatus = {
          service: 'comfyui',
          status: 'healthy',
          responseTimeMs: responseTime,
          lastChecked: now,
        };
      } else {
        this.comfyuiStatus = {
          service: 'comfyui',
          status: 'degraded',
          responseTimeMs: responseTime,
          lastChecked: now,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      this.comfyuiStatus = {
        service: 'comfyui',
        status: 'unhealthy',
        lastChecked: now,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }

    this.comfyuiLastCheck = now;
    return this.comfyuiStatus;
  }

  async getOverallHealth(force = false): Promise<HealthReport> {
    const [ollama, comfyui] = await Promise.all([
      this.checkOllama(force),
      this.checkComfyUI(force),
    ]);

    const services = [ollama, comfyui];
    const hasUnhealthy = services.some(s => s.status === 'unhealthy');
    const hasDegraded = services.some(s => s.status === 'degraded');

    let overall: ServiceStatus;
    if (hasUnhealthy) {
      overall = 'unhealthy';
    } else if (hasDegraded) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      services,
      timestamp: Date.now(),
    };
  }

  getCachedStatus(service: 'ollama' | 'comfyui'): HealthStatus {
    return service === 'ollama' ? this.ollamaStatus : this.comfyuiStatus;
  }
}

export const healthMonitor = new HealthMonitor();
