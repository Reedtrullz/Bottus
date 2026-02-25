// Confirmation system for dangerous actions
// Requires user confirmation before executing destructive operations

import { auditLogger, AuditAction } from './audit-log.js';

export enum ConfirmationType {
  DELETE_EVENT = 'delete_event',
  CLEAR_MEMORY = 'clear_memory',
  DELETE_MEMORY = 'delete_memory',
  EXPORT_DATA = 'export_data',
  ROLE_CHANGE = 'role_change',
  APPROVE_PROPOSAL = 'approve_proposal',
  REJECT_PROPOSAL = 'reject_proposal',
}

export interface PendingConfirmation {
  id: string;
  type: ConfirmationType;
  userId: string;
  channelId: string;
  createdAt: number;
  expiresAt: number;
  details: Record<string, unknown>;
  approved: boolean | null;
}

export class ConfirmationService {
  private pending: Map<string, PendingConfirmation> = new Map();
  private timeoutMs = 60000;

  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }

  createConfirmation(type: ConfirmationType, userId: string, channelId: string, details: Record<string, unknown> = {}): PendingConfirmation {
    const confirmation: PendingConfirmation = {
      id: `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId,
      channelId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.timeoutMs,
      details,
      approved: null,
    };
    this.pending.set(confirmation.id, confirmation);
    auditLogger.log(AuditAction.CONFIRMATION_REQUESTED, userId, channelId, { type, confirmationId: confirmation.id, details });
    return confirmation;
  }

  approve(confirmationId: string): boolean {
    const confirmation = this.pending.get(confirmationId);
    if (!confirmation) return false;
    if (Date.now() > confirmation.expiresAt) {
      this.pending.delete(confirmationId);
      auditLogger.log(AuditAction.CONFIRMATION_TIMEOUT, confirmation.userId, confirmation.channelId, { type: confirmation.type, confirmationId });
      return false;
    }
    confirmation.approved = true;
    this.pending.delete(confirmationId);
    auditLogger.log(AuditAction.CONFIRMATION_APPROVED, confirmation.userId, confirmation.channelId, { type: confirmation.type, confirmationId });
    return true;
  }

  cancel(confirmationId: string): boolean {
    const confirmation = this.pending.get(confirmationId);
    if (!confirmation) return false;
    confirmation.approved = false;
    this.pending.delete(confirmationId);
    auditLogger.log(AuditAction.CONFIRMATION_CANCELLED, confirmation.userId, confirmation.channelId, { type: confirmation.type, confirmationId });
    return true;
  }

  getPending(channelId: string): PendingConfirmation[] {
    const now = Date.now();
    const result: PendingConfirmation[] = [];
    for (const confirmation of this.pending.values()) {
      if (confirmation.channelId === channelId && now < confirmation.expiresAt) {
        result.push(confirmation);
      }
    }
    // Clean up expired
    for (const [id, confirmation] of this.pending.entries()) {
      if (Date.now() > confirmation.expiresAt) this.pending.delete(id);
    }
    return result;
  }

  getConfirmation(confirmationId: string): PendingConfirmation | undefined {
    return this.pending.get(confirmationId);
  }

  isPendingForUser(channelId: string, userId: string): boolean {
    const now = Date.now();
    for (const confirmation of this.pending.values()) {
      if (confirmation.channelId === channelId && confirmation.userId === userId && now < confirmation.expiresAt && confirmation.approved === null) {
        return true;
      }
    }
    return false;
  }
}

export const confirmationService = new ConfirmationService();
