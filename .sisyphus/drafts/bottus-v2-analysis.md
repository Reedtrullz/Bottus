# Bottus v2 - Comprehensive Analysis & Enhancement Plan

**Generated:** 2026-02-23  
**Analyst:** Prometheus (Strategic Planning Consultant)

---

## Executive Summary

After thorough analysis of the Bottus v2 codebase, I've identified critical gaps preventing the calendar and image generation skills from "just working." The core issues are:

1. **Calendar**: Dual implementations with no persistence, broken reminders, no event deletion
2. **Image**: Hard-coded models, no fallback strategy, URL format issues
3. **Architecture**: Monolithic code, inconsistent skill routing, no observability

This document outlines specific enhancements to make these features production-ready.

---

## Current State Assessment

### ✅ What's Working

| Component | Status | Notes |
|-----------|--------|-------|
| Build | ✅ Pass | `npm run build` succeeds |
| Tests | ⚠️ 35/38 | 1 pre-existing timeout, 2 skipped |
| Skills System | ⚠️ Partial | Registry exists but not consistently used |
| Ollama Integration | ✅ Working | Circuit breaker added |
| i18n | ✅ Working | Norwegian + English |
| AGENTS.md | ✅ Complete | 8 files, comprehensive |

### ❌ Critical Gaps

#### Calendar Skill (Priority 1)
| Issue | Severity | Impact |
|-------|----------|--------|
| In-memory DB only | CRITICAL | All events lost on restart |
| Reminders not wired | CRITICAL | No Discord notifications sent |
| Delete is stub | HIGH | Users can't remove events |
| Dual implementations | MEDIUM | Confusion, maintenance burden |
| Recurrence not expanded | MEDIUM | Weekly events show once |

#### Image Skill (Priority 1)
| Issue | Severity | Impact |
|-------|----------|--------|
| Hard-coded models | HIGH | Fails if model not installed |
| No fallback strategy | HIGH | Complete failure on ComfyUI issues |
| Image URL format | MEDIUM | May not send correctly via selfbot |
| Rate limit messaging | LOW | Typo in method name |

#### Architecture (Priority 2)
| Issue | Severity | Impact |
|-------|----------|--------|
| Monolithic onMention | HIGH | 20+ sequential checks, untestable |
| Skills not unified | MEDIUM | HandlerRegistry exists but unused |
| Memory not persisted | MEDIUM | All memories lost on restart |
| No observability | MEDIUM | No metrics for debugging |

---

## Detailed Issue Analysis

### 1. Calendar Service V2 - Deep Dive

**Current Flow:**
```
User message → CalendarSkillV2.canHandle() → CalendarSkillV2.handle()
  → CalendarServiceV2.createEvent() → In-memory sql.js DB
  → scheduleReminders() → setTimeout() → console.log()
```

**Problems Identified:**

1. **No Persistence** (line 20 in calendar-v2.ts):
   ```typescript
   this.db = new SQL.Database();  // In-memory only!
   ```
   Events stored in RAM, lost on restart.

2. **Reminders Not Connected** (line 270-272):
   ```typescript
   private sendReminder(event: CalendarEvent, minutesBefore: number): void {
     console.log(`[REMINDER] ${event.title} in ${minutesBefore} minutes`);
     // No Discord message sent!
   }
   ```

3. **Delete Stub** (line 128-130):
   ```typescript
   private async deleteEvent(_message: string, _channelId: string, _userId: string): Promise<SkillResponse> {
     return { handled: true, response: 'To delete an event, please provide the event title.' };
   }
   ```

4. **Data Fragmentation**:
   - CalendarServiceV2 uses in-memory sql.js
   - CalendarDisplayService reads from eventDb (main SQLite)
   - Two different data sources = potential divergence

**Required Fixes:**
- [ ] Persist calendar to disk (use main eventDb or file-based sql.js)
- [ ] Wire sendReminder to Discord channel notifications
- [ ] Implement deleteEvent with event ID lookup and confirmation
- [ ] Consolidate to single data source OR add sync layer

---

### 2. Image Generation - Deep Dive

**Current Flow:**
```
User: "lag et bilde av en katt"
  → ImageSkill.canHandle() → ImageSkill.handle()
  → ComfyUIClient.generateImage()
    → health check → rate limit → POST /prompt
    → waitForCompletion() (polls 60x 2s)
    → returns imageUrl
  → Discord sendMessage with { file: imageUrl }
```

**Problems Identified:**

1. **Hard-coded Models** (lines 150, 205):
   ```typescript
   "ckpt_name": "v1-5-pruned-emaonly.safetensors"  // May not exist!
   "ckpt_name": "sd15_default.yaml"  // Fallback may also fail
   ```

2. **No Extended Fallback**:
   - Only 2 workflow attempts
   - No alternative image service
   - Complete failure if ComfyUI down

3. **URL Format Issue** (line 40):
   ```typescript
   await ctx.discord.sendMessage(ctx.channelId, '🎨 Bildet ditt:', { file: result.imageUrl });
   ```
   Selfbot may not handle external URLs correctly.

4. **Minor Bug** (line 122):
   ```typescript
   private getRemainingRemainingTime(userId: string): string {  // Typo!
   ```

**Required Fixes:**
- [ ] Make model names configurable via env vars
- [ ] Add fallback to cached images or placeholder
- [ ] Fix URL handling for Discord selfbot
- [ ] Rename method (getRemainingRemainingTime → getRemainingTime)

---

### 3. Architecture Issues

**Monolithic onMention Handler** (relay/index.ts ~970 lines):
- 20+ sequential if-checks
- Cannot test individual handlers in isolation
- High risk of regressions

**Skill Routing Inconsistency**:
- HandlerRegistry exists at src/relay/handlers/registry.ts
- Global handlers exported from src/relay/handlers/index.ts
- But relay/index.ts uses inline checks instead of registry

**Memory Not Persisted**:
- MemorySkill uses in-memory Map
- Lost on restart

---

## Enhancement Plan

### Phase 1: Fix Critical Calendar Issues (Week 1)

#### 1.1 Calendar Persistence
**Objective:** Make calendar events survive restart

**Options:**
| Approach | Pros | Cons |
|----------|------|------|
| Use main eventDb | Already persisted | Schema mismatch |
| File-based sql.js | Simple, existing code | Manual save needed |
| better-sqlite3 | Fast, native | Native bindings required |

**Recommended:** File-based sql.js with periodic save

#### 1.2 Wire Reminders to Discord
**Objective:** Users actually receive reminder notifications

**Implementation:**
```typescript
// In CalendarServiceV2.sendReminder():
async sendReminder(event: CalendarEvent, minutesBefore: number): Promise<void> {
  const channel = await this.discord.channels.get(event.channelId);
  if (channel) {
    await channel.sendMessage(`⏰ Påminnelse: **${event.title}** starter om ${minutesBefore} minutter`);
  }
}
```

#### 1.3 Implement Delete Event
**Objective:** Allow users to remove events

**Implementation:**
- Parse event title from message
- Search events matching title
- Show confirmation buttons or ask for ID

#### 1.4 Unify Calendar Data
**Objective:** Single source of truth

**Decision:** Use main eventDb, remove v2 in-memory DB

---

### Phase 2: Robust Image Generation (Week 1-2)

#### 2.1 Configurable Models
**Implementation:**
```typescript
const MODEL_NAME = process.env.COMFYUI_MODEL || 'v1-5-pruned-emaonly.safetensors';
const FALLBACK_MODEL = process.env.COMFYUI_FALLBACK_MODEL || 'sd15_default.yaml';
```

#### 2.2 Extended Fallback Strategy
**Implementation:**
1. Try primary model
2. Try fallback model
3. Return cached recent image OR
4. Return placeholder with "ComfyUI unavailable"

#### 2.3 Fix Image Sending
**Implementation:**
- Download image to temp file first
- Send as local file, not URL
- Or use Discord's embed format

---

### Phase 3: Architecture Improvements (Week 2-3)

#### 3.1 Modular Message Handler
**Objective:** Break monolithic onMention into testable units

**Structure:**
```
src/relay/handlers/
├── index.ts           # Registry + exports
├── image.ts           # Image generation
├── calendar.ts        # Calendar operations  
├── extraction.ts      # Extraction flow
├── memory.ts          # Memory store/recall
└── ollama.ts          # LLM fallback
```

#### 3.2 Unified Skill Routing
**Objective:** Use HandlerRegistry consistently

**Implementation:**
- Register all handlers at startup
- Replace inline checks with registry.dispatch()

#### 3.3 Persist Memory
**Objective:** Save user memories across restarts

**Implementation:**
- Use existing MemoryService with SQLite backend
- Or write to .sisyphus/memories/

---

### Phase 4: Observability & Polish (Week 3)

#### 4.1 Add Metrics
- Image generation latency/success rate
- Calendar event creation count
- Ollama response times

#### 4.2 Health Dashboard
- Simple status page showing:
  - Ollama: ✅/❌
  - ComfyUI: ✅/❌
  - Database: ✅/❌

#### 4.3 Error Recovery
- Circuit breaker for Ollama (exists)
- Add for ComfyUI
- Add for database operations

---

## Quick Wins (Can Do Today)

| Task | Effort | Impact |
|------|--------|--------|
| Add reminder Discord message | 1hr | HIGH |
| Configurable ComfyUI model | 30min | MEDIUM |
| Fix getRemainingRemainingTime typo | 5min | LOW |
| Add calendar persistence | 2hr | HIGH |
| Implement deleteEvent | 1hr | MEDIUM |

---

## Success Criteria

### Calendar - "Just Work" Checklist
- [ ] Events persist across bot restart
- [ ] User receives Discord notification at reminder time
- [ ] User can list today's events
- [ ] User can list this week's events
- [ ] User can create event with natural language
- [ ] User can delete event
- [ ] Recurring events appear multiple times

### Image Generation - "Just Work" Checklist
- [ ] "lag et bilde av X" generates image
- [ ] Clear error if ComfyUI unavailable
- [ ] Rate limit respected
- [ ] Image actually displays in Discord

### Architecture - "Just Work" Checklist
- [ ] Each handler testable in isolation
- [ ] No monolithic functions >100 lines
- [ ] Consistent skill/handler routing
- [ ] Memory survives restart

---

## Next Steps

1. **Confirm priorities** - Which enhancements matter most?
2. **Decide calendar approach** - Use eventDb or file-based sql.js?
3. **Start implementation** - I can create detailed work plans for each phase

The core insight: **the skills exist but aren't connected to real infrastructure** (no persistence, no notifications). Fixing these connections will make them "just work."
