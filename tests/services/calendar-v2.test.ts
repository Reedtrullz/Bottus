import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarServiceV2 } from '../../src/services/calendar-v2.js';
import type { CalendarEvent } from '../../src/db/calendar-schema.js';

describe('CalendarServiceV2', () => {
  let service: CalendarServiceV2;

  beforeEach(() => {
    // Create service without initializing DB
    service = new CalendarServiceV2(':memory:');
  });

  describe('parseNaturalDate', () => {
    it('should parse "tomorrow at 14" in English', () => {
      const result = service.parseNaturalDate('tomorrow at 14');
      
      expect(result).not.toBeNull();
      expect(result?.start).toBeInstanceOf(Date);
      expect(result?.start.getHours()).toBe(14);
    });

    it('should parse "next monday" in English', () => {
      const result = service.parseNaturalDate('next monday');
      
      expect(result).not.toBeNull();
      expect(result?.start).toBeInstanceOf(Date);
    });

    it('should parse "today at 10" in English', () => {
      const result = service.parseNaturalDate('today at 10');
      
      expect(result).not.toBeNull();
      expect(result?.start.getHours()).toBe(10);
    });

    it('should parse date format YYYY-MM-DD', () => {
      const result = service.parseNaturalDate('2025-03-15');
      
      expect(result).not.toBeNull();
      expect(result?.start).toBeInstanceOf(Date);
    });

    it('should parse "next friday" in English', () => {
      const result = service.parseNaturalDate('next friday at 16');
      
      expect(result).not.toBeNull();
      expect(result?.start.getHours()).toBe(16);
    });

    it('should detect recurrence "weekly" in English', () => {
      const result = service.parseNaturalDate('meeting weekly at 10');
      
      expect(result).not.toBeNull();
      expect(result?.recurrence).toBe('FREQ=WEEKLY');
    });

    it('should detect recurrence "daily" in English', () => {
      const result = service.parseNaturalDate('standup daily at 09');
      
      expect(result).not.toBeNull();
      expect(result?.recurrence).toBe('FREQ=DAILY');
    });

    it('should return null for unparseable input', () => {
      const result = service.parseNaturalDate('random text without date');
      
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = service.parseNaturalDate('');
      
      expect(result).toBeNull();
    });

    // Note: Norwegian dates (imorgen, idag, møte, etc.) and some English patterns
    // like "monthly" or "each week" without explicit time require chrono-node
    // to be configured with custom parsing rules or locale extensions.
    // The service uses chrono-node which is primarily English-focused.
    it('should return null for Norwegian dates without time context', () => {
      const result = service.parseNaturalDate('imorgen');
      expect(result).toBeNull();
    });
  });

  describe('generateICS', () => {
    it('should generate valid ICS calendar with single event', () => {
      const events: CalendarEvent[] = [
        {
          id: 'test-event-1',
          title: 'Test Meeting',
          description: 'A test meeting',
          startTime: new Date('2025-03-15T14:00:00Z').getTime(),
          endTime: new Date('2025-03-15T15:00:00Z').getTime(),
          timezone: 'Europe/Oslo',
          creatorId: 'user-123',
          channelId: 'channel-456',
          rsvp: '{}',
          reminders: '[15, 60]',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const ics = service.generateICS(events);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Test Meeting');
      expect(ics).toContain('DESCRIPTION:A test meeting');
      expect(ics).toContain('DTSTART:');
      expect(ics).toContain('DTEND:');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('should generate ICS with location', () => {
      const events: CalendarEvent[] = [
        {
          id: 'test-event-2',
          title: 'Office Meeting',
          location: 'Conference Room A',
          startTime: new Date('2025-03-20T10:00:00Z').getTime(),
          timezone: 'Europe/Oslo',
          creatorId: 'user-123',
          channelId: 'channel-456',
          rsvp: '{}',
          reminders: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const ics = service.generateICS(events);

      expect(ics).toContain('LOCATION:Conference Room A');
    });

    it('should handle multiple events', () => {
      const events: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Event 1',
          startTime: Date.now(),
          timezone: 'Europe/Oslo',
          creatorId: 'user-1',
          channelId: 'channel-1',
          rsvp: '{}',
          reminders: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'event-2',
          title: 'Event 2',
          startTime: Date.now() + 86400000,
          timezone: 'Europe/Oslo',
          creatorId: 'user-2',
          channelId: 'channel-2',
          rsvp: '{}',
          reminders: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const ics = service.generateICS(events);

      expect(ics).toContain('SUMMARY:Event 1');
      expect(ics).toContain('SUMMARY:Event 2');
      // Should have two VEVENT blocks
      const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(2);
    });

    it('should handle empty events array', () => {
      const ics = service.generateICS([]);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('END:VCALENDAR');
      // Should not contain VEVENT
      expect(ics).not.toContain('BEGIN:VEVENT');
    });

    it('should handle event without endTime', () => {
      const events: CalendarEvent[] = [
        {
          id: 'test-event-3',
          title: 'All Day Event',
          startTime: new Date('2025-04-01T12:00:00Z').getTime(),
          timezone: 'Europe/Oslo',
          creatorId: 'user-123',
          channelId: 'channel-456',
          rsvp: '{}',
          reminders: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const ics = service.generateICS(events);

      expect(ics).toContain('SUMMARY:All Day Event');
      // Should not contain DTEND when not specified
      expect(ics).not.toMatch(/DTEND:/);
    });

    it('should include PRODID header', () => {
      const ics = service.generateICS([]);

      expect(ics).toContain('PRODID:-//Bottus//Calendar//EN');
      expect(ics).toContain('CALSCALE:GREGORIAN');
    });

    it('should generate unique UIDs for each event', () => {
      const events: CalendarEvent[] = [
        {
          id: 'unique-id-1',
          title: 'Event A',
          startTime: Date.now(),
          timezone: 'Europe/Oslo',
          creatorId: 'user-1',
          channelId: 'channel-1',
          rsvp: '{}',
          reminders: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'unique-id-2',
          title: 'Event B',
          startTime: Date.now(),
          timezone: 'Europe/Oslo',
          creatorId: 'user-2',
          channelId: 'channel-2',
          rsvp: '{}',
          reminders: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const ics = service.generateICS(events);

      expect(ics).toContain('UID:unique-id-1@bottus');
      expect(ics).toContain('UID:unique-id-2@bottus');
    });
  });

  describe('setDiscord', () => {
    it('should set Discord client after construction', () => {
      const mockDiscord = {
        sendMessage: vi.fn(),
      };

      service.setDiscord(mockDiscord);

      // Just verify it doesn't throw - the method exists
      expect(() => service.setDiscord(mockDiscord)).not.toThrow();
    });
  });

  // Note: Database-dependent methods (createEvent, getEvents, deleteEvent, etc.)
  // require heavy mocking of sql.js and are tested via integration tests
  // or via the calendar-skill-v2.test.ts which uses mocks.
});
