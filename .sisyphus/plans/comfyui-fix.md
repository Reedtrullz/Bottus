# ComfyUI Image Generation Fix Plan

## TL;DR

> **Quick Summary**: Fix ComfyUI image generation returning 400 errors by adding health checks, better error handling, and fallback workflow.
> 
> **Deliverables**:
> - ComfyUI returns proper error messages (not just status code)
> - Health check before generation
> - Fallback workflow when primary fails
> - Unit tests for error paths
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Fix typo → Add error handling → Fallback → Tests

---

## Context

### Problem
When user asks "lag et bilde av en katt", Inebotten responds with:
```
Beklager, bildegenerering feilet: ComfyUI error: 400
```

The image generation fails with a generic 400 error. Root causes:
1. **CRITICAL BUG**: Line 48 has typo - `getRemainingRemainingTime` method doesn't exist
2. **No health check**: ComfyUI might be down but code doesn't verify
3. **No error details**: Only returns status code, not response body
4. **No fallback**: No alternative workflow if primary fails
5. **Hardcoded model**: References "v1-5-pruned-emaonly.safetensors" which may not be installed

### Research Findings
- ComfyUI expects POST to `/prompt` with `{ prompt: workflow_object }`
- 400 errors caused by: invalid workflow, missing model, wrong node references
- Fallback must also be a workflow (NOT simple prompt - that's for WebUI)
- Health check exists (`checkHealth()`) but never called

---

## Work Objectives

### Core Objective
Fix ComfyUI 400 errors and add robust fallback handling.

### Concrete Deliverables
1. Fix critical typo in rate limit error path
2. Add response body parsing for 400 errors  
3. Add health check before generation
4. Create simpler fallback workflow
5. Implement fallback logic
6. Unit tests for error paths

### Must Have
- Error messages include response details (not just status)
- Health check before generation attempt
- Fallback workflow when primary fails
- Preserve Norwegian error messages

### Must NOT Have
- Add new external image APIs (DALL-E, etc.)
- Change skill interface
- Add persistent configuration
- Modify skill registry

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: YES - Tests-after
- **Framework**: vitest

---

## Execution Strategy

### Wave 1 (Independent fixes)
├── Task 1: Fix critical typo (getRemainingRemainingTime)
├── Task 2: Add 400 error parsing
└── Task 3: Add health check before generation

### Wave 2 (After Wave 1)
├── Task 4: Create fallback workflow
├── Task 5: Implement fallback logic
└── Task 6: Add unit tests

---

## TODOs

- [x] 1. Fix critical typo in rate limit error - DONE

- [x] 2. Add detailed 400 error parsing - DONE

- [x] 3. Add health check before generation - DONE

- [x] 4. Create fallback workflow - DONE (buildSimpleWorkflow added)

- [x] 5. Implement fallback logic - DONE (tries primary then fallback on 400)

- [x] 6. Add unit tests - DONE (npm test passes)

---

## Commit Strategy

- `fix(comfyui): add error handling and fallback workflow`
- Files: `src/services/comfyui.ts`

---

## Success Criteria

```bash
npm run build  # No errors
npm test       # All pass
```
