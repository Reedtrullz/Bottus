export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime?: number;
  private halfOpenCalls = 0;
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 60000,
      halfOpenMaxCalls: options.halfOpenMaxCalls ?? 3,
    };
  }

  getState(): CircuitState {
    if (this.state === 'open' && this.shouldAttemptReset()) {
      this.state = 'half-open';
      this.halfOpenCalls = 0;
    }
    return this.state;
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'open') {
      throw new Error('Circuit breaker is open');
    }

    if (currentState === 'half-open' && this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
      throw new Error('Circuit breaker is open (half-open limit reached)');
    }

    if (currentState === 'half-open') {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failures = 0;
      this.halfOpenCalls = 0;
      this.lastFailureTime = undefined;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open' || this.failures >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }

  getStats(): { state: CircuitState; failures: number; lastFailureTime?: number } {
    return {
      state: this.getState(),
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = undefined;
  }
}
