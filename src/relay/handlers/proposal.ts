/**
 * Proposal Handler for Discord
 * 
 * Handles proposal approval/rejection commands:
 * - approve <proposal-id>
 * - reject <proposal-id> <reason>
 */

import { MessageHandler, HandlerContext, HandlerResult } from './interfaces.js';
import { ProposalEngine } from '../../services/proposal-engine.js';
import { PermissionService, Permission } from '../skills/permission.js';
import { ConfirmationService, ConfirmationType } from '../skills/confirmation.js';
import { logger } from '../../utils/logger.js';

export class ProposalHandler implements MessageHandler {
  readonly name = 'proposal';

  private proposalEngine: ProposalEngine;
  private permissionService: PermissionService;
  private confirmationService: ConfirmationService;

  constructor(
    proposalEngine: ProposalEngine,
    permissionService: PermissionService,
    confirmationService: ConfirmationService
  ) {
    this.proposalEngine = proposalEngine;
    this.permissionService = permissionService;
    this.confirmationService = confirmationService;
  }

  canHandle(message: string, _ctx: HandlerContext): boolean {
    if (!message) return false;
    const m = message.toLowerCase().trim();
    
    // Check for approve/reject commands
    const approveRegex = /^approve\s+[\w-]+$/i;
    const rejectRegex = /^reject\s+[\w-]+\s+.+$/i;
    
    return approveRegex.test(m) || rejectRegex.test(m);
  }

  async handle(message: string, ctx: HandlerContext): Promise<HandlerResult> {
    try {
      const trimmed = message.trim();
      const parts = trimmed.split(/\s+/);
      const command = parts[0].toLowerCase();

      if (command === 'approve') {
        return await this.handleApprove(parts, ctx);
      } else if (command === 'reject') {
        return await this.handleReject(parts, ctx);
      }

      return {
        handled: false,
        response: 'Unknown command. Use: approve <proposal-id> or reject <proposal-id> <reason>'
      };
    } catch (error) {
      logger.error('[ProposalHandler] Error handling message:', { error: error as any });
      return {
        handled: true,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleApprove(parts: string[], ctx: HandlerContext): Promise<HandlerResult> {
    // Parse: approve <proposal-id>
    if (parts.length < 2) {
      return {
        handled: true,
        response: 'Usage: approve <proposal-id>\nExample: approve abc-123-def'
      };
    }

    const proposalId = parts[1];
    const { userId, channelId } = ctx;

    // Check permission before approving
    if (!this.permissionService.hasPermission(channelId, userId, Permission.APPROVE_PROPOSAL)) {
      this.proposalEngine.logAudit('APPROVE_DENIED', proposalId, userId, 'User lacks APPROVE_PROPOSAL permission');
      return {
        handled: true,
        response: `❌ You don't have permission to approve proposals. Requires ADMIN role.`
      };
    }

    // Request confirmation for approval (dangerous action)
    const existingConfirmation = this.confirmationService.getPending(channelId).find(
      c => c.type === ConfirmationType.APPROVE_PROPOSAL && (c.details['proposalId'] as string) === proposalId
    );

    if (!existingConfirmation) {
      const confirmation = this.confirmationService.createConfirmation(
        ConfirmationType.APPROVE_PROPOSAL,
        userId,
        channelId,
        { proposalId, action: 'approve' }
      );

      return {
        handled: true,
        response: `⚠️ You're about to **approve** proposal \`${proposalId}\`.\n\n` +
          `This action cannot be undone. Type \`confirm ${confirmation.id}\` to proceed, ` +
          `or \`cancel ${confirmation.id}\` to abort.`
      };
    }

    // Execute approval directly (permission already checked)
    const proposal = await this.proposalEngine.approve(proposalId, userId, channelId);

    if (!proposal) {
      return { handled: true, response: `❌ Proposal \`${proposalId}\` not found.` };
    }

    logger.info(`[ProposalHandler] Proposal approved: ${proposalId} by ${userId}`);

    return {
      handled: true,
      response: `✅ Proposal **approved**!\n\n` +
        `**ID:** ${proposal.id}\n` +
        `**Title:** ${proposal.title}\n` +
        `**Approved by:** ${userId}\n` +
        `**Status:** ${proposal.status}`
    };
  }

  private async handleReject(parts: string[], ctx: HandlerContext): Promise<HandlerResult> {
    // Parse: reject <proposal-id> <reason>
    if (parts.length < 3) {
      return {
        handled: true,
        response: 'Usage: reject <proposal-id> <reason>\nExample: reject abc-123-def "Not aligned with project goals"'
      };
    }

    const proposalId = parts[1];
    const reason = parts.slice(2).join(' ');
    const { userId, channelId } = ctx;

    // Check permission before rejecting
    if (!this.permissionService.hasPermission(channelId, userId, Permission.REJECT_PROPOSAL)) {
      this.proposalEngine.logAudit('REJECT_DENIED', proposalId, userId, 'User lacks REJECT_PROPOSAL permission');
      return {
        handled: true,
        response: `❌ You don't have permission to reject proposals. Requires ADMIN role.`
      };
    }

    // Request confirmation for rejection (dangerous action)
    const existingConfirmation = this.confirmationService.getPending(channelId).find(
      c => c.type === ConfirmationType.REJECT_PROPOSAL && (c.details['proposalId'] as string) === proposalId
    );

    if (!existingConfirmation) {
      const confirmation = this.confirmationService.createConfirmation(
        ConfirmationType.REJECT_PROPOSAL,
        userId,
        channelId,
        { proposalId, reason, action: 'reject' }
      );

      return {
        handled: true,
        response: `⚠️ You're about to **reject** proposal \`${proposalId}\`.\n\n` +
          `**Reason:** ${reason}\n\n` +
          `This action cannot be undone. Type \`confirm ${confirmation.id}\` to proceed, ` +
          `or \`cancel ${confirmation.id}\` to abort.`
      };
    }

    // Execute rejection directly
    const proposal = await this.proposalEngine.reject(proposalId, userId, reason, channelId);

    if (!proposal) {
      return { handled: true, response: `❌ Proposal \`${proposalId}\` not found.` };
    }

    logger.info(`[ProposalHandler] Proposal rejected: ${proposalId} by ${userId}, reason: ${reason}`);

    return {
      handled: true,
      response: `❌ Proposal **rejected**!\n\n` +
        `**ID:** ${proposal.id}\n` +
        `**Title:** ${proposal.title}\n` +
        `**Rejected by:** ${userId}\n` +
        `**Reason:** ${reason}\n` +
        `**Status:** ${proposal.status}`
    };
  }
}
