# Hotspot Brief: src/relay/ollama.ts

**Size:** 114 lines  
**Complexity:** Low - 1 class, 4 methods, focused API client

**Primary Responsibilities:**
OllamaClient provides direct HTTP client for Ollama LLM API. Handles single-message queries with Norwegian system prompt, multi-message chat conversations, and health checking. Uses fetch with AbortController for timeout management (default 60s).

**Key Patterns:**
- Constructor injection: baseUrl, model, timeoutMs
- Hardcoded system prompt in Norwegian ("Du er inebot, en vennlig norsk chatbot...")
- Two message formats: sendMessage (system+user) vs chat (full message array)
- Request options: num_predict (1500), temperature (0.5-0.7), top_p (0.9)
- Error handling: timeout detection, HTTP status checking, error propagation

**Extraction Opportunities:**
1. **SystemPromptBuilder:** Extract Norwegian system prompt to external config with templating support
2. **RequestOptionsFactory:** Extract num_predict, temperature, top_p into configurable request builder
3. **OllamaClient extends BaseAPIClient:** Could extract fetch+timeout pattern to abstract base for reusability
4. **ModelConfig:** Extract model name and URL to configuration rather than constructor args
5. **ResponseParser:** Extract data.message?.content extraction to dedicated response handler
