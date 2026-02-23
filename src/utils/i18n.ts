export const i18n = {
  nb: {
    calendar: {
      created: '📅 Opprettet: **{title}**',
      today: 'Idag',
      thisWeek: 'Denne uken',
      noEvents: 'Ingen kommende arrangementer.',
      deleted: '🗑️ Arrangement slettet.',
      updateFailed: 'Kalender navigasjon kunne ikke oppdateres.',
      buildFailed: 'Kalenderen kunne ikke bygges akkurat nå.',
      fetchFailed: 'Feil ved henting av kalender.',
    },
    
    selfAnalysis: {
      start: '🔍 Analysere ytelsen min...',
      error: 'Kunne ikke kjøre analyse. Sjekk loggene.'
    },
    feedback: {
      thanks: 'Takk for tilbakemeldingen!',
      criticRunning: 'Analyserer respons...',
    },
    teach: {
      success: '✅ Lært: {type} — "{content}"',
      adminOnly: '⛔ Bare administratorer kan bruke !teach.',
      skillProposed: '📝 Kompetanseforslag logget for vurdering.',
    },
    errors: {
      generic: 'Noe gikk galt. Prøv igjen.',
      parseFailed: 'Kunne ikke forstå. Prøv igjen med en clearer dato.',
      missingToken: 'DISCORD_USER_TOKEN må settes.',
      unknownTool: 'Ukjent verktøy: {toolName}',
    },
  },
  en: {
    calendar: {
      created: '📅 Created: **{title}**',
      today: 'Today',
      thisWeek: 'This week',
      noEvents: 'No upcoming events.',
      deleted: '🗑️ Event deleted.',
      updateFailed: 'Calendar navigation could not be updated.',
      buildFailed: 'The calendar could not be built right now.',
      fetchFailed: 'Error fetching calendar.',
    },
    selfAnalysis: {
      start: '🔍 Analyzing my performance...',
      error: 'Could not run analysis. Check logs.'
    },
    feedback: {
      thanks: 'Thanks for the feedback!',
      criticRunning: 'Analyzing response...',
    },
    teach: {
      success: '✅ Learned: {type} — "{content}"',
      adminOnly: '⛔ Only admins can use !teach.',
      skillProposed: '📝 Skill proposal logged for review.',
    },
    errors: {
      generic: 'Something went wrong. Try again.',
      parseFailed: 'Could not understand. Try a clearer date.',
      missingToken: 'DISCORD_USER_TOKEN must be set',
      unknownTool: 'Unknown tool: {toolName}',
    },
  },
};

export type Locale = 'nb' | 'en';

export function t(key: string, locale: Locale = 'nb', params?: Record<string, string>): string {
  const keys = key.split('.');
  const getFromLocale = (loc: Locale) => {
    let val: any = (i18n as any)[loc as string];
    for (const k of keys) {
      val = val?.[k];
    }
    return typeof val === 'string' ? val : undefined;
  };
  let value = getFromLocale(locale);
  if (typeof value !== 'string') {
    value = getFromLocale('en');
  }
  if (typeof value !== 'string') return key;

  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
  }

  return value;
}
