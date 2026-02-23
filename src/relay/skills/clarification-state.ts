// Shared clarification state for MemorySkill and ClarificationSkill
// This allows the two skills to share pending clarification state

export interface PendingClarification {
  text: string;
  timestamp: number;
  userId: string;
}

// Module-level map to track pending clarifications per channel
const _pendingClarifications = new Map<string, PendingClarification>();

export const pendingClarifications = {
  set(channelId: string, clarification: PendingClarification): void {
    _pendingClarifications.set(channelId, clarification);
  },

  get(channelId: string): PendingClarification | undefined {
    return _pendingClarifications.get(channelId);
  },

  delete(channelId: string): boolean {
    return _pendingClarifications.delete(channelId);
  },

  has(channelId: string): boolean {
    return _pendingClarifications.has(channelId);
  }
};
