/**
 * Test: SkillAdapter context adaptation
 * Verifies that GatewayContext is correctly converted to HandlerContext
 */

import { describe, it, expect, vi } from 'vitest';
import { SkillAdapter } from '../../src/gateway/adapters.js';

// Mock skill that expects HandlerContext
const mockHandlerContextSkill = {
  name: 'test-handler',
  canHandle: vi.fn((message, ctx) => {
    // Should receive adapted context with channelId at top level
    return ctx && typeof ctx.channelId === 'string' && ctx.channelId.length > 0;
  }),
  handle: vi.fn(async (message, ctx) => {
    return { handled: true, response: 'Success!' };
  })
};

describe('SkillAdapter Context Adaptation', () => {
  it('should adapt GatewayContext to HandlerContext format', () => {
    const adapter = new SkillAdapter(mockHandlerContextSkill);
    
    // GatewayContext format (what gateway passes)
    const gatewayContext = {
      message: {
        id: '123',
        channelId: 'channel-456',
        userId: 'user-789',
        username: 'testuser',
        content: 'help',
        isDM: false,
        isGroupDM: true,
        timestamp: Date.now(),
        raw: {}
      },
      discord: {
        sendMessage: vi.fn()
      },
      memory: {
        get: vi.fn(),
        add: vi.fn(),
        clear: vi.fn()
      }
    };
    
    // Test canHandle with adapted context
    const result = adapter.canHandle('help', gatewayContext);
    
    expect(result).toBe(true);
    expect(mockHandlerContextSkill.canHandle).toHaveBeenCalled();
    
    // Verify the adapted context was passed
    const calledCtx = mockHandlerContextSkill.canHandle.mock.calls[0][1];
    expect(calledCtx.channelId).toBe('channel-456');
    expect(calledCtx.userId).toBe('user-789');
    expect(calledCtx.message).toBe('help');
  });

  it('should handle handle method with adapted context', async () => {
    const adapter = new SkillAdapter(mockHandlerContextSkill);
    
    const gatewayContext = {
      message: {
        channelId: 'channel-123',
        userId: 'user-456',
        content: 'test message'
      },
      discord: {
        sendMessage: vi.fn()
      }
    };
    
    const result = await adapter.handle('test message', gatewayContext);
    
    expect(result).toBeDefined();
    expect(result.handled).toBe(true);
    
    // Verify adapted context was passed to handle
    const calledCtx = mockHandlerContextSkill.handle.mock.calls[0][1];
    expect(calledCtx.channelId).toBe('channel-123');
  });
});
