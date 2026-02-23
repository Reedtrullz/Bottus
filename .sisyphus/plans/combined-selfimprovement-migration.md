# Combined Work Plan: Self-Improvement + Migration + Modularity + Skills

## TL;DR

> **Quick Summary**: Fix self-improvement system using Ollama, migrate from archived discord.js-selfbot-v13, implement modular relay architecture, and add NanoClaw-inspired skills system.
>
> **Deliverables**:
> - Self-improvement system working (analyser deg selv)
> - Discord library migration path decided
> - Modular relay structure implemented
> - Skills system inspired by NanoClaw
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 5 waves

---

## Context

### Research Findings

**1. Self-Improvement System** (from openclaw-sd-selfimprovement.md)
- Original plan: Use Ollama directly (skip OpenClaw complexity)
- Self-improvement commands: `analyser deg selv`
- Needs implementation of metrics + AI analysis + human approval flow

**2. Discord Library Migration** (from migration-risk.md)
- discord.js-selfbot-v13: ARCHIVED Oct 2025
- discord-user-bots (npm): NOT RECOMMENDED (46 weekly downloads)
- discord.py-self: Active Python alternative
- Recommendation: Stay short-term + monitor

**3. Modular Relay** (from relay-architecture.md)
- Current: 1015-line monolith with 20+ sequential if-checks
- Target: Message Handler Registry pattern
- Modules: core/, discord/, ollama/, router/
- Already scaffolded with interfaces and stubs

**4. NanoClaw Skills System** (from nanoclaw.dev research)
- ~5000 lines, container-isolated, skills-based architecture
- NOT Discord-native (WhatsApp/Telegram only)
- Key concept to adapt: Skills registry with per-skill memory
- Create Discord-native skills: calendar, image, memory, extraction

---

## Work Objectives

### Core Objective
Complete three related improvements:
1. Make self-improvement system functional
2. Decide and implement Discord library migration path
3. Replace relay monolith with modular architecture

### Concrete Deliverables

**Self-Improvement System:**
- [ ] Metrics collection working
- [ ] AI analysis via Ollama (analyser deg selv)
- [ ] Human approval flow for improvements

**Discord Library:**
- [ ] Choose migration path (stay/discord.py-self/Eris)
- [ ] Implement rate limiting as interim measure
- [ ] Document migration steps

**Modular Relay:**
- [ ] Extract 12 message handlers to individual files
- [ ] Implement handler registry pattern
- [ ] Reduce relay to ~300 lines

---

## Verification Strategy

- **Tests**: `npm test` - all pass
- **Build**: `npm run build` - compiles
- **Manual**: Run each command to verify

---

## Execution Strategy

### Wave 1: Self-Improvement Foundation
1. Implement metrics collection service
2. Create Ollama analysis prompt template
3. Build human approval flow (interactive message)
4. Wire up `analyser deg selv` command

### Wave 2: Discord Library Decision
1. Document all migration options with pros/cons
2. Implement rate limiting (10-15 msg/min) as interim
3. Choose and document migration path
4. Set up monitoring for library alternatives

### Wave 3: Modular Relay - Handlers
1. Extract detection functions to utils/detectors.ts
2. Extract each message handler to separate file
3. Create handler registry interface
4. Wire handlers to registry

### Wave 4: Modular Relay - Integration
1. Refactor onMention to use registry
2. Extract reminder service
3. Extract query handler service
4. Final cleanup and testing

### Wave 5: Skills System (NanoClaw-Inspired)
1. Design skill interface (canHandle, handle, getMemory, setMemory)
2. Create skill registry
3. Migrate handlers to skills format:
   - calendar-skill.ts
   - image-skill.ts
   - memory-skill.ts
   - extraction-skill.ts
4. Add per-skill memory support


---

## Success Criteria

- [ ] `npm test` passes
- [ ] `npm run build` compiles
- [ ] `@inebotten analyser deg selv` runs without error
- [ ] Relay code reduced from 1015 to ~300 lines

 [ ] Skills system implemented (calendar, image, memory, extraction)

- [ ] Migration path documented
