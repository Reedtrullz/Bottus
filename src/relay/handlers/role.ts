/**
 * Role Management Handler for Discord
 * 
 * Handles role management commands:
 * - promote <user> to <role>
 * - demote <user>
 * - remove <user>
 * - list roles
 * - myrole
 */

import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { PermissionService, UserRole, Permission } from '../skills/permission.js';
import { logger } from '../../utils/logger.js';

const VALID_ROLES = ['member', 'contributor', 'admin'];

export class RoleHandler implements MessageHandler {
  readonly name = 'role';

  private permissionService: PermissionService;

  constructor(permissionService: PermissionService) {
    this.permissionService = permissionService;
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase().trim();
    
    // Commands that this handler can handle
    const patterns = [
      /^promote\s+</,
      /^demote\s+</,
      /^remove\s+</,
      /^list\s+roles$/,
      /^myrole$/,
      /^hvilken\s+rolle\s+har\s+jeg$/,
      /^min\s+rolle$/,
      /^roller$/,
    ];
    
    return patterns.some(p => p.test(m));
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const trimmed = message.trim();
      const parts = trimmed.split(/\s+/);
      const command = parts[0].toLowerCase();
      const channelId = ctx.channelId;
      const callerId = ctx.userId;

      // Check if caller has permission to manage roles
      if (!this.permissionService.hasPermission(channelId, callerId, Permission.MODIFY_PERMISSIONS)) {
        return {
          handled: true,
          response: '❌ Du har ikke tillatelse til å administrere roller.'
        };
      }

      if (command === 'promote') {
        return await this.handlePromote(parts, channelId, callerId);
      } else if (command === 'demote') {
        return await this.handleDemote(parts, channelId, callerId);
      } else if (command === 'remove') {
        return await this.handleRemove(parts, channelId, callerId);
      } else if (command === 'list' && parts[1]?.toLowerCase() === 'roles') {
        return await this.handleListRoles(channelId);
      } else if (command === 'myrole' || command === 'min' || command === 'hvilken') {
        return await this.handleMyRole(channelId, callerId);
      }

      return {
        handled: false,
        response: 'Ukjent kommando. Bruk: promote <bruker> to <rolle>, demote <bruker>, remove <bruker>, list roles, myrole'
      };
    } catch (error) {
      logger.error('[RoleHandler] Error handling message:', { error: error as any });
      return {
        handled: true,
        response: 'En feil oppstod ved håndtering av rollen.'
      };
    }
  }

  private async handlePromote(parts: string[], channelId: string, callerId: string): Promise<HandlerResult> {
    // Format: promote <user> to <role>
    const toIndex = parts.findIndex(p => p.toLowerCase() === 'to');
    
    if (toIndex === -1 || toIndex < 2 || toIndex >= parts.length - 1) {
      return {
        handled: true,
        response: 'Bruk: promote <bruker> to <rolle>\nGyldige roller: member, contributor, admin'
      };
    }

    const targetUser = parts[1];
    const roleStr = parts.slice(toIndex + 1).join('').toLowerCase();

    if (!VALID_ROLES.includes(roleStr)) {
      return {
        handled: true,
        response: `Ugyldig rolle: ${roleStr}\nGyldige roller: ${VALID_ROLES.join(', ')}`
      };
    }

    const role = roleStr as UserRole;
    this.permissionService.setUserRole(channelId, targetUser, role, callerId);

    const roleEmoji = role === 'admin' ? '🛡️' : role === 'contributor' ? '⭐' : '👤';
    return {
      handled: true,
      response: `${roleEmoji} ${targetUser} er nå ${role} i denne samtalen.`
    };
  }

  private async handleDemote(parts: string[], channelId: string, callerId: string): Promise<HandlerResult> {
    // Format: demote <user>
    if (parts.length < 2) {
      return {
        handled: true,
        response: 'Bruk: demote <bruker>'
      };
    }

    const targetUser = parts[1];
    const currentRole = this.permissionService.getUserRole(channelId, targetUser);
    
    if (currentRole === UserRole.MEMBER) {
      return {
        handled: true,
        response: `${targetUser} er allerede medlem (laveste rolle).`
      };
    }

    // Demote to member
    this.permissionService.setUserRole(channelId, targetUser, UserRole.MEMBER, callerId);

    return {
      handled: true,
      response: `👤 ${targetUser} er nå degradert til medlem.`
    };
  }

  private async handleRemove(parts: string[], channelId: string, callerId: string): Promise<HandlerResult> {
    // Format: remove <user> (removes role entirely, defaults to member)
    if (parts.length < 2) {
      return {
        handled: true,
        response: 'Bruk: remove <bruker>'
      };
    }

    const targetUser = parts[1];
    this.permissionService.setUserRole(channelId, targetUser, UserRole.MEMBER, callerId);

    return {
      handled: true,
      response: `❌ Fjernet rolle for ${targetUser}. De er nå standard medlem.`
    };
  }

  private async handleListRoles(channelId: string): Promise<HandlerResult> {
    const { roleDb } = await import('../../db/index.js');
    const roles = roleDb.getChannelRoles(channelId);

    if (!roles || roles.length === 0) {
      return {
        handled: true,
        response: 'Ingen roller er satt i denne samtalen. Alle er standard medlemmer.'
      };
    }

    const roleIcons: Record<string, string> = {
      owner: '👑',
      admin: '🛡️',
      contributor: '⭐',
      member: '👤'
    };

    const lines = ['**Roller i denne samtalen:**'];
    for (const r of roles) {
      const icon = roleIcons[r.role] || '👤';
      lines.push(`${icon} ${r.user_id}: ${r.role}`);
    }

    return {
      handled: true,
      response: lines.join('\n')
    };
  }

  private async handleMyRole(channelId: string, userId: string): Promise<HandlerResult> {
    const role = this.permissionService.getUserRole(channelId, userId);
    
    const roleInfo: Record<string, { emoji: string; permissions: string }> = {
      owner: { emoji: '👑', permissions: 'Alle tilganger' },
      admin: { emoji: '🛡️', permissions: 'Kan administrere roller, slette events, godkjenne forslag' },
      contributor: { emoji: '⭐', permissions: 'Kan opprette events og minner' },
      member: { emoji: '👤', permissions: 'Kan se kalender og bilder' }
    };

    const info = roleInfo[role] || roleInfo.member;

    return {
      handled: true,
      response: `${info.emoji} Din rolle: ${role}\n${info.permissions}`
    };
  }
}
