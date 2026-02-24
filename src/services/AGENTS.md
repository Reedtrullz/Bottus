# src/services/ - Domain Services

## OVERVIEW
Core business logic implemented as 12 services.

## FILES
| File | Purpose |
|------|---------|
| consent.ts | Opt-in/opt-out (/jeg-samtykker, /jeg-tilbakekall) |
| calendar.ts | Google Calendar integration (MVP: local only) |
| calendar-display.ts | Embed rendering for week/month views |
| calendar-renderer.ts | SVG image calendar generation |
| **comfyui.ts** | **ComfyUI image generation with prompt enhancement** |
| reminders.ts | Task reminders via Discord |
| retention.ts | 1-hour TTL data cleanup |
| extraction.ts | Date/event extraction from messages (chrono-node) |
| tone.ts | Adapts to group chat tone |
| ai.ts | LLM response generation |
| governance.ts | Proposal/voting system |
| ingestion.ts | Message processing pipeline |
| proposal_poll.ts | Democratic decision polling |
| memory.ts | Persistent memory storage |
| timePoll.ts | Time polling for event scheduling |

## WHERE TO LOOK
| Task | Class |
|------|-------|
| Consent handling | ConsentManager |
| Calendar ops | CalendarService |
| Calendar display | CalendarDisplayService |
| Image calendar | CalendarRenderer |
| **Image generation** | **ComfyUIClient** |
| Task reminders | ReminderService |
| Governance | GovernanceService |
| AI responses | AIService |
| Date extraction | ExtractionService |
| Memory storage | MemoryService |
| Time polls | TimePollService |

## CONVENTIONS
- Class-based with constructor DI
- Export singleton instances where appropriate
- Methods are async where I/O needed

## NOTES
- Timezone: Europe/Oslo hardcoded
- Norwegian/English bilingual commands


## HOTSPOT FINDINGS

Service layer observations from codebase analysis:

| File | Issue | Impact |
|------|-------|--------|
| `src/index.ts` | 8 service dependencies, dual polling loops | High coupling, hard to test |
| `db/index.ts` | Sync writes, no indexes | Services blocked on DB persistence |

### Service Extraction Opportunities

| Proposed Service | Source | Status |
|-----------------|--------|--------|
| PollingScheduler | index.ts (setInterval loops) | Not extracted |
| QueryPatternMatcher | index.ts (isTechStackQuery) | Not extracted |
| ReminderService | relay/index.ts (lines 959-1000) | Exists in services/ |
| UserLookupService | relay/discord.ts (3-tier lookup) | Not extracted |

### Service-DB Coupling

Services directly import from `src/db/index.ts`:
- `calendar.ts` → `eventDb`
- `reminders.ts` → `taskDb`
- `consent.ts` → `consentDb`
- `memory.ts` → `memoryDb`
- `governance.ts` → `proposalDb`

DB performance issues (sync writes, no indexes) directly impact service latency.

---

## SERVICE BOUNDARIES

| Service | DB Dependency | External API |
|---------|---------------|--------------|
| ConsentManager | consentDb | None |
| CalendarService | eventDb, rsvpDb | Google Calendar (future) |
| ReminderService | taskDb | Discord API |
| ExtractionService | None | chrono-node |
| MemoryService | memoryDb | None |
| GovernanceService | proposalDb | None |
| AIService | None | Ollama (relay) |
| ToneLearningService | toneProfileDb | None |
| **ComfyUIClient** | **None** | **ComfyUI + Ollama (prompt enhancement)** |