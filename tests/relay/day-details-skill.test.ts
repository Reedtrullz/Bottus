import { describe, it, expect, beforeEach } from 'vitest';
import { DayDetailsSkill } from '../../src/relay/skills/day-details-skill.js';
import type { HandlerContext } from '../../src/relay/skills/interfaces.js';
import { MockDiscordClient, TEST_CONFIG } from './test-utils.js';

class MockCalendarDisplayService {
  async getDayDetails(date: Date): Promise<any[]> {
    const day = date.getDay();
    if (day === 2) {
      return [
        {
          title: 'Team møte',
          start_time: '14:00',
          end_time: '15:00',
          description: 'Ukentlig team meeting',
          attendees: ['Alice', 'Bob', 'Charlie'],
          rsvp_status: 'confirmed'
        }
      ];
    }
    if (day === 4) {
      return [
        {
          title: 'Workshop',
          start_time: '10:00',
          end_time: '12:00',
          description: 'Tech workshop',
          attendees: ['Team'],
          rsvp_status: 'pending'
        }
      ];
    }
    return [];
  }
}

describe('DayDetailsSkill', () => {
  let skill: DayDetailsSkill;
  let mockDiscord: MockDiscordClient;
  let ctx: HandlerContext;

  beforeEach(() => {
    skill = new DayDetailsSkill();
    mockDiscord = new MockDiscordClient();
    ctx = {
      userId: TEST_CONFIG.userId,
      channelId: TEST_CONFIG.channelId,
      message: '',
      discord: mockDiscord,
    };
    (skill as any).displayService = new MockCalendarDisplayService();
  });

  describe('canHandle', () => {
    it('should handle "detaljer om" pattern', () => {
      expect(skill.canHandle('detaljer om mandag', ctx)).toBe(true);
      expect(skill.canHandle('detaljer om imorgen', ctx)).toBe(true);
    });

    it('should handle "vis dag" pattern', () => {
      expect(skill.canHandle('vis dag mandag', ctx)).toBe(true);
      expect(skill.canHandle('vis imorgen', ctx)).toBe(true);
    });

    it('should handle "vis" pattern without dag', () => {
      expect(skill.canHandle('vis tirsdag', ctx)).toBe(true);
    });

    it('should return false for unrelated messages', () => {
      expect(skill.canHandle('hei, hvordan går det?', ctx)).toBe(false);
    });

    it('should return false for empty message', () => {
      expect(skill.canHandle('', ctx)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(skill.canHandle('DETALJER OM MANDAG', ctx)).toBe(true);
      expect(skill.canHandle('VIS DAG TIRSDAG', ctx)).toBe(true);
    });
  });

  describe('handle - valid date', () => {
    it('should return event details for valid date with events', async () => {
      const tuesday = getNextWeekday(2);
      const result = await skill.handle(`detaljer om ${tuesday.toDateString()}`, ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Team møte');
      expect(result.response).toContain('14:00');
    });

    it('should return "ingen hendelser" for date without events', async () => {
      const wednesday = getNextWeekday(3);
      const result = await skill.handle(`detaljer om ${wednesday.toDateString()}`, ctx);
      expect(result.handled).toBe(true);
      expect(result.response).toContain('Ingen hendelser');
    });

    it('should include description when available', async () => {
      const tuesday = getNextWeekday(2);
      const result = await skill.handle(`detaljer om ${tuesday.toDateString()}`, ctx);
      expect(result.response).toContain('Ukentlig team meeting');
    });

    it('should include attendees when available', async () => {
      const tuesday = getNextWeekday(2);
      const result = await skill.handle(`detaljer om ${tuesday.toDateString()}`, ctx);
      expect(result.response).toContain('Alice');
      expect(result.response).toContain('Bob');
    });

    it('should include RSVP status when available', async () => {
      const tuesday = getNextWeekday(2);
      const result = await skill.handle(`detaljer om ${tuesday.toDateString()}`, ctx);
      expect(result.response).toContain('confirmed');
    });
  });

  describe('handle - invalid date', () => {
    it('should return handled: false for invalid date string', async () => {
      const result = await skill.handle('detaljer om not-a-valid-date', ctx);
      expect(result.handled).toBe(false);
      expect(result.shouldContinue).toBe(true);
    });
  });

  describe('handle - message parsing', () => {
    it('should extract date from "detaljer om" pattern', async () => {
      const tuesday = getNextWeekday(2);
      const result = await skill.handle(`detaljer om ${formatNorwegianDate(tuesday)}`, ctx);
      expect(result.handled).toBe(true);
    });

    it('should extract date from "vis dag" pattern', async () => {
      const thursday = getNextWeekday(4);
      const result = await skill.handle(`vis dag ${formatNorwegianDate(thursday)}`, ctx);
      expect(result.handled).toBe(true);
    });

    it('should extract date from "vis" pattern', async () => {
      const thursday = getNextWeekday(4);
      const result = await skill.handle(`vis ${formatNorwegianDate(thursday)}`, ctx);
      expect(result.handled).toBe(true);
    });
  });
});

function getNextWeekday(targetDay: number): Date {
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const date = new Date(now);
  date.setDate(date.getDate() + daysUntil);
  return date;
}

function formatNorwegianDate(date: Date): string {
  const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 
                  'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  const weekdays = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  return `${weekdays[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]}`;
}
