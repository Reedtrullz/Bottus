import { describe, it, expect } from 'vitest';
import { ExtractionService } from '../../src/services/extraction.js';

describe('ExtractionService', () => {
  const service = new ExtractionService();

  describe('extract method', () => {
    it('should return an array', () => {
      const result = service.extract('test message');
      expect(result).toBeInstanceOf(Array);
    });

    it('should return ExtractedItem objects with required fields', () => {
      const result = service.extract('husk melk');
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('confidence');
        expect(['event', 'task', 'agreement']).toContain(item.type);
      });
    });
  });

  describe('extractTasks', () => {
    it('should extract task from husk pattern', () => {
      const result = service.extract('husk å kjøpe melk');
      const tasks = result.filter(item => item.type === 'task');
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should extract task from ikke glem pattern', () => {
      const result = service.extract('ikke glem å sende email');
      const tasks = result.filter(item => item.type === 'task');
      expect(tasks.length).toBeGreaterThan(0);
    });
  });

  describe('extractAgreements', () => {
    it('should extract from vi blir enige pattern', () => {
      const result = service.extract('vi blir enige om å møtes');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract from jeg lover pattern', () => {
      const result = service.extract('jeg lover å være der');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].confidence).toBe(0.7);
    });
  });

  describe('confidence scoring', () => {
    it('should assign valid confidence values (0-1)', () => {
      const result = service.extract('husk melk');
      result.forEach(item => {
        expect(item.confidence).toBeGreaterThanOrEqual(0);
        expect(item.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp in Europe/Oslo timezone', () => {
      const timestamp = Math.floor(new Date('2024-01-15T18:00:00Z').getTime() / 1000);
      const formatted = service.formatTimestamp(timestamp);
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = service.extract('');
      expect(result).toBeInstanceOf(Array);
    });

    it('should handle random text', () => {
      const result = service.extract('random text with no dates');
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('ExtractedItem interface', () => {
    it('should have correct type values', () => {
      const result = service.extract('husk melk');
      result.forEach(item => {
        expect(item.type).toMatch(/^(event|task|agreement)$/);
      });
    });

    it('should have title as string', () => {
      const result = service.extract('husk melk');
      result.forEach(item => {
        expect(typeof item.title).toBe('string');
        expect(item.title.length).toBeGreaterThan(0);
      });
    });
  });
});
