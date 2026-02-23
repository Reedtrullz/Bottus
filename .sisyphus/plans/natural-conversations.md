# Plan: Natural LLM-Powered Conversations

## TL;DR
> Replace hardcoded confirmations and follow-up questions with natural LLM-generated responses for a more fun bot experience.

## Context

**Problem:**
- Current messages are robotic: "Lagt til: tripple trumf torsdag"
- Hardcoded follow-ups don't feel natural
- Bot feels like a command-line tool, not a friend

**Solution:**
- Use Ollama to generate natural Norwegian confirmations
- Ask contextual follow-up questions via LLM
- Make interactions fun and conversational

---

## Work Objectives

- **Objective:** Replace hardcoded strings with LLM-generated natural responses
- **Deliverables:**
  1. LLM-powered confirmations (after successful storage)
  2. LLM-powered follow-up questions (when clarification needed)
  3. Graceful fallback if LLM fails

---

## Definition of Done

- [ ] "Husk trippel trumf på torsdag kl 18" → LLM: "Kult! Jeg husker tripple trumf torsdag kl 18. Vil du ha påminnelse?"
- [ ] "Husk trippel trumf på torsdag" → LLM asks natural follow-up about time/frequency
- [ ] Falls back to simple message if LLM unavailable

---

## Must Have

- LLM generates confirmations in Norwegian
- LLM asks ONE clear follow-up when needed
- Fallback to simple message on LLM failure
- Preserve all existing storage logic

---

## Must NOT Have

- Don't break existing database storage
- Don't ask multiple questions at once
- Don't leak user data to LLM prompts unnecessarily

---

## TODOs

- [ ] 1. LLM Confirmations
  **What to do**: After successful eventDb.create() or taskDb.create(), call LLM with prompt like:
  `Brukeren har lagt til "{title}" til {formattedTime}. Skriv en vennlig, naturlig bekreftelse på norsk. Være kort og enthousiastisk!`
  
  **Example**:
  - Input: title="tripple trumf", time="torsdag kl 18"
  - LLM: "Kult! Jeg husker tripple trumf torsdag kl 18. Vil du ha påminnelse før da?"

- [ ] 2. LLM Follow-ups  
  **What to do**: When clarification needed (no time, recurring date), call LLM with:
  `Brukeren sa: "{message}". Spør ÉN naturlig oppfølgingsspørsmål på norsk for å avklare (tid, ukedag, eller gjentakelse).`
  
  **Example**:
  - Input: "Husk tripple trumf på torsdag"
  - LLM: "Er det denne torsdagen eller hver torsdag? Og vil du ha påminnelse?"

- [ ] 3. Fallback Handling
  **What to do**: Wrap LLM calls in try/catch. If fails, use simple hardcoded message.

---

## Execution

**File to modify:** src/relay/index.ts

**Changes:**
1. In handleExtractionFlow, after storage succeeds:
   - Call ollama.sendMessage() with confirmation prompt
   - Send LLM response to user
   
2. For follow-ups:
   - Call ollama.sendMessage() with clarification prompt  
   - Send LLM question to user

**Example flow:**
```
User: @inebotten Husk tripple trumf på torsdag kl 18
  → extraction finds task with time
  → storage succeeds (eventDb.create)
  → LLM prompt: "Brukeren har lagt til 'tripple trumf' til torsdag kl 18. Skriv en vennlig bekreftelse..."
  → LLM: "Kult! Jeg husker det! Vil du ha påminnelse?"
  → Bot sends to Discord
```

---

## Success Criteria

```bash
# Test confirmation
@inebotten Møte på fredag kl 14
# Expected: "Kult! Satt opp møte fredag kl 14. Skal jeg sende påminnelse?"

# Test follow-up  
@inebotten Husk tripple trumf på torsdag
# Expected: "Er det denne torsdagen eller hver torsdag? Og hvilken tid?"
```
