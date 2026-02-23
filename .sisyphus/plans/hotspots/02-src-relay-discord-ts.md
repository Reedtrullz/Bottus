# Hotspot Brief: src/relay/discord.ts

**Size:** 183 lines  
**Complexity:** Medium - 1 class, 15 methods, selfbot event handling

**Primary Responsibilities:**
DiscordRelay class wraps discord.js-selfbot-v13 Client for bidirectional relay between Discord DMs/Group DMs and Ollama. Manages per-channel message history (Map<channelId, MessageHistory[]>), detects mentions via regex patterns, handles message events with bot filtering, and provides DM/channel messaging with embed support.

**Key Patterns:**
- Private fields for client, userId, username, history, token, mentionCallback
- Event-driven: on('message'), on('ready'), on('error'), on('disconnect')
- Three-tier user lookup: cache → fetch → partial match fallback
- Channel type detection: guild null = deletable, recipients defined = DM
- History bounded by maxHistory (default 5) with FIFO eviction

**Extraction Opportunities:**
1. **UserLookupService:** Extract the three-tier user finding logic (cache, fetch, partial) into a dedicated service with clear fallback chain
2. **MessageHistoryStore:** Extract history Map management to a separate class with add, get, clear, evict policies
3. **MentionDetector:** Extract isMentioned regex pattern building to a reusable matcher
4. **ChannelClassifier:** Extract isDeletableChannel, isDM into a channel type classification utility
5. **RichMessageBuilder:** Extract sendMessage payload construction with embed/component handling
