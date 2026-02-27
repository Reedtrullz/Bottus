import { describe, it, expect } from 'vitest';
import {
  isQueryMessage,
  extractImagePrompt,
  isMemoryStore,
  isMemoryQuery,
  isCalendarQuery,
  isTechStackQuery,
  isFeaturesQuery,
  isSelfAnalysisQuery
} from '../../src/relay/utils/detectors.js';

describe('detectors', () => {
  describe('isQueryMessage', () => {
    it('should return false for empty message', () => {
      expect(isQueryMessage('')).toBe(false);
      expect(isQueryMessage(null as any)).toBe(false);
      expect(isQueryMessage(undefined as any)).toBe(false);
    });

    it('should detect Norwegian "når skal"', () => {
      expect(isQueryMessage('Når skal vi møtes?')).toBe(true);
      expect(isQueryMessage('når skal vi dra?')).toBe(true);
    });

    it('should detect Norwegian "når er"', () => {
      expect(isQueryMessage('Når er festen?')).toBe(true);
    });

    it('should detect "hva har vi"', () => {
      expect(isQueryMessage('Hva har vi planlagt?')).toBe(true);
    });

    it('should detect "hva skjer"', () => {
      expect(isQueryMessage('Hva skjer i helga?')).toBe(true);
    });

    it('should detect English "what\'s planned"', () => {
      expect(isQueryMessage("What's planned for today?")).toBe(true);
    });

    it('should detect "neste"', () => {
      expect(isQueryMessage('Hva er neste?')).toBe(true);
    });

    it('should return false for unrelated messages', () => {
      expect(isQueryMessage('Hei, hvordan går det?')).toBe(false);
    });
  });

  describe('extractImagePrompt', () => {
    it('should return null for empty message', () => {
      expect(extractImagePrompt('')).toBeNull();
      expect(extractImagePrompt(null as any)).toBeNull();
    });

    it('should extract prompt from "lag et bilde av"', () => {
      const result = extractImagePrompt('Lag et bilde av en katt');
      expect(result).toBe('en katt');
    });

    it('should extract prompt from "generer et bilde av"', () => {
      const result = extractImagePrompt('Generer et bilde av en hund');
      expect(result).toBe('en hund');
    });

    it('should extract prompt from "tegn"', () => {
      const result = extractImagePrompt('Tegn en blomst');
      expect(result).toBe('en blomst');
    });

    it('should extract prompt from "generate image of"', () => {
      const result = extractImagePrompt('Generate image of a sunset');
      expect(result).toBe('a sunset');
    });

    it('should return null when prompt is empty', () => {
      expect(extractImagePrompt('Lag et bilde av')).toBeNull();
    });

    it('should return null when no pattern matches', () => {
      expect(extractImagePrompt('Hei, fine dag!')).toBeNull();
    });

    it('should handle multiple patterns', () => {
      expect(extractImagePrompt('lag bilde av et fjell')).toBe('et fjell');
      // Note: 'tegn' matches first (shorter pattern), so it returns remaining text
      expect(extractImagePrompt('tegn et bilde av en båt')).toBe('et bilde av en båt');
    });
  });

  describe('isMemoryStore', () => {
    it('should return false for empty message', () => {
      expect(isMemoryStore('')).toBe(false);
    });

    it('should detect "husk"', () => {
      expect(isMemoryStore('Husk at jeg liker pizza')).toBe(true);
      expect(isMemoryStore('husk at han er sur')).toBe(true);
    });

    it('should detect "husk at"', () => {
      expect(isMemoryStore('husk at melk er tomt')).toBe(true);
    });

    it('should detect "husk jeg er"', () => {
      expect(isMemoryStore('husk jeg er allergisk')).toBe(true);
    });

    it('should return false for "husker"', () => {
      expect(isMemoryStore('husker du hvor jeg parkerte?')).toBe(false);
    });
  });

  describe('isMemoryQuery', () => {
    it('should detect "husker du"', () => {
      expect(isMemoryQuery('Husker du hva jeg liker?')).toBe(true);
      expect(isMemoryQuery('husker du?')).toBe(true);
    });

    it('should detect "hva husker du"', () => {
      expect(isMemoryQuery('Hva husker du om meg?')).toBe(true);
    });

    it('should return false for unrelated messages', () => {
      expect(isMemoryQuery('husk at jeg liker kaffe')).toBe(false);
    });
  });

  describe('isCalendarQuery', () => {
    it('should detect "hva har vi planlagt"', () => {
      expect(isCalendarQuery('Hva har vi planlagt?')).toBe(true);
    });

    it('should detect "når er"', () => {
      expect(isCalendarQuery('Når er møtet?')).toBe(true);
    });

    it('should detect "hva skjer"', () => {
      expect(isCalendarQuery('Hva skjer i helga?')).toBe(true);
    });

    it('should detect "vis kalender"', () => {
      expect(isCalendarQuery('Vis kalender')).toBe(true);
    });

    it('should detect "kalender"', () => {
      expect(isCalendarQuery('Kalender')).toBe(true);
    });

    it('should detect "hva skjer i dag"', () => {
      expect(isCalendarQuery('hva skjer i dag')).toBe(true);
    });
  });

  describe('isTechStackQuery', () => {
    it('should detect "tech stack"', () => {
      expect(isTechStackQuery('What is your tech stack?')).toBe(true);
    });

    it('should detect "teknologi"', () => {
      expect(isTechStackQuery('Hvilken teknologi bruker du?')).toBe(true);
    });

    it('should detect "hva kjører du på"', () => {
      expect(isTechStackQuery('Hva kjører du på?')).toBe(true);
    });

    it('should detect "which libraries"', () => {
      expect(isTechStackQuery('Which libraries do you use?')).toBe(true);
    });

    it('should detect "hvilke biblioteker"', () => {
      expect(isTechStackQuery('hvilke biblioteker har du?')).toBe(true);
    });
  });

  describe('isFeaturesQuery', () => {
    it('should detect "hva kan du"', () => {
      expect(isFeaturesQuery('Hva kan du?')).toBe(true);
      expect(isFeaturesQuery('hva kan jeg bruke deg til?')).toBe(true);
    });

    it('should detect "what can you do"', () => {
      expect(isFeaturesQuery('What can you do?')).toBe(true);
    });

    it('should detect "which commands"', () => {
      expect(isFeaturesQuery('Which commands do you have?')).toBe(true);
    });

    it('should detect "features"', () => {
      expect(isFeaturesQuery('What are your features?')).toBe(true);
    });

    it('should detect "funksjoner"', () => {
      expect(isFeaturesQuery('Hvilke funksjoner har du?')).toBe(true);
    });
  });

  describe('isSelfAnalysisQuery', () => {
    it('should detect "analyser deg selv"', () => {
      expect(isSelfAnalysisQuery('Analyser deg selv')).toBe(true);
      expect(isSelfAnalysisQuery('analyse deg selv')).toBe(true);
    });

    it('should return false for other analysis queries', () => {
      expect(isSelfAnalysisQuery('analyser dette')).toBe(false);
    });
  });
});
