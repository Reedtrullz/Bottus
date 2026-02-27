# Relay Modernization Notepad

## Session: relay-modernization
## Started: 2026-02-26

## Task 8: Refactor onMention to use handler registry

### Current State (Before)
- relay/index.ts: ~1007 lines
- Handler system partially used (techStackHandler, helpHandler, imageHandler)
- 20+ inline if-checks in onMention callback

### Target State (After)
- All handlers registered with globalHandlers registry
- Single dispatch call replaces inline if-chains
- relay/index.ts: ≤300 lines

### Inline Handlers to Migrate
1. Image generation (inline) → use ImageHandler
2. Features query (inline) → use FeaturesHandler  
3. TechStack query (inline, duplicate!) → use TechStackHandler
4. Self-analysis (inline) → create SelfAnalysisHandler
5. Memory store/recall (inline) → use MemoryHandler
6. Day-details (inline) → use DayDetailsHandler
7. Calendar query (inline) → use CalendarHandler
8. Feedback (inline) → use FeedbackHandler
9. Tone set (inline) → create ToneHandler
10. Clarification (inline) → use ClarificationHandler

### Key Decision Points
- Handler execution order must be preserved (first-match-wins)
- skillRegistry still used for complex skills (calendar-v2, memory-v2, etc.)
- Image generation checked BEFORE handlers (special case - needs ComfyUI health check)

### Files Modified
- src/relay/index.ts: Replace inline handlers with registry dispatch
