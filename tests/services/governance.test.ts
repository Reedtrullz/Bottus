import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs module before importing the service
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(() => '[]'),
  writeFileSync: vi.fn()
}));

// Mock path module
vi.mock('path', () => ({
  dirname: vi.fn(() => './data')
}));

import { GovernanceService } from '../../src/services/governance.js';
import * as fs from 'fs';

describe('GovernanceService', () => {
  let governanceService: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    governanceService = new GovernanceService();
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('[]');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleProposal', () => {
    it('should return error message for empty proposal text', async () => {
      const interaction = {
        user: { id: 'user-1', username: 'TestUser' },
        options: { getString: vi.fn(() => '') },
        content: ''
      };

      const result = await governanceService.handleProposal(interaction as any);

      expect(result.executed).toBe(false);
      expect(result.message).toContain('Vennligst gi et forslagstekst');
    });

    it('should create new proposal for first proposer', async () => {
      const interaction = {
        user: { id: 'user-1', username: 'TestUser' },
        options: { getString: vi.fn(() => 'New proposal text') },
        content: ''
      };

      const result = await governanceService.handleProposal(interaction as any);

      expect(result.executed).toBe(false);
      expect(result.message).toContain('Nytt forslag');
      expect(result.message).toContain('Trenger 1 mer');
      expect(result.proposalId).toBeDefined();
    });

    it('should detect duplicate proposal from same user', async () => {
      // First create the proposal
      const firstInteraction = {
        user: { id: 'user-1', username: 'TestUser' },
        options: { getString: vi.fn(() => 'Same Proposal') },
        content: ''
      };
      
      await governanceService.handleProposal(firstInteraction as any);
      
      // Now try to create the same proposal again with same user
      const duplicateInteraction = {
        user: { id: 'user-1', username: 'TestUser' },
        options: { getString: vi.fn(() => 'Same Proposal') },
        content: ''
      };

      const result = await governanceService.handleProposal(duplicateInteraction as any);

      expect(result.executed).toBe(false);
      expect(result.message).toContain('allerede foreslått');
    });

    it('should add second supporter and execute when threshold reached', async () => {
      // First create the proposal with first user
      const firstInteraction = {
        user: { id: 'user-1', username: 'FirstUser' },
        options: { getString: vi.fn(() => 'Test Proposal') },
        content: ''
      };
      
      await governanceService.handleProposal(firstInteraction as any);
      
      // Second user supports the proposal - should trigger execution
      const secondInteraction = {
        user: { id: 'user-2', username: 'SecondUser' },
        options: { getString: vi.fn(() => 'Test Proposal') },
        content: ''
      };

      const result = await governanceService.handleProposal(secondInteraction as any);

      expect(result.executed).toBe(true);
      expect(result.message).toContain('DEMOKRATISK GODKJENNING');
      expect(result.message).toContain('2');
    });

    it('should show supporting message when second user supports', async () => {
      // First create the proposal with first user
      const firstInteraction = {
        user: { id: 'user-1', username: 'FirstUser' },
        options: { getString: vi.fn(() => 'Another Proposal') },
        content: ''
      };
      
      await governanceService.handleProposal(firstInteraction as any);
      
      // Second user supports - with 2 users it executes immediately (threshold >= 2)
      const secondInteraction = {
        user: { id: 'user-2', username: 'SecondUser' },
        options: { getString: vi.fn(() => 'Another Proposal') },
        content: ''
      };

      const result = await governanceService.handleProposal(secondInteraction as any);

      // With 2 unique proposers, execution happens immediately
      expect(result.executed).toBe(true);
    });
  });

  describe('listProposals', () => {
    it('should return message for empty proposal list', () => {
      const result = governanceService.listProposals();

      expect(result).toBe('Ingen aktive forslag.');
    });

    it('should return formatted pending proposals', () => {
      const pendingProposals = [
        {
          id: 'p1',
          normalizedText: 'proposal one',
          originalText: 'Proposal One',
          proposers: ['user-1', 'user-2'],
          status: 'pending',
          createdAt: Date.now()
        },
        {
          id: 'p2',
          normalizedText: 'proposal two',
          originalText: 'Proposal Two',
          proposers: ['user-1'],
          status: 'pending',
          createdAt: Date.now()
        }
      ];
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(pendingProposals));

      const result = governanceService.listProposals();

      expect(result).toContain('Proposal One');
      expect(result).toContain('Proposal Two');
      expect(result).toContain('/2');
    });

    it('should only list pending proposals, not executed ones', () => {
      const proposals = [
        {
          id: 'p1',
          normalizedText: 'executed proposal',
          originalText: 'Executed Proposal',
          proposers: ['user-1', 'user-2'],
          status: 'needs_ai',
          createdAt: Date.now()
        }
      ];
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(proposals));

      const result = governanceService.listProposals();

      expect(result).toBe('Ingen aktive forslag.');
    });
  });

  describe('getExecutedProposals', () => {
    it('should return proposals with needs_ai status', () => {
      const proposals = [
        {
          id: 'p1',
          normalizedText: 'executed 1',
          originalText: 'Executed 1',
          proposers: ['user-1', 'user-2'],
          status: 'needs_ai',
          createdAt: Date.now()
        },
        {
          id: 'p2',
          normalizedText: 'pending',
          originalText: 'Pending',
          proposers: ['user-1'],
          status: 'pending',
          createdAt: Date.now()
        },
        {
          id: 'p3',
          normalizedText: 'executed 2',
          originalText: 'Executed 2',
          proposers: ['user-1', 'user-2'],
          status: 'needs_ai',
          createdAt: Date.now()
        }
      ];
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(proposals));

      const result = governanceService.getExecutedProposals();

      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toContain('p1');
      expect(result.map(p => p.id)).toContain('p3');
    });

    it('should return empty array when no needs_ai proposals', () => {
      const result = governanceService.getExecutedProposals();

      expect(result).toEqual([]);
    });
  });

  describe('handleDictate', () => {
    it('should return error message for empty dictate text', async () => {
      const interaction = {
        user: { id: 'user-1', username: 'TestUser' },
        options: { getString: vi.fn(() => '') },
        content: ''
      };

      const result = await governanceService.handleDictate(interaction as any);

      expect(result.message).toContain('Vennligst gi en instruks');
      expect(result.proposalId).toBe('');
    });

    it('should create new dictate proposal with needs_ai status', async () => {
      const interaction = {
        user: { id: 'user-1', username: 'TestUser' },
        options: { getString: vi.fn(() => 'Dictate command here') },
        content: ''
      };

      const result = await governanceService.handleDictate(interaction as any);

      expect(result.message).toContain('Motatt');
      expect(result.proposalId).toContain('dictate_');
      expect(result.proposalId).toContain('user-1');
    });

    it('should store dictate with needs_ai status immediately', async () => {
      const interaction = {
        user: { id: 'user-dictate', username: 'DictateUser' },
        options: { getString: vi.fn(() => 'Process this immediately') },
        content: ''
      };

      await governanceService.handleDictate(interaction as any);

      // Verify writeFileSync was called to save the dictate
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Check that the saved proposal has needs_ai status
      const savedData = (fs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const parsed = JSON.parse(savedData);
      expect(parsed[0].status).toBe('needs_ai');
    });
  });

  describe('processReadyProposals', () => {
    it('should send messages for ready proposals', async () => {
      const readyProposals = [
        {
          id: 'p1',
          normalizedText: 'ready 1',
          originalText: 'Ready 1',
          proposers: ['user-1'],
          status: 'ready',
          result: 'AI response for ready 1',
          createdAt: Date.now()
        },
        {
          id: 'p2',
          normalizedText: 'ready 2',
          originalText: 'Ready 2',
          proposers: ['user-1'],
          status: 'ready',
          result: 'AI response for ready 2',
          createdAt: Date.now()
        }
      ];
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(readyProposals));

      const sendMessage = vi.fn().mockResolvedValue({});
      
      await governanceService.processReadyProposals(sendMessage);

      expect(sendMessage).toHaveBeenCalledTimes(2);
      expect(sendMessage).toHaveBeenCalledWith('AI response for ready 1');
      expect(sendMessage).toHaveBeenCalledWith('AI response for ready 2');
    });

    it('should not send messages for pending proposals', async () => {
      const proposals = [
        {
          id: 'p1',
          normalizedText: 'pending',
          originalText: 'Pending',
          proposers: ['user-1'],
          status: 'pending',
          result: 'Should not send',
          createdAt: Date.now()
        }
      ];
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(proposals));

      const sendMessage = vi.fn().mockResolvedValue({});
      
      await governanceService.processReadyProposals(sendMessage);

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should not send messages for proposals without results', async () => {
      const proposals = [
        {
          id: 'p1',
          normalizedText: 'ready no result',
          originalText: 'Ready No Result',
          proposers: ['user-1'],
          status: 'ready',
          result: undefined,
          createdAt: Date.now()
        }
      ];
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(proposals));

      const sendMessage = vi.fn().mockResolvedValue({});
      
      await governanceService.processReadyProposals(sendMessage);

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should update proposal status to sent after sending', async () => {
      const readyProposals = [
        {
          id: 'p1',
          normalizedText: 'ready 1',
          originalText: 'Ready 1',
          proposers: ['user-1'],
          status: 'ready',
          result: 'AI response',
          createdAt: Date.now()
        }
      ];
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(readyProposals));

      const sendMessage = vi.fn().mockResolvedValue({});
      
      await governanceService.processReadyProposals(sendMessage);

      // Verify the queue was saved with updated status
      expect(fs.writeFileSync).toHaveBeenCalled();
      const savedData = (fs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const parsed = JSON.parse(savedData);
      expect(parsed[0].status).toBe('sent');
    });
  });
});
