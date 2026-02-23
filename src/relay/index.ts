import { config } from 'dotenv';
import { DiscordRelay } from './discord.js';
import { eventDb, taskDb, initializeDatabase, metricsDb } from '../db/index.js';
import { ExtractionService, ExtractedItem } from '../services/extraction.js';
import { rsvpDb } from '../db/index.js';
import { OllamaClient } from './ollama.js';
import { ComfyUIClient } from '../services/comfyui.js';
import { isQueryMessage, isCalendarQuery, isTechStackQuery, isFeaturesQuery, isSelfAnalysisQuery, isMemoryStore, isMemoryQuery, extractImagePrompt } from './utils/detectors.js';
import { FeaturesHandler, TechStackHandler, HelpHandler, HandlerContext } from './handlers/index.js';

let comfyui: any = null;
import { OpenClawClient, calendarTools } from './openclaw-client.js';
import { PlanRouter } from './plan-router.js';
import { selfImprovement } from '../services/self-improvement.js';

// Norwegian date/time context for OpenClaw prompts
function getDateTimeContext(now?: Date): string {
  const date = now ?? new Date();
  const days = ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"];
  const months = ["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];
  const weekday = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `Idag er det ${weekday}, ${day}. ${month}. Klokken er ${hh}:${mm}.`;
}

// OpenClaw tool executor factory for calendar operations
export function createOpenClawToolExecutor(discord: any, userId: string, channelId: string) {
  void calendarTools;
  void discord;
  const executor = async (toolName: string, argsStr: string): Promise<string> => {
    const parseArgs = (input: string) => {
      if (!input) return {} as any;
      try {
        return JSON.parse(input);
      } catch {
        const out: any = {};
        input.split(';').forEach((pair) => {
          const [k, v] = pair.split('=');
          if (k) out[k.trim()] = v?.trim();
        });
        return out;
      }
    };
    const args = parseArgs(argsStr || '{}');
    try {
      switch (toolName) {
        case 'create_event': {
          const { title, startTime, endTime, description } = args || {};
          const eventId = await eventDb.create({ userId, channelId, title, startTime, endTime, description });
          return `Event created: ${eventId}`;
        }
        case 'list_events': {
          const limit = Number(args?.limit) || 20;
          const events: any[] = await eventDb.findUpcoming(limit);
          if (!events?.length) return 'No upcoming events';
          return events.map((e) => `- [${e.id}] ${e.title} at ${e.startTime}`).join('\n');
        }
        case 'get_event': {
          const id = args?.id;
          const list: any[] = await eventDb.findUpcoming(1000);
          const found = list.find((e) => e.id === id);
          return found ? JSON.stringify(found) : `Event not found: ${id}`;
        }
        case 'update_event': {
          const id = args?.id;
          const updates = args?.updates ?? {};
          const list: any[] = await eventDb.findUpcoming(1000);
          const existing = list.find((e) => e.id === id);
          if (!existing) return `Event not found: ${id}`;
          const merged = { ...existing, ...updates };
          const newId = await eventDb.create({ userId, channelId, title: merged.title, startTime: merged.startTime, endTime: merged.endTime, description: merged.description });
          await eventDb.delete(id);
          return `Event updated: new id ${newId} (replaced ${id})`;
        }
        case 'delete_event': {
          const delId = args?.id;
          await eventDb.delete(delId);
          return `Event deleted: ${delId}`;
        }
        case 'set_reminder': {
          const { title, dueTime, relatedEventId } = args || {};
          const reminderTitle = title ?? `Reminder${relatedEventId ? ` for ${relatedEventId}` : ''}`;
          const taskId = await taskDb.create({ userId, channelId, title: reminderTitle, dueTime });
          return `Reminder set: ${taskId}`;
        }
        case 'list_reminders': {
          const reminders: any[] = await taskDb.findPending();
          if (!reminders?.length) return 'No reminders';
          return reminders.map((r) => `- ${r.title} (due ${r.dueTime}, id ${r.id})`).join('\n');
        }
        case 'cancel_reminder': {
          const remId = args?.id;
          await taskDb.complete(remId);
          return `Reminder cancelled: ${remId}`;
        }
        default:
          return `Unknown tool: ${toolName}`;
      }
    } catch (err: any) {
      return `Error executing ${toolName}: ${err?.message ?? err}`;
    }
  };
  return executor;
}
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

// OpenClaw configuration (optional - set USE_OPENCLAW=true to enable)
const USE_OPENCLAW = process.env.USE_OPENCLAW === 'true';
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL || 'openclaw';


  async function main() {
  console.log('[Relay] Starting Ine Ollama Relay...');

  if (!DISCORD_TOKEN) {
    console.error('[Relay] ERROR: DISCORD_USER_TOKEN must be set');
    process.exit(1);
  }

  console.log('[Relay] Initializing database...');
  await initializeDatabase();
  console.log('[Relay] Database initialized');

  const ollama = new OllamaClient(OLLAMA_URL, OLLAMA_MODEL, RELAY_TIMEOUT_MS);
  const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
  comfyui = new ComfyUIClient(COMFYUI_URL);
  
  // Initialize OpenClaw client if enabled (used when USE_OPENCLAW=true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let openclaw: OpenClawClient | undefined;
  void openclaw;
  if (USE_OPENCLAW && OPENCLAW_TOKEN) {
    openclaw = new OpenClawClient(OPENCLAW_URL, OPENCLAW_TOKEN, OPENCLAW_MODEL, RELAY_TIMEOUT_MS);
    console.log('[Relay] OpenClaw client enabled');
  } else if (USE_OPENCLAW) {
    console.warn('[Relay] USE_OPENCLAW=true but OPENCLAW_TOKEN not set');
  }
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
            await interaction.reply({ content: 'Kalender navigasjon kunne ikke oppdateres.', ephemeral: true });
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
  const feedback = new FeedbackService();

  // Flow handler: processes extraction results and continues the relay flow
  const handleExtractionFlow = async (
    extractionResult: ExtractedItem[],
    userMessage: string,
    channelId: string
  ) => {
  // Pre-fetch memories to inject into Ollama prompts later
  const userIdForMemory = (discord as any).getUserId?.() ?? '';
  let memoryContext = '';
  try {
    const mems: any[] = await memory.recall(userIdForMemory);
    if (Array.isArray(mems) && mems.length > 0) {
      const facts = mems
        .map((m: any) => m?.fact)
        .filter((f: any) => typeof f === 'string' && f.trim().length > 0);
      if (facts.length > 0) {
        // Format as a single-line block: "User facts: - fact1 - fact2"
        memoryContext = `User facts: ${facts.map((f: string) => `- ${f}`).join(' ')}`;
      }
    }
  } catch (err) {
    console.error('[Relay] Memory recall failed:', (err as Error)?.message ?? err);
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
      console.log('[Relay] PlanRouter handled extraction');
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
    console.log('[Extraction] Found', extractionResult.length, 'item(s):', snippets);
  } else {
    console.log('[Extraction] No items extracted from message');
  }

  // Inject memory context if available
  const promptForOllama = memoryContext ? `${memoryContext}\n${enhancedMessage}` : enhancedMessage;

  const startTime = Date.now();
  try {
    const response = await ollama.sendMessage(promptForOllama);
    const responseTimeMs = Date.now() - startTime;
    const userIdForMetrics = (discord as any).getUserId?.() ?? '';
    metricsDb.record({ userId: userIdForMetrics, responseTimeMs, model: OLLAMA_MODEL });
    const userIdForTone = (discord as any).getUserId?.() ?? '';
    const tonedResponse = ToneService.apply(response, userIdForTone);
    await discord.sendMessage(channelId, tonedResponse);
    console.log('[Relay] Extraction flow: response sent to Discord');
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const userIdForMetrics = (discord as any).getUserId?.() ?? '';
    metricsDb.record({ userId: userIdForMetrics, responseTimeMs, errorCount: 1, model: OLLAMA_MODEL });
    console.error('[Relay] Extraction flow error:', errorMessage);
    await discord.sendMessage(channelId, `Sorry, extraction flow failed. Error: ${errorMessage}`);
  }

}; // end of handleExtractionFlow

      console.log('[Relay] Checking Ollama connectivity...');
      const healthy = await ollama.healthCheck();
      if (!healthy) {
        console.warn('[Relay] WARNING: Ollama not reachable. Will retry on messages.');
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
        // Image generation trigger (before extraction flow)
        const _imagePrompt = extractImagePrompt(userMessage);
        if (_imagePrompt && comfyui) {
          try {
const result = await comfyui.generateImage(_imagePrompt, userId);
if (result.success && result.imageUrl) {
  await discord.sendMessage(channelId, '🖼️ Bildet ditt:', { file: result.imageUrl });
} else {
  console.warn('[Relay] Image generation failed:', result.error);
  await discord.sendMessage(channelId, 'Beklager, bildegenerering feilet: ' + (result.error || 'ukjent feil'));
}
          } catch (err) {
            console.error('[Relay] ComfyUI image generation failed:', err);
          }
        }
 
        if (USE_OPENCLAW && typeof openclaw !== 'undefined' && (openclaw as any)?.sendMessageWithTools) {
          try {
            // Prepend date/time context to userMessage for OpenClaw
            const _dateContextOpenClaw = getDateTimeContext();
            const _augmentedUserMessage = `${_dateContextOpenClaw} ${userMessage}`;
            const executor = createOpenClawToolExecutor(discord, userId, channelId);
            // @ts-ignore
            const apiResponse = await (openclaw as any).sendMessageWithTools(_augmentedUserMessage, calendarTools, executor);
            if (apiResponse) {
              await discord.sendMessage(channelId, apiResponse);
              return;
            }
          } catch {
            // fall back to Ollama flow below
          }
        }

// Dispatch to registered handlers
const handlerCtx: HandlerContext = { message: userMessage, userId, channelId, discord };

// Check canHandle first, then call handle
// FeaturesHandler removed - HelpHandler now handles all help queries
void featuresHandler;
if (techStackHandler.canHandle(userMessage, handlerCtx)) {
  const techResult = await techStackHandler.handle(userMessage, handlerCtx);
  if (techResult.handled) return;
}
if (helpHandler.canHandle(userMessage, handlerCtx)) {
  const helpResult = await helpHandler.handle(userMessage, handlerCtx);
  console.log('[Relay] HelpHandler result:', helpResult);
  if (helpResult.handled) return;
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
        await discord.sendMessage(channelId, '🔍 Analyzer ytelsen min...');
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
        await discord.sendMessage(channelId, 'Kunne ikke kjøre analyse. Sjekk loggene.');
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
        console.error('[Relay] Calendar embed error:', err);
        await discord.sendMessage(channelId, 'Feil ved henting av kalender.');
      }
      return;
    }
    // Proceed with normal flow
    try {
      console.log(`[Relay] Detected @mention. Running extraction...`);
      const extractionResult = extraction.extract(enhancedUserMessage);
      await handleExtractionFlow(extractionResult, enhancedUserMessage, channelId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Relay] Error: ${errorMessage}`);
      await discord.sendMessage(channelId, `Sorry, I couldn't get a response. Error: ${errorMessage}`);
    }
  });

        await discord.login();

        // Send readiness DM after login (reusing READY_USER from earlier block)
        try {
          const comfyHealth = await fetch(`${COMFYUI_URL || 'http://localhost:8188'}/system_stats`);
          if (comfyHealth && comfyHealth.ok) {
            console.log('[Relay] ComfyUI health: OK (post-login)');
            try {
              const sent = await discord.sendDMToUser(READY_USER, 
                '🎨 **Bildegenerering er klar!**\\n\\nJeg kan nå lage bilder for deg. Prøv f.eks:\\n• "lag et bilde av et ekorn"\\n• "tegn en koselig katt"\\n• "generer et bilde av en strand i solnedgang"');
              if (sent) {
                console.log(`[Relay] Sent readiness message to ${READY_USER}`);
              }
            } catch (e) {
              console.warn('[Relay] Failed to send readiness DM:', e);
            }
          }
        } catch (e) {
          console.warn('[Relay] ComfyUI health check failed:', e);
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
                console.error('[Relay] Reminder send failed:', err);
              }
            } else {
              console.warn('[Relay] Reminder skipped: missing channel_id for event', id);
            }
            remindedEventIds.add(id);
          }
        }
      }
    } catch (err) {
      console.error('[Relay] Reminder timer error:', err);
    }
  };

  // Run every 60 seconds
  setInterval(() => {
    // Fire and forget; errors are handled inside runReminders
    runReminders();
  }, 60 * 1000);

  process.on('SIGINT', () => {
    console.log('[Relay] Shutting down...');
    discord.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
