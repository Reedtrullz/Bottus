# Learnings: Reply-based conversation context for Ollama relay

- Implemented reply-based context detection in src/relay/index.ts.
- When a user replies to a bot message, the relay fetches the replied message content
  and the last N messages in the same channel (before the replied-to message).
- A conversation context block is built from these messages and appended to the Ollama prompt
  as context, improving relevance for follow-up queries.
- The feature is activated only when the replied-to message is authored by a bot.
- Norwegian UI text is preserved for user-facing messages (e.g., "Lagret minne").
- Fallback remains if any step in fetching context fails, ensuring normal flow continues.

Implementation details:
- Located in src/relay/index.ts within the onMention handler.
- Fetches replied message via channel.messages.fetch(replyId) and prior messages with
  channel.messages.fetch({ limit: HISTORY_MAX_MESSAGES-1, before: replyId }).
- Context is formatted as: "Author: content" lines, then appended to user input as
  a contextual block for Ollama.

Testing notes:
- In a group DM, reply to a bot-generated message and send another message. The model should
  receive a context block and respond with awareness of the prior conversation.
- If context fetch fails, the flow falls back to the original prompt without context.

Date: 2026-02-22
