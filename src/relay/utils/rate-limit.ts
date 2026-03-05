export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstLimit?: number;
  cooldownMs?: number;
}

interface RateLimitEntry {
  times: number[];
  consecutiveFailures: number;
  lastFailureTime?: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 15 }) {
    this.config = {
      windowMs: config.windowMs ?? 60000,
      maxRequests: config.maxRequests ?? 15,
      burstLimit: config.burstLimit ?? 3,
      cooldownMs: config.cooldownMs ?? 5000,
    };
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.getOrCreateEntry(key);
    
    if (this.isInCooldown(entry, now)) {
      return false;
    }

    const windowStart = now - this.config.windowMs;
    const recentTimes = entry.times.filter(t => t > windowStart);
    
    if (recentTimes.length >= this.config.maxRequests) {
      entry.times = recentTimes;
      return false;
    }

    recentTimes.push(now);
    entry.times = recentTimes;
    this.requests.set(key, entry);
    return true;
  }

  private getOrCreateEntry(key: string): RateLimitEntry {
    const existing = this.requests.get(key);
    if (existing) return existing;
    
    const entry: RateLimitEntry = {
      times: [],
      consecutiveFailures: 0,
    };
    this.requests.set(key, entry);
    return entry;
  }

  private isInCooldown(entry: RateLimitEntry, now: number): boolean {
    if (!entry.lastFailureTime) return false;
    const backoffMs = this.calculateBackoff(entry.consecutiveFailures);
    return now - entry.lastFailureTime < backoffMs;
  }

  private calculateBackoff(failures: number): number {
    const baseBackoff = this.config.cooldownMs;
    const exponential = Math.min(failures, 6);
    return baseBackoff * Math.pow(2, exponential);
  }

  recordFailure(key: string): void {
    const entry = this.getOrCreateEntry(key);
    entry.consecutiveFailures++;
    entry.lastFailureTime = Date.now();
    this.requests.set(key, entry);
  }

  recordSuccess(key: string): void {
    const entry = this.requests.get(key);
    if (entry && entry.consecutiveFailures > 0) {
      entry.consecutiveFailures = 0;
      entry.lastFailureTime = undefined;
      this.requests.set(key, entry);
    }
  }

  getRemaining(key: string): number {
    const now = Date.now();
    const entry = this.requests.get(key);
    if (!entry) return this.config.maxRequests;
    
    const windowStart = now - this.config.windowMs;
    const recentTimes = entry.times.filter(t => t > windowStart);
    return Math.max(0, this.config.maxRequests - recentTimes.length);
  }

  getBackoffTime(key: string): number {
    const entry = this.requests.get(key);
    if (!entry || !entry.lastFailureTime) return 0;
    
    const backoffMs = this.calculateBackoff(entry.consecutiveFailures);
    const elapsed = Date.now() - entry.lastFailureTime;
    return Math.max(0, backoffMs - elapsed);
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  getStats(key: string): { requests: number; failures: number; backoffMs: number } {
    const entry = this.requests.get(key);
    if (!entry) return { requests: 0, failures: 0, backoffMs: 0 };
    
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const recentTimes = entry.times.filter(t => t > windowStart);
    
    return {
      requests: recentTimes.length,
      failures: entry.consecutiveFailures,
      backoffMs: this.getBackoffTime(key),
    };
  }
}

export const discordRateLimiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 15,
  burstLimit: 3,
  cooldownMs: 5000,
});
