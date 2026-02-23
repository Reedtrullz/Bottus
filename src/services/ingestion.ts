import { eventDb, taskDb } from '../db/index.js';

export class MessageIngestion {
  constructor(
    private consentManager: any,
    private extractionService: any,
    private toneLearningService: any
  ) {}
  
  async process(message: any): Promise<void> {
    const userId = message.author.id;
    
    if (!this.consentManager.hasConsent(userId)) {
      return;
    }
    
    const extracted = this.extractionService.extract(message.content);
    
    for (const item of extracted) {
      if (item.type === 'event' && item.startTime) {
        const eventId = eventDb.create({
          userId,
          channelId: message.channel.id,
          title: item.title,
          description: item.description,
          startTime: item.startTime,
          sourceMessageId: message.id,
          recurrenceRule: (item as any).recurrenceRule
        });
        console.log(`Created event: ${item.title} (${eventId})`);
      }
      
      if (item.type === 'task') {
        const taskId = taskDb.create({
          userId,
          channelId: message.channel.id,
          title: item.title,
          dueTime: item.dueTime || item.startTime,
          sourceMessageId: message.id
        });
        console.log(`Created task: ${item.title} (${taskId})`);
      }
    }
    
    await this.toneLearningService.updateTone(userId, undefined, message.content);
  }
}
