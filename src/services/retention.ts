import { eventDb, taskDb } from '../db/index.js';

export class DataRetentionService {
  private intervalId: NodeJS.Timeout | null = null;
  
  constructor() {}
  
  start(): void {
    this.intervalId = setInterval(() => this.purgeExpired(), 300000);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private purgeExpired(): void {
    const eventsDeleted = eventDb.deleteExpired();
    const tasksDeleted = taskDb.deleteExpired();
    
    if (eventsDeleted.changes > 0 || tasksDeleted.changes > 0) {
      console.log(`Purged ${eventsDeleted.changes} events and ${tasksDeleted.changes} tasks`);
    }
  }
}
