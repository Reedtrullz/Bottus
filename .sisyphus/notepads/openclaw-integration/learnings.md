Learnings:
- Implemented a general OpenClaw calendar tool executor (create_event, list_events, get_event, update_event, delete_event, set_reminder, list_reminders, cancel_reminder).
- Integrated executor with the relay's onMention flow, preferring OpenClaw when USE_OPENCLAW is true and an OpenClaw client is available; otherwise fall back to Ollama.
- Used eventDb and taskDb for persistence operations within the executor.
- Exposed createOpenClawToolExecutor(discord, userId, channelId) as a reusable helper.
- Added calendarTools import and wired to OpenClaw flow; ensured no breaking changes to existing extraction/memory flows.
