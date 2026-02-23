AI_STYLE environment integration implemented in src/services/ai.ts.
- Default style: balanced (read from process.env.AI_STYLE, fallback to 'balanced').
- Valid values: 'concise', 'balanced', 'verbose'.
- System prompt is now a class property set in the AIService constructor based on AI_STYLE.
- Behavior:
  - concise: prompts AI to respond short, direct, no hedging.
  - balanced: preserves existing behavior.
  - verbose: encourages detailed responses and clarifications when helpful.
- Results are reflected in subsequent calls to generateResponse via this.systemPrompt.
