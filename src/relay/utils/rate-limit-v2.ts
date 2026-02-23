interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    let times = this.requests.get(key) || [];
    times = times.filter(t => t > windowStart);
    
    if (times.length >= this.config.maxRequests) {
      return false;
    }
    
    times.push(now);
    this.requests.set(key, times);
    return true;
  }

  getRemaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    const times = (this.requests.get(key) || [])
      .filter(t => t > windowStart);
    
    return Math.max(0, this.config.maxRequests - times.length);
  }
}

export const discordRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
});
