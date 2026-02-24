Title: PlanRouter LSP Fixes - Learnings
- Removed unused CalendarService and MemoryService fields from PlanRouter to resolve 'declared but never read' errors.
- Removed unused imports for MemoryService and CalendarService to avoid unused import warnings.
- Refactored event creation to avoid unused eventId by not capturing the return value.
- Renamed handleMediumConfidence parameter from 'userMessage' to '_userMessage' to satisfy unused-parameter linting.
- Ensured compatibility by keeping calls intact (route() continues to call handleMediumConfidence with the same value).
- Verified no remaining compile-time unused variables for this file.

Next steps (optional): If future plans require these services, re-introduce with proper usage or enable underscored placeholders for clarity.
