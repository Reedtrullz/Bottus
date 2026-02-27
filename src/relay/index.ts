import { handleQuery } from './services/query-handler.js';
import { setDiscord, startReminderInterval } from './services/reminder.js';
import { config } from 'dotenv';
import './utils/console-override.js';
import { DiscordRelay } from './discord.js';
import { initializeDatabase, metricsDb } from '../db/index.js';
import { ExtractionService, ExtractedItem } from '../services/extraction.js';
import { rsvpDb } from '../db/index.js';
import { OllamaClient } from './ollama.js';
import { CircuitBreaker } from '../utils/error-recovery.js';
import { logger } from './utils/logger.js';
declare const console: any;
console.log = (...args: any[]) => logger.info(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')) as any;
console.error = (...args: any[]) => logger.error(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')) as any;
console.warn = (...args: any[]) => logger.warn(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')) as any;
import { selfHealer } from '../services/self-healer.js';
import { healthMonitor } from '../services/health-monitor.js';
import { ComfyUIClient } from '../services/comfyui.js';
import { t } from '../utils/i18n.js';
import { isQueryMessage, extractImagePrompt } from './utils/detectors.js';
import { discordRateLimiter } from './utils/rate-limit.js';
import { FeaturesHandler, TechStackHandler, HelpHandler, HandlerContext, ImageHandler, globalHandlers, ToneHandler, SelfAnalysisHandler } from './handlers/index.js';

let comfyui: any = null;
const ollamaBreaker = new CircuitBreaker();
import { PlanRouter } from './plan-router.js';
import { FeedbackHandler } from './handlers/feedback.js';
import { selfImprovement } from '../services/self-improvement.js';
import { skillRegistry, HandlerContext as SkillHandlerContext } from './skills/registry.js';
import { CalendarSkillV2 } from './skills/calendar-skill-v2.js';
import { MemorySkill } from './skills/memory-skill.js';
import { ClarificationSkill } from './skills/clarification-skill.js';
import { DayDetailsSkill } from './skills/day-details-skill.js';
import { CalendarServiceV2 } from '../services/calendar-v2.js';
import { startHealthEndpoint } from './health.js';

import { CalendarDisplayService } from '../services/calendar-display.js';
import { ToneService } from '../services/tone.js';
import { MemoryService } from '../services/memory.js';


import { permissionService, auditLogger, confirmationService } from './skills/index.js';
import { userProfileService } from '../services/user-profile.js';
import { botPersonaService } from '../services/bot-persona.js';




config();

const DISCORD_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b-instruct';
const RELAY_TIMEOUT_MS = parseInt(process.env.RELAY_TIMEOUT_MS || '60000', 10);
const HISTORY_MAX_MESSAGES = parseInt(process.env.HISTORY_MAX_MESSAGES || '5', 10);

function validateEnv(): void {
  const missing: string[] = [];

  if (!process.env.DISCORD_USER_TOKEN) {
    missing.push('DISCORD_USER_TOKEN');
  }

  if (missing.length > 0) {
    logger.error('❌ Missing required environment variables:', { context: 'Relay' });
    missing.forEach((v) => logger.error(`   - ${v}`, { context: 'Relay' }));
    process.exit(1);
  }
}

validateEnv();

  async function main() {
  const VERSION = '1.0.0';
  logger.info('╔═══════════════════════════════════════════════════════╗');
  logger.info('║           Ine Ollama Relay Bot                      ║');
  logger.info(`║           Version: ${VERSION.padEnd(39)}║`);
  logger.info(`║           Port:    3001 (health)                      ║`);
  logger.info('╚═══════════════════════════════════════════════════════╝');
  logger.info('[Relay] Starting Ine Ollama Relay...');




  logger.info('[Relay] Initializing database...', { context: 'Relay' });
  await initializeDatabase();
  logger.info('[Relay] Database initialized', { context: 'Relay' });
  
  // Start health endpoint
  startHealthEndpoint();

  const ollama = new OllamaClient(OLLAMA_URL, OLLAMA_MODEL, RELAY_TIMEOUT_MS);
  const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
  comfyui = new ComfyUIClient(COMFYUI_URL);
  const discord = new DiscordRelay(DISCORD_TOKEN, HISTORY_MAX_MESSAGES);
  setDiscord(discord);
  startReminderInterval();

  // Register message handlers
  const featuresHandler = new FeaturesHandler();
  const techStackHandler = new TechStackHandler();
  const helpHandler = new HelpHandler();

  
  try {
    const client: any = (discord as any).getClient?.();
    if (client) {
      client.on('interactionCreate', async (interaction: any) => {
        try {
          if (!(typeof interaction?.isButton === 'function' ? interaction.isButton() : false)) return;
          const customId = interaction?.customId;
          if (!customId) return;
          if (!['kalender_prev', 'kalender_next', 'kalender_today'].includes(customId)) return;
          const channelId = interaction?.channel?.id ?? '';
          let next = weekOffsets.get(channelId) ?? 0;
          if (customId === 'kalender_prev') next -= 1;
          if (customId === 'kalender_next') next += 1;
          if (customId === 'kalender_today') next = 0;
          weekOffsets.set(channelId, next);
          const calendar = new CalendarDisplayService();
          const embed = await calendar.buildWeekEmbed(undefined, undefined, next);
          const lines: string[] = [];
          if ((embed as any).title) lines.push((embed as any).title);
          if ((embed as any).fields && Array.isArray((embed as any).fields)) {
            for (const f of (embed as any).fields) {
              const name = f?.name ?? '';
              const value = f?.value ?? '';
              lines.push(`${name}: ${value}`.trim());
            }
          }
          const text = lines.join('\n');
          if (text) {
            await (discord as any).sendMessage(channelId, text, { embed: embed as any });
          } else {
            await interaction.reply({ content: t('calendar.updateFailed'), ephemeral: true });
          }
          try { await interaction.deferUpdate?.(); } catch { }
        } catch {
  
        }
      });
    }
  } catch {
  }

  // RSVP reaction handling
  try {
    const client: any = (discord as any).getClient?.();
    if (client) {
  client.on('messageReactionAdd', async (reaction: any, user: any) => {
    if (!reaction?.message) return;
    const msgId = reaction.message.id;
    const eventId = eventConfirmationMap.get(msgId);
    if (!eventId) return;
    const emoji = reaction.emoji?.name;
    const status = emoji === '✅' ? 'yes' : emoji === '❌' ? 'no' : emoji === '🤔' ? 'maybe' : null;
    if (status) {
      try { await rsvpDb.upsert(eventId, user?.id ?? '', status); } catch {}
    }
    // Also log thumbs feedback to FeedbackHandler when available
    try {
      if (emoji === '👍' || emoji === '👎') {
        await feedbackHandler.handleReaction(msgId, user?.id ?? '', emoji);
      }
    } catch {
      // best-effort logging; ignore failures to avoid breaking flow
    }
  });
      client.on('messageReactionRemove', async (reaction: any, user: any) => {
        if (!reaction?.message) return;
        const msgId = reaction.message.id;
        const eventId = eventConfirmationMap.get(msgId);
        if (!eventId) return;
        try { await rsvpDb.remove(eventId, user?.id ?? ''); } catch {}
      });
    }
  } catch {
  }

  // Per-channel calendar week offset (for navigation via buttons / commands)
  const weekOffsets: Map<string, number> = new Map();
  // In-memory mapping of confirmation message IDs to event IDs for RSVP handling
  const eventConfirmationMap: Map<string, string> = new Map();

  // Extraction service (wire-in)
  const extraction = new ExtractionService();
  // Memory service (store/recall memories)
  const memory = new MemoryService();
  const planRouter = new PlanRouter();
  // Feedback handler for logging and critique
  const feedbackHandler = new FeedbackHandler('./data/interactions.db', './data/critic-prompt.txt', OLLAMA_URL, OLLAMA_MODEL);
  // Lightweight FeedbackService instance (kept for backward compatibility in existing paths)


  // Register modular handlers
  const imageHandler = new ImageHandler(comfyui);

  // Register all handlers with globalHandlers
  globalHandlers.register(featuresHandler);
  globalHandlers.register(techStackHandler);
  globalHandlers.register(helpHandler);
  globalHandlers.register(imageHandler);
  globalHandlers.register(new ToneHandler());
  globalHandlers.register(new SelfAnalysisHandler(selfImprovement));


  const calendarV2 = new CalendarServiceV2('./data/calendar-v2.db');
  skillRegistry.register(new CalendarSkillV2(calendarV2));
  skillRegistry.register(new MemorySkill());
  skillRegistry.register(new ClarificationSkill());
  skillRegistry.register(new DayDetailsSkill());
  // Set bot owner for permission checks
  const BOT_OWNER_ID = process.env.DISCORD_OWNER_ID || 'your-discord-user-id';
  permissionService.setOwner(BOT_OWNER_ID);
  logger.info(`Bot owner set to: ${BOT_OWNER_ID}`);
  // Check if message is relevant for memory context injection
  const needsMemoryContext = (msg: string): boolean => {
    const lower = msg.toLowerCase();
    const skipPatterns = [
      'lag et bilde', 'generate image', 'lag bilde',
      'calendar', 'kalender', 'arrangement', 'møte',
      'help', 'hjelp', 'commands', 'kommandoer',
      'vis dag', 'detaljer om',
      'husk at', 'husk jeg', 'husk imorgen', 'husk på'
    ];
    if (skipPatterns.some(p => lower.includes(p))) return false;
    if (msg.length < 5) return false;
    const personalPatterns = [
      'hvem er jeg', 'about me', 'who am i',
      'hva kan du', 'what can you', 'fortell om',
      '?', 'hva synes', 'hva mener', 'what do you'
    ];
    return personalPatterns.some(p => lower.includes(p));
  };

  // Flow handler: processes extraction results and continues the relay flow
  const handleExtractionFlow = async (
    extractionResult: ExtractedItem[],
    userMessage: string,
    channelId: string
  ) => {
  // Pre-fetch memories only when relevant
  const userIdForMemory = (discord as any).getUserId?.() ?? '';
  let memoryContext = '';
  if (needsMemoryContext(userMessage)) {
    try {
      const mems: any[] = await memory.recall(userIdForMemory);
      if (Array.isArray(mems) && mems.length > 0) {
        const facts = mems
          .map((m: any) => m?.fact)
          .filter((f: any) => typeof f === 'string' && f.trim().length > 0);
        if (facts.length > 0) {
          memoryContext = `User facts: ${facts.map((f: string) => `- ${f}`).join(' ')}`;
        }
      }
    } catch (err) {
      console.error('[Relay] Memory recall failed:', (err as Error)?.message ?? err);
    }
  }
  // If the user asked a query about events/tasks, answer directly instead of extraction flow
  if (isQueryMessage(userMessage)) {
    const userIdForQuery = (discord as any).getUserId?.() ?? '';
    const queryResp = await handleQuery(channelId, userMessage, userIdForQuery);
    await discord.sendMessage(channelId, queryResp);
    return;
  }
  // Route extraction results through PlanRouter; if it handles, stop here
  const userId = (discord as any).getUserId?.() ?? '';
  if (extractionResult && extractionResult.length > 0) {
    const actions = await planRouter.route(extractionResult, userMessage, userId, channelId, discord);
    const tookAction = actions.some(a => a.type !== 'none');
    if (tookAction) {
      logger.info('[Relay] PlanRouter handled extraction', { context: 'Relay' });
      return;
    }
  }
  // Continue with the original flow (LOW confidence or no-action cases)
  // Build a lightweight enhancement to the prompt that includes extraction results
  let enhancedMessage = userMessage;
  if (extractionResult && extractionResult.length > 0) {
    const snippets = extractionResult.map((item) => {
      const type = item.type.toUpperCase();
      const title = item.title;
      const conf = Math.round(item.confidence * 100);
      return `${type} ${title} (${conf}%)`;
    }).join(' | ');
    enhancedMessage = `${userMessage}\n[Extraction] ${snippets}`;
    // Log extraction details for visibility
    logger.info('[Extraction] Found ' + extractionResult.length + ' item(s): ' + snippets, { context: 'Relay' });
  } else {
  logger.info('[Extraction] No items extracted from message', { context: 'Relay' });
  }

  // Get user role for context (NanoBot handles permission-aware responses)

  // Inject memory context if available
  const personaContext = botPersonaService.buildSystemPrompt();
  const personaPrefix = personaContext ? `${personaContext}\n\n` : "";
  const userContext = userProfileService.buildContextString(channelId, userId);
  const userContextPrefix = userContext ? `[User Context]\n${userContext}\n\n` : "";
  const promptForOllama = memoryContext ? `${personaPrefix}${userContextPrefix}${memoryContext}\n${enhancedMessage}` : `${personaPrefix}${userContextPrefix}${enhancedMessage}`;

  // Health check before Ollama call
  const ollamaHealth = await healthMonitor.checkOllama();
  if (ollamaHealth.status === 'unhealthy') {
    logger.warn(`Ollama unhealthy: ${ollamaHealth.error}`, { context: 'Relay' });
    await discord.sendMessage(channelId, 'AI-tjenesten er for øyeblikket utilgjengelig. Prøv igjen senere.');
    return;
  }

  const startTime = Date.now();
  let response = '';
  try {
    response = await ollamaBreaker.execute(() => ollama.sendMessage(promptForOllama));
    const responseTimeMs = Date.now() - startTime;
    const userIdForMetrics = (discord as any).getUserId?.() ?? '';
    metricsDb.record({ userId: userIdForMetrics, responseTimeMs, model: OLLAMA_MODEL });
    const userIdForTone = (discord as any).getUserId?.() ?? '';
    const tonedResponse = ToneService.apply(response, userIdForTone);
    const sent = await discord.sendMessage(channelId, tonedResponse);
    const messageId = (sent as any)?.id ?? '';
    try {
      const interaction = await feedbackHandler.logInteraction(messageId, channelId, userIdForMemory, enhancedMessage, tonedResponse, []);
      // critique asynchronously (fire-and-forget)
      void feedbackHandler.critiqueResponse?.(interaction, enhancedMessage);
    } catch {
      // ignore logging/critique failures to avoid breaking bot flow
    }
    logger.info('Extraction flow: response sent to Discord');
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const responseTimeMs = Date.now() - startTime;
    const userIdForMetrics = (discord as any).getUserId?.() ?? '';
    metricsDb.record({ userId: userIdForMetrics, responseTimeMs, errorCount: 1, model: OLLAMA_MODEL });
    console.error('[Relay] Extraction flow error:', errorMessage);
    await discord.sendMessage(channelId, `Sorry, extraction flow failed. Error: ${errorMessage}`);
  }

}; // end of handleExtractionFlow

  logger.info('Checking Ollama connectivity...');
  let healthy = false;
  try {
    healthy = await ollamaBreaker.execute(() => ollama.healthCheck());
  } catch (err: any) {
    healthy = false;
    console.warn('[Relay] Ollama health check blocked by circuit breaker:', (err?.message ?? err));
  }
  if (!healthy) {
    logger.warn('Ollama not reachable (circuit breaker or network). Will retry on messages.');
  } else {
    logger.info('Ollama is reachable');
  }
      // Readiness check for ComfyUI after Ollama health check
      // Also send Discord DM if READY_USER is set
      const READY_USER = process.env.READY_USER || 'reedtrullz';
      try {
        const comfyHealth = await fetch(`${COMFYUI_URL || 'http://localhost:8188'}/system_stats`);
        if (comfyHealth && comfyHealth.ok) {
          logger.info('ComfyUI health: OK');
          // Send readiness DM to user
          try {
            const sent = await discord.sendDMToUser(READY_USER, 
              '🎨 **Bildegenerering er klar!**\n\nJeg kan nå lage bilder for deg. Prøv f.eks:\n• "lag et bilde av et ekorn"\n• "tegn en koselig katt"\n• "generer et bilde av en strand i solnedgang"');
            if (sent) {
              logger.info(`Sent readiness message to ${READY_USER}`);
            }
          } catch (e) {
            console.warn('[Relay] Failed to send readiness DM:', e);
          }
        } else {
          console.warn('[Relay] ComfyUI health check status', comfyHealth?.status ?? 'unknown');
        }
      } catch (e) {
        console.warn('[Relay] ComfyUI health check failed:', e);
      }

      // (Memory handling implemented in the first onMention block. This duplicate block has been removed.)

      // Register the mention handler (memory-enabled) before login
      discord.onMention(async (msg: any) => {
        const channelId = msg.channel.id;
        const rawContent = msg.content || '';
        const userMessage = rawContent.replace(/<@!?\d+>/g, '').replace(/@inebotten/gi, '').trim();
        const userId = (discord as any).getUserId();
        
        // Rate limiting check
        if (!discordRateLimiter.isAllowed(userId)) {
          const remaining = discordRateLimiter.getRemaining(userId);
          await discord.sendMessage(channelId, `Vennligst vent litt... Du har ${remaining} forsøk igjen i dette minuttet.`);
          return;
        }
        
        // Image generation trigger (before extraction flow)
        const _imagePrompt = extractImagePrompt(userMessage);
        if (_imagePrompt && comfyui) {
          // Health check before ComfyUI call
          const comfyuiHealth = await healthMonitor.checkComfyUI();
          if (comfyuiHealth.status === 'unhealthy') {
            logger.warn(`ComfyUI unhealthy: ${comfyuiHealth.error}`, { context: 'Relay' });
            await discord.sendMessage(channelId, 'Bildegenerering er for øyeblikket utilgjengelig. Prøv igjen senere.');
            return;
          }
          
          try {
            const enhancedPrompt = await comfyui.enhancePrompt(_imagePrompt);
            const result = await comfyui.generateImage(enhancedPrompt, userId);
if (result.success && result.imageUrl) {
  // Send only the URL as the message content (no file payload)
  await discord.sendMessage(channelId, `${result.imageUrl}`);
  return;
} else {
  console.warn('[Relay] Image generation failed:', result.error);
  await discord.sendMessage(channelId, 'Beklager, bildegenerering feilet: ' + (result.error || 'ukjent feil'));
  return;
}
          } catch (err) {
            logger.error('[Relay] ComfyUI image generation failed:', { context: 'Relay', error: err as any });
          }
        }

// Dispatch to registered handlers
const handlerCtx: HandlerContext = { 
  message: userMessage, 
  userId, 
  channelId, 
  discord
};

// Check canHandle first, then call handle
// FeaturesHandler removed - HelpHandler now handles all help queries
void featuresHandler;
if (techStackHandler.canHandle(userMessage, handlerCtx)) {
  const techResult = await techStackHandler.handle(userMessage, handlerCtx);
  if (techResult.handled) return;
}


// Unified skill routing using skillRegistry
const securityCtx = { permissionService, auditLogger, confirmationService };
const skillCtx: SkillHandlerContext = { message: userMessage, userId, channelId, discord, extraction, memory, security: securityCtx };
const skill = skillRegistry.findHandler(userMessage, skillCtx);
if (skill) {
  logger.info(`Skill matched: ${skill.name}`, { context: 'Relay' });
  
  // Self-healing wrapper around skill execution
  const result = await selfHealer.executeWithHealing(
    () => skill.handle(userMessage, skillCtx),
    {
      context: skill.name,
      onRetry: (error, attempt) => {
        logger.warn(`Skill ${skill.name} failed (attempt ${attempt}): ${error.message}`, { context: 'Relay' });
      },
      onHeal: (error, category) => {
        logger.error(`Skill ${skill.name} healed after retry: ${error.message}`, { context: 'Relay', category });
      },
      fallback: async () => {
        // User-friendly fallback messages per skill type
        const fallbackMessages: Record<string, string> = {
          'calendar-v2': 'Kunne ikke hente kalenderen. Prøv igjen senere.',
          'memory': 'Kunne ikke lagre minnet. Prøv igjen.',
          'clarification': 'Noe gikk galt. Prøv igjen.',
          'day-details': 'Kunne ikke hente detaljer. Prøv igjen.',
        };
        const msg = fallbackMessages[skill.name] || 'Noe gikk galt. Prøv igjen.';
        await discord.sendMessage(channelId, msg);
        return { handled: true, response: msg };
      },
    }
  );
  
  if (result.success && result.data?.handled) {
    return;
  }
}

// Help handler - AFTER skills so actual queries are handled by skills first
if (helpHandler.canHandle(userMessage, handlerCtx)) {
  const helpResult = await helpHandler.handle(userMessage, handlerCtx);
  logger.info('[Relay] HelpHandler result:', { context: 'Relay', result: helpResult });
  if (helpResult.handled) return;
}

// Dispatch to modular handlers (image - remaining handler)
if (imageHandler.canHandle(userMessage, handlerCtx)) {
  const imgResult = await imageHandler.handle(userMessage, handlerCtx);
  if (imgResult.handled) return;
}

// Dispatch remaining to globalHandlers registry
const result = await globalHandlers.dispatch(userMessage, handlerCtx);
if (result.handled) return;

// Build reply-context if this is a reply to a bot message
    let enhancedUserMessage = userMessage;
    const replyId = (msg as any).reference?.message_id || (msg as any).reference?.messageId;
    if (replyId) {
      try {
        const client: any = (discord as any).getClient();
        const channel = client?.channels?.cache?.get(channelId);
        if (channel && channel.messages && channel.messages.fetch) {
          const replied: any = await channel.messages.fetch(replyId);
          if (replied && replied.author && replied.author.bot) {
            const beforeLimit = Math.max(HISTORY_MAX_MESSAGES - 1, 0);
            const beforeCollection: any = await channel.messages.fetch({ limit: beforeLimit, before: replyId } as any);
            const beforeMsgs: any[] = Array.isArray(beforeCollection) ? beforeCollection : Array.from((beforeCollection as any)?.values?.() ?? []);
            const ordered = beforeMsgs.sort((a: any, b: any) => (a.createdTimestamp ?? 0) - (b.createdTimestamp ?? 0));
            const contextLines = ordered.map((m: any) => `${m.author?.username ?? 'Unknown'}: ${m.content ?? ''}`);
            contextLines.push(`${replied.author?.username ?? 'Bot'}: ${replied.content ?? ''}`);
            const contextText = contextLines.join('\n');
            if (contextText.trim()) {
              enhancedUserMessage = `[Context for Ollama]\n${contextText}\nUser: ${userMessage}`;
            }
          }
        }
      } catch (e: any) {
        console.error('[Relay] Reply context fetch failed:', e?.message ?? e);
      }
    }
    // Proceed with normal flow
  try {
  logger.info('[Relay] Detected @mention. Running extraction...', { context: 'Relay' });
      const extractionResult = extraction.extract(enhancedUserMessage);
      await handleExtractionFlow(extractionResult, enhancedUserMessage, channelId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Relay] Error: ${errorMessage}`, { context: 'Relay' });
      await discord.sendMessage(channelId, `Sorry, I couldn't get a response. Error: ${errorMessage}`);
    }
  });

        await discord.login();

        // Send readiness DM after login (reusing READY_USER from earlier block)
        try {
          const comfyHealth = await fetch(`${COMFYUI_URL || 'http://localhost:8188'}/system_stats`);
          if (comfyHealth && comfyHealth.ok) {
            logger.info('[Relay] ComfyUI health: OK (post-login)', { context: 'Relay' });
            try {
              const sent = await discord.sendDMToUser(READY_USER, 
                '🎨 **Bildegenerering er klar!**\\n\\nJeg kan nå lage bilder for deg. Prøv f.eks:\\n• "lag et bilde av et ekorn"\\n• "tegn en koselig katt"\\n• "generer et bilde av en strand i solnedgang"');
              if (sent) {
                logger.info(`[Relay] Sent readiness message to ${READY_USER}`, { context: 'Relay' });
              }
            } catch (e) {
              logger.warn('[Relay] Failed to send readiness DM:', { context: 'Relay', error: e as any });
            }
          }
        } catch (e) {
          logger.warn('[Relay] ComfyUI health check failed:', { context: 'Relay', error: e as any });
        }


  process.on('SIGINT', () => {
    logger.info('Received SIGINT - Shutting down gracefully...');
    discord.disconnect();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM - Shutting down gracefully...');
    discord.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
