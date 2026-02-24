# Learnings

- Extracted extraction wiring in relay: src/relay/index.ts now imports ExtractionService and uses ExtractionService.extract on every @mention.
- A new flow handler handleExtractionFlow(extractionResult, userMessage, channelId) was introduced to encapsulate the continuation logic after extraction.
- Extraction results are logged with item count and confidence; enhanced messages may include extraction snippets to inform Ollama prompts.
- This completes Task 1. Plan states that Task 2 will extend storage/forwarding and UI hooks in subsequent steps.
