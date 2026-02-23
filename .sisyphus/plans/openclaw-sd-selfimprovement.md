# Inebotten: Self-Improvement + Image Generation

## TL;DR

> **Quick Summary**: Build a self-improvement system using existing Ollama (no complex OpenClaw setup), and add ComfyUI for local image generation.

> **Deliverables**:
> - Self-improvement system with metrics, AI analysis, and human approval
> - ComfyUI image generation (self-hosted, GPU-accelerated)
> - Commands: "analyser deg selv", "lag et bilde av..."

> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves

---

## Context

### Research Summary

**OpenClaw Issues Found:**
- Complex initialization required (onboarding, device pairing)
- Gateway not starting in current environment
- Requires token configuration and authentication
- Not practical for current setup

**Decision: Skip OpenClaw**
- Use existing Ollama directly for self-improvement features
- Same capabilities achievable without complex setup
- Existing Inebotten already works with Ollama

**ComfyUI (Image Generation):**
- Best self-hosted option (quality + Docker support)
- Requires GPU with 4GB+ VRAM
- REST API for integration

---

## Work Objectives

### Core Objective
Add self-improvement capabilities and image generation to Inebotten using existing Ollama.

### Concrete Deliverables
1. **Self-Improvement System** - Metrics + AI analysis via Ollama + human approval
2. **ComfyUI Integration** - Self-hosted image generation

### Definition of Done
- [ ] `@inebotten analyser deg selv` → runs analysis, shows suggestions
- [ ] `@inebotten lag et bilde av en solnedgang` → generates and posts image
- [ ] Human approval required before any code changes
- [ ] Rollback command available

### Must Have
- Metrics tracking (response_time, errors, feedback)
- Self-analysis via existing Ollama
- Approval workflow (/godkjenn)
- Git-backed rollback
- ComfyUI with GPU support
- Rate limiting (5 images/hour)

### Must NOT Have
- Auto-apply code improvements without approval
- Paid API dependencies

---

## Execution Strategy

### Wave 1: Self-Improvement Foundation
- **T1**: Create metrics tracking in SQLite
- **T2**: Build analysis agent using existing Ollama
- **T3**: Implement approval workflow

### Wave 2: ComfyUI Integration
- **T4**: Add ComfyUI to docker-compose
- **T5**: Create ComfyUI client
- **T6**: Add image generation command
- **T7**: Add rate limiting

### Wave 3: Commands & Polish
- **T8**: Add self-analysis command
- **T9**: Add git-backed rollback

---

## TODOs

### Wave 1: Self-Improvement Foundation

- [ ] 1. Create Metrics Tracking

  **What to do**:
  - Add metrics table to SQLite
  - Track: response_time_ms, error_count, feedback_score
  - Add method to record metrics after each response

  **Acceptance Criteria**:
  - [ ] Metrics stored in database

- [ ] 2. Build Analysis Agent

  **What to do**:
  - Use existing Ollama to analyze metrics
  - Generate improvement suggestions
  - Focus on: error patterns, slow responses

  **Must NOT do**:
  - Auto-apply suggestions

  **Acceptance Criteria**:
  - [ ] Analysis runs without errors

- [ ] 3. Implement Approval Workflow

  **What to do**:
  - Create /godkjenn command
  - Store pending suggestions in DB
  - Require explicit approval
  - Never auto-apply

  **Must NOT do**:
  - Auto-apply improvements

  **Acceptance Criteria**:
  - [ ] Approval required before changes

---

### Wave 2: ComfyUI Integration

- [ ] 4. Add ComfyUI to Docker Compose

  **What to do**:
  - Add ComfyUI service to docker-compose
  - Configure GPU access
  - Set up volume for output images

  **Acceptance Criteria**:
  - [ ] ComfyUI container runs

- [ ] 5. Create ComfyUI Client

  **What to do**:
  - Create src/relay/comfy-client.ts
  - Implement generateImage(prompt)
  - Handle API calls

  **Acceptance Criteria**:
  - [ ] Client class created

- [ ] 6. Add Image Generation Command

  **What to do**:
  - Detect "lag et bilde av" pattern
  - Call ComfyUI client
  - Upload result to Discord

  **Acceptance Criteria**:
  - [ ] Image posted to Discord

- [ ] 7. Add Rate Limiting

  **What to do**:
  - Per-user limit (5/hour)
  - Show "genererer..." status

  **Acceptance Criteria**:
  - [ ] Rate limit enforced

---

### Wave 3: Commands & Polish

- [ ] 8. Create Self-Analysis Command

  **What to do**:
  - Add "analyser deg selv" command
  - Show metrics + suggestions

  **Acceptance Criteria**:
  - [ ] Command works

- [ ] 9. Add Git-Backed Rollback

  **What to do**:
  - Commit before changes
  - Create rollback command

  **Acceptance Criteria**:
  - [ ] Rollback works

---

## Success Criteria

```bash
# Test self-improvement
@inebotten analyser deg selv
# Expected: Shows metrics + suggestions

# Test image gen
@inebotten lag et bilde av en solnedgang
# Expected: Image generated and posted
```
