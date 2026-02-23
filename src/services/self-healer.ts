import { ErrorClassifier, type ErrorCategory, type RecoveryStrategy, withJitter } from './error-classifier.js';
import { healthMonitor, type ServiceStatus } from './health-monitor.js';

export interface HealingOptions {
  context?: string;
  fallback?: () => Promise<any>;
  onRetry?: (error: Error, attempt: number, category: ErrorCategory) => void;
  onHeal?: (error: Error, category: ErrorCategory) => void;
}

export interface HealingResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  category?: ErrorCategory;
  attempts: number;
  healed: boolean;
}

interface RecoveryMetric {
  category: ErrorCategory;
  timestamp: number;
  success: boolean;
  attempts: number;
}

class SelfHealer {
  private classifier = new ErrorClassifier();
  private metrics: RecoveryMetric[] = [];
  private maxMetrics = 1000;

  async executeWithHealing<T>(
    fn: () => Promise<T>,
    options: HealingOptions = {}
  ): Promise<HealingResult<T>> {
    const { context, fallback, onRetry, onHeal } = options;

    try {
      const data = await fn();
      return { success: true, data, attempts: 1, healed: false };
    } catch (error) {
      const err = error as Error;
      const category = this.classifier.classify(err, context);
      const strategy = this.classifier.getStrategy(category);

      if (!strategy.shouldRetry) {
        this.recordMetric(category, false, 1);
        return {
          success: false,
          error: err,
          category,
          attempts: 1,
          healed: false,
        };
      }

      let lastError = err;

      for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
        try {
          if (onRetry) {
            onRetry(err, attempt, category);
          }

          const delay = this.calculateDelay(attempt, strategy);
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const data = await fn();
          
          if (onHeal) {
            onHeal(err, category);
          }

          this.recordMetric(category, true, attempt + 1);
          return { success: true, data, category, attempts: attempt + 1, healed: true };
        } catch (attemptError) {
          lastError = attemptError as Error;
          
          if (category === 'rate_limit') {
            const retryAfter = this.classifier.getRetryAfterMs(lastError as Error);
            if (retryAfter) {
              await new Promise(resolve => setTimeout(resolve, retryAfter));
            }
          }
        }
      }

      if (fallback) {
        try {
          const data = await fallback();
          this.recordMetric(category, true, strategy.maxRetries + 1);
          return { success: true, data, category, attempts: strategy.maxRetries + 1, healed: true };
        } catch {
          // fallback failed, continue to return error
        }
      }

      this.recordMetric(category, false, strategy.maxRetries + 1);
      return {
        success: false,
        error: lastError,
        category,
        attempts: strategy.maxRetries + 1,
        healed: false,
      };
    }
  }

  private calculateDelay(attempt: number, strategy: RecoveryStrategy): number {
    let delay = strategy.baseDelayMs * Math.pow(strategy.backoffMultiplier, attempt - 1);
    
    if (strategy.useJitter) {
      delay = withJitter(delay);
    }
    
    return Math.min(delay, 30000);
  }

  private recordMetric(category: ErrorCategory, success: boolean, attempts: number): void {
    this.metrics.push({
      category,
      timestamp: Date.now(),
      success,
      attempts,
    });

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics() {
    return [...this.metrics];
  }

  getRecoveryStats() {
    const stats: Record<ErrorCategory, { total: number; success: number; rate: number }> = {
      network: { total: 0, success: 0, rate: 0 },
      auth: { total: 0, success: 0, rate: 0 },
      parsing: { total: 0, success: 0, rate: 0 },
      skill: { total: 0, success: 0, rate: 0 },
      external: { total: 0, success: 0, rate: 0 },
      rate_limit: { total: 0, success: 0, rate: 0 },
      timeout: { total: 0, success: 0, rate: 0 },
      validation: { total: 0, success: 0, rate: 0 },
      unknown: { total: 0, success: 0, rate: 0 },
    };

    for (const metric of this.metrics) {
      stats[metric.category].total++;
      if (metric.success) {
        stats[metric.category].success++;
      }
    }

    for (const category of Object.keys(stats) as ErrorCategory[]) {
      if (stats[category].total > 0) {
        stats[category].rate = stats[category].success / stats[category].total;
      }
    }

    return stats;
  }

  async checkHealthBeforeExecute(service: 'ollama' | 'comfyui'): Promise<{ healthy: boolean; status: ServiceStatus }> {
    const status = service === 'ollama' 
      ? (await healthMonitor.checkOllama()).status 
      : (await healthMonitor.checkComfyUI()).status;
    
    return {
      healthy: status === 'healthy' || status === 'degraded',
      status,
    };
  }
}

export const selfHealer = new SelfHealer();
