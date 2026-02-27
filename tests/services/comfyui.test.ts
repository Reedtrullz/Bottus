import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mocks before vi.mock is called
const { mockFetch, mockChat } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockChat: vi.fn()
}));

// Mock the modules
vi.mock('node-fetch', () => ({
  default: mockFetch
}));

vi.mock('../../src/relay/ollama.js', () => ({
  OllamaClient: vi.fn().mockImplementation(() => ({
    chat: mockChat
  }))
}));

import { ComfyUIClient } from '../../src/services/comfyui.js';

describe('ComfyUIClient', () => {
  let client: ComfyUIClient;

  beforeEach(() => {
    // Use mockReset to clear both calls AND return value queue
    mockFetch.mockReset();
    mockChat.mockReset();
    mockChat.mockResolvedValue('A beautiful sunset, detailed, high quality, 4k');
    client = new ComfyUIClient('http://localhost:8188');
  });

  describe('rate limiting', () => {
    it('should allow requests within rate limit', () => {
      const userId = 'user-123';
      
      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(client.checkRateLimit(userId)).toBe(true);
      }
      
      // 6th request should be denied
      expect(client.checkRateLimit(userId)).toBe(false);
    });

    it('should track rate limits per user independently', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      
      // Fill up user1's limit
      for (let i = 0; i < 5; i++) {
        client.checkRateLimit(user1);
      }
      
      // user1 should be blocked
      expect(client.checkRateLimit(user1)).toBe(false);
      
      // user2 should still be allowed
      expect(client.checkRateLimit(user2)).toBe(true);
    });

    it('should return remaining quota correctly', () => {
      const userId = 'user-quota-test';
      
      // Initially should have full quota
      expect(client.getRemainingQuota(userId)).toBe(5);
      
      // Use 2 requests
      client.checkRateLimit(userId);
      client.checkRateLimit(userId);
      
      // Should have 3 remaining
      expect(client.getRemainingQuota(userId)).toBe(3);
    });

    it('should reset quota after time window expires', async () => {
      const userId = 'user-reset-test';
      
      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        client.checkRateLimit(userId);
      }
      
      expect(client.checkRateLimit(userId)).toBe(false);
      
      // Manually advance time by 2 hours (beyond the 1 hour window)
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 3600001);
      
      try {
        // Should be reset now - the count resets but it's a fresh window so count starts at 1
        expect(client.checkRateLimit(userId)).toBe(true);
        // After checkRateLimit, count is 1, so remaining should be 4
        expect(client.getRemainingQuota(userId)).toBe(4);
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('checkHealth', () => {
    it('should return true when ComfyUI is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({})
      });

      const result = await client.checkHealth();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8188/system_stats');
    });

    it('should return false when ComfyUI returns non-ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await client.checkHealth();
      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.checkHealth();
      expect(result).toBe(false);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue('Server error') })
        .mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue('Server error') })
        .mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue('Server error') })
        .mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue('Server error') });

      // Try multiple times to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        await client.generateImage('test prompt', 'circuit-user-' + i);
      }

      // Next request should fail with circuit breaker message
      const result = await client.generateImage('test prompt', 'circuit-user-new');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('midlertidig utilgjengelig');
    });
  });

  describe('generateImage', () => {
    it('should return error when health check fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await client.generateImage('test prompt', 'user-health-fail');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('ikke tilgjengelig');
    });

    it('should return error when rate limited', async () => {
      // Create a fresh client to avoid circuit breaker from previous tests
      const freshClient = new ComfyUIClient('http://localhost:8188');
      
      // First, exhaust the rate limit
      const userId = 'rate-limited-user';
      for (let i = 0; i < 5; i++) {
        freshClient.checkRateLimit(userId);
      }

      // Health check must succeed for rate limit to be checked
      mockFetch.mockResolvedValue({ ok: true });

      const result = await freshClient.generateImage('test prompt', userId);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should try fallback workflow on primary failure', async () => {
      mockFetch
        // First call: health check (ok)
        .mockResolvedValueOnce({ ok: true })
        // Second call: primary workflow (fail) - needs json() method
        .mockResolvedValueOnce({ 
          ok: false, 
          status: 500,
          text: vi.fn().mockResolvedValue('Error'),
          json: vi.fn().mockRejectedValue(new Error('Not JSON'))
        })
        // Third call: fallback workflow (success)
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ prompt_id: 'fallback-id' }) })
        // Fourth call: history check
        .mockResolvedValueOnce({ 
          ok: true, 
          json: vi.fn().mockResolvedValue({ 
            'fallback-id': { 
              outputs: { 
                '5': { images: [{ filename: 'fallback.png', subfolder: '' }] } 
              } 
            } 
          }) 
        });

      const result = await client.generateImage('test prompt', 'fallback-user');
      
      // The fallback workflow is attempted
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('enhancePrompt', () => {
    it('should enhance Norwegian prompt to English', async () => {
      const result = await client.enhancePrompt('en katt i en hatt');
      
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return original prompt on Ollama error', async () => {
      // Override the mock to throw
      mockChat.mockRejectedValueOnce(new Error('Ollama error'));
      
      const result = await client.enhancePrompt('test prompt');
      
      // Should return original prompt on error
      expect(result).toBe('test prompt');
    });
  });

  describe('workflow building', () => {
    it('should build primary workflow with correct structure', () => {
      // Access private method via any cast
      const workflow = (client as any).buildWorkflow('a beautiful landscape');
      
      expect(workflow).toHaveProperty('3'); // KSampler
      expect(workflow).toHaveProperty('4'); // CheckpointLoader
      expect(workflow).toHaveProperty('5'); // CLIPTextEncode (positive)
      expect(workflow).toHaveProperty('6'); // CLIPTextEncode (negative)
      expect(workflow).toHaveProperty('7'); // EmptyLatentImage
      expect(workflow).toHaveProperty('8'); // VAEDecode
      expect(workflow).toHaveProperty('9'); // SaveImage
    });

    it('should build simple fallback workflow', () => {
      const workflow = (client as any).buildSimpleWorkflow('a cat');
      
      expect(workflow).toHaveProperty('1'); // CLIPTextEncode
      expect(workflow).toHaveProperty('2'); // CheckpointLoader
      expect(workflow).toHaveProperty('3'); // KSampler
      expect(workflow).toHaveProperty('4'); // VAEDecode
      expect(workflow).toHaveProperty('5'); // SaveImage
    });
  });
});
