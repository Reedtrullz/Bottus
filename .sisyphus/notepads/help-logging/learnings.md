Task: Add debug logging to HelpHandler to diagnose why it's not triggering when users ask "hvem er du?" / "who are you?".

- Actions taken:
  - Added console.log in canHandle to expose detected category: `[Relay] HelpHandler canHandle: message="...", category="..."`.
  - Added console.log in handle to expose category and language: `[Relay] HelpHandler handle: category="...", lang="..."`.
- Rationale:
  - Non-invasive, no logic changes. Logs only aid debugging in development and should not affect production behavior.
- Verification plan:
  - Build succeeds locally.
  - When messages like 'hvem er du' are received, logs show expected category in canHandle and processing path in handle.
