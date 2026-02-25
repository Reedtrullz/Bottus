// Permission system for NanoBot
// Provides role-based access control for skills and dangerous actions

export enum UserRole {
  MEMBER = 'member',
  CONTRIBUTOR = 'contributor',
  ADMIN = 'admin',
  OWNER = 'owner',
}

export enum Permission {
  QUERY_CALENDAR = 'query:calendar',
  QUERY_MEMORY = 'query:memory',
  QUERY_IMAGE = 'query:image',
  CREATE_EVENT = 'create:event',
  CREATE_MEMORY = 'create:memory',
  RSVP = 'rsvp',
  DELETE_EVENT = 'delete:event',
  DELETE_MEMORY = 'delete:memory',
  CLEAR_CHANNEL_MEMORY = 'clear:channel_memory',
  MODIFY_PERMISSIONS = 'admin:permissions',
  MANAGE_SKILLS = 'admin:skills',
  EXPORT_DATA = 'admin:export',
  APPROVE_PROPOSAL = 'proposal:approve',
  REJECT_PROPOSAL = 'proposal:reject',
  ALL = '*',
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.MEMBER]: [Permission.QUERY_CALENDAR, Permission.QUERY_MEMORY, Permission.QUERY_IMAGE],
  [UserRole.CONTRIBUTOR]: [Permission.QUERY_CALENDAR, Permission.QUERY_MEMORY, Permission.QUERY_IMAGE, Permission.CREATE_EVENT, Permission.CREATE_MEMORY, Permission.RSVP],
  [UserRole.ADMIN]: [Permission.QUERY_CALENDAR, Permission.QUERY_MEMORY, Permission.QUERY_IMAGE, Permission.CREATE_EVENT, Permission.CREATE_MEMORY, Permission.RSVP, Permission.DELETE_EVENT, Permission.DELETE_MEMORY, Permission.CLEAR_CHANNEL_MEMORY, Permission.EXPORT_DATA, Permission.MODIFY_PERMISSIONS, Permission.APPROVE_PROPOSAL, Permission.REJECT_PROPOSAL],
  [UserRole.OWNER]: [Permission.ALL],
};

export class PermissionService {
  private channelRoles: Map<string, Map<string, UserRole>> = new Map();
  private ownerId = '';

  setOwner(userId: string): void {
    this.ownerId = userId;
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  setUserRole(channelId: string, userId: string, role: UserRole): void {
    if (!this.channelRoles.has(channelId)) {
      this.channelRoles.set(channelId, new Map());
    }
    this.channelRoles.get(channelId)!.set(userId, role);
  }

  getUserRole(channelId: string, userId: string): UserRole {
    if (userId === this.ownerId) return UserRole.OWNER;
    const channelMap = this.channelRoles.get(channelId);
    return channelMap?.get(userId) || UserRole.MEMBER;
  }

  hasPermission(channelId: string, userId: string, permission: Permission): boolean {
    const role = this.getUserRole(channelId, userId);
    if (role === UserRole.OWNER) return true;
    const permissions = ROLE_PERMISSIONS[role];
    return permissions.includes(permission) || permissions.includes(Permission.ALL);
  }
}

export const permissionService = new PermissionService();
