## Plan: User Feedback System for Bot Responses

## TL;DR
> Summary: Allow users to rate bot responses with thumbs up/down, store feedback in database, and provide a command to view/compile feedback for analysis.
> Deliverables: 1) Feedback table in DB, 2) FeedbackService, 3) Auto-react with rating emojis on bot messages, 4) /feedback command
> Effort: Small-Medium
> Parallel: NO - sequential tasks

## Context
### Original Request
- Users want a way to leave feedback on bot replies
- Feedback should be compiled into a list for analysis
- Use feedback to enhance future interactions

### Technical Decisions
- Decision 1: Use emoji reactions (👍👎) for quick feedback
  - Rationale: Discord-native, zero friction, users already know how to use reactions
- Decision 2: Store feedback in SQLite (like other data)
  - Rationale: Follows existing patterns, no new dependencies
- Decision 3: Provide a /feedback command to view compiled feedback
  - Rationale: Simple way to access feedback data, can export later

## Research Findings
- Database uses sql.js with tables in src/db/index.ts
- Existing pattern: services wrap database operations (e.g., MemoryService, ReminderService)
- Messages sent via `discord.sendMessage(channelId, content)` 
- Reactions can be added via `message.react(emoji)` (seen in RSVP handling)

## Scope
- IN: Add feedback table, FeedbackService, auto-react on bot messages, /feedback command
- OUT: Advanced analytics, ML-based improvement, external storage

## Plan
1. Add feedback table to src/db/index.ts
2. Create src/services/feedback.ts with store/recall functions  
3. Modify relay/index.ts to auto-react with 👍👎 on bot messages
4. Add reaction listener to capture feedback
5. Add /feedback command to view recent feedback

## Acceptance Criteria
- Bot adds 👍👎 reactions to its own messages
- Clicking a reaction stores feedback in database
- /feedback command shows recent feedback list
- All existing tests pass
