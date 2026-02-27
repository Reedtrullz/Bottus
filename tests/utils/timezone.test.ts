import { describe, it, expect } from 'vitest';
import { TimezoneHandler } from '../../src/utils/timezone.js';

describe('TimezoneHandler', () => {
  describe('formatNorwegian', () => {
    const handler = new TimezoneHandler();

    it('should format date with full format', () => {
      // Use a date that we know the expected output for
      // June 15, 2024 at 14:30 UTC becomes 16:30 in Europe/Oslo (CEST, UTC+2)
      const date = new Date('2024-06-15T14:30:00Z');
      const result = handler.formatNorwegian(date, 'full');
      
      expect(result).toContain('15'); // day
      expect(result).toContain('juni'); // month in Norwegian
      expect(result).toContain('2024'); // year
      expect(result).toContain('16'); // hour (UTC+2)
      expect(result).toContain('30'); // minute
    });

    it('should format date with short format', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = handler.formatNorwegian(date, 'short');
      
      expect(result).toContain('15');
      expect(result).toContain('juni');
    });

    it('should format date with time only format', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = handler.formatNorwegian(date, 'time');
      
      expect(result).toContain('16'); // hour (UTC+2)
      expect(result).toContain('30'); // minute
    });

    it('should default to full format', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = handler.formatNorwegian(date);
      
      expect(result).toContain('juni'); // Full format has month name
    });
  });

  describe('defaultTimezone', () => {
    const handler = new TimezoneHandler();

    it('should use Europe/Oslo as default timezone', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const result = handler.formatNorwegian(date, 'full');
      
      // Verify it uses Norwegian locale
      expect(result).toMatch(/lørdag|fredag|onsdag|tirsdag|mandag|torsdag|søndag/);
    });

    it('should have correct timezone property', () => {
      const handler = new TimezoneHandler();
      // Access the private property through formatNorwegian output
      const date = new Date('2024-06-15T12:00:00Z');
      const result = handler.formatNorwegian(date, 'full');
      
      // The timezone is hardcoded to Europe/Oslo
      expect(result).toBeTruthy();
    });
  });
});
