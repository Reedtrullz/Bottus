import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReminderService } from '../../src/services/reminders.js';

vi.mock('../../src/db/index.js', () => ({
  eventDb: {
    findUpcoming: vi.fn()
  },
  taskDb: {
    findPending: vi.fn(),
    create: vi.fn()
  }
}));

import { eventDb, taskDb } from '../../src/db/index.js';

describe('ReminderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('start/stop', () => {
    it('should start interval', () => {
      const service = new ReminderService();
      service.start();
      // Interval should be set
      expect(service).toBeInstanceOf(ReminderService);
      service.stop();
    });

    it('should stop interval', () => {
      const service = new ReminderService();
      service.start();
      service.stop();
      // Should not throw
    });
  });

  describe('handleTasksCommand', () => {
    it('should reply with no tasks message when empty', async () => {
      (taskDb.findPending as any).mockReturnValue([]);
      
      const service = new ReminderService();
      const mockReply = vi.fn().mockResolvedValue({});
      const interaction = { reply: mockReply };
      
      await service.handleTasksCommand(interaction as any);
      
      expect(mockReply).toHaveBeenCalledWith({
        content: 'Ingen oppgaver! 🎉',
        ephemeral: true
      });
    });

    it('should return list of tasks', async () => {
      (taskDb.findPending as any).mockReturnValue([
        { title: 'Buy milk', due_time: 1704067200 },
        { title: 'Call mom', due_time: null }
      ]);
      
      const service = new ReminderService();
      const mockReply = vi.fn().mockResolvedValue({});
      const interaction = { reply: mockReply };
      
      await service.handleTasksCommand(interaction as any);
      
      expect(mockReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Buy milk')
        })
      );
    });

    it('should limit to 10 tasks', async () => {
      const tasks = Array.from({ length: 15 }, (_, i) => ({ title: `Task ${i}` }));
      (taskDb.findPending as any).mockReturnValue(tasks);
      
      const service = new ReminderService();
      const mockReply = vi.fn().mockResolvedValue({});
      const interaction = { reply: mockReply };
      
      await service.handleTasksCommand(interaction as any);
      
      const replyContent = mockReply.mock.calls[0][0].content;
      expect(replyContent).not.toContain('Task 10');
    });
  });

  describe('createTask', () => {
    it('should create task and return id', async () => {
      (taskDb.create as any).mockReturnValue('task-123');
      
      const service = new ReminderService();
      const result = await service.createTask('user-1', 'Test task', 1704067200);
      
      expect(taskDb.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'Test task',
        dueTime: 1704067200,
        ttl: 3600
      });
      expect(result).toBe('task-123');
    });

    it('should create task without due time', async () => {
      (taskDb.create as any).mockReturnValue('task-456');
      
      const service = new ReminderService();
      const result = await service.createTask('user-1', 'Test task');
      
      expect(taskDb.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'Test task',
        dueTime: undefined,
        ttl: 3600
      });
      expect(result).toBe('task-456');
    });
  });
});
