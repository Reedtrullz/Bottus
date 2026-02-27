// Query handler - extracted from relay/index.ts
import { eventDb, taskDb, rsvpDb } from '../../db/index.js';

export async function handleQuery(channelId: string, query: string, userId?: string): Promise<string> {
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
