import { config } from 'dotenv';
import './utils/console-override.js';
import { DiscordRelay } from './discord.js';
import { eventDb, taskDb, initializeDatabase, metricsDb } from '../db/index.js';
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
import { isQueryMessage, isCalendarQuery, isTechStackQuery, isFeaturesQuery, isSelfAnalysisQuery, isMemoryStore, isMemoryQuery, extractImagePrompt } from './utils/detectors.js';
import { discordRateLimiter } from './utils/rate-limit.js';
import { FeaturesHandler, TechStackHandler, HelpHandler, HandlerContext, ImageHandler } from './handlers/index.js';

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
import { toneDb } from '../db/index.js';
import { FeedbackService } from '../services/feedback.js';

// Norwegian month name -> 0-11 index helper
function norskMonthNameToIndex(name: string): number | null {
  if (!name) return null;
  const n = name.toLowerCase();
  const map: Record<string, number> = {
    januar: 0,
    februar: 1,
    mars: 2,
    april: 3,
    mai: 4,
    juni: 5,
    juli: 6,
    august: 7,
    september: 8,
    oktober: 9,
    november: 10,
    desember: 11,
  };
  return map[n] ?? null;
}
// Month index -> Norwegian month name
function norskMonthIndexToName(idx: number): string {
  const list = [
    'Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'
  ];
  return list[((idx % 12) + 12) % 12];
}

// Track pending clarifications: channelId -> { text, timestamp }
const pendingClarifications = new Map<string, { text: string; timestamp: number }>();

async function handleQuery(channelId: string, query: string, userId?: string): Promise<string> {
  // Mark channelId as used to satisfy static analysis when the value isn't read
  void channelId;
  // Fetch upcoming events and pending tasks
  const eventsResp: any[] = await eventDb.findUpcoming(10);
  const tasksResp: any[] = await taskDb.findPending();
  const events = Array.isArray(eventsResp) ? eventsResp : [];
  const tasks = Array.isArray(tasksResp) ? tasksResp : [];
  const q = (query ?? "").toLowerCase();
  // If a userId is provided, allow specific event title queries
  const userIdForQuery = userId ?? '';
  const specificFromQuery = maybeHandleSpecificEventQuery(query ?? '', userIdForQuery);
  if (specificFromQuery) return specificFromQuery;
  let filteredEvents = events;
  const keywords: string[] = [];
  if (q.includes("alfred")) keywords.push("alfred");
  if (q.includes("spania") || q.includes("spanish")) keywords.push("spania");
  if (keywords.length > 0) {
    filteredEvents = events.filter((ev: any) => {
      const title = (ev?.title ?? "").toString().toLowerCase();
      const desc = (ev?.description ?? "").toString().toLowerCase();
      return keywords.some(k => title.includes(k) || desc.includes(k));
    });
  }

  const formatDateTime = (dt: any): string => {
    try {
      const d = new Date(dt);
      return d.toLocaleString("nb-NO", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return dt?.toString?.() ?? "";
    }
  };

  // NEW: Specific event query handling (Norwegian)
  // If user asks "når er <title>?" try to fetch exact event by title
  function maybeHandleSpecificEventQuery(queryStr: string, userId: string): string | null {
    if (!queryStr) return null as string | null;
    const lower = queryStr.toLowerCase();
    if (!lower.includes('når er')) return null;
    const m = queryStr.match(/når er\s+(.+?)(?:\?|$)/i);
    if (!m) return null;
    const titleQuery = m[1]?.trim();
    if (!titleQuery) return null;
    try {
      const hits = (eventDb as any).searchByTitle(userId, titleQuery) as any[];
      if (Array.isArray(hits) && hits.length > 0) {
        const ev = hits[0];
        const start = ev?.start_time ?? ev?.startTime ?? ev?.start;
        const startText = start != null ? formatDateTime(start) : '';
        const end = ev?.end_time ?? ev?.endTime ?? ev?.end;
        const endText = end != null ? ` til ${formatDateTime(end)}` : '';
        const nm = ev?.title ?? titleQuery;
        return `Arrangementen "${nm}" er planlagt${startText ? ` kl. ${startText}` : ''}${endText}.`;
      } else {
        return `Fant ingen hendelse med tittelen "${titleQuery}".`;
      }
    } catch {
      return null;
    }
  }

  const formatEvent = (ev: any): string => {
    const title = ev?.title ?? ev?.name ?? "Arrangement";
    const t = ev?.start ?? ev?.time ?? ev?.date ?? ev?.startTime;
    const timePart = t ? `kl. ${formatDateTime(t)}` : "";
    return [title, timePart].filter(Boolean).join(" ").trim();
  };

  // Build response
  const parts: string[] = [];
  // Norwegian RSVP query: who is coming to the next event?
  if (q.includes('hvem kommer')) {
    const nextEvent = events.length > 0 ? events[0] : null;
    if (nextEvent) {
      try {
        const rsvps = await (rsvpDb as any).findForEvent(nextEvent.id) as any[];
        const lines = (rsvps || []).map((rv: any) => `${rv.user_id} (${rv.status})`);
        const text = lines.length > 0 ? lines.join(', ') : 'Ingen påmeldte ennå';
        return `Deltakere for neste arrangement (${nextEvent.title}): ${text}`;
      } catch {
        return `Deltakere for neste arrangement: ingen data tilgjengelig`;
      }
    }
    return 'Ingen kommende arrangementer å vise deltakere for.';
  }
  if (filteredEvents.length > 0) {
    const list = filteredEvents.slice(0, 10);
    if (list.length === 1) {
      parts.push(`Du har ${formatEvent(list[0]).trim()}`);
    } else {
      const items = list.map((ev: any, idx: number) => `${idx + 1}) ${formatEvent(ev).trim()}`);
      parts.push(`Planlagt: ${items.join(", ")}`);
    }
  }
  if (Array.isArray(tasks) && tasks.length > 0) {
    const tlist = tasks.slice(0, 10);
    const fmt = tlist.map((tk: any, idx: number) => {
      const title = tk?.title ?? tk?.name ?? "Oppgave";
      const due = tk?.due ?? tk?.dueDate ?? null;
      const when = due ? ` (${formatDateTime(due)})` : "";
      return `${idx + 1}) ${title}${when}`;
    });
    if (parts.length > 0) {
      parts.push(`Neste oppgaver: ${fmt.join(", ")}`);
    } else if (tlist.length === 1) {
      parts.push(`Du har en oppgave: ${fmt[0]}`);
    } else {
      parts.push(`Neste oppgaver: ${fmt.join(", ")}`);
    }
  }
  if (parts.length === 0) {
    return "Ingen planlagte arrangementer";
  }
  return parts.join("\n");
}

config();

const DISCORD_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b-instruct';
const RELAY_TIMEOUT_MS = parseInt(process.env.RELAY_TIMEOUT_MS || '60000', 10);
const HISTORY_MAX_MESSAGES = parseInt(process.env.HISTORY_MAX_MESSAGES || '5', 10);


  async function main() {
  const VERSION = '1.0.0';
  logger.info('╔═══════════════════════════════════════════════════════╗');
  logger.info('║           Ine Ollama Relay Bot                      ║');
  logger.info(`║           Version: ${VERSION.padEnd(39)}║`);
  logger.info(`║           Port:    3001 (health)                      ║`);
  logger.info('╚═══════════════════════════════════════════════════════╝');
  logger.info('[Relay] Starting Ine Ollama Relay...');

  if (!DISCORD_TOKEN) {
    logger.error('[Relay] ERROR:', { context: 'Relay', message: t('errors.missingToken') });
    process.exit(1);
  }

  logger.info('[Relay] Initializing database...', { context: 'Relay' });
  await initializeDatabase();
  logger.info('[Relay] Database initialized', { context: 'Relay' });
  
  // Start health endpoint
  startHealthEndpoint();

  const ollama = new OllamaClient(OLLAMA_URL, OLLAMA_MODEL, RELAY_TIMEOUT_MS);
  const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
  comfyui = new ComfyUIClient(COMFYUI_URL);
  const discord = new DiscordRelay(DISCORD_TOKEN, HISTORY_MAX_MESSAGES);

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
  const feedback = new FeedbackService();

  // Register modular handlers
  const imageHandler = new ImageHandler(comfyui);

  // Register skills with the skillRegistry at startup
  const calendarV2 = new CalendarServiceV2('./data/calendar-v2.db');
  skillRegistry.register(new CalendarSkillV2(calendarV2));
  skillRegistry.register(new MemorySkill());
  skillRegistry.register(new ClarificationSkill());
  skillRegistry.register(new DayDetailsSkill());

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

  // Inject memory context if available
  const promptForOllama = memoryContext ? `${memoryContext}\n${enhancedMessage}` : enhancedMessage;

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
    console.log('[Relay] Extraction flow: response sent to Discord');
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const responseTimeMs = Date.now() - startTime;
    const userIdForMetrics = (discord as any).getUserId?.() ?? '';
    metricsDb.record({ userId: userIdForMetrics, responseTimeMs, errorCount: 1, model: OLLAMA_MODEL });
    console.error('[Relay] Extraction flow error:', errorMessage);
    await discord.sendMessage(channelId, `Sorry, extraction flow failed. Error: ${errorMessage}`);
  }

}; // end of handleExtractionFlow

  console.log('[Relay] Checking Ollama connectivity...');
  let healthy = false;
  try {
    healthy = await ollamaBreaker.execute(() => ollama.healthCheck());
  } catch (err: any) {
    healthy = false;
    console.warn('[Relay] Ollama health check blocked by circuit breaker:', (err?.message ?? err));
  }
  if (!healthy) {
    console.warn('[Relay] Ollama not reachable (circuit breaker or network). Will retry on messages.');
  } else {
    console.log('[Relay] Ollama is reachable');
  }
      // Readiness check for ComfyUI after Ollama health check
      // Also send Discord DM if READY_USER is set
      const READY_USER = process.env.READY_USER || 'reedtrullz';
      try {
        const comfyHealth = await fetch(`${COMFYUI_URL || 'http://localhost:8188'}/system_stats`);
        if (comfyHealth && comfyHealth.ok) {
          console.log('[Relay] ComfyUI health: OK');
          // Send readiness DM to user
          try {
            const sent = await discord.sendDMToUser(READY_USER, 
              '🎨 **Bildegenerering er klar!**\n\nJeg kan nå lage bilder for deg. Prøv f.eks:\n• "lag et bilde av et ekorn"\n• "tegn en koselig katt"\n• "generer et bilde av en strand i solnedgang"');
            if (sent) {
              console.log(`[Relay] Sent readiness message to ${READY_USER}`);
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
if (helpHandler.canHandle(userMessage, handlerCtx)) {
  const helpResult = await helpHandler.handle(userMessage, handlerCtx);
  logger.info('[Relay] HelpHandler result:', { context: 'Relay', result: helpResult });
  if (helpResult.handled) return;
}

// Unified skill routing using skillRegistry
const skillCtx: SkillHandlerContext = { message: userMessage, userId, channelId, discord, extraction, memory };
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

// Dispatch to modular handlers (image - remaining handler)
if (imageHandler.canHandle(userMessage, handlerCtx)) {
  const imgResult = await imageHandler.handle(userMessage, handlerCtx);
  if (imgResult.handled) return;
}

  // Phase 3: per-user tone set command (NB-NO friendly) - allow minor configuration via chat
  if (userMessage.startsWith('tone set') || userMessage.startsWith('tone-set')) {
    const tokens = userMessage.split(/\s+/).slice(2);
    let language = 'nb-NO';
    tokens.forEach((t: string) => {
      if (t.startsWith('en')) language = 'en-US';
    });
    try {
      toneDb?.setTone?.(userId, 'friendly_nb', language);
      await discord.sendMessage(channelId, `Tone oppdatert: ${language}`);
    } catch {
      await discord.sendMessage(channelId, `Kunne ikke oppdatere tone for deg.`);
    }
    return;
  }

    // Feedback handling: store or view feedback
    if (userMessage.toLowerCase().includes('tilbakemelding') || userMessage.toLowerCase().includes('feedback')) {
      // If user says "tilbakemelding" followed by text, store it
      const feedbackMatch = userMessage.match(/(?:tilbakemelding|feedback)\s*:?\s*(.+)/i);
      if (feedbackMatch && feedbackMatch[1]?.trim()) {
        // Store feedback with the text
        try {
          await feedback.store(userId, '', channelId, 'positive', feedbackMatch[1].trim(), '');
          await discord.sendMessage(channelId, `Takk for tilbakemeldingen! ${feedbackMatch[1].trim().substring(0, 50)}... lagret.`);
        } catch (e) {
          await discord.sendMessage(channelId, `Kunne ikke lagre tilbakemelding: ${(e as Error)?.message}`);
        }
        return;
      }
      // Otherwise show their recent feedback
      try {
        const userFeedback = await feedback.getByUser(userId, 10);
        const list = feedback.formatFeedbackList(userFeedback);
        await discord.sendMessage(channelId, `📋 Dine tilbakemeldinger:\n${list}`);
      } catch (e) {
        await discord.sendMessage(channelId, `Kunne ikke hente tilbakemeldinger: ${(e as Error)?.message}`);
      }
      return;
    }
    
    // Check for pending clarification response
    const pending = pendingClarifications.get(channelId);
    if (pending && (userMessage === 'avtale' || userMessage === 'minne' || userMessage === 'avtale!' || userMessage === 'minne!')) {
      pendingClarifications.delete(channelId);
      if (userMessage.startsWith('avtale')) {
        await discord.sendMessage(channelId, `Får ikke opprettet kalenderhendelse ennå. Kan du prøve /kalender kommandoen?`);
      } else {
        await memory.store(userId, pending.text);
        await discord.sendMessage(channelId, `Lagret minne: ${pending.text}`);
      }
      return;
    }
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
    // Features trigger: respond with capabilities
    if (isFeaturesQuery(userMessage)) {
      try {
        const lines = [
          'Jeg kan hjelpe deg med litt av hvert! Her er hva jeg kan:',
          '',
          '📅 **Kalender** - spør om "hva skjer" eller "når er X"',
          '💾 **Huske ting for deg** - bare si "husk at..."',
          '📊 **Lage avstemninger** - "finn en tid for møte"',
          '',
          'Vil du vite mer om hvordan jeg er bygget? Spør om "tech stack"! 🤓'
        ];
        const text = lines.join('\n');
        const toned = ToneService.apply(text, userId);
        await discord.sendMessage(channelId, toned);
      } catch (err) {
        console.error('[Relay] Features error:', err);
      }
      return;
    }
    // Tech stack trigger: respond
    if (isTechStackQuery(userMessage)) {
      try {
        const lines = [
          'Ah, du vil vite hvordan jeg fungerer? 😊',
          '',
          'Jeg er bygget med **TypeScript** og kjører på **Node.js**.',
          'For Discord bruker jeg **Eris** og en selfbot-ting for å kunne lese gruppechatter.',
          '',
          'Den "hjernen" min er **Ollama** med mistral:7b-instruct modellen - den er ganske flink til norsk!',
          'Alt lagres lokalt i **SQLite**, så ingen data forlater maskinen din.',
          '',
          'Hele greia kjører i **Docker** konteinere for å holde det ryddig. 🐳'
        ];
        await discord.sendMessage(channelId, lines.join('\n'));
      } catch (err) {
        console.error('[Relay] Tech stack error:', err);
      }
      return;
    }
    // Self-analysis trigger: analyze bot performance
    if (isSelfAnalysisQuery(userMessage)) {
      try {
        await discord.sendMessage(channelId, t('selfAnalysis.start'));
        const result = await selfImprovement.analyze(50);
        const stats = selfImprovement.getStats();
        const lines = [
          `📊 **Analyseresultater**`,
          '',
          `Totalt: ${stats.total} requests`,
          `Gj.snitt respons-tid: ${Math.round(Number(stats.avgResponseTime))}ms`,
          `Feil-rate: ${Math.round((stats.errorRate || 0) * 100)}%`,
          '',
          result.summary,
          ''
        ];
        if (result.suggestions.length > 0) {
          lines.push('💡 **Forslag til forbedringer:**');
          for (const s of result.suggestions.slice(0, 3)) {
            lines.push(`- [${s.category}] ${s.description} (${s.effort})`);
          }
        }
        await discord.sendMessage(channelId, lines.join('\n'));
      } catch (err) {
        console.error('[Relay] Self-analysis error:', err);
        await discord.sendMessage(channelId, t('selfAnalysis.error'));
      }
      return;
    }
    // Memory store / recall handling (Norwegian prompts)
    try {
      if (isMemoryStore(userMessage)) {
        const m = userMessage.match(/(?:^|\s)(husk|husk at|husk jeg er)\b\s*(.*)/i);
        const textToStore = m?.[2]?.trim() ?? userMessage;
        
        // Check if text contains date/time patterns - if so, ask for clarification
        const datePatterns = [
          'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag',
          'i dag', 'i morgen', 'imorgen', 'neste uke',
          'kl ', 'klokken', 'tidspunkt',
          'dato', 'januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'
        ];
        const hasDatePattern = datePatterns.some(p => textToStore.toLowerCase().includes(p));
        const hasTimePattern = /\d{1,2}:\d{2}/.test(textToStore);
        
        if (hasDatePattern || hasTimePattern) {
          // Ask for clarification and store pending
          pendingClarifications.set(channelId, { text: textToStore, timestamp: Date.now() });
          await discord.sendMessage(channelId, 
            'Jeg ser at dette kan være en avtale eller et minne. Vil du:\n' +
            '• 🗓️ **Opprett som kalenderhendelse**\n' +
            '• 💾 **Lagre som et minne**\n\n' +
            'Svar med "avtale" eller "minne", så ordner jeg det!'
          );
          return;
        }
        
        await memory.store(userId, textToStore);
        const memoryMsg = `Lagret minne: ${textToStore}`;
        const tonedMemory = ToneService.apply(memoryMsg, userId);
        await discord.sendMessage(channelId, tonedMemory);
        return;
      }
      if (isMemoryQuery(userMessage)) {
        const mems: any[] = await memory.recall(userId);
        if (Array.isArray(mems) && mems.length > 0) {
          const items = mems.slice(0, 5).map((mm: any, idx: number) => `${idx + 1}. ${mm?.fact ?? ''}`);
          await discord.sendMessage(channelId, `Husker jeg:\n${items.join('\n')}`);
        } else {
          await discord.sendMessage(channelId, 'Ingen minner funnet.');
        }
        return;
      }
    } catch (e) {
      console.error('[Relay] Memory handling error:', (e as Error)?.message ?? e);
    }
    // Day-details trigger: "detaljer om <dato>" or "vis[, dag] <dato>"
    try {
      const ddMatch = userMessage.match(/detaljer om\s+(.+)/i) || userMessage.match(/vis(?: dag)?\s+(.+)/i);
      if (ddMatch && ddMatch[1]) {
        const dateStr = ddMatch[1].trim();
        const date = new Date(dateStr);
        if (!Number.isNaN(date.getTime())) {
          const calendar = new CalendarDisplayService();
          const details = await calendar.getDayDetails(date);
          if (Array.isArray(details) && details.length > 0) {
            const header = `Detaljer for ${date.toDateString()}:`;
            const lines = details.map((ev: any) => {
              const when = `${ev.start_time}–${ev.end_time}`.trim();
              const parts = [`${ev.title} (${when})`];
              if (ev.description) parts.push(`Beskrivelse: ${ev.description}`);
              if (ev.attendees && ev.attendees.length > 0) parts.push(`Deltakere: ${ev.attendees.join(', ')}`);
              if (ev.rsvp_status) parts.push(`RSVP: ${ev.rsvp_status}`);
              return parts.join(' | ');
            });
            const text = [header, ...lines].join('\n');
            await discord.sendMessage(channelId, text);
            return;
          }
        }
      }
    } catch {
      // no-op on day-details failures
    }
    // Calendar query handling: show calendar embed instead of Ollama when query detected
    if (isCalendarQuery(userMessage)) {
      try {
        // Extract month jump if present (Norwegian): \/kalender måned:navn or \"kalender måned Navn\"
        let monthIndex: number | undefined;
        let yearForMonth: number | undefined;
        const lowerMsg = userMessage.toLowerCase();
        const mMonthColon = userMessage.match(/\/kalender\s+måned\s*:\s*([a-zøæåäö]+)\b/i);
        if (mMonthColon && mMonthColon[1]) {
          const nm = mMonthColon[1];
          const idx = norskMonthNameToIndex(nm);
          if (idx !== null) monthIndex = idx;
        } else {
          const mMonthPlain = lowerMsg.match(/kalender\s+måned\s+([a-zæøå]+)\b/i);
          if (mMonthPlain && mMonthPlain[1]) {
            const idx = norskMonthNameToIndex(mMonthPlain[1]);
            if (idx !== null) monthIndex = idx;
          }
        }
        const m = userMessage.match(/\/kalender uke:(-?\d+)/i);
        if (m && m[1] !== undefined) {
          const parsed = parseInt(m[1], 10);
          if (!Number.isNaN(parsed)) {
            weekOffsets.set(channelId, parsed);
          }
        }
        const calendar = new CalendarDisplayService();
        const offset = weekOffsets.get(channelId) ?? 0;
        let embed: any;
        if (typeof monthIndex === 'number') {
          const year = (typeof yearForMonth === 'number') ? yearForMonth : new Date().getFullYear();
          embed = await calendar.buildWeekEmbed(undefined, undefined, offset, monthIndex, year);
        } else {
          embed = await calendar.buildWeekEmbed(undefined, undefined, offset);
        }
        if (embed) {
          const lines: string[] = [];
          if ((embed as any).title) lines.push((embed as any).title);
          // Optional: show the month fallback name when jumping to a specific month
          if (typeof monthIndex === 'number') {
            lines.push(`Kalender måned: ${norskMonthIndexToName(monthIndex)}`);
          }
          if ((embed as any).fields && Array.isArray((embed as any).fields)) {
            for (const f of (embed as any).fields) {
              const name = f?.name ?? '';
              const value = f?.value ?? '';
              lines.push(`${name}: ${value}`.trim());
            }
          }
          const text = lines.join('\n');
          if (text) {
            {
              const toned = ToneService.apply(text + '\n\n⚠️ *Kalenderhendelser er ikke implementert endå. Bruk "husk" for å lagre minner.*', userId);
              await discord.sendMessage(channelId, toned, { embed: embed as any });
            }
          }
        } else {
          await discord.sendMessage(channelId, 'Kalenderen kunne ikke bygges akkurat nå.');
        }
  } catch (err) {
    logger.error('[Relay] Calendar embed error:', { context: 'Relay', error: err });
        await discord.sendMessage(channelId, t('calendar.fetchFailed'));
      }
      return;
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

  // In-memory cache to avoid duplicate reminders within the same runtime
  const remindedEventIds = new Set<string>();

  // Helper to run reminder checks periodically
  const runReminders = async () => {
    try {
      // Fetch upcoming events (limited to the next 10 by start_time)
      const upcoming: any[] = eventDb.findUpcoming(10);
      if (!upcoming || upcoming.length === 0) return;

      const nowSec = Math.floor(Date.now() / 1000);
      const twoHoursSec = 2 * 60 * 60;

      for (const ev of upcoming) {
        // event rows use snake_case as returned by sqlite, but be tolerant
        const id = ev.id;
        const channelId = ev.channel_id ?? ev.channelId ?? ev?.channel?.id;
        const title = ev.title ?? '';
        const startTime = ev.start_time ?? ev.startTime ?? ev?.start?.time ?? undefined;
        if (!id || !startTime) continue;

        const diff = Number(startTime) - nowSec;
        // Within 2 hours window, and within next hour to remind (<= 3600 seconds)
        if (diff > 0 && diff <= twoHoursSec) {
          // Only remind once per runtime
          if (diff <= 3600 && !remindedEventIds.has(id)) {
            const formattedTime = extraction.formatTimestamp(Number(startTime));
            const message = `⏰ Påminnelse: ${title} starter ${formattedTime}`;
            if (channelId) {
              try {
                await discord.sendMessage(channelId, message);
              } catch (err) {
                // If we fail to send, log but keep trying on next tick
                logger.error('[Relay] Reminder send failed:', { context: 'Relay', error: err as any });
              }
            } else {
              console.warn('[Relay] Reminder skipped: missing channel_id for event', id);
            }
            remindedEventIds.add(id);
          }
        }
      }
    } catch (err) {
      logger.error('[Relay] Reminder timer error:', { context: 'Relay', error: err as any });
    }
  };

  // Run every 60 seconds
  setInterval(() => {
    // Fire and forget; errors are handled inside runReminders
    runReminders();
  }, 60 * 1000);

  process.on('SIGINT', () => {
    console.log('[Relay] Received SIGINT - Shutting down gracefully...');
    discord.disconnect();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('[Relay] Received SIGTERM - Shutting down gracefully...');
    discord.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
