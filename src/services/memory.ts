import { memoryDb } from '../db/index.js';
export class MemoryService {
  async store(userId: string, fact: string): Promise<string> {
    return memoryDb.store(userId, fact);
  }

  async recall(userId: string): Promise<any[]> {
    return memoryDb.recall(userId);
  }

  async search(userId: string, query: string): Promise<any[]> {
    return memoryDb.search(userId, query);
  }

  async delete(id: string): Promise<void> {
    memoryDb.delete(id);
  }
}
