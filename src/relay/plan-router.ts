import { eventDb, taskDb } from '../db/index.js';
import { logger } from '../utils/logger.js';
declare const console: any;
console.log = (...args: any[]) => logger.info(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')) as any;
console.error = (...args: any[]) => logger.error(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')) as any;
console.warn = (...args: any[]) => logger.warn(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')) as any;
import { ExtractedItem } from '../services/extraction.js';
import { ToneService } from '../services/tone.js';
import { DiscordRelay } from './discord.js';

/**
 * PlanRouter - Centralized routing for extraction results
 * 
 * Responsibilities:
 * - Determine whether an extracted item should become a calendar event, a task/reminder, or a memory
 * - Dispatch to the appropriate service (CalendarService, taskDb, MemoryService)
 * - Return structured plan actions for audit/traceability
 */

export type PlanActionType = 'calendar_event' | 'task' | 'memory' | 'clarification' | 'none';

export interface PlanAction {
  type: PlanActionType;
  title?: string;
  startTime?: number;
  endTime?: number;
  dueTime?: number;
  description?: string;
  clarification?: string;
  confidence: number;
}

export class PlanRouter {

  /**
   * Main entry point: route extraction results to appropriate handlers
   * @param extractionResult - Array of extracted items from ExtractionService
   * @param userMessage - Original user message for context
   * @param userId - Discord user ID
   * @param channelId - Discord channel ID
   * @param discord - DiscordRelay instance for sending messages
   * @returns Array of PlanAction objects describing what was done
   */
  async route(
    extractionResult: ExtractedItem[],
    userMessage: string,
    userId: string,
    channelId: string,
    discord: DiscordRelay
  ): Promise<PlanAction[]> {
    const actions: PlanAction[] = [];

    if (!extractionResult || extractionResult.length === 0) {
      actions.push({ type: 'none', confidence: 0 });
      return actions;
    }

    // Get the highest confidence item
    const best = extractionResult.reduce((acc, cur) => 
      (cur.confidence > acc.confidence ? cur : acc), extractionResult[0]);
    
    const conf = best.confidence;

    // HIGH confidence (>= 0.8): dispatch directly
    if (conf >= 0.8) {
      const action = await this.handleHighConfidence(best, userId, channelId, discord);
      if (action) actions.push(action);
      return actions;
    }

    // MEDIUM confidence (>= 0.5): ask for clarification
    if (conf >= 0.5) {
      const action = await this.handleMediumConfidence(best, userMessage, channelId, discord);
      if (action) actions.push(action);
      return actions;
    }

    // LOW confidence or no items: let the LLM handle it (no action)
    actions.push({ type: 'none', confidence: conf });
    return actions;
  }

  /**
   * Handle high-confidence extractions (>0.8)
   * Directly create calendar events, tasks, or memories
   */
  private async handleHighConfidence(
    item: ExtractedItem,
    userId: string,
    channelId: string,
    discord: DiscordRelay
  ): Promise<PlanAction | null> {
    const title = item.title ?? '';
    const isTask = item.type === 'task' || /frist|deadline/i.test(title);

    // Format time for display
    const tsVal = item.startTime != null
      ? (typeof item.startTime === 'number' ? item.startTime * 1000 : Date.parse(item.startTime))
      : Date.now();
    const formattedTime = this.formatTimestamp(tsVal / 1000);

    try {
      if (isTask) {
        // Create a task/reminder
        await taskDb.create({
          userId,
          channelId,
          title,
          dueTime: item.dueTime,
          ttl: (item as any).ttl
        });
        
        const message = `Lagt til oppgave: ${title}${item.dueTime ? ` (frist: ${this.formatTimestamp(item.dueTime)})` : ''}`;
        const tonedMessage = ToneService.apply(message, userId);
        await discord.sendMessage(channelId, tonedMessage);
        
        return { type: 'task', title, dueTime: item.dueTime, confidence: item.confidence };
      } else {
        // Create a calendar event
        const endTime = item.endTime != null
          ? (typeof item.endTime === 'number' ? item.endTime : Date.parse(item.endTime))
          : undefined;
          
        await eventDb.create({
          userId,
          channelId,
          title,
          startTime: (typeof item.startTime === 'number' ? item.startTime : (item.startTime ? Date.parse(item.startTime) : tsVal)),
          endTime: endTime as any,
          ttl: (item as any).ttl
        });

        // Send confirmation with RSVP options
        const confText = `Lagt til: ${title} ${formattedTime}`.trim();
        const tonedConfText = ToneService.apply(confText, userId);
        const confMsg: any = await discord.sendMessage(channelId, tonedConfText);
        
        // Add RSVP reactions
        if (confMsg && typeof confMsg.react === 'function') {
          try { await confMsg.react('✅'); } catch {}
          try { await confMsg.react('❌'); } catch {}
          try { await confMsg.react('🤔'); } catch {}
        }

        return { 
          type: 'calendar_event', 
          title, 
          startTime: item.startTime, 
          endTime: item.endTime,
          confidence: item.confidence 
        };
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[PlanRouter] High confidence dispatch error:', errMsg);
      
      // Fallback: notify user but don't fail
      await discord.sendMessage(channelId, `Lagt til: ${title} ${formattedTime}`.trim());
      
      return { 
        type: isTask ? 'task' : 'calendar_event', 
        title, 
        confidence: item.confidence 
      };
    }
  }

  /**
   * Handle medium-confidence extractions (0.5-0.8)
   * Ask user for clarification before committing
   */
  private async handleMediumConfidence(
    item: ExtractedItem,
    _userMessage: string,
    channelId: string,
    discord: DiscordRelay
  ): Promise<PlanAction | null> {
    const clarification = (item as any).clarification;
    if (clarification) {
      await discord.sendMessage(channelId, clarification);
      return { type: 'clarification', clarification, confidence: item.confidence };
    }

    const tsVal = item.startTime != null
      ? (typeof item.startTime === 'number' ? item.startTime * 1000 : Date.parse(item.startTime))
      : Date.now();
    
    const hasTime = item.startTime != null;
    const hasTitle = item.title && item.title !== 'Påminnelse' && item.title !== 'Arrangement' && item.title !== 'Avtale';
    const isTask = item.type === 'task';

    let message = '';
    if (!hasTitle && hasTime) {
      if (isTask) {
        message = `Fant dato, men hva skal du huske på?`;
      } else {
        message = `Fant dato (${this.formatTimestamp(tsVal / 1000)}), men hva skal vi møtes om?`;
      }
    } else if (hasTitle && !hasTime) {
      message = `Når skal du huske på "${item.title}"?`;
    } else {
      message = `Kan du gi meg mer info om dette?`;
    }

    await discord.sendMessage(channelId, message);
    
    return { 
      type: 'clarification', 
      clarification: message, 
      title: item.title,
      confidence: item.confidence 
    };
  }

  /**
   * Format timestamp for display (Norwegian locale)
   */
  private formatTimestamp(ts: number): string {
    try {
      const d = new Date(ts * 1000);
      return d.toLocaleString('nb-NO', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return new Date(ts * 1000).toISOString();
    }
  }
}

export default PlanRouter;
