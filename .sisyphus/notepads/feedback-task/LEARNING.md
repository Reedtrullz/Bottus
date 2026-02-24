Task: Add feedback tracking to SQLite DB and a small DB access layer

What I did:
- Created a new SQL table: feedback with fields id, user_id, message_id, channel_id, rating, comment, bot_response_text, created_at.
- Implemented feedbackDb with three methods:
  - store(userId, messageId, channelId, rating, comment?, botResponseText?) -> string (id)
  - getRecent(limit?) -> array of feedback rows (default limit 10)
  - getByUser(userId, limit?) -> array of feedback rows for a user (default limit 10)
- Wired up according to existing patterns (memoryDb/taskDb style) and used same helper funcs (run, queryAll, queryOne).
- Ensured the new table creation executes in initializeDatabase before saveDb(), and added same transactional persistence behavior.

Notes:
- Table constraint rating CHECK ensures only 'positive' or 'negative'.
- Using unix timestamp for created_at to simplify sorting.
- No external dependencies introduced beyond existing uuid/v4 usage.

Verification strategy:
- Inspect src/db/index.ts to confirm the CREATE TABLE for feedback exists.
- Ensure feedbackDb.store/getRecent/getByUser functions exist and mimic the memoryDb pattern.
- Build and run tests to ensure no TS compile errors.
