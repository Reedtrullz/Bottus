Learnings from one-file relay log.
- Replaced console.* with logger.* in src/relay/index.ts
- logger API expects (message: string, meta?: object); used context: 'Relay'
- Confirmed build passes; lsp diagnostics show no errors
- Next steps: apply same approach to other modules if needed
