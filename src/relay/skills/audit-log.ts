// Audit logging system for NanoBot
// Records all actions for security review and accountability

import { Permission } from './permission.js';

export enum AuditAction {
  ROLE_ASSIGNED = 'role:assigned',
  ROLE_REMOVED = 'role:removed',
  PERMISSION_CHECK_FAILED = 'permission:denied',
  EVENT_CREATED = 'calendar:event_created',
  EVENT_DELETED = 'calendar:event_deleted',
  EVENT_RSVP = 'calendar:rsvp',
  EVENT_EXPORTED = 'calendar:exported',
  MEMORY_CREATED = 'memory:created',
  MEMORY_DELETED = 'memory:deleted',
  MEMORY_CLEARED = 'memory:cleared_channel',
  IMAGE_GENERATED = 'image:generated',
  RATE_LIMITED = 'rate:limited',
  SKILL_REGISTERED = 'skill:registered',
  SKILL_UNREGISTERED = 'skill:unregistered',
  CONFIRMATION_REQUESTED = 'confirmation:requested',
  CONFIRMATION_APPROVED = 'confirmation:approved',
  CONFIRMATION_CANCELLED = 'confirmation:cancelled',
  CONFIRMATION_TIMEOUT = 'confirmation:timeout',
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: AuditAction;
  userId: string;
  channelId: string;
  details: Record<string, unknown>;
  success: boolean;
}

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private maxEntries = 10000;

  log(action: AuditAction, userId: string, channelId: string, details: Record<string, unknown> = {}, success = true): AuditEntry {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action,
      userId,
      channelId,
      details,
      success,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
    const status = success ? '✓' : '✗';
    console.log(`[AUDIT] ${status} ${action} by ${userId} in ${channelId}:`, details);
    return entry;
  }

  getEntries(options: { userId?: string; channelId?: string; action?: AuditAction; since?: number; limit?: number } = {}): AuditEntry[] {
    let filtered = this.entries;
    if (options.userId) filtered = filtered.filter(e => e.userId === options.userId);
    if (options.channelId) filtered = filtered.filter(e => e.channelId === options.channelId);
    if (options.action) filtered = filtered.filter(e => e.action === options.action);
    const since = options.since;
    if (since) filtered = filtered.filter(e => e.timestamp >= since);
    if (options.limit) filtered = filtered.slice(-options.limit);
    return filtered;
  }

  logPermissionDenied(userId: string, channelId: string, permission: Permission, attemptedAction: string): AuditEntry {
    return this.log(AuditAction.PERMISSION_CHECK_FAILED, userId, channelId, { attemptedAction, permission }, false);
  }
}

export const auditLogger = new AuditLogger();
