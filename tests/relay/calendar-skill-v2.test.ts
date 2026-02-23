import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarSkillV2 } from '../../src/relay/skills/calendar-skill-v2.js';
import type { HandlerContext } from '../../src/relay/skills/interfaces.js';
import { MockDiscordClient, TEST_CONFIG } from './test-utils.js';

class MockCalendarServiceV2 {
  private events: Map<string, any[]> = new Map();
  
  async initialize(): Promise<void> {}
  
  async createEvent(title: string, startTime: Date, options: any): Promise<any> {
    const event = {
      id: `event-${Date.now()}`,
      title,
      startTime: startTime.toISOString(),
      endTime: options?.endTime?.toISOString() || startTime.toISOString(),
      recurrence: options?.recurrence,
      creatorId: options?.creatorId || 'test-user',
      channelId: options?.channelId || 'test-channel',
    };
    
    const channelEvents = this.events.get(event.channelId) || [];
    channelEvents.push(event);
    this.events.set(event.channelId, channelEvents);
    
    return event;
  }
  
  async getEvents(channelId: string, range?: string): Promise<any[]> {
    return this.events.get(channelId) || [];
  }
  
  async deleteEvent(eventId: string, userId: string): Promise<boolean> {
    for (const [channelId, events] of this.events.entries()) {
      const idx = events.findIndex(e => e.id === eventId);
      if (idx !== -1) {
        const event = events[idx];
        if (event.creatorId === userId) {
          events.splice(idx, 1);
          return true;
        }
        return false;
      }
    }
    return false;
  }
  
  parseNaturalDate(message: string): { start: Date; end?: Date; recurrence?: string } | null {
    const lower = message.toLowerCase();
    const now = new Date();
    
    if (lower.includes('imorgen') || lower.includes('i morgen')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      return { start: tomorrow };
    }
    
    const timeMatch = message.match(/kl[okken]?\s*(\d{1,2})(?::(\d{2}))?/i);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const date = new Date(now);
      date.setHours(hours, minutes, 0, 0);
      return { start: date };
    }
    
    return null;
  }
  
  generateICS(events: any[]): string {
    if (events.length === 0) return '';
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
    for (const event of events) {
      ics += 'BEGIN:VEVENT\n';
      ics += `SUMMARY:${event.title}\n`;
      ics += 'END:VEVENT\n';
    }
    ics += 'END:VCALENDAR';
    return ics;
  }
  
  async getEventById(eventId: string): Promise<any | null> {
    for (const events of this.events.values()) {
      const event = events.find(e => e.id === eventId);
      if (event) return event;
    }
    return null;
  }
  
  async updateEvent(eventId: string, updates: Partial<any>): Promise<boolean> {
    for (const events of this.events.values()) {
      const idx = events.findIndex(e => e.id === eventId);
      if (idx !== -1) {
        events[idx] = { ...events[idx], ...updates };
        return true;
      }
    }
    return false;
  }
}

class MockCalendarDisplayService {
  async buildWeekEmbed(...args: any[]): Promise<{ fields: Array<{ name: string; value: string }> } | null> {
    return {
      fields: [
        { name: 'Mandag', value: 'Ingen hendelser' },
        { name: 'Tirsdag', value: 'Møte kl 14:00' },
      ]
    };
  }
  
  async getDayDetails(date: Date): Promise<any[]> {
    const day = date.getDay();
    if (day === 2) {
      return [{ title: 'Møte', start_time: '14:00', end_time: '15:00' }];
    }
    return [];
  }
}

describe('CalendarSkillV2', () => {
  let skill: CalendarSkillV2;
  let mockCalendar: MockCalendarServiceV2;
  let mockDisplay: MockCalendarDisplayService;
  let mockDiscord: MockDiscordClient;
  let ctx: HandlerContext;

  beforeEach(() => {
    mockCalendar = new MockCalendarServiceV2();
    mockDisplay = new MockCalendarDisplayService();
    skill = new CalendarSkillV2(mockCalendar as any);
    (skill as any).displayService = mockDisplay;
    mockDiscord = new MockDiscordClient();
    ctx = {
      userId: TEST_CONFIG.userId,
      channelId: TEST_CONFIG.channelId,
      message: '',
      discord: mockDiscord,
    };
  });

  describe('canHandle', () => {
    it('should handle calendar keyword', () => {
      expect(skill.canHandle('calendar', ctx)).toBe(true);
      expect(skill.canHandle('kalender', ctx)).toBe(true);
    });

    it('should handle event keyword', () => {
      expect(skill.canHandle('event', ctx)).toBe(true);
    });

    it('should handle remind keyword', () => {
      expect(skill.canHandle('remind me', ctx)).toBe(true);
    });

    it('should handle schedule keyword', () => {
      expect(skill.canHandle('schedule', ctx)).toBe(true);
      expect(skill.canHandle('planlegg', ctx)).toBe(true);
    });

    it('should handle møte keyword', () => {
      expect(skill.canHandle('møte', ctx)).toBe(true);
      expect(skill.canHandle('avtale', ctx)).toBe(true);
    });

    it('should handle natural date parsing', () => {
      expect(skill.canHandle('lag arrangement imorgen kl 14', ctx)).toBe(true);
    });

    it('should return false for unrelated messages', () => {
      expect(skill.canHandle('hei, hvordan går det?', ctx)).toBe(false);
    });
  });

  describe('handle - create event', () => {
    it('should create event with natural date', async () => {
      const result = await skill.handle('lag arrangement møte imorgen kl 14', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Created event');
    });

    it('should create event with time', async () => {
      const result = await skill.handle('lag arrangement workshop kl 10', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Created event');
    });
  });

  describe('handle - list events', () => {
    it('should list events with "hva skjer"', async () => {
      const result = await skill.handle('hva skjer', ctx);
      expect(result.handled).toBe(true);
    });

    it('should list events with "list events"', async () => {
      const result = await skill.handle('list events', ctx);
      expect(result.handled).toBe(true);
    });

    it('should list events with "what\'s coming"', async () => {
      const result = await skill.handle("what's coming", ctx);
      expect(result.handled).toBe(true);
    });
  });

  describe('handle - week view', () => {
    it('should show week view with "uke"', async () => {
      const result = await skill.handle('kalender uke', ctx);
      expect(result.handled).toBe(true);
    });

    it('should show week view with "week"', async () => {
      const result = await skill.handle('calendar week', ctx);
      expect(result.handled).toBe(true);
    });
  });

  describe('handle - month view', () => {
    it('should show month view with "måned"', async () => {
      const result = await skill.handle('kalender måned', ctx);
      expect(result.handled).toBe(true);
    });

    it('should show month view with "month"', async () => {
      const result = await skill.handle('calendar month', ctx);
      expect(result.handled).toBe(true);
    });

    it('should show specific month', async () => {
      const result = await skill.handle('kalender januar 2025', ctx);
      expect(result.handled).toBe(true);
    });
  });

  describe('handle - today', () => {
    it('should show today events with "today"', async () => {
      const result = await skill.handle('today', ctx);
      expect(result.handled).toBe(true);
    });

    it('should show today events with "idag"', async () => {
      const result = await skill.handle('i dag', ctx);
      expect(result.handled).toBe(true);
    });
  });

  describe('handle - export', () => {
    it('should export calendar with "eksport"', async () => {
      await mockCalendar.createEvent('Test Event', new Date(), {
        creatorId: TEST_CONFIG.userId,
        channelId: TEST_CONFIG.channelId,
      });
      
      const result = await skill.handle('eksport kalender', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('BEGIN:VCALENDAR');
    });

    it('should export calendar with "export"', async () => {
      const result = await skill.handle('export ics', ctx);
      expect(result.handled).toBe(true);
    });

    it('should handle empty calendar export', async () => {
      const result = await skill.handle('eksport kalender', ctx);
      expect(result.handled).toBe(true);
    });
  });

  describe('handle - delete', () => {
    it('should delete event', async () => {
      await mockCalendar.createEvent('Test møte', new Date(), {
        creatorId: TEST_CONFIG.userId,
        channelId: TEST_CONFIG.channelId,
      });
      
      const result = await skill.handle('slett møte', ctx);
      expect(result.handled).toBe(true);
    });

    it('should handle delete without title', async () => {
      const result = await skill.handle('slett', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Please provide');
    });
  });

  describe('handle - unknown command', () => {
    it('should return help message for unknown commands', async () => {
      const result = await skill.handle('random text without date', ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('I can create calendar events');
    });
  });
});
