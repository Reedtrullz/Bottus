import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService } from '../../src/services/memory.js';

vi.mock('../../src/db/index.js', () => ({
  memoryDb: {
    store: vi.fn().mockResolvedValue('memory-id-123'),
    recall: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue([]),
    delete: vi.fn()
  }
}));

import { memoryDb } from '../../src/db/index.js';

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MemoryService();
  });

  describe('store', () => {
    it('should store memory and return id', async () => {
      const result = await service.store('user-1', 'I like pizza');
      
      expect(memoryDb.store).toHaveBeenCalledWith('user-1', 'I like pizza');
      expect(result).toBe('memory-id-123');
    });
  });

  describe('recall', () => {
    it('should recall memories for user', async () => {
      const memories = [{ id: '1', fact: 'I like pizza' }];
      (memoryDb.recall as any).mockResolvedValue(memories);
      
      const result = await service.recall('user-1');
      
      expect(memoryDb.recall).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(memories);
    });
  });

  describe('search', () => {
    it('should search memories', async () => {
      const results = [{ id: '1', fact: 'I like pizza' }];
      (memoryDb.search as any).mockResolvedValue(results);
      
      const result = await service.search('user-1', 'pizza');
      
      expect(memoryDb.search).toHaveBeenCalledWith('user-1', 'pizza');
      expect(result).toEqual(results);
    });
  });

  describe('delete', () => {
    it('should delete memory by id', async () => {
      await service.delete('memory-1');
      
      expect(memoryDb.delete).toHaveBeenCalledWith('memory-1');
    });
  });
});
