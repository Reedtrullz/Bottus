# Hotspot Brief: src/db/index.ts

**File**: `src/db/index.ts`  
**Lines**: 533  
**Analyzed**: 2026-02-22

---

## Overview

Central database access layer using sql.js (SQLite in-memory with file persistence). Contains 13 table definitions, 3 core query helpers, and 13 repository objects. Currently implements a partial repository pattern.

---

## Data Models (13 Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `consents` | User consent tracking | user_id, status, opted_in_at |
| `feedback` | Bot feedback collection | user_id, rating, comment |
| `events` | Calendar events with TTL | user_id, start_time, calendar_event_id |
| `event_rsvps` | Event attendance | event_id, user_id, status |
| `tasks` | Task management | user_id, due_time, completed |
| `tone_profiles` | User tone scoring | user_id, tone_score, message_count |
| `proposals` | Governance proposals | guild_id, approvals (JSON), status |
| `google_tokens` | OAuth tokens | user_id, access_token, expires_at |
| `memories` | User memories/facts | user_id, fact |
| `user_preferences` | User settings (timezone) | user_id, timezone |
| `user_tone` | Per-user tone config | user_id, tone, language |
| `metrics` | Bot performance metrics | response_time_ms, feedback_score |
| `improvement_suggestions` | Feature suggestions | category, status |

---

## Complex Queries

### 1. Event Queries (lines 262-284)
```typescript
// Upcoming events with time filter
findUpcoming(limit) → `WHERE start_time > ? ORDER BY start_time ASC`

// Search with exact/partial match fallback
searchByTitle(userId, titleQuery) → LOWER(title) = LOWER(?) → LIKE fallback
```
**Concern**: Two queries for single search operation.

### 2. Proposal Approval Logic (lines 374-386)
```typescript
// Read → Parse JSON → Modify → Write
const approvals = JSON.parse(proposal.approvals);
approvals.push(approverId);
const newStatus = approvals.length >= 2 ? 'approved' : 'pending';
```
**Concern**: Race condition potential, embedded business logic.

### 3. Metrics Aggregations (lines 485-496)
```typescript
// 4 separate aggregate queries
getStats() → COUNT, AVG, SUM + GROUP BY
```
**Concern**: N+1 query pattern, no caching.

### 4. TTL Cleanup (lines 281-284, 339-342)
```typescript
DELETE FROM events WHERE ttl > 0 AND created_at + ttl < ?
DELETE FROM tasks WHERE ttl > 0 AND completed = 1 AND created_at + ttl < ?
```
**Concern**: Full table scans on every cleanup, no indexes.

---

## Performance Concerns

### Critical
1. **Synchronous file write on every write** (line 219)
   - `run()` calls `saveDb()` which does `fs.writeFileSync(DB_PATH, db.export())`
   - Blocks event loop on every INSERT/UPDATE/DELETE
   - No batching or debouncing

2. **No database indexes**
   - All WHERE clauses perform full table scans
   - High-risk: `memories.user_id`, `events.user_id`, `tasks.completed`

### Moderate
3. **LIKE queries without indexes** (lines 424-425)
   - `memories` search: `fact LIKE ?` on potentially large text field

4. **JSON parsing in hot path** (line 378)
   - `proposalDb.addApproval()` parses approvals JSON on every call

---

## Repository Pattern Status

**Current State**: Partial implementation (13 repos)

| Repository | Methods | Complexity |
|------------|---------|------------|
| consentDb | 4 | Simple |
| eventDb | 6 | Medium |
| toneDb | 2 | Simple |
| rsvpDb | 5 | Medium |
| taskDb | 4 | Simple |
| toneProfileDb | 2 | Simple |
| proposalDb | 4 | Medium |
| tokenDb | 2 | Simple |
| memoryDb | 4 | Medium |
| feedbackDb | 3 | Simple |
| preferenceDb | 2 | Simple |
| metricsDb | 6 | Complex |
| suggestionsDb | 6 | Simple |

### Opportunities
1. **Extract to separate files** - Each repo could be its own module
2. **Type-safe queries** - Use sql.js typed statements instead of `any[]`
3. **Batch operations** - Add `transaction()` method for bulk writes
4. **Index management** - Add migration system for indexes

---

## Coupling Issues

### Global State
- Line 6: `let db: SqlJsDatabase` - module-level singleton
- Line 8: `DB_PATH` hardcoded

### Business Logic Leakage
- Line 410-414: `memoryDb.store()` contains regex pattern matching for "husk"
- Line 349-350: `toneProfileDb.upsert()` calculates score incrementally
- Line 382: `proposalDb` enforces 2-approver threshold

### No Transaction Support
- Cannot wrap multiple operations atomically
- Partial failures leave inconsistent state

---

## Recommendations

| Priority | Action |
|----------|--------|
| **High** | Add database indexes on `user_id`, `guild_id`, `created_at` fields |
| **High** | Async file writes or batched persistence |
| **Medium** | Extract repositories to separate files under `src/db/repos/` |
| **Medium** | Add query builder or ORM layer for type safety |
| **Low** | Implement transaction wrapper |

---

## Usage from Services

```typescript
// Current pattern - direct imports
import { eventDb, taskDb, consentDb } from '../db';

// Example: services/calendar.ts likely calls eventDb.findUpcoming()
// Example: services/consent.ts likely calls consentDb.findByUserId()
```

---

*End of brief*
