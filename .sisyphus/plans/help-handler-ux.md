# Plan: UX-Focused Help System for Inebotten

## TL;DR

> Replace the generic "features" response with a comprehensive, UX-driven help system that teaches users how to actually use the bot through contextual guidance, practical examples, and progressive disclosure.

**Deliverables:**
- New `HelpHandler` class with multi-trigger support
- Rich help responses organized by capability category  
- Example prompts users can copy-paste
- Interactive help mode ("tell me about X")
- Localization support (Norwegian/English)

**Estimated Effort:** Short  
**Parallel Execution:** Yes - 3 waves  
**Critical Path:** Task 1 → Task 2 → Task 3

---

## Context

### The Problem

Current state (`features.ts`):
```
Jeg kan hjelpe deg med litt av hvert! Her er hva jeg kan:

📅 **Kalender** - spør om "hva skjer" eller "når er X"
💾 **Huske ting for deg** - bare si "husk at..."
📊 **Lage avstemninger** - "finn en tid for møte"

Vil du vite mer om hvordan jeg er bygget? Spør om "tech stack"! 🤓
```

This response is:
- **Too generic** - "hva skjer" isn't a real command
- **Not actionable** - users don't know what to type
- **Missing capabilities** - extraction, image generation, reminders, polls not mentioned
- **Wrong focus** - points to "tech stack" instead of teaching usage

### What Users Actually Ask

Based on detector patterns and typical Discord bot usage:
- "Who are you?" / "Hvem er du?"
- "What do you do?" / "Hva gjør du?"
- "How do I use you?" / "Hvordan bruke deg?"
- "What commands do you have?" / "Hvilke kommandoer?"
- "Help" / "Hjelp"
- "What can you do?" / "Hva kan du?"

### Architecture Fit

Existing handler pattern:
```typescript
interface MessageHandler {
  readonly name: string;
  canHandle(message: string, ctx: HandlerContext): boolean;
  handle(message: string, ctx: HandlerContext): Promise<HandlerResult>;
}
```

Handlers dispatch sequentially - first match wins. New HelpHandler should run early but after image generation (which is a quick win).

---

## Work Objectives

### Core Objective

Create a help system that:
1. **Answers the question asked** - not a generic monologue
2. **Provides copy-paste examples** - concrete prompts they can use immediately  
3. **Shows, doesn't just tell** - demonstrates through example phrasing
4. **Respects user language** - Norwegian default, English supported
5. **Offers progressive disclosure** - "learn more about X" links

### Concrete Deliverables

1. **`src/relay/handlers/help.ts`** - New HelpHandler class
2. **Help response database** - Structured help content by category
3. **Trigger expansion** - More detection patterns for help queries
4. **Wiring into relay** - Register and dispatch HelpHandler

### Definition of Done

- [ ] User typing "hva kan du" gets actionable examples, not generic list
- [ ] User typing "who are you" gets brief identity + quick start
- [ ] User typing "help" or "hjelp" gets comprehensive overview
- [ ] User asking "how do I [X]" gets specific guidance for that task
- [ ] All responses include copy-paste example prompts
- [ ] Language detection works (NB-NO vs EN-US)

### Must Have

- Copy-paste example prompts for every capability
- At least 3 response variants (brief, standard, comprehensive)
- Norwegian as default language
- Recognition of: help, who are you, what do you do, how to use, commands

### Must NOT Have

- Generic "I'm a chatbot here to assist you" responses
- Lists of commands without examples
- Responses longer than 1500 characters (Discord limit)
- Technical jargon about architecture (that's for "tech stack" query)

---

## Verification Strategy

### Test Infrastructure
- **Framework:** vitest (existing)
- **Tests:** Unit tests for HelpHandler canHandle and handle
- **Manual QA:** Interact with bot using help triggers

### QA Policy

Every task includes agent-executed QA scenarios:

**Scenario: "hva kan du" query**
- Tool: interactive_bash + Playwright for Discord simulation
- Trigger: Send message "hva kan du" to bot
- Verify: Response includes copy-paste examples for calendar, memory, images

**Scenario: "who are you" query**  
- Tool: interactive_bash
- Trigger: Send "who are you"
- Verify: Brief identity (<100 words) + quick start examples

**Scenario: "help" with context**
- Tool: interactive_bash
- Trigger: Send "hvordan lage en avtale"
- Verify: Specific guidance for calendar events, not generic help

---

## Execution Strategy

### Wave 1: Foundation (Quick)
- Task 1: Create HelpHandler skeleton with interface
- Task 2: Build help content structure (JSON/markdown in code)
- Task 3: Implement trigger detection (help, who are you, etc.)

### Wave 2: Content & Logic (Quick)
- Task 4: Implement help response generation with categories
- Task 5: Add copy-paste example prompts
- Task 6: Implement language detection (NB-NO vs EN)

### Wave 3: Integration (Quick)
- Task 7: Wire HelpHandler into relay/index.ts
- Task 8: Update handlers/index.ts exports
- Task 9: Test all trigger patterns

---

## TODOs

- [x] 1. Create HelpHandler skeleton - DONE (1192 lines of rich content!)

- [x] 2. Build help content structure - DONE

- [x] 3. Implement trigger detection - DONE

- [x] 4. Implement help response generation - DONE

- [x] 5. Add copy-paste example prompts - DONE

- [x] 6. Implement language detection - DONE

- [x] 7. Wire HelpHandler into relay - DONE (relay/index.ts)

- [x] 8. Update handlers/index.ts exports - DONE

- [x] 9. FIX CONTEXT MISMATCH - DONE (adapted SkillAdapter to convert GatewayContext to HandlerContext)

  **What to do**:
  - Root cause: Gateway (src/gateway/) uses different context type than relay
  - HandlerContext: { message, userId, channelId, discord }
  - GatewayContext: { message, discord, memory, ollama, extraction }
  - Solution: Adapt SkillAdapter to convert or make HelpHandler handle both

  **References**:
  - `src/relay/handlers/interfaces.ts` - HandlerContext definition
  - `src/gateway/interfaces.ts` - GatewayContext definition
  - `src/gateway/adapters.js` - SkillAdapter (fix location)
  - `src/gateway/run.ts:26` - HelpHandler registered here

- [x] 10. Test all trigger patterns - DONE (unit tests created: 15 tests for HelpHandler)

  **Test Coverage**:
  - canHandle tests: 11 test cases (help, hjelp, who are you, hvem er du, hva kan du, what can you do, calendar, kalender, memory, commands, negative cases)
  - handle tests: 3 test cases (help, who are you, hva kan du)
  - All tests pass: 15/15

---

## Final Verification Wave

- [x] F1. Plan Compliance Audit — All must-haves implemented
- [x] F2. Code Quality Review — Build passes (tsc), no lint errors
- [ ] F3. Real Manual QA — Test each trigger pattern manually
- [x] F4. Scope Fidelity Check — No feature creep (scope unchanged)

---

## Commit Strategy

- `feat(relay): add HelpHandler with UX-focused help responses`
- Files: `src/relay/handlers/help.ts`, `src/relay/handlers/index.ts`, `src/relay/index.ts`

---

## Success Criteria

### Verification Commands
```bash
# Build
npm run build  # Expected: no errors

# Tests  
npm test      # Expected: all pass

# Manual verification (after deployment)
# "hva kan du" -> actionable examples
# "who are you" -> brief identity + quick start
# "help" -> comprehensive overview
```

### UX Checkpoints

| Trigger | Current (Bad) | Target (Good) |
|---------|--------------|---------------|
| "hva kan du" | Generic list | Copy-paste examples for each capability |
| "who are you" | N/A | Brief identity + "try typing X" |
| "help" | N/A | Categorized help with examples |
| "how to calendar" | N/A | Specific calendar usage guide |

---

## Help Content Design (Draft)

### Identity Response (Brief)
> Jeg er Inebotten - din personlige assistent i Discord! 🎉
> 
> Jeg kan hjelpe deg med kalender, huske ting, lage bilder, og mer.
> 
> **Prøv dette:**
> - «hva skjer i dag?» → se kalenderen
> - «husk at møte kl 15» → lagre et minne  
> - «lag et bilde av en katt» → generer et bilde

### Capabilities Response (Standard)
> Her er hva jeg kan hjelpe deg med:
> 
> **📅 Kalender**
> - «hva skjer i dag?»
> - «når er julen?»
> - «vis kalender»
> 
> **💾 Minner**
> - «husk at jeg liker kaffe»
> - «hva husker du?»
> 
> **🖼️ Bilder**
> - «lag et bilde av en strand i solnedgang»
> 
> **Mer info?** Spør f.eks. «hvordan lage en avtale?» for detaljer!

### Detailed Help (Comprehensive)
For "hvordan lage en avtale?" or similar:
> Slik lager du en kalenderhendelse:
> 
> **Enkelt** - bare fortell meg tidspunktet:
> «Vi har møte på mandag kl 14» eller «Lunsj på fredag kl 12»
> 
> **Spesifikt** - bruk kalenderkommandoen:
> `/kalender` for å se hele uken
> 
> Jeg husker også avtaler hvis du svarer «avtale» når jeg spør!

---

## Appendix: Trigger Patterns

```typescript
const HELP_TRIGGERS = [
  // English
  'help', 'helping', 'helper',
  'who are you', 'what are you', 'what is your name',
  'what do you do', 'how do you work', 'how to use',
  'commands', 'what commands', 'list commands',
  'how do i', 'how can i',
  
  // Norwegian  
  'hjelp', 'hjelp meg',
  'hvem er du', 'hva er du', 'kven er du',
  'hva gjør du', 'hva kan du', 'kva kan du',
  'hvordan bruke', 'hvordan bruke deg',
  'kommandoer', 'hvilke kommandoer',
  'hvordan lage', 'hvordan opprette'
];
```
