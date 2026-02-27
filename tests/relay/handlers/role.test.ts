import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../src/db/index.js', () => ({
  roleDb: {
    setUserRole: vi.fn().mockReturnValue(true),
    getUserRole: vi.fn().mockReturnValue(null),
    getChannelRoles: vi.fn().mockReturnValue([])
  }
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

import { RoleHandler } from '../../../src/relay/handlers/role.js';
import { PermissionService, Permission, UserRole } from '../../../src/relay/skills/permission.js';
import { roleDb } from '../../../src/db/index.js';

describe('RoleHandler', () => {
  let handler: RoleHandler;
  let mockPermissionService: PermissionService;

  const mockCtx = {
    message: 'test message',
    channelId: 'test-channel',
    userId: 'admin-user',
    discord: {
      sendMessage: vi.fn().mockResolvedValue(undefined)
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionService = new PermissionService();
    mockPermissionService.setOwner('owner-user');
    handler = new RoleHandler(mockPermissionService as any);
  });

  describe('constructor', () => {
    it('should set handler name to "role"', () => {
      expect(handler.name).toBe('role');
    });
  });

  describe('canHandle', () => {
    it('should return true for promote command', () => {
      expect(handler.canHandle('promote <@user> to admin', mockCtx)).toBe(true);
      expect(handler.canHandle('PROMOTE <@user> to contributor', mockCtx)).toBe(true);
    });

    it('should return true for demote command', () => {
      expect(handler.canHandle('demote <@user>', mockCtx)).toBe(true);
      expect(handler.canHandle('DEMOTE <@user>', mockCtx)).toBe(true);
    });

    it('should return true for remove command', () => {
      expect(handler.canHandle('remove <@user>', mockCtx)).toBe(true);
      expect(handler.canHandle('REMOVE <@user>', mockCtx)).toBe(true);
    });

    it('should return true for list roles command', () => {
      expect(handler.canHandle('list roles', mockCtx)).toBe(true);
      expect(handler.canHandle('LIST ROLES', mockCtx)).toBe(true);
    });

    it('should return true for myrole command', () => {
      expect(handler.canHandle('myrole', mockCtx)).toBe(true);
      expect(handler.canHandle('MYROLE', mockCtx)).toBe(true);
    });

    it('should return true for Norwegian commands', () => {
      expect(handler.canHandle('hvilken rolle har jeg', mockCtx)).toBe(true);
      expect(handler.canHandle('min rolle', mockCtx)).toBe(true);
      expect(handler.canHandle('roller', mockCtx)).toBe(true);
    });

    it('should return false for empty message', () => {
      expect(handler.canHandle('', mockCtx)).toBe(false);
      expect(handler.canHandle('   ', mockCtx)).toBe(false);
    });

    it('should return false for non-role commands', () => {
      expect(handler.canHandle('hello', mockCtx)).toBe(false);
      expect(handler.canHandle('create event', mockCtx)).toBe(false);
      expect(handler.canHandle('list', mockCtx)).toBe(false);
    });
  });

  describe('handle', () => {
    describe('permission denial', () => {
      it('should deny when user lacks MODIFY_PERMISSIONS permission', async () => {
        vi.spyOn(mockPermissionService, 'hasPermission').mockReturnValue(false);

        const result = await handler.handle('promote <@user> to admin', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('ikke tillatelse');
      });
    });

    describe('promote command', () => {
      beforeEach(() => {
        vi.spyOn(mockPermissionService, 'hasPermission').mockReturnValue(true);
      });

      it('should return usage error when format is invalid', async () => {
        const result = await handler.handle('promote', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Bruk: promote');
      });

      it('should return error for invalid role', async () => {
        const result = await handler.handle('promote <@user> to invalidrole', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Ugyldig rolle');
        expect(result.response).toContain('member, contributor, admin');
      });

      it('should promote user to admin role', async () => {
        vi.spyOn(mockPermissionService, 'setUserRole').mockReturnValue(undefined);

        const result = await handler.handle('promote <@user> to admin', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('<@user>');
        expect(result.response).toContain('admin');
        expect(mockPermissionService.setUserRole).toHaveBeenCalledWith(
          'test-channel',
          '<@user>',
          UserRole.ADMIN,
          'admin-user'
        );
      });

      it('should promote user to contributor role with star emoji', async () => {
        vi.spyOn(mockPermissionService, 'setUserRole').mockReturnValue(undefined);

        const result = await handler.handle('promote <@user> to contributor', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('⭐');
        expect(result.response).toContain('contributor');
      });

      it('should promote user to member role', async () => {
        vi.spyOn(mockPermissionService, 'setUserRole').mockReturnValue(undefined);

        const result = await handler.handle('promote <@user> to member', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('👤');
        expect(result.response).toContain('member');
      });
    });

    describe('demote command', () => {
      beforeEach(() => {
        vi.spyOn(mockPermissionService, 'hasPermission').mockReturnValue(true);
      });

      it('should return usage error when user is missing', async () => {
        const result = await handler.handle('demote', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Bruk: demote');
      });

      it('should return message when user is already member', async () => {
        vi.spyOn(mockPermissionService, 'getUserRole').mockReturnValue(UserRole.MEMBER);

        const result = await handler.handle('demote <@user>', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('allerede medlem');
      });

      it('should demote user to member', async () => {
        vi.spyOn(mockPermissionService, 'getUserRole').mockReturnValue(UserRole.ADMIN);
        vi.spyOn(mockPermissionService, 'setUserRole').mockReturnValue(undefined);

        const result = await handler.handle('demote <@user>', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('degradert til medlem');
        expect(mockPermissionService.setUserRole).toHaveBeenCalledWith(
          'test-channel',
          '<@user>',
          UserRole.MEMBER,
          'admin-user'
        );
      });
    });

    describe('remove command', () => {
      beforeEach(() => {
        vi.spyOn(mockPermissionService, 'hasPermission').mockReturnValue(true);
      });

      it('should return usage error when user is missing', async () => {
        const result = await handler.handle('remove', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Bruk: remove');
      });

      it('should remove user role and set to member', async () => {
        vi.spyOn(mockPermissionService, 'setUserRole').mockReturnValue(undefined);

        const result = await handler.handle('remove <@user>', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Fjernet rolle for <@user>');
        expect(mockPermissionService.setUserRole).toHaveBeenCalledWith(
          'test-channel',
          '<@user>',
          UserRole.MEMBER,
          'admin-user'
        );
      });
    });

    describe('list roles command', () => {
      beforeEach(() => {
        vi.spyOn(mockPermissionService, 'hasPermission').mockReturnValue(true);
      });

      it('should return message when no roles exist', async () => {
        vi.spyOn(roleDb, 'getChannelRoles').mockReturnValue([]);

        const result = await handler.handle('list roles', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Ingen roller');
      });

      it('should list roles with correct icons', async () => {
        vi.spyOn(roleDb, 'getChannelRoles').mockReturnValue([
          { user_id: 'user1', role: 'admin' },
          { user_id: 'user2', role: 'contributor' },
          { user_id: 'user3', role: 'member' }
        ]);

        const result = await handler.handle('list roles', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Roller i denne samtalen');
        expect(result.response).toContain('🛡️ user1: admin');
        expect(result.response).toContain('⭐ user2: contributor');
        expect(result.response).toContain('👤 user3: member');
      });

      it('should handle unknown roles with default icon', async () => {
        vi.spyOn(roleDb, 'getChannelRoles').mockReturnValue([
          { user_id: 'unknown-user', role: 'unknown_role' }
        ]);

        const result = await handler.handle('list roles', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('👤 unknown-user: unknown_role');
      });
    });

    describe('myrole command', () => {
      beforeEach(() => {
        vi.spyOn(mockPermissionService, 'hasPermission').mockReturnValue(true);
      });

      it('should return owner role info', async () => {
        const ownerCtx = { ...mockCtx, userId: 'owner-user' };
        vi.spyOn(mockPermissionService, 'getUserRole').mockReturnValue(UserRole.OWNER);

        const result = await handler.handle('myrole', ownerCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('👑');
        expect(result.response).toContain('owner');
        expect(result.response).toContain('Alle tilganger');
      });

      it('should return admin role info', async () => {
        vi.spyOn(mockPermissionService, 'getUserRole').mockReturnValue(UserRole.ADMIN);

        const result = await handler.handle('myrole', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('🛡️');
        expect(result.response).toContain('admin');
        expect(result.response).toContain('Kan administrere roller');
      });

      it('should return contributor role info', async () => {
        vi.spyOn(mockPermissionService, 'getUserRole').mockReturnValue(UserRole.CONTRIBUTOR);

        const result = await handler.handle('myrole', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('⭐');
        expect(result.response).toContain('contributor');
        expect(result.response).toContain('Kan opprette events');
      });

      it('should return member role info', async () => {
        vi.spyOn(mockPermissionService, 'getUserRole').mockReturnValue(UserRole.MEMBER);

        const result = await handler.handle('myrole', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('👤');
        expect(result.response).toContain('member');
        expect(result.response).toContain('Kan se kalender');
      });

      it('should work with Norwegian commands', async () => {
        vi.spyOn(mockPermissionService, 'getUserRole').mockReturnValue(UserRole.MEMBER);

        const result = await handler.handle('min rolle', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('Din rolle: member');
      });
    });

    describe('unknown command', () => {
      beforeEach(() => {
        vi.spyOn(mockPermissionService, 'hasPermission').mockReturnValue(true);
      });

      it('should return handled=false for unknown commands', async () => {
        const result = await handler.handle('unknown command', mockCtx);

        expect(result.handled).toBe(false);
        expect(result.response).toContain('Ukjent kommando');
      });
    });

    describe('error handling', () => {
      it('should catch errors and return error response', async () => {
        vi.spyOn(mockPermissionService, 'hasPermission').mockImplementation(() => {
          throw new Error('Database error');
        });

        const result = await handler.handle('promote <@user> to admin', mockCtx);

        expect(result.handled).toBe(true);
        expect(result.response).toContain('feil oppstod');
      });
    });
  });
});
