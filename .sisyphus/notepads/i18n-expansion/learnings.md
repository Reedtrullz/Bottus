Summary of i18n expansion task
- Implemented a small i18n system usage across codebase:
  - Added a safe fallback to English in t(key, locale, params)
  - Extended nb/en locale files with new keys: calendar.updateFailed, calendar.buildFailed, calendar.fetchFailed, errors.unknownTool, errors.missingToken, selfAnalysis.start, selfAnalysis.error
  - Replaced representative user-facing strings in src/relay/index.ts to use t() with params for dynamic content
  - Created missing token handling message using i18n: errors.missingToken
  - Added t import and proper locale-aware responses
- Built project successfully with npm run build
- Ensured at least 5 user-facing strings use i18n
