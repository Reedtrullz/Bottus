Memory Relay Enhancement
- Implemented Norwegian memory handling in the relay: detect store commands using husk/husk at/husk jeg er and recall commands using husker du / hva husker du.
- Added MemoryService usage to store and recall memories from the user context.
- Responses are sent in Norwegian. Memory storage prefixes are preserved by the memory backend (memoryDb).
- No changes to Ollama flow for non-memory queries; memory handling is isolated to the relay layer.
