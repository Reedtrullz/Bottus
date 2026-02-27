import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../../src/gateway/event-bus.js';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on', () => {
    it('should register an event handler', async () => {
      const handler = vi.fn().mockResolvedValue({ handled: true });
      bus.on('test-event', handler);
      
      await bus.emit('test-event', { content: 'test' }, {});
      
      expect(handler).toHaveBeenCalled();
    });

    it('should allow multiple handlers for different events', async () => {
      const handler1 = vi.fn().mockResolvedValue({ handled: true });
      const handler2 = vi.fn().mockResolvedValue({ handled: true });
      
      bus.on('event1', handler1);
      bus.on('event2', handler2);
      
      await bus.emit('event1', { content: 'test' }, {});
      await bus.emit('event2', { content: 'test' }, {});
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('onDefault', () => {
    it('should register a default handler', async () => {
      const handler = vi.fn().mockResolvedValue({ handled: true });
      bus.onDefault(handler);
      
      await bus.emit('unknown-event', { content: 'test' }, {});
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should call specific handler when event matches', async () => {
      const handler = vi.fn().mockResolvedValue({ handled: true });
      bus.on('specific', handler);
      
      const result = await bus.emit('specific', { content: 'hello' }, { channelId: '123' });
      
      expect(handler).toHaveBeenCalledWith(
        { content: 'hello' },
        { channelId: '123' }
      );
      expect(result).toEqual({ handled: true });
    });

    it('should call default handler when no specific handler exists', async () => {
      const defaultHandler = vi.fn().mockResolvedValue({ handled: false });
      bus.onDefault(defaultHandler);
      
      const result = await bus.emit('no-handler-event', { content: 'test' }, {});
      
      expect(defaultHandler).toHaveBeenCalled();
      expect(result).toEqual({ handled: false });
    });

    it('should return { handled: false } when no handlers exist', async () => {
      const result = await bus.emit('unknown', { content: 'test' }, {});
      
      expect(result).toEqual({ handled: false });
    });

    it('should prioritize specific handler over default', async () => {
      const specificHandler = vi.fn().mockResolvedValue({ handled: true });
      const defaultHandler = vi.fn().mockResolvedValue({ handled: false });
      
      bus.on('event', specificHandler);
      bus.onDefault(defaultHandler);
      
      await bus.emit('event', { content: 'test' }, {});
      
      expect(specificHandler).toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should remove a handler', async () => {
      const handler = vi.fn().mockResolvedValue({ handled: true });
      bus.on('removable', handler);
      bus.off('removable');
      
      await bus.emit('removable', { content: 'test' }, {});
      
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
