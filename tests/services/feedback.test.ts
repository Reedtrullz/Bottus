import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackService } from '../../src/services/feedback.js';

vi.mock('../../src/db/index.js', () => ({
  feedbackDb: {
    store: vi.fn().mockResolvedValue('feedback-id-123'),
    getRecent: vi.fn().mockResolvedValue([]),
    getByUser: vi.fn().mockResolvedValue([])
  }
}));

import { feedbackDb } from '../../src/db/index.js';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeedbackService();
  });

  describe('store', () => {
    it('should store feedback and return id', async () => {
      const result = await service.store('user-1', 'msg-1', 'channel-1', 'positive', 'Great response!');
      
      expect(feedbackDb.store).toHaveBeenCalledWith('user-1', 'msg-1', 'channel-1', 'positive', 'Great response!', undefined);
      expect(result).toBe('feedback-id-123');
    });

    it('should store feedback without comment', async () => {
      const result = await service.store('user-1', 'msg-1', 'channel-1', 'negative');
      
      expect(feedbackDb.store).toHaveBeenCalledWith('user-1', 'msg-1', 'channel-1', 'negative', undefined, undefined);
      expect(result).toBe('feedback-id-123');
    });
  });

  describe('getRecent', () => {
    it('should call getRecent on db', async () => {
      await service.getRecent(10);
      
      expect(feedbackDb.getRecent).toHaveBeenCalledWith(10);
    });

    it('should call getRecent without limit', async () => {
      await service.getRecent();
      
      expect(feedbackDb.getRecent).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getByUser', () => {
    it('should call getByUser on db', async () => {
      await service.getByUser('user-1', 5);
      
      expect(feedbackDb.getByUser).toHaveBeenCalledWith('user-1', 5);
    });
  });

  describe('formatFeedbackList', () => {
    it('should return no feedback message for empty array', () => {
      const result = service.formatFeedbackList([]);
      expect(result).toBe('Ingen tilbakemeldinger funnet.');
    });

    it('should return no feedback message for null', () => {
      const result = service.formatFeedbackList(null as any);
      expect(result).toBe('Ingen tilbakemeldinger funnet.');
    });

    it('should format positive feedback', () => {
      const feedback = [{
        rating: 'positive',
        created_at: 1704067200, // 2024-01-01
        comment: 'Very helpful!',
        response_text: 'Here is some helpful information about the calendar.'
      }];
      
      const result = service.formatFeedbackList(feedback);
      
      expect(result).toContain('👍');
      expect(result).toContain('Very helpful!');
    });

    it('should format negative feedback', () => {
      const feedback = [{
        rating: 'negative',
        created_at: 1704067200,
        comment: null
      }];
      
      const result = service.formatFeedbackList(feedback);
      
      expect(result).toContain('👎');
    });

    it('should handle missing fields gracefully', () => {
      const feedback = [{}];
      
      const result = service.formatFeedbackList(feedback);
      
      expect(result).toContain('1.');
    });

    it('should handle createdAt timestamp alternative', () => {
      const feedback = [{
        rating: 'positive',
        createdAt: 1704067200
      }];
      
      const result = service.formatFeedbackList(feedback);
      
      expect(result).toContain('👍');
    });
  });
});
