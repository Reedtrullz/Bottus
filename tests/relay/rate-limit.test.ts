import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, discordRateLimiter } from '../../src/relay/utils/rate-limit.js';
import type { RateLimitConfig } from '../../src/relay/utils/rate-limit.js';

describe('rate-limit', () => {
  describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      limiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });
    });

    describe('isAllowed', () => {
      it('should return true when under limit', () => {
        expect(limiter.isAllowed('user1')).toBe(true);
        expect(limiter.isAllowed('user1')).toBe(true);
        expect(limiter.isAllowed('user1')).toBe(true);
      });

      it('should return false when limit exceeded', () => {
        // Make 5 requests (at limit)
        for (let i = 0; i < 5; i++) {
          expect(limiter.isAllowed('user1')).toBe(true);
        }
        // 6th request should be blocked
        expect(limiter.isAllowed('user1')).toBe(false);
      });

      it('should return false when limit is exactly reached', () => {
        // Fill up to the limit
        for (let i = 0; i < 5; i++) {
          const allowed = limiter.isAllowed('user1');
          expect(allowed).toBe(true);
        }
        // Next request should be denied
        expect(limiter.isAllowed('user1')).toBe(false);
      });
    });

    describe('getRemaining', () => {
      it('should return correct count', () => {
        expect(limiter.getRemaining('user1')).toBe(5);
        
        limiter.isAllowed('user1');
        expect(limiter.getRemaining('user1')).toBe(4);
        
        limiter.isAllowed('user1');
        expect(limiter.getRemaining('user1')).toBe(3);
      });

      it('should return 0 when limit exceeded', () => {
        // Use all 5 slots
        for (let i = 0; i < 5; i++) {
          limiter.isAllowed('user1');
        }
        
        expect(limiter.getRemaining('user1')).toBe(0);
        
        // Even after being blocked, remaining should be 0
        limiter.isAllowed('user1');
        expect(limiter.getRemaining('user1')).toBe(0);
      });

      it('should return maxRequests for unknown key', () => {
        expect(limiter.getRemaining('unknown')).toBe(5);
      });
    });

    describe('reset', () => {
      it('should clear the rate limit', () => {
        // Use some requests
        limiter.isAllowed('user1');
        limiter.isAllowed('user1');
        expect(limiter.getRemaining('user1')).toBe(3);
        
        // Reset
        limiter.reset('user1');
        
        // Should be back to full capacity
        expect(limiter.getRemaining('user1')).toBe(5);
        expect(limiter.isAllowed('user1')).toBe(true);
      });

      it('should handle reset of non-existent key', () => {
        expect(() => limiter.reset('nonexistent')).not.toThrow();
      });
    });

    describe('different keys', () => {
      it('should have independent limits', () => {
        // Fill up user1
        for (let i = 0; i < 5; i++) {
          limiter.isAllowed('user1');
        }
        
        // user1 should be blocked
        expect(limiter.isAllowed('user1')).toBe(false);
        
        // user2 should still have full capacity
        expect(limiter.isAllowed('user2')).toBe(true);
        expect(limiter.getRemaining('user2')).toBe(4);
      });
    });

    describe('window expiration', () => {
      it('should allow requests after window expires', async () => {
        // Use a very short window
        const shortLimiter = new RateLimiter({ windowMs: 50, maxRequests: 2 });
        
        // Use both slots
        expect(shortLimiter.isAllowed('user1')).toBe(true);
        expect(shortLimiter.isAllowed('user1')).toBe(true);
        
        // Should be blocked
        expect(shortLimiter.isAllowed('user1')).toBe(false);
        
        // Wait for window to expire
        await new Promise(resolve => setTimeout(resolve, 60));
        
        // Should be allowed again
        expect(shortLimiter.isAllowed('user1')).toBe(true);
      });

      it('should correctly count remaining after window partially expires', async () => {
        const shortLimiter = new RateLimiter({ windowMs: 50, maxRequests: 3 });
        
        // Make 3 requests
        shortLimiter.isAllowed('user1');
        shortLimiter.isAllowed('user1');
        shortLimiter.isAllowed('user1');
        
        expect(shortLimiter.getRemaining('user1')).toBe(0);
        
        // Wait for window to expire
        await new Promise(resolve => setTimeout(resolve, 60));
        
        // Should have full capacity again
        expect(shortLimiter.getRemaining('user1')).toBe(3);
      });
    });
  });

  describe('default config', () => {
    it('should use default config when not provided', () => {
      const limiter = new RateLimiter();
      
      // Default: 15 requests per 60000ms
      for (let i = 0; i < 15; i++) {
        expect(limiter.isAllowed('user')).toBe(true);
      }
      expect(limiter.isAllowed('user')).toBe(false);
    });
  });

  describe('discordRateLimiter singleton', () => {
    it('should be an instance of RateLimiter', () => {
      expect(discordRateLimiter).toBeInstanceOf(RateLimiter);
    });

    it('should have default config', () => {
      expect(discordRateLimiter.isAllowed('test')).toBe(true);
      expect(discordRateLimiter.getRemaining('test')).toBe(14);
    });
  });

  describe('RateLimitConfig interface', () => {
    it('should accept valid config', () => {
      const config: RateLimitConfig = { windowMs: 1000, maxRequests: 10 };
      const limiter = new RateLimiter(config);
      
      expect(limiter.isAllowed('user')).toBe(true);
      expect(limiter.getRemaining('user')).toBe(9);
    });

    it('should handle custom window and maxRequests', () => {
      const config: RateLimitConfig = { windowMs: 1000, maxRequests: 1 };
      const limiter = new RateLimiter(config);
      
      expect(limiter.isAllowed('user')).toBe(true);
      expect(limiter.isAllowed('user')).toBe(false);
    });
  });
});
