Title: Fix corrupted line 330 in src/relay/index.ts

Summary:
- Removed a stray line (MB|) that caused a TypeScript parse error (Expression expected) during build.

Actions taken:
- Searched around lines 324-334 in src/relay/index.ts and confirmed presence of a stray line at 330.
- Removed the stray MB| line to restore valid TS syntax.
- Rebuilt the project to verify compilation succeeds.

Verification:
- npm run build completed without TS errors.
- File region around 324-334 now shows clean, valid TypeScript code (no stray MB| line).

Notes:
- The original corruption appeared as MB| on line 330, which was not valid TypeScript and caused TS1109 errors.
- If future patches reintroduce line-mangling, consider guardrails to prevent stray tokens in generated files.
