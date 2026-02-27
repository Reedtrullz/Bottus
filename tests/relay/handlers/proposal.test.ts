import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies before importing the handler
vi.mock('../../../src/services/proposal-engine', () => ({
  ProposalEngine: vi.fn().mockImplementation(() => ({
    approve: vi.fn(),
    reject: vi.fn(),
    logAudit: vi.fn(),
    sanitizePrompt: vi.fn()
  }))
}));

vi.mock('../../../src/relay/skills/permission', () => ({
  Permission: {
    APPROVE_PROPOSAL: 'proposal:approve',
    REJECT_PROPOSAL: 'proposal:reject'
  },
  PermissionService: vi.fn().mockImplementation(() => ({
    hasPermission: vi.fn()
  }))
}));

vi.mock('../../../src/relay/skills/confirmation', () => ({
  ConfirmationType: {
    APPROVE_PROPOSAL: 'approve_proposal',
    REJECT_PROPOSAL: 'reject_proposal'
  },
  ConfirmationService: vi.fn().mockImplementation(() => ({
    createConfirmation: vi.fn().mockReturnValue({
      id: 'confirm_123',
      type: 'approve_proposal',
      userId: 'test-user',
      channelId: 'test-channel',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
      details: {},
      approved: null
    }),
    getPending: vi.fn().mockReturnValue([])
  }))
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

import { ProposalHandler } from '../../../src/relay/handlers/proposal';
import { ConfirmationType } from '../../../src/relay/skills/confirmation';
import { ProposalEngine } from '../../../src/services/proposal-engine';
import { PermissionService } from '../../../src/relay/skills/permission';
import { ConfirmationService } from '../../../src/relay/skills/confirmation';

describe('ProposalHandler', () => {
  let handler: ProposalHandler;
  let mockProposalEngine: ProposalEngine;
  let mockPermissionService: PermissionService;
  let mockConfirmationService: ConfirmationService;

  const mockCtx = {
    message: 'test message',
    channelId: 'test-channel',
    userId: 'test-user',
    discord: {
      sendMessage: vi.fn().mockResolvedValue(undefined)
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh mock instances
    mockProposalEngine = new ProposalEngine();
    mockPermissionService = new PermissionService();
    mockConfirmationService = new ConfirmationService();
    
    handler = new ProposalHandler(
      mockProposalEngine as any,
      mockPermissionService as any,
      mockConfirmationService as any
    );
  });

  describe('canHandle', () => {
    it('should return true for approve command', () => {
      expect(handler.canHandle('approve abc-123', mockCtx)).toBe(true);
      expect(handler.canHandle('APPROVE abc-123', mockCtx)).toBe(true);
      expect(handler.canHandle('approve proposal-xyz', mockCtx)).toBe(true);
    });

    it('should return true for reject command with reason', () => {
      expect(handler.canHandle('reject abc-123 because reasons', mockCtx)).toBe(true);
      expect(handler.canHandle('REJECT abc-123 Not aligned', mockCtx)).toBe(true);
      expect(handler.canHandle('reject prop-456 "valid reason"', mockCtx)).toBe(true);
    });

    it('should return false for non-proposal messages', () => {
      expect(handler.canHandle('hello how are you', mockCtx)).toBe(false);
      expect(handler.canHandle('what is the weather', mockCtx)).toBe(false);
      expect(handler.canHandle('approve', mockCtx)).toBe(false);
      expect(handler.canHandle('reject abc', mockCtx)).toBe(false);
      expect(handler.canHandle('', mockCtx)).toBe(false);
    });

    it('should return false for invalid approve format', () => {
      expect(handler.canHandle('approve', mockCtx)).toBe(false);
      expect(handler.canHandle('approve abc-123 extra-args', mockCtx)).toBe(false);
    });
  });

  describe('handle', () => {
    describe('handleApprove', () => {
      it('should return usage error when proposal id is missing', async () => {
        const result = await handler.handle('approve', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Usage: approve');
      });

      it('should request confirmation when user has permission', async () => {
        vi.mocked(mockPermissionService.hasPermission).mockReturnValue(true);
        vi.mocked(mockConfirmationService.getPending).mockReturnValue([]);
        vi.mocked(mockConfirmationService.createConfirmation).mockReturnValue({
          id: 'confirm_123',
          type: ConfirmationType.APPROVE_PROPOSAL,
          userId: 'test-user',
          channelId: 'test-channel',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          details: { proposalId: 'abc-123', action: 'approve' },
          approved: null
        });

        const result = await handler.handle('approve abc-123', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('abc-123');
        expect(result.response).toContain('confirm');
      });

      it('should deny permission when user lacks APPROVE_PROPOSAL permission', async () => {
        vi.mocked(mockPermissionService.hasPermission).mockReturnValue(false);

        const result = await handler.handle('approve abc-123', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain("don't have permission");
        expect(mockProposalEngine.logAudit).toHaveBeenCalledWith(
          'APPROVE_DENIED',
          'abc-123',
          'test-user',
          expect.any(String)
        );
      });

      it('should execute approval when confirmation already exists', async () => {
        vi.mocked(mockPermissionService.hasPermission).mockReturnValue(true);
        
        const existingConfirmation = {
          id: 'confirm_456',
          type: ConfirmationType.APPROVE_PROPOSAL,
          userId: 'test-user',
          channelId: 'test-channel',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          details: { proposalId: 'abc-123', action: 'approve' },
          approved: null
        };
        
        vi.mocked(mockConfirmationService.getPending).mockReturnValue([existingConfirmation]);

        const mockProposal = {
          id: 'abc-123',
          guildId: 'guild-1',
          proposerId: 'proposer-1',
          title: 'Test Proposal',
          description: 'Test description',
          type: 'feature',
          status: 'approved'
        };
        
        vi.mocked(mockProposalEngine.approve).mockResolvedValue(mockProposal as any);

        const result = await handler.handle('approve abc-123', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('approved');
        expect(result.response).toContain('Test Proposal');
        expect(mockProposalEngine.approve).toHaveBeenCalledWith('abc-123', 'test-user', 'test-channel');
      });

      it('should return error when proposal not found', async () => {
        vi.mocked(mockPermissionService.hasPermission).mockReturnValue(true);
        
        // Set up existing confirmation so it executes approval instead of creating new confirmation
        const existingConfirmation = {
          id: 'confirm_123',
          type: ConfirmationType.APPROVE_PROPOSAL,
          userId: 'test-user',
          channelId: 'test-channel',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          details: { proposalId: 'abc-123', action: 'approve' },
          approved: null
        };
        vi.mocked(mockConfirmationService.getPending).mockReturnValue([existingConfirmation]);

        vi.mocked(mockProposalEngine.approve).mockResolvedValue(null);

        const result = await handler.handle('approve abc-123', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('not found');
      });
    });

    describe('handleReject', () => {
      it('should return usage error when proposal id or reason is missing', async () => {
        const result = await handler.handle('reject abc-123', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Usage: reject');
      });

      it('should request confirmation when user has permission', async () => {
        vi.mocked(mockPermissionService.hasPermission).mockReturnValue(true);
        vi.mocked(mockConfirmationService.getPending).mockReturnValue([]);
        vi.mocked(mockConfirmationService.createConfirmation).mockReturnValue({
          id: 'confirm_789',
          type: ConfirmationType.REJECT_PROPOSAL,
          userId: 'test-user',
          channelId: 'test-channel',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          details: { proposalId: 'abc-123', reason: 'Not aligned', action: 'reject' },
          approved: null
        });

        const result = await handler.handle('reject abc-123 Not aligned', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('abc-123');
        expect(result.response).toContain('Not aligned');
        expect(result.response).toContain('confirm');
      });

      it('should deny permission when user lacks REJECT_PROPOSAL permission', async () => {
        vi.mocked(mockPermissionService.hasPermission).mockReturnValue(false);

        const result = await handler.handle('reject abc-123 reason', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain("don't have permission");
        expect(mockProposalEngine.logAudit).toHaveBeenCalledWith(
          'REJECT_DENIED',
          'abc-123',
          'test-user',
          expect.any(String)
        );
      });

      it('should execute rejection when confirmation already exists', async () => {
        vi.mocked(mockPermissionService.hasPermission).mockReturnValue(true);
        
        const existingConfirmation = {
          id: 'confirm_456',
          type: ConfirmationType.REJECT_PROPOSAL,
          userId: 'test-user',
          channelId: 'test-channel',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          details: { proposalId: 'abc-123', reason: 'Not aligned', action: 'reject' },
          approved: null
        };
        
        vi.mocked(mockConfirmationService.getPending).mockReturnValue([existingConfirmation]);

        const mockProposal = {
          id: 'abc-123',
          guildId: 'guild-1',
          proposerId: 'proposer-1',
          title: 'Test Proposal',
          description: 'Test description',
          type: 'feature',
          status: 'rejected'
        };
        
        vi.mocked(mockProposalEngine.reject).mockResolvedValue(mockProposal as any);

        const result = await handler.handle('reject abc-123 Not aligned', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('rejected');
        expect(result.response).toContain('Not aligned');
        expect(mockProposalEngine.reject).toHaveBeenCalledWith('abc-123', 'test-user', 'Not aligned', 'test-channel');
      });

      it('should return error when proposal not found on rejection', async () => {
        vi.mocked(mockPermissionService.hasPermission).mockReturnValue(true);
        
        // Set up existing confirmation so it executes rejection instead of creating new confirmation
        const existingConfirmation = {
          id: 'confirm_789',
          type: ConfirmationType.REJECT_PROPOSAL,
          userId: 'test-user',
          channelId: 'test-channel',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          details: { proposalId: 'abc-123', reason: 'Not aligned', action: 'reject' },
          approved: null
        };
        vi.mocked(mockConfirmationService.getPending).mockReturnValue([existingConfirmation]);

        vi.mocked(mockProposalEngine.reject).mockResolvedValue(null);

        const result = await handler.handle('reject abc-123 Not aligned', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('not found');
      });
    });

    describe('error handling', () => {
      it('should catch and return errors from proposal engine', async () => {
        vi.mocked(mockPermissionService.hasPermission).mockReturnValue(true);
        
        const existingConfirmation = {
          id: 'confirm_456',
          type: ConfirmationType.APPROVE_PROPOSAL,
          userId: 'test-user',
          channelId: 'test-channel',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          details: { proposalId: 'abc-123', action: 'approve' },
          approved: null
        };
        
        vi.mocked(mockConfirmationService.getPending).mockReturnValue([existingConfirmation]);
        vi.mocked(mockProposalEngine.approve).mockRejectedValue(new Error('Database error'));

        const result = await handler.handle('approve abc-123', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.error).toBe('Database error');
      });
    });

    describe('unknown command', () => {
      it('should return unknown command for invalid commands', async () => {
        const result = await handler.handle('unknown-cmd test', mockCtx);

        expect(result.handled).toBe(false);
        expect(result.response).toContain('Unknown command');
      });
    });
  });
});
