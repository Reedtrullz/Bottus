# Fix Image Generation with LLM Prompt Enhancement

## TL;DR

> **Quick Summary**: Add Ollama prompt enhancement between user request and ComfyUI generation to fix persistent 400 errors. Consolidate duplicate image handling paths into single skill-based flow.
> 
> **Deliverables**:
> - Enhanced prompt pipeline: extract → Ollama enhance → ComfyUI generate → Discord respond
> - Single image handling path (remove duplicates)
> - Proper error handling (no duplicate error messages)
> 
> **Estimated Effort**: Short (3-5 tasks)
> **Parallel Execution**: NO - sequential (each task depends on previous)
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request
Fix image generation that currently fails with "Beklager, bildegenerering feilet: ComfyUI error: 400" every time. User wants:
1. Ask for image in Discord (Norwegian)
2. Ollama enhances the prompt (English, quality keywords)
3. Enhanced prompt → ComfyUI → Discord image

### Interview Summary
**Key Discussions**:
- Root cause: Raw Norwegian prompt sent directly to ComfyUI (expects English, structured prompts)
- Three duplicate image handling paths found in codebase
- Current error flow: 400 error sent to Discord THEN follow-up with actual response

**Research Findings**:
- `src/relay/index.ts:561-575` - Direct ComfyUI call (no enhancement, runs first)
- `src/relay/index.ts:615-622` - Skill registry → ImageSkill (no enhancement)
- `src/relay/handlers/image.ts` - Legacy handler (no enhancement)
- `src/services/comfyui.ts` - ComfyUI client with workflow building

### Metis Review
**Identified Gaps** (addressed):
- Need early return after image success (prevent duplicate generation)
- Must handle Ollama timeout gracefully
- Empty prompt edge case needs handling
- Which path should be canonical? (Decision: Skill registry)

---

## Work Objectives

### Core Objective
Fix persistent "400" errors on image generation by adding LLM prompt enhancement, while consolidating duplicate handling paths.

### Concrete Deliverables
- Ollama prompt enhancement service/method
- Updated image generation flow: extract → enhance → generate → respond
- Removed duplicate image handling in relay/index.ts
- Proper error handling (single error message, not two)

### Definition of Done
- [x] User says "lag et bilde av en katt" → receives cat image (not 400 error)
- [x] Only ONE message sent (not error-first-then-response)
- [x] No duplicate image generations for same request
- [x] Norwegian prompt converted to English with quality keywords

### Must Have
- Ollama enhancement step before ComfyUI
- Single image handling path (skill registry)
- Graceful fallback if Ollama fails (try without enhancement)

### Must NOT Have (Guardrails)
- No error message sent BEFORE actual response
- No duplicate image generations
- No blocking on Ollama timeout (max ~10 seconds)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after (add test after implementation)
- **Framework**: vitest

### QA Policy
Every task includes agent-executed QA scenarios (manual verification via running the bot).

---

## Execution Strategy

### Sequential Flow (NO parallelism - each builds on previous)

```
Task 1: Create prompt enhancement method in ComfyUIClient
  ↓
Task 2: Update image handling in relay/index.ts to use enhancement
  ↓
Task 3: Add early return after image success (prevent duplicates)
  ↓
Task 4: Test full flow end-to-end
```

---

## TODOs

- [x] 1. Add prompt enhancement method to ComfyUIClient

  **What to do**:
  - Add `enhancePrompt(prompt: string): Promise<string>` method to `src/services/comfyui.ts`
  - Use existing Ollama client to convert Norwegian → English + add quality keywords
  - Handle Ollama timeout gracefully (throw error after 10s)
  - Add fallback: if enhancement fails, return original prompt

  **Must NOT do**:
  - Don't block forever on Ollama (timeout required)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: None required - follows existing patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: First task
  - **Blocks**: Task 2

  **References**:
  - `src/services/comfyui.ts` - Existing ComfyUIClient to extend
  - `src/relay/ollama.ts` - Existing Ollama client to reuse

  **Acceptance Criteria**:
  - [ ] Method `enhancePrompt("en koselig katt")` returns English string with quality keywords
  - [ ] Method throws/times out after 10 seconds max
  - [ ] If Ollama fails, returns original prompt (fallback)

  **QA Scenarios**:

  Scenario: Enhancement converts Norwegian to English
    Tool: Bash (node REPL test)
    Preconditions: Ollama running
    Steps:
      1. Import ComfyUIClient
      2. Call enhancePrompt with Norwegian: "en søt katt i solskinn"
      3. Verify result contains English words
    Expected Result: Returns string like "A cute cat in sunlight, detailed, high quality"
    Evidence: .sisyphus/evidence/task-1-enhance.ts

  Scenario: Ollama timeout returns original prompt
    Tool: Bash
    Preconditions: Ollama not running or slow
    Steps:
      1. Call enhancePrompt with "test bilde"
      2. Verify returns original "test bilde" after timeout
    Expected Result: Original prompt returned (fallback works)

- [x] 2. Update relay/index.ts to use enhancement

  **What to do**:
  - Modify the image generation block in `relay/index.ts:561-575`
  - Call `comfyui.enhancePrompt()` before `comfyui.generateImage()`
  - Use result of enhancement as the prompt

  **Must NOT do**:
  - Don't break other message handling
  - Don't remove other skills' functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: After Task 1
  - **Blocks**: Task 3

  **References**:
  - `src/relay/index.ts:561-575` - Current image handling code
  - `src/services/comfyui.ts` - Updated with enhancePrompt

  **Acceptance Criteria**:
  - [ ] Image requests now go through enhancement step

  **QA Scenarios**:

  Scenario: Full image flow with enhancement
    Tool: interactive_bash (tmux)
    Preconditions: Bot running, Ollama running, ComfyUI running
    Steps:
      1. Send "lag et bilde av en katt" to bot
      2. Verify response includes image (not 400 error)
    Expected Result: Cat image sent to Discord

- [x] 3. Add early return and fix error handling

  **What to do**:
  - Ensure proper return after image generation success (prevent skill registry from also handling)
  - Remove the duplicate image handling that runs AFTER the first block
  - Fix error message: single message, not error-then-response

  **Must NOT do**:
  - Don't break skill registry for other skills

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: After Task 2
  - **Blocks**: Task 4

  **References**:
  - `src/relay/index.ts:555-640` - Full message handler section

  **Acceptance Criteria**:
  - [ ] Only ONE image message sent per request
  - [ ] No "400 error" message appears before image

  **QA Scenarios**:

  Scenario: Single message per image request
    Tool: interactive_bash
    Preconditions: Bot running
    Steps:
      1. Send "lag et bilde av en hund" to bot
      2. Count messages from bot (should be 1)
    Expected Result: Exactly 1 message (image), no error preceding it

- [x] 4. Test full end-to-end flow

  **What to do**:
  - Test with various Norwegian prompts
  - Verify image generation works
  - Verify Ollama fallback works if enhancement fails

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: After Task 3
  - **Blocks**: None (final task)

  **References**:
  - All modified files

  **Acceptance Criteria**:
  - [ ] "lag et bilde av [X]" works for multiple X
  - [ ] Error handling is graceful

---

## Final Verification Wave

- [x] F1. **Code Review** — Read modified files, verify no regressions
- [x] F2. **Integration Test** — Full flow works end-to-end

---

## Commit Strategy

- **Single commit**: `fix(image): add prompt enhancement for ComfyUI generation`

---

## Success Criteria

### Verification Commands
```bash
# Type check
npx tsc --noEmit

# Run tests
npm test
```

### Final Checklist
- [x] Image generation works without 400 errors
- [x] Single message per request (no error-first-then-response)
- [x] No duplicate image generations
- [x] TypeScript compiles without errors
