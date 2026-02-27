import { describe, it, expect } from 'vitest';
import { norskMonthNameToIndex, norskMonthIndexToName } from '../../src/relay/utils/date-utils.js';

describe('date-utils', () => {
  describe('norskMonthNameToIndex', () => {
    it('should return null for empty input', () => {
      expect(norskMonthNameToIndex('')).toBeNull();
      expect(norskMonthNameToIndex(null as any)).toBeNull();
      expect(norskMonthNameToIndex(undefined as any)).toBeNull();
    });

    it('should return correct index for Norwegian month names', () => {
      expect(norskMonthNameToIndex('januar')).toBe(0);
      expect(norskMonthNameToIndex('februar')).toBe(1);
      expect(norskMonthNameToIndex('mars')).toBe(2);
      expect(norskMonthNameToIndex('april')).toBe(3);
      expect(norskMonthNameToIndex('mai')).toBe(4);
      expect(norskMonthNameToIndex('juni')).toBe(5);
      expect(norskMonthNameToIndex('juli')).toBe(6);
      expect(norskMonthNameToIndex('august')).toBe(7);
      expect(norskMonthNameToIndex('september')).toBe(8);
      expect(norskMonthNameToIndex('oktober')).toBe(9);
      expect(norskMonthNameToIndex('november')).toBe(10);
      expect(norskMonthNameToIndex('desember')).toBe(11);
    });

    it('should be case insensitive', () => {
      expect(norskMonthNameToIndex('JANUAR')).toBe(0);
      expect(norskMonthNameToIndex('Januar')).toBe(0);
      expect(norskMonthNameToIndex('MARs')).toBe(2);
    });

    it('should return null for invalid month names', () => {
      expect(norskMonthNameToIndex('invalid')).toBeNull();
      expect(norskMonthNameToIndex('jan')).toBeNull();
      expect(norskMonthNameToIndex('summer')).toBeNull();
    });
  });

  describe('norskMonthIndexToName', () => {
    it('should return correct name for valid indices', () => {
      expect(norskMonthIndexToName(0)).toBe('Januar');
      expect(norskMonthIndexToName(1)).toBe('Februar');
      expect(norskMonthIndexToName(2)).toBe('Mars');
      expect(norskMonthIndexToName(3)).toBe('April');
      expect(norskMonthIndexToName(4)).toBe('Mai');
      expect(norskMonthIndexToName(5)).toBe('Juni');
      expect(norskMonthIndexToName(6)).toBe('Juli');
      expect(norskMonthIndexToName(7)).toBe('August');
      expect(norskMonthIndexToName(8)).toBe('September');
      expect(norskMonthIndexToName(9)).toBe('Oktober');
      expect(norskMonthIndexToName(10)).toBe('November');
      expect(norskMonthIndexToName(11)).toBe('Desember');
    });

    it('should handle negative indices (wrap around)', () => {
      expect(norskMonthIndexToName(-1)).toBe('Desember');
      // -12 % 12 = 0 in JavaScript, so wraps to Januar
      expect(norskMonthIndexToName(-12)).toBe('Januar');
    });

    it('should handle indices > 11 (wrap around)', () => {
      expect(norskMonthIndexToName(12)).toBe('Januar');
      expect(norskMonthIndexToName(13)).toBe('Februar');
    });
  });
});
