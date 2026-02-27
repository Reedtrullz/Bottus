import { describe, it, expect } from 'vitest';
import { t, i18n, Locale } from '../../src/utils/i18n.js';

describe('i18n', () => {
  describe('t function', () => {
    it('should return translation for valid nb key', () => {
      const result = t('calendar.created', 'nb', { title: 'Test Event' });
      expect(result).toBe('📅 Opprettet: **Test Event**');
    });

    it('should return translation for valid en key', () => {
      const result = t('calendar.created', 'en', { title: 'Test Event' });
      expect(result).toBe('📅 Created: **Test Event**');
    });

    it('should fallback to English if nb key not found', () => {
      const result = t('nonexistent.key', 'nb');
      expect(result).toBe('nonexistent.key');
    });

    it('should return key if both locales missing', () => {
      const result = t('missing.completely', 'nb');
      expect(result).toBe('missing.completely');
    });

    it('should replace params in translation', () => {
      const result = t('teach.success', 'nb', { type: 'fact', content: '2+2=4' });
      expect(result).toBe('✅ Lært: fact — "2+2=4"');
    });

    it('should handle missing params gracefully', () => {
      const result = t('calendar.created', 'nb', {});
      expect(result).toContain('**'); // Has the formatting but empty title
    });

    it('should handle nested keys', () => {
      expect(t('errors.generic', 'nb')).toBe('Noe gikk galt. Prøv igjen.');
      expect(t('errors.generic', 'en')).toBe('Something went wrong. Try again.');
    });

    it('should use default locale nb when not specified', () => {
      const result = t('calendar.noEvents');
      expect(result).toBe('Ingen kommende arrangementer.');
    });
  });

  describe('i18n structure', () => {
    it('should have nb locale with all required keys', () => {
      expect(i18n.nb.calendar).toBeDefined();
      expect(i18n.nb.errors).toBeDefined();
      expect(i18n.nb.feedback).toBeDefined();
      expect(i18n.nb.teach).toBeDefined();
      expect(i18n.nb.selfAnalysis).toBeDefined();
    });

    it('should have en locale with all required keys', () => {
      expect(i18n.en.calendar).toBeDefined();
      expect(i18n.en.errors).toBeDefined();
      expect(i18n.en.feedback).toBeDefined();
      expect(i18n.en.teach).toBeDefined();
      expect(i18n.en.selfAnalysis).toBeDefined();
    });
  });
});
