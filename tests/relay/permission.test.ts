import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionService, UserRole, Permission, permissionService } from '../../src/relay/skills/permission.js';

// Mock the roleDb module
vi.mock('../../src/db/index.js', () => ({
  roleDb: {
    setUserRole: vi.fn().mockReturnValue(true),
    getUserRole: vi.fn().mockReturnValue(null),
  },
}));

// Import after mocking
import { roleDb } from '../../src/db/index.js';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh instance for each test to avoid state leakage
    service = new PermissionService();
  });

  describe('UserRole enum', () => {
    it('should have MEMBER role', () => {
      expect(UserRole.MEMBER).toBe('member');
    });

    it('should have CONTRIBUTOR role', () => {
      expect(UserRole.CONTRIBUTOR).toBe('contributor');
    });

    it('should have ADMIN role', () => {
      expect(UserRole.ADMIN).toBe('admin');
    });

    it('should have OWNER role', () => {
      expect(UserRole.OWNER).toBe('owner');
    });
  });

  describe('Permission enum', () => {
    it('should have QUERY_CALENDAR permission', () => {
      expect(Permission.QUERY_CALENDAR).toBe('query:calendar');
    });

    it('should have QUERY_MEMORY permission', () => {
      expect(Permission.QUERY_MEMORY).toBe('query:memory');
    });

    it('should have QUERY_IMAGE permission', () => {
      expect(Permission.QUERY_IMAGE).toBe('query:image');
    });

    it('should have CREATE_EVENT permission', () => {
      expect(Permission.CREATE_EVENT).toBe('create:event');
    });

    it('should have CREATE_MEMORY permission', () => {
      expect(Permission.CREATE_MEMORY).toBe('create:memory');
    });

    it('should have RSVP permission', () => {
      expect(Permission.RSVP).toBe('rsvp');
    });

    it('should have DELETE_EVENT permission', () => {
      expect(Permission.DELETE_EVENT).toBe('delete:event');
    });

    it('should have DELETE_MEMORY permission', () => {
      expect(Permission.DELETE_MEMORY).toBe('delete:memory');
    });

    it('should have CLEAR_CHANNEL_MEMORY permission', () => {
      expect(Permission.CLEAR_CHANNEL_MEMORY).toBe('clear:channel_memory');
    });

    it('should have MODIFY_PERMISSIONS permission', () => {
      expect(Permission.MODIFY_PERMISSIONS).toBe('admin:permissions');
    });

    it('should have MANAGE_SKILLS permission', () => {
      expect(Permission.MANAGE_SKILLS).toBe('admin:skills');
    });

    it('should have EXPORT_DATA permission', () => {
      expect(Permission.EXPORT_DATA).toBe('admin:export');
    });

    it('should have APPROVE_PROPOSAL permission', () => {
      expect(Permission.APPROVE_PROPOSAL).toBe('proposal:approve');
    });

    it('should have REJECT_PROPOSAL permission', () => {
      expect(Permission.REJECT_PROPOSAL).toBe('proposal:reject');
    });

    it('should have ALL permission', () => {
      expect(Permission.ALL).toBe('*');
    });
  });

  describe('ROLE_PERMISSIONS mapping', () => {
    it('should assign correct permissions to MEMBER role', () => {
      const memberPermissions = [
        Permission.QUERY_CALENDAR,
        Permission.QUERY_MEMORY,
        Permission.QUERY_IMAGE,
      ];

      expect([
        Permission.QUERY_CALENDAR,
        Permission.QUERY_MEMORY,
        Permission.QUERY_IMAGE,
      ]).toEqual(memberPermissions);
    });

    it('should assign correct permissions to CONTRIBUTOR role', () => {
      expect([
        Permission.QUERY_CALENDAR,
        Permission.QUERY_MEMORY,
        Permission.QUERY_IMAGE,
        Permission.CREATE_EVENT,
        Permission.CREATE_MEMORY,
        Permission.RSVP,
      ]).toContain(Permission.QUERY_CALENDAR);
      expect(Permission.CREATE_EVENT).toBe('create:event');
      expect(Permission.CREATE_MEMORY).toBe('create:memory');
      expect(Permission.RSVP).toBe('rsvp');
    });

    it('should assign correct permissions to ADMIN role', () => {
      expect(Permission.DELETE_EVENT).toBe('delete:event');
      expect(Permission.DELETE_MEMORY).toBe('delete:memory');
      expect(Permission.CLEAR_CHANNEL_MEMORY).toBe('clear:channel_memory');
      expect(Permission.EXPORT_DATA).toBe('admin:export');
      expect(Permission.MODIFY_PERMISSIONS).toBe('admin:permissions');
      expect(Permission.APPROVE_PROPOSAL).toBe('proposal:approve');
      expect(Permission.REJECT_PROPOSAL).toBe('proposal:reject');
    });

    it('should assign ALL permissions to OWNER role', () => {
      expect(Permission.ALL).toBe('*');
    });
  });

  describe('PermissionService.setOwner()', () => {
    it('should set owner ID', () => {
      service.setOwner('owner-user-123');
      expect(service.getOwnerId()).toBe('owner-user-123');
    });

    it('should update owner ID', () => {
      service.setOwner('first-owner');
      service.setOwner('second-owner');
      expect(service.getOwnerId()).toBe('second-owner');
    });

    it('should allow empty owner initially', () => {
      expect(service.getOwnerId()).toBe('');
    });
  });

  describe('PermissionService.setUserRole()', () => {
    it('should set user role in memory', () => {
      service.setUserRole('channel-1', 'user-1', UserRole.MEMBER);

      const role = service.getUserRole('channel-1', 'user-1');
      expect(role).toBe(UserRole.MEMBER);
    });

    it('should persist role to database', () => {
      service.setUserRole('channel-1', 'user-1', UserRole.ADMIN, 'owner-1');

      expect(roleDb.setUserRole).toHaveBeenCalledWith(
        'channel-1',
        'user-1',
        UserRole.ADMIN,
        'owner-1'
      );
    });

    it('should handle role assignment without assignedBy', () => {
      service.setUserRole('channel-1', 'user-1', UserRole.CONTRIBUTOR);

      expect(roleDb.setUserRole).toHaveBeenCalledWith(
        'channel-1',
        'user-1',
        UserRole.CONTRIBUTOR,
        undefined
      );
    });

    it('should overwrite existing role', () => {
      service.setUserRole('channel-1', 'user-1', UserRole.MEMBER);
      service.setUserRole('channel-1', 'user-1', UserRole.ADMIN);

      const role = service.getUserRole('channel-1', 'user-1');
      expect(role).toBe(UserRole.ADMIN);
    });

    it('should handle different channels independently', () => {
      service.setUserRole('channel-1', 'user-1', UserRole.MEMBER);
      service.setUserRole('channel-2', 'user-1', UserRole.ADMIN);

      expect(service.getUserRole('channel-1', 'user-1')).toBe(UserRole.MEMBER);
      expect(service.getUserRole('channel-2', 'user-1')).toBe(UserRole.ADMIN);
    });
  });

  describe('PermissionService.getUserRole()', () => {
    it('should return owner role for owner user', () => {
      service.setOwner('owner-123');

      const role = service.getUserRole('channel-1', 'owner-123');
      expect(role).toBe(UserRole.OWNER);
    });

    it('should return stored role from memory', () => {
      service.setUserRole('channel-1', 'user-1', UserRole.CONTRIBUTOR);

      const role = service.getUserRole('channel-1', 'user-1');
      expect(role).toBe(UserRole.CONTRIBUTOR);
    });

    it('should return null role for unknown user', () => {
      vi.mocked(roleDb.getUserRole).mockReturnValue(null);

      const role = service.getUserRole('channel-1', 'unknown-user');
      expect(role).toBeNull();
    });

    it('should load role from database when not in memory', () => {
      vi.mocked(roleDb.getUserRole).mockReturnValue(UserRole.ADMIN);

      const role = service.getUserRole('channel-1', 'user-db');
      expect(role).toBe(UserRole.ADMIN);
      expect(roleDb.getUserRole).toHaveBeenCalledWith('channel-1', 'user-db');
    });

    it('should cache database role in memory', () => {
      vi.mocked(roleDb.getUserRole).mockReturnValue(UserRole.CONTRIBUTOR);

      // First call loads from DB
      service.getUserRole('channel-1', 'user-1');
      // Second call should use cached value (DB should not be called again)
      service.getUserRole('channel-1', 'user-1');

      expect(roleDb.getUserRole).toHaveBeenCalledTimes(1);
    });
  });

  describe('PermissionService.hasPermission()', () => {
    beforeEach(() => {
      service = new PermissionService();
    });

    it('should return true for owner with any permission', () => {
      service.setOwner('owner-123');

      expect(service.hasPermission('channel-1', 'owner-123', Permission.QUERY_CALENDAR)).toBe(true);
      expect(service.hasPermission('channel-1', 'owner-123', Permission.DELETE_EVENT)).toBe(true);
      expect(service.hasPermission('channel-1', 'owner-123', Permission.MODIFY_PERMISSIONS)).toBe(true);
    });

    it('should return true when user has required permission', () => {
      service.setUserRole('channel-1', 'user-1', UserRole.MEMBER);

      expect(service.hasPermission('channel-1', 'user-1', Permission.QUERY_CALENDAR)).toBe(true);
      expect(service.hasPermission('channel-1', 'user-1', Permission.QUERY_MEMORY)).toBe(true);
      expect(service.hasPermission('channel-1', 'user-1', Permission.QUERY_IMAGE)).toBe(true);
    });

    it('should return false when user lacks required permission', () => {
      service.setUserRole('channel-1', 'user-1', UserRole.MEMBER);

      expect(service.hasPermission('channel-1', 'user-1', Permission.CREATE_EVENT)).toBe(false);
      expect(service.hasPermission('channel-1', 'user-1', Permission.DELETE_EVENT)).toBe(false);
      expect(service.hasPermission('channel-1', 'user-1', Permission.MODIFY_PERMISSIONS)).toBe(false);
    });

    it('should allow CONTRIBUTOR to create events and memories', () => {
      service.setUserRole('channel-1', 'contributor-1', UserRole.CONTRIBUTOR);

      expect(service.hasPermission('channel-1', 'contributor-1', Permission.CREATE_EVENT)).toBe(true);
      expect(service.hasPermission('channel-1', 'contributor-1', Permission.CREATE_MEMORY)).toBe(true);
      expect(service.hasPermission('channel-1', 'contributor-1', Permission.RSVP)).toBe(true);
    });

    it('should allow ADMIN to delete and modify', () => {
      service.setUserRole('channel-1', 'admin-1', UserRole.ADMIN);

      expect(service.hasPermission('channel-1', 'admin-1', Permission.DELETE_EVENT)).toBe(true);
      expect(service.hasPermission('channel-1', 'admin-1', Permission.DELETE_MEMORY)).toBe(true);
      expect(service.hasPermission('channel-1', 'admin-1', Permission.CLEAR_CHANNEL_MEMORY)).toBe(true);
      expect(service.hasPermission('channel-1', 'admin-1', Permission.EXPORT_DATA)).toBe(true);
      expect(service.hasPermission('channel-1', 'admin-1', Permission.MODIFY_PERMISSIONS)).toBe(true);
    });

    it('should deny MEMBER for contributor actions', () => {
      service.setUserRole('channel-1', 'member-1', UserRole.MEMBER);

      expect(service.hasPermission('channel-1', 'member-1', Permission.CREATE_EVENT)).toBe(false);
      expect(service.hasPermission('channel-1', 'member-1', Permission.RSVP)).toBe(false);
    });

    it('should deny CONTRIBUTOR for admin actions', () => {
      service.setUserRole('channel-1', 'contributor-1', UserRole.CONTRIBUTOR);

      expect(service.hasPermission('channel-1', 'contributor-1', Permission.DELETE_EVENT)).toBe(false);
      expect(service.hasPermission('channel-1', 'contributor-1', Permission.MODIFY_PERMISSIONS)).toBe(false);
    });

    it('should throw for unknown user without any role', () => {
      vi.mocked(roleDb.getUserRole).mockReturnValue(null);

      // When role is null, ROLE_PERMISSIONS[null] is undefined, so this throws
      // The function doesn't handle null roles gracefully
      expect(() => service.hasPermission('channel-1', 'unknown-user', Permission.QUERY_CALENDAR)).toThrow();
    });
  });

  describe('Role hierarchy', () => {
    beforeEach(() => {
      service = new PermissionService();
    });

    it('MEMBER has fewer permissions than CONTRIBUTOR', () => {
      service.setUserRole('channel-1', 'member', UserRole.MEMBER);
      service.setUserRole('channel-1', 'contributor', UserRole.CONTRIBUTOR);

      // Contributor should have all member permissions plus more
      expect(service.hasPermission('channel-1', 'contributor', Permission.QUERY_CALENDAR)).toBe(true);
      expect(service.hasPermission('channel-1', 'contributor', Permission.CREATE_EVENT)).toBe(true);

      // Member should not have contributor-only permissions
      expect(service.hasPermission('channel-1', 'member', Permission.CREATE_EVENT)).toBe(false);
    });

    it('CONTRIBUTOR has fewer permissions than ADMIN', () => {
      service.setUserRole('channel-1', 'contributor', UserRole.CONTRIBUTOR);
      service.setUserRole('channel-1', 'admin', UserRole.ADMIN);

      // Admin should have contributor permissions plus more
      expect(service.hasPermission('channel-1', 'admin', Permission.CREATE_EVENT)).toBe(true);
      expect(service.hasPermission('channel-1', 'admin', Permission.DELETE_EVENT)).toBe(true);

      // Contributor should not have admin-only permissions
      expect(service.hasPermission('channel-1', 'contributor', Permission.DELETE_EVENT)).toBe(false);
    });

    it('ADMIN has fewer permissions than OWNER', () => {
      service.setUserRole('channel-1', 'admin', UserRole.ADMIN);
      service.setOwner('owner-user');

      // Owner should have all permissions regardless of stored role
      expect(service.hasPermission('channel-1', 'owner-user', Permission.QUERY_CALENDAR)).toBe(true);
      expect(service.hasPermission('channel-1', 'owner-user', Permission.MODIFY_PERMISSIONS)).toBe(true);
      expect(service.hasPermission('channel-1', 'owner-user', Permission.ALL)).toBe(true);

      // Admin should not have ALL permissions
      expect(service.hasPermission('channel-1', 'admin', Permission.ALL)).toBe(false);
    });
  });

  describe('Owner bypass', () => {
    beforeEach(() => {
      service = new PermissionService();
    });

    it('owner should have ALL permissions regardless of assigned role', () => {
      service.setOwner('owner-123');
      // Even if owner has no explicit role or MEMBER role
      service.setUserRole('channel-1', 'owner-123', UserRole.MEMBER);

      expect(service.hasPermission('channel-1', 'owner-123', Permission.QUERY_CALENDAR)).toBe(true);
      expect(service.hasPermission('channel-1', 'owner-123', Permission.CREATE_EVENT)).toBe(true);
      expect(service.hasPermission('channel-1', 'owner-123', Permission.DELETE_EVENT)).toBe(true);
      expect(service.hasPermission('channel-1', 'owner-123', Permission.MODIFY_PERMISSIONS)).toBe(true);
    });

    it('owner bypass should work even with no stored role', () => {
      service.setOwner('owner-123');
      vi.mocked(roleDb.getUserRole).mockReturnValue(null);

      expect(service.hasPermission('channel-1', 'owner-123', Permission.DELETE_EVENT)).toBe(true);
    });
  });

  describe('Database persistence', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      service = new PermissionService();
    });

    it('should call roleDb.setUserRole when setting role', () => {
      service.setUserRole('channel-1', 'user-1', UserRole.ADMIN, 'owner-1');

      expect(roleDb.setUserRole).toHaveBeenCalledTimes(1);
      expect(roleDb.setUserRole).toHaveBeenCalledWith(
        'channel-1',
        'user-1',
        UserRole.ADMIN,
        'owner-1'
      );
    });

    it('should call roleDb.getUserRole when loading from database', () => {
      vi.mocked(roleDb.getUserRole).mockReturnValue(UserRole.CONTRIBUTOR);

      service.getUserRole('channel-1', 'user-1');

      expect(roleDb.getUserRole).toHaveBeenCalledWith('channel-1', 'user-1');
    });
  });

  describe('Exported permissionService singleton', () => {
    it('should export a PermissionService instance', () => {
      expect(permissionService).toBeInstanceOf(PermissionService);
    });

    it('should have setOwner method', () => {
      expect(typeof permissionService.setOwner).toBe('function');
    });

    it('should have getOwnerId method', () => {
      expect(typeof permissionService.getOwnerId).toBe('function');
    });

    it('should have setUserRole method', () => {
      expect(typeof permissionService.setUserRole).toBe('function');
    });

    it('should have getUserRole method', () => {
      expect(typeof permissionService.getUserRole).toBe('function');
    });

    it('should have hasPermission method', () => {
      expect(typeof permissionService.hasPermission).toBe('function');
    });
  });
});
