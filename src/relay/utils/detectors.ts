export function isQueryMessage(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("når skal") ||
         m.includes("når er") ||
         m.includes("når drar") ||
         m.includes("hva har vi") ||
         m.includes("hva skjer") ||
         m.includes("what's planned") ||
         m.includes("neste");
}

export function extractImagePrompt(message: string): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  const patterns = [
    'lag et bilde av',
    'generer et bilde av',
    'tegn',
    'generate image of',
    'lag bilde av',
    'tegn et bilde av'
  ];
  for (const pattern of patterns) {
    if (m.includes(pattern)) {
      const idx = m.indexOf(pattern);
      const after = message.substring(idx + pattern.length).trim();
      if (after.length > 0) return after;
    }
  }
  return null;
}

export function isMemoryStore(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return /(\b(husk|husk at|husk jeg er)\b)/.test(m);
}

export function isMemoryQuery(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return /\b(hva husker du|husker du)\b/.test(m);
}

export function isCalendarQuery(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  const keywords = [
    'hva har vi planlagt',
    'når er',
    'hva skjer',
    'vis kalender',
    'kalender',
    'hva skjer i dag',
  ];
  return keywords.some(k => m.includes(k));
}

export function isTechStackQuery(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  const patterns = [
    'tech stack',
    'teknologi',
    'teknologistack',
    'hva kjører du på',
    'what technology',
    'which libraries',
    'which tech',
    'hvilke biblioteker'
  ];
  return patterns.some(p => m.includes(p));
}

export function isFeaturesQuery(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  const patterns = [
    'hva kan du',
    'hva kan jeg',
    'what can you do',
    'hvilke kommandoer',
    'which commands',
    'features',
    'funksjoner'
  ];
  return patterns.some(p => m.includes(p));
}

export function isSelfAnalysisQuery(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('analyser deg selv') || m.includes('analyse deg selv');
}
