import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProposalEngine } from '../../src/services/proposal-engine.js';
import { ConfirmationService, ConfirmationType } from '../../src/relay/skills/confirmation.js';
import { PermissionService, Permission, UserRole } from '../../src/relay/skills/permission.js';

// Mock database for testing
class MockProposalDb {
  private proposals: Map<string, any> = new Map();

  async create(payload: any): Promise<any> {
    this.proposals.set(payload.id, { ...payload });
    return payload;
  }

  async update(payload: any): Promise<void> {
    const existing = this.proposals.get(payload.id);
    if (existing) {
      this.proposals.set(payload.id, { ...existing, ...payload });
    }
  }

  async queryOne({ id }: { id: string }): Promise<any | null> {
    return this.proposals.get(id) || null;
  }

  async queryAll(): Promise<any[]> {
    return Array.from(this.proposals.values());
  }

  clear(): void {
    this.proposals.clear();
  }
}

describe('ProposalEngine Integration', () => {
  let mockDb: MockProposalDb;
  let confirmationService: ConfirmationService;
  let permissionService: PermissionService;
  let proposalEngine: ProposalEngine;

  const TEST_CHANNEL_ID = 'test-channel-123';
  const ADMIN_USER_ID = 'admin-user-456';
  const REGULAR_USER_ID = 'regular-user-789';
  const PROPOSAL_ID = 'proposal-001';

  beforeEach(() => {
    mockDb = new MockProposalDb();
    confirmationService = new ConfirmationService();
    permissionService = new PermissionService();

    // Set up admin user with ADMIN role
    permissionService.setUserRole(TEST_CHANNEL_ID, ADMIN_USER_ID, UserRole.ADMIN);
    // Set up regular user with MEMBER role
    permissionService.setUserRole(TEST_CHANNEL_ID, REGULAR_USER_ID, UserRole.MEMBER);

    // Create engine with services
    proposalEngine = new ProposalEngine(mockDb, confirmationService, permissionService);
  });

  describe('Permission Flow', () => {
    it('should allow admin to approve proposal', async () => {
      // Create a proposal first
      await mockDb.create({
        id: PROPOSAL_ID,
        guildId: 'guild-1',
        proposerId: REGULAR_USER_ID,
        title: 'Test Proposal',
        description: 'Test description',
        type: 'feature',
        status: 'pending',
      });

      // Admin should be able to approve
      const result = await proposalEngine.approve(PROPOSAL_ID, ADMIN_USER_ID, TEST_CHANNEL_ID);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('approved');
      expect(result?.approverId).toBe(ADMIN_USER_ID);
    });

    it('should deny non-admin user from approving proposal', async () => {
      // Create a proposal first
      await mockDb.create({
        id: PROPOSAL_ID,
        guildId: 'guild-1',
        proposerId: REGULAR_USER_ID,
        title: 'Test Proposal',
        description: 'Test description',
        type: 'feature',
        status: 'pending',
      });

      // Regular user should NOT be able to approve
      const result = await proposalEngine.approve(PROPOSAL_ID, REGULAR_USER_ID, TEST_CHANNEL_ID);

      expect(result).toBeNull();
    });

    it('should allow admin to reject proposal', async () => {
      // Create a proposal first
      await mockDb.create({
        id: PROPOSAL_ID,
        guildId: 'guild-1',
        proposerId: REGULAR_USER_ID,
        title: 'Test Proposal',
        description: 'Test description',
        type: 'feature',
        status: 'pending',
      });

      // Admin should be able to reject
      const result = await proposalEngine.reject(PROPOSAL_ID, ADMIN_USER_ID, 'Not approved', TEST_CHANNEL_ID);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('rejected');
      expect(result?.rejectedBy).toBe(ADMIN_USER_ID);
    });

    it('should deny non-admin user from rejecting proposal', async () => {
      // Create a proposal first
      await mockDb.create({
        id: PROPOSAL_ID,
        guildId: 'guild-1',
        proposerId: ADMIN_USER_ID,
        title: 'Test Proposal',
        description: 'Test description',
        type: 'feature',
        status: 'pending',
      });

      // Regular user should NOT be able to reject
      const result = await proposalEngine.reject(PROPOSAL_ID, REGULAR_USER_ID, 'Not approved', TEST_CHANNEL_ID);

      expect(result).toBeNull();
    });

    it('should allow approve without channelId (backward compatibility)', async () => {
      // Create a proposal first
      await mockDb.create({
        id: PROPOSAL_ID,
        guildId: 'guild-1',
        proposerId: REGULAR_USER_ID,
        title: 'Test Proposal',
        description: 'Test description',
        type: 'feature',
        status: 'pending',
      });

      // Should work without channelId
      const result = await proposalEngine.approve(PROPOSAL_ID, REGULAR_USER_ID);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('approved');
    });

    it('should check permissions correctly via checkPermission method', () => {
      // Admin should have MODIFY_PERMISSIONS
      const adminHasPermission = proposalEngine.checkPermission(
        ADMIN_USER_ID,
        TEST_CHANNEL_ID,
        Permission.MODIFY_PERMISSIONS
      );
      expect(adminHasPermission).toBe(true);

      // Regular user should NOT have MODIFY_PERMISSIONS
      const userHasPermission = proposalEngine.checkPermission(
        REGULAR_USER_ID,
        TEST_CHANNEL_ID,
        Permission.MODIFY_PERMISSIONS
      );
      expect(userHasPermission).toBe(false);
    });
  });

  describe('Confirmation Flow', () => {
    it('should create confirmation via requestConfirmation', () => {
      const confirmation = proposalEngine.requestConfirmation(
        ConfirmationType.DELETE_EVENT,
        REGULAR_USER_ID,
        TEST_CHANNEL_ID,
        { proposalId: PROPOSAL_ID }
      );

      expect(confirmation).not.toBeNull();
      expect(confirmation?.type).toBe(ConfirmationType.DELETE_EVENT);
      expect(confirmation?.userId).toBe(REGULAR_USER_ID);
      expect(confirmation?.channelId).toBe(TEST_CHANNEL_ID);
    });

    it('should return null when confirmation service not provided', () => {
      const engineWithoutConfirmation = new ProposalEngine(mockDb, undefined, permissionService);

      const confirmation = engineWithoutConfirmation.requestConfirmation(
        ConfirmationType.DELETE_EVENT,
        REGULAR_USER_ID,
        TEST_CHANNEL_ID
      );

      expect(confirmation).toBeNull();
    });

    it('should approve and reject confirmation via confirmationService', async () => {
      const confirmation = proposalEngine.requestConfirmation(
        ConfirmationType.ROLE_CHANGE,
        ADMIN_USER_ID,
        TEST_CHANNEL_ID,
        { role: UserRole.ADMIN }
      );

      expect(confirmation).not.toBeNull();
      expect(confirmation?.approved).toBeNull();

      // Approve the confirmation
      const approved = confirmationService.approve(confirmation!.id);
      expect(approved).toBe(true);

      // Verify it's no longer pending
      const pending = confirmationService.getPending(TEST_CHANNEL_ID);
      expect(pending.length).toBe(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without permission service (allows by default)', async () => {
      const engineWithoutPermission = new ProposalEngine(mockDb, confirmationService, undefined);

      // Create a proposal first
      await mockDb.create({
        id: PROPOSAL_ID,
        guildId: 'guild-1',
        proposerId: REGULAR_USER_ID,
        title: 'Test Proposal',
        description: 'Test description',
        type: 'feature',
        status: 'pending',
      });

      // Should work even without permission service
      const result = await engineWithoutPermission.approve(PROPOSAL_ID, REGULAR_USER_ID, TEST_CHANNEL_ID);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('approved');
    });

    it('should work without any services', async () => {
      const engineMinimal = new ProposalEngine();

      // Test basic methods exist
      expect(engineMinimal.sanitizePrompt).toBeDefined();
      expect(engineMinimal.checkPermission).toBeDefined();
      expect(engineMinimal.requestConfirmation).toBeDefined();
      expect(engineMinimal.logAudit).toBeDefined();

      // checkPermission should allow by default when no service
      const hasPermission = engineMinimal.checkPermission(
        REGULAR_USER_ID,
        TEST_CHANNEL_ID,
        Permission.MODIFY_PERMISSIONS
      );
      expect(hasPermission).toBe(true);

      // requestConfirmation should return null when no service
      const confirmation = engineMinimal.requestConfirmation(
        ConfirmationType.DELETE_EVENT,
        REGULAR_USER_ID,
        TEST_CHANNEL_ID
      );
      expect(confirmation).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    it('should log audit when permission denied for approve', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create a proposal first
      await mockDb.create({
        id: PROPOSAL_ID,
        guildId: 'guild-1',
        proposerId: ADMIN_USER_ID,
        title: 'Test Proposal',
        description: 'Test description',
        type: 'feature',
        status: 'pending',
      });

      // Try to approve as non-admin - should be denied
      await proposalEngine.approve(PROPOSAL_ID, REGULAR_USER_ID, TEST_CHANNEL_ID);

      // Check that audit was logged
      const logCall = consoleSpy.mock.calls[0]?.[0] || '';
      expect(logCall).toContain('[AUDIT]');
      expect(logCall).toContain('APPROVE_DENIED');
      expect(logCall).toContain(PROPOSAL_ID);

      consoleSpy.mockRestore();
    });

    it('should log audit when permission denied for reject', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create a proposal first
      await mockDb.create({
        id: PROPOSAL_ID,
        guildId: 'guild-1',
        proposerId: ADMIN_USER_ID,
        title: 'Test Proposal',
        description: 'Test description',
        type: 'feature',
        status: 'pending',
      });

      // Try to reject as non-admin - should be denied
      await proposalEngine.reject(PROPOSAL_ID, REGULAR_USER_ID, 'Test reason', TEST_CHANNEL_ID);

      // Check that audit was logged
      const logCall = consoleSpy.mock.calls[0]?.[0] || '';
      expect(logCall).toContain('[AUDIT]');
      expect(logCall).toContain('REJECT_DENIED');

      consoleSpy.mockRestore();
    });
  });
});
