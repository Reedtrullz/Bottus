import { eventDb, taskDb } from '../db/index.js';

export class ReminderService {
  private intervalId: NodeJS.Timeout | null = null;
  
  constructor() {}
  
  start(): void {
    this.intervalId = setInterval(() => this.checkReminders(), 60000);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private async checkReminders(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const upcomingEvents = eventDb.findUpcoming(5) as any[];
    
    for (const event of upcomingEvents) {
      const minutesUntil = (event.start_time - now) / 60;
      
      if (minutesUntil <= 60 && minutesUntil > 55) {
        console.log(`Reminder: ${event.title} starts in ${Math.round(minutesUntil)} minutes`);
      }
    }
  }
  
  async handleTasksCommand(interaction: any): Promise<void> {
    const tasks = taskDb.findPending() as any[];
    
    if (tasks.length === 0) {
      await interaction.reply({
        content: 'Ingen oppgaver! 🎉',
        ephemeral: true
      });
      return;
    }
    
    const taskList = tasks.slice(0, 10).map((task, i) => 
      `${i + 1}. ${task.title}${task.due_time ? ` (${new Date(task.due_time * 1000).toLocaleDateString('no-NO')})` : ''}`
    ).join('\n');
    
    await interaction.reply({
      content: `📋 Oppgaver:\n${taskList}`,
      ephemeral: true
    });
  }
  
  async createTask(userId: string, title: string, dueTime?: number): Promise<string> {
    return taskDb.create({
      userId,
      title,
      dueTime,
      ttl: 3600
    });
  }
}
