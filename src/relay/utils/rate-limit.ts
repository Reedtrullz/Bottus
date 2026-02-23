export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 15 }) {
    this.config = config;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    const times = this.requests.get(key) || [];
    const recentTimes = times.filter(t => t > windowStart);
    
    if (recentTimes.length >= this.config.maxRequests) {
      this.requests.set(key, recentTimes);
      return false;
    }
    
    recentTimes.push(now);
    this.requests.set(key, recentTimes);
    return true;
  }

  getRemaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const times = this.requests.get(key) || [];
    const recentTimes = times.filter(t => t > windowStart);
    return Math.max(0, this.config.maxRequests - recentTimes.length);
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const discordRateLimiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 15
});
