# Hotspot Onboarding Guide

This guide helps developers get oriented with the Ine-Discord project's high-complexity areas. These areas, called "hotspots," require special care when modifying due to their size, coupling, or architectural concerns.

## What Are Hotspots?

Hotspots are files or modules that have been identified as high-risk modification targets. They typically share some combination of these traits:

- Large line counts (500+ lines)
- Multiple responsibilities crammed into single files
- Sequential conditional chains that are hard to extend
- Performance concerns like synchronous writes or missing indexes
- Dependencies on archived or unmaintained libraries

The project currently has three primary hotspots, documented in detail in `.sisyphus/plans/hotspots/`.

---

## Architecture Overview

### System Components

The bot consists of several interconnected parts:

**Main Bot (Eris)**
- Entry point: `src/index.ts`
- Handles slash commands, event listeners, and polling loops
- Uses the Eris library (community-driven Discord library)

**Relay Bot (discord.js-selfbot-v13)**
- Entry point: `src/relay/index.ts`
- Provides Group DM access for the Ollama-powered chat relay
- Handles message routing, extraction, calendar queries, and more

**Database Layer**
- Entry point: `src/db/index.ts`
- Uses sql.js (SQLite in-memory with file persistence)
- Contains 13 tables and 13 repository objects

**Services (12 domain services)**
- Located in `src/services/`
- Include calendar, reminders, consent, memory, extraction, tone, and more
- Injected into both bots

### Data Flow

```
User Message (Group DM)
       ↓
   Relay Bot (src/relay/index.ts)
       ↓
  Extraction Service (date/event parsing)
       ↓
   PlanRouter (determines action)
       ↓
   Ollama (LLM response)
       ↓
   Tone Application → Response
```

### Key Technologies

| Component | Technology | Notes |
|-----------|------------|-------|
| Main bot client | Eris | Active maintenance |
| Relay bot client | discord.js-selfbot-v13 | Archived (see migration section) |
| LLM | Ollama (Docker) | Local model hosting |
| Database | sql.js | SQLite in-memory |
| Date parsing | chrono-node | Multi-language support |

---

## Hotspot Areas

### 1. src/relay/index.ts (1015 lines)

The relay file is the central hub for Discord↔Ollama communication. It handles message routing, extraction, image generation, calendar management, memory, feedback, reminders, and more.

**Critical Issue:** The `discord.onMention()` callback contains 20+ sequential if-checks in 335 lines. Adding new message handlers means inserting another conditional branch into this massive function.

**Key metrics:**
- Main function: 635 lines
- Message handler callback: 335 lines
- Query handler: 115 lines

**Refactoring strategy:** Extract each handler into its own module using a registry pattern. See `.sisyphus/plans/hotspots/relay-index.md` for detailed extraction plan.

**Files to create:**
```
src/relay/utils/detectors.ts      # is*() detection functions
src/relay/utils/date-utils.ts    # Date/time helpers
src/relay/handlers/              # Individual message handlers
```

### 2. src/db/index.ts (533 lines)

The database layer provides data access for all 13 tables. It uses a partial repository pattern with synchronous writes on every operation.

**Critical issues:**
- Synchronous file writes block the event loop on every INSERT/UPDATE/DELETE
- No database indexes, causing full table scans on every query
- Business logic embedded in repository methods (JSON parsing, threshold enforcement)

**Performance concerns:**
- `saveDb()` uses `fs.writeFileSync()` after every write operation
- TTL cleanup queries scan entire tables
- Metrics aggregations run 4 separate queries with no caching

**Refactoring strategy:** Add async/batched persistence, create indexes, extract repositories to separate files. See `.sisyphus/plans/hotspots/db-index.md` for detailed recommendations.

### 3. src/index.ts (286 lines)

The main bot entry point. It instantiates 8 services, registers event handlers, and runs two polling intervals.

**Issues:**
- Hardcoded channel ID for polling (GROUP_DM_CHANNEL_ID)
- Pattern-matching functions with hardcoded keyword arrays
- Large switch statement in command handling
- Dual messageCreate handlers

**Refactoring strategy:** Extract polling scheduler, command router, and pattern matcher services. See `.sisyphus/plans/hotspots/01-src-index-ts.md`.

---

## How to Contribute

### Before You Start

1. **Read the relevant hotspot brief** in `.sisyphus/plans/hotspots/`
2. **Understand the current patterns** by reading the source file
3. **Check for related services** that might be affected
4. **Run the existing tests** if any exist

### Making Changes to Hotspots

When modifying hotspot files, follow these guidelines:

**Do:**
- Keep changes focused and incremental
- Add comments explaining complex logic
- Extract new helper functions rather than adding to existing large functions
- Test locally before pushing
- Update the hotspot brief if your change significantly alters the file

**Do not:**
- Add new message handlers to the sequential if-chain in relay/index.ts
- Add new synchronous writes to the database layer
- Introduce new hardcoded values in index.ts
- Bypass the existing service architecture

### Extracting Code from Hotspots

If your work requires adding significant new logic to a hotspot, consider extracting it instead:

1. Create the new module (e.g., `src/relay/handlers/my-handler.ts`)
2. Implement the handler with a clear interface
3. Register it in the appropriate place
4. Remove the original implementation

Example handler pattern from the relay:

```typescript
// src/relay/handlers/base.ts
interface MessageHandler {
  canHandle(msg: string, ctx: HandlerContext): boolean;
  handle(msg: Message, ctx: HandlerContext): Promise<void>;
}

// src/relay/handlers/calendar.ts
export class CalendarHandler implements MessageHandler {
  canHandle(msg: string, ctx: HandlerContext): boolean {
    return isCalendarQuery(msg);
  }

  async handle(msg: Message, ctx: HandlerContext): Promise<void> {
    // Implementation
  }
}
```

### Code Review Checklist

Before submitting changes to hotspot files, verify:

- [ ] Change does not increase file size significantly
- [ ] New logic is in a separate function (not added to existing large functions)
- [ ] Related services are not negatively affected
- [ ] Any performance concerns have been addressed
- [ ] Hotspot brief has been updated if needed

---

## Running Hotspot Scans

### Current Approach

The project uses Sisyphus analysis to identify and document hotspots. Results are stored in `.sisyphus/plans/hotspots/`.

### Viewing Existing Analysis

Hotspot briefs are available at:

```
.sisyphus/plans/hotspots/relay-index.md      # src/relay/index.ts
.sisyphus/plans/hotspots/db-index.md        # src/db/index.ts
.sisyphus/plans/hotspots/01-src-index-ts.md # src/index.ts
.sisyphus/plans/hotspots/02-src-relay-discord-ts.md
.sisyphus/plans/hotspots/03-src-relay-ollama-ts.md
.sisyphus/plans/hotspots/04-src-commands-index-ts.md
```

### Manual Code Analysis

To analyze code manually, use these commands:

```bash
# Check file line counts
wc -l src/relay/index.ts src/db/index.ts src/index.ts

# Find large functions (>50 lines)
ast_grep_search --pattern 'function $NAME($$$) { $$$ }' --lang typescript

# Find sequential if-chains
grep -n "if (" src/relay/index.ts | head -30

# Check for synchronous writes
grep -n "writeFileSync" src/db/index.ts
```

### Adding New Analysis

When you identify a new hotspot area:

1. Create `.sisyphus/plans/hotspots/XX-filename.md`
2. Document the file path, line count, and complexity level
3. List large functions and their purposes
4. Identify extraction opportunities
5. Include recommended refactoring path

---

## Migration Notes

### Critical: discord.js-selfbot-v13 Archive Risk

The relay uses `discord.js-selfbot-v13` for Group DM access. This library was archived in October 2025 and is no longer maintained.

**Current risks:**
- No security patches for future vulnerabilities
- No Discord API updates when Discord changes its endpoints
- Potential for Discord to detect and ban the account

See `.sisyphus/plans/migration-risk.md` for the complete risk assessment and migration options.

### Migration Options Summary

| Option | Risk | Maintenance | Effort |
|--------|------|-------------|--------|
| Stay (current) | High | None | None |
| discord.py-self | High | Active | High |
| Eris for both | Low | Active | Medium |
| Official Bot API | None | N/A | High (not viable) |

### Immediate Action Items

If you are working on the relay:

1. **Add rate limiting** to reduce ban risk. The relay currently has no rate limiting.
2. **Monitor for API breakage** and have a fallback plan
3. **Do not increase selfbot activity** while working on other parts

### Long-term Recommendations

- Investigate whether Eris can support the required selfbot features
- If Eris is insufficient, prototype a discord.py-self migration
- Set a calendar reminder to re-evaluate in 6 months

---

## Quick Reference

### Key Files

| Purpose | Location |
|---------|----------|
| Main bot | `src/index.ts` |
| Relay bot | `src/relay/index.ts` |
| Database | `src/db/index.ts` |
| Commands | `src/commands/index.ts` |
| Services | `src/services/*.ts` |

### Running the Bot

```bash
# Development (watch mode)
npm run dev

# Production build
npm run build
npm run start

# Relay only
npm run start:relay
```

### Environment Variables

Required variables (do not commit):

- `DISCORD_TOKEN` - Main bot token
- `RELAY_TOKEN` - Selfbot token for relay
- `OLLAMA_HOST` - Ollama API endpoint
- `DB_PATH` - Database file path

See `.env.example` for the full list.

---

## Getting Help

If you have questions about working with hotspots:

1. **Start with the hotspot brief** - each one has detailed analysis
2. **Check the migration risk doc** - for context on archive dependencies
3. **Review related services** - understand the broader architecture
4. **Ask questions early** - don't modify hotspots without understanding the context
