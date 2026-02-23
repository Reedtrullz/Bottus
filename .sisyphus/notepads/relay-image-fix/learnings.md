Learnings:
- Added early return after successful image generation and after error handling in src/relay/index.ts to prevent duplicate or cascading responses.
- Ensured only one image message is sent per request by bypassing further handlers.
- Removed auxiliary comments to keep code clean and adhere to internal guidance.

Notes:
- This change should be validated with unit tests and type checks (lsp diagnostics) and a quick local run of the relay workflow.
