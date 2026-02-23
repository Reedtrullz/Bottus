# Draft: AI Discord Bot for Group Chat Monitoring

**Date:** 2026-02-20

## Summary of User Input (Phase 1 interview)
- **Calendar Integrations**: Google Calendar (Recommended)
- **Data Retention**: 1 hour
- **Channel Scope**: Monitor all group channels in a server, and a 3-person direct messages group chat
- **Consent & Privacy**: All participants must opt-in via a one-time command
- **Extraction & Actions**: Both dates and agreements; map to calendar events and to-do/tasks
- **Reminders Delivery**: Discord channel messages
- **Non-functional Constraints**: Reliability-focused (retries and idempotency)

## Open Questions / Gaps (ambiguous items)
- Feasibility: Can a Discord bot read messages in a 3-person Direct Messages group chat? Confirm platform constraints and permissions.
- Data retention option: The interview options did not include a 1-hour retention slot; clarify whether 1 hour is acceptable and how purge should be handled.
- Timezone handling: How should the bot determine user timezone for events and reminders?
- Data storage: Where should extracted data be stored (local DB vs cloud)? What are the security/access controls?
- Opt-in flow: What should the one-time command look like (syntax, channel-scoped)?
- Administrative control: Who can adjust settings (server admin, bot owner, etc.)?
- Scope management: Should the bot ignore messages in DMs with non-consenting users if not opt-ed in?
- Any branding or tone preferences for bot messages in Discord?

## Proposed Next Steps (high level)
- Validate Discord permissions and feasibility for group DM monitoring.
- Define data model for extracted items (dates, events, tasks) and a minimal storage schema.
- Choose tech stack (likely Node.js with discord.js) and NLP approach (rule-based date extraction plus optional ML/NER).
- Outline MVP features (Phase 1): Google Calendar sync for events, simple task creation, basic reminder messages in channel.
- Establish privacy/consent policy and opt-in workflow with clear user-facing messages.
- Create a planning file (.sisyphus/plans/ai-discord-bot.md) after requirements are finalized.

## Draft Decisions Log
- This draft will be updated after each interview response and agent research.

## Resolved decisions (Phase 2 intake aftermath)
- Group DMs support: ENABLED. The bot will participate in a 3-person Direct Messages group chat in addition to server group channels.
- Timezone: Europe/Oslo (Norway) for all time calculations, event scheduling, and reminders.
- Data retention: 1 hour TTL for raw/message-derived data. Data may be summarized/aggregated for analytics within that window. Long-term storage is avoided unless explicitly approved in future scope, with opt-in via policy.
- Opt-in/Consent: Opt-in command is /jeg-samtykker, delivered in the group DM with the bot. All participants can run it. Opt-in is required for reading messages processing data.
- Extraction & Actions: Both dates and agreements will be extracted and mapped to calendar events and to-do/tasks.
- Reminders Delivery: Reminders will be posted in the Discord channel (group chat) by default.
- Non-functional Constraints: Reliability-focused with explicit retry and idempotency semantics to prevent duplicate actions.
- Governance & Change Control: Anyone can propose changes; at least two participants must approve before a change is implemented.
- Tone / Learning: The bot should adapt to chatter tone, to improve natural language understanding and user experience, while preserving privacy and avoiding overfitting.

- Open questions (now resolved):
- None remaining for MVP scope; all critical ambiguities have been addressed in this intake.

## Next steps
- Proceed to generate the formal work plan and milestones based on these decisions.
- Define MVP scope and a staged rollout plan to Google Calendar integration, channel reminders, and basic task creation.
- Draft privacy policy snippet and consent messaging for users.
