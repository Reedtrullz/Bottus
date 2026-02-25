Task: Redirected console statements to a central logger by introducing logger-based wrappers in critical relay files.
- Implemented in: src/relay/index.ts (import path adjusted to './utils/logger.js', wrapper overrides for console.log, console.error, console.warn)
- Implemented in: src/relay/plan-router.ts (import added: '../utils/logger.js', wrapper overrides for console methods)
- Verified: TypeScript build passes (tsc) and type check OK
- Rationale: Unify logging, reduce ad-hoc console usage, surface through logger with consistent formatting
