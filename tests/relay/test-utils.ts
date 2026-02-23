import type { HandlerContext } from '../../src/relay/skills/interfaces.js';

export class MockDiscordClient {
  sentMessages: Array<{ channelId: string; content: string }> = [];
  
  async sendMessage(channelId: string, content: string): Promise<any> {
    this.sentMessages.push({ channelId, content });
    return { id: 'mock-message-id', channelId, content };
  }
  
  clearMessages(): void {
    this.sentMessages = [];
  }
}

export function createMockContext(overrides?: Partial<HandlerContext>): HandlerContext {
  const mockDiscord = new MockDiscordClient();
  return {
    userId: 'test-user-123',
    channelId: 'test-channel-456',
    message: '',
    discord: mockDiscord,
    ...overrides,
  };
}

export const TEST_CONFIG = {
  userId: 'test-user-123',
  channelId: 'test-channel-456',
  anotherUserId: 'test-user-789',
  anotherChannelId: 'test-channel-999',
};
