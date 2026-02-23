# Hotspot Brief: src/index.ts

**Size:** 286 lines  
**Complexity:** High - 8 service dependencies, multiple event handlers, dual polling loops

**Primary Responsibilities:**
Main entry point for the Ine-Discord bot. Initializes Eris client, instantiates 8 domain services (ConsentManager, ExtractionService, CalendarService, ReminderService, RetentionService, ToneLearningService, AIService, MessageIngestion), and registers all event handlers. Contains two polling intervals: one for @mention detection (5s) and one for governance proposal processing (10s).

**Key Patterns:**
- Service instantiation at module level
- Hardcoded channel ID for polling (GROUP_DM_CHANNEL_ID)
- Pattern-matching functions (isTechStackQuery, isFeaturesQuery) with hardcoded Norwegian/English keyword arrays
- Large switch statement in interactionCreate handler (8 command cases)
- Dual messageCreate handlers

**Extraction Opportunities:**
1. **PollingScheduler Service:** Extract the two setInterval loops into a dedicated scheduler service with configurable intervals and channel targets
2. **CommandRouter:** Move the switch statement in interactionCreate to a command registry/dispatcher pattern
3. **QueryPatternMatcher:** Extract isTechStackQuery/isFeaturesQuery into a pattern-matching service with externalized config
4. **HelpResponseBuilder:** Extract tech stack and features response strings to config or separate builders
5. **EventHandlerRegistry:** Group the 5+ event handlers into registered observers
