# Hotspot Analysis Implementation Plan - REVISED

## TL;DR

> **Quick Summary**: Implement recommendations from codebase hotspot analysis - create hotspot briefs for large files, update AGENTS.md, design relay modularization using event-driven patterns, add tests, and establish scanning cadence. Includes specific considerations for archived discord.js-selfbot-v13 and ComfyUI integration patterns.
> 
> **Deliverables**:
> - Hotspot briefs for src/relay/index.ts (~1015 lines) and src/db/index.ts (~533 lines)
> - Updated AGENTS.md files with hotspot sections and governance cadence
> - Relay modularization architecture using EventEmitter pattern (from research)
> - New relay module scaffolding (core, discord adapter, ollama adapter, router)
> - Unit/integration tests for new modules
> - Hotspot scanning script with proper exclusions (excludes package-lock.json)
> - Discord.js-selfbot-v13 migration risk assessment
> - Onboarding documentation
> 
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Hotspot briefs → AGENTS.md updates → Architecture design → Scaffold → Implementation → Tests

---

## Context

### Original Request
User asked to implement recommendations from the /init-deep hotspot analysis which identified:
- src/relay/index.ts at ~1015 lines (major hotspot)
- src/db/index.ts at ~533 lines (secondary hotspot)
- 4 existing AGENTS.md files at various levels
- Need for relay modularization

### Research Findings (from parallel analysis)

#### External Documentation Summary

**1. Relay Architecture Patterns (from librarian research)**
- Event-driven relay using EventEmitter pattern for decoupling
- Constructor-based dependency injection for clients
- Streaming by default for better UX (Ollama streaming)
- Modular service architecture with clear boundaries

**2. Recommended Interfaces (from research)**
```typescript
// Core Relay Interface
interface Relay {
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(handler: (msg: RelayMessage) => Promise<void>): void;
  send(message: RelayMessage): Promise<void>;
}

interface RelayMessage {
  id: string;
  source: 'discord' | 'ollama';
  content: string;
  metadata?: { userId?: string; channelId?: string; timestamp?: Date };
}

// Event Bus Interface
interface RelayEventBus {
  on(event: 'discord:message', handler: (msg: DiscordMessage) => void): void;
  on(event: 'ollama:response', handler: (res: OllamaResponse) => void): void;
  on(event: 'stream:chunk', handler: (chunk: StreamChunk) => void): void;
  emit(event: string, data: any): void;
}

// Streaming Interface
interface StreamManager {
  createStream(channelId: string): Promise<void>;
  appendToStream(channelId: string, chunk: string): Promise<void>;
  finalizeStream(channelId: string): Promise<void>;
  cancelStream(channelId: string): Promise<void>;
}
```

**3. ComfyUI Integration Patterns**
- POST /prompt for workflow execution
- WebSocket for real-time progress tracking
- /view endpoint for retrieving generated images
- Async execution with timeout handling (default 300s)
- Workflow requires node-based JSON structure

**4. discord.js-selfbot-v13 Critical Notes (UPDATED Feb 2026)**
- ⚠️ PROJECT ARCHIVED (Oct 2025) - Read-only, no future updates
- TOS Violation risk - account ban possible
- Consider migration path: eris (current bot) or discord.js (bot API)
- Rate limit handling: `restGlobalRateLimit: 50` recommended
- Node.js 20.18.0+ required

**5. Discord User Account Library Alternatives**
- ⚠️ **discord-user-bots** (npm): **NOT RECOMMENDED** - Very low activity (46 weekly downloads, v2.0.3 published 1 year ago)
  - 10 dependencies, only 1 dependent
  - DISCLAIMER: "USE AT YOUR OWN RISK" - account ban possible
  - Features: create accounts, send friend requests, join guilds, remote control
  - Low community adoption = potential stability/security issues
- ✅ **discord.py-self** (Python): Active alternative
  - v2.1.0 Beta (Feb 2025)
  - 1256 code snippets, Benchmark: 74.5
  - Modern async Python library with Discord user API access
- 🔄 **Recommendation**: Stay with current setup + monitor for TypeScript alternatives
  - Check for community forks of discord.js-selfbot-v13
  - Consider Python migration (discord.py-self) if TypeScript fork unavailable

#### Codebase Hotspots Identified

| File | Lines | Hotspot Level | Issues | Recommended Action |
|------|-------|---------------|--------|-------------------|
| src/relay/index.ts | ~1015 | HIGH | Monolith, multiple responsibilities, hard to test | Modularize with event-driven pattern |
| src/db/index.ts | ~533 | MEDIUM | Central data access, potential coupling | Repository pattern, in-memory mocks for tests |
| src/index.ts | ~500+ | MEDIUM | Entry point orchestration | Extract domain handlers |
| src/relay/discord.ts | ~300+ | MEDIUM | Event handling, message routing | Extract to adapter |
| src/relay/ollama.ts | ~200+ | MEDIUM | LLM client wrapper | Thin wrapper + pure functions |
| src/commands/index.ts | ~200+ | MEDIUM | Command registration | Per-domain modules |

#### Existing AGENTS.md Structure
- Root: /AGENTS.md
- Src: /src/AGENTS.md
- Relay: /src/relay/AGENTS.md
- Services: /src/services/AGENTS.md

---

## Work Objectives

### Core Objective
Reduce risk in codebase hotspots through documentation, modularization, and testing while establishing ongoing governance. Address the archived discord.js-selfbot-v13 risk by planning migration path.

### Concrete Deliverables
- [ ] Hotspot briefs (Markdown) for relay/index.ts and db/index.ts with specific refactor suggestions
- [ ] Updated AGENTS.md files with hotspot sections and governance cadence
- [ ] Relay modularization architecture document using EventEmitter pattern
- [ ] New relay module scaffolding (core, discord adapter, ollama adapter, router)
- [ ] Migration risk assessment for discord.js-selfbot-v13
- [ ] Unit tests for new relay modules
- [ ] Integration tests for relay pathways
- [ ] Hotspot scanning script (excludes package-lock.json)
- [ ] Onboarding documentation

### Definition of Done
- [ ] All hotspot briefs created and linked in AGENTS.md
- [ ] Relay modularization design approved with event-driven pattern
- [ ] New module scaffolding exists and compiles
- [ ] Tests pass for new modules
- [ ] Scanning script runs without package-lock.json
- [ ] Migration risk assessment documented

### Must Have
- Hotspot briefs for all identified files
- AGENTS.md updates with links
- Relay architecture design using EventEmitter pattern
- Working test scaffold
- Migration risk assessment

### Must NOT Have
- package-lock.json in hotspot scans
- Breaking changes to existing relay behavior (use feature flags)
- Undocumented interfaces
- Ignoring discord.js-selfbot-v13 archival risk

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests-after)
- **Framework**: vitest
- **Test Approach**: Unit tests for interfaces, integration tests for adapters, E2E for critical paths

### QA Policy
Every task includes agent-executed QA:
- CLI: Run scanning script, verify output
- API/Backend: TypeScript compile, lint
- Integration: npm test (vitest)
- Each scenario = exact command + assertions

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - can run in parallel):
├── Task 1: Create hotspot brief template
├── Task 2: Analyze src/relay/index.ts hotspots (full code read)
├── Task 3: Analyze src/db/index.ts hotspots (full code read)
├── Task 4: Analyze additional hotspots (index.ts, discord.ts, ollama.ts, commands)
├── Task 5: Document discord.js-selfbot-v13 migration risk assessment
└── Task 6: Update Root AGENTS.md with hotspot section + governance

Wave 2 (Design + Documentation - depends on Wave 1):
├── Task 7: Design relay modularization architecture (EventEmitter pattern)
├── Task 8: Define interfaces for new modules (from research)
├── Task 9: Create new relay module folder structure
├── Task 10: Update src/AGENTS.md with hotspot summary
├── Task 11: Update src/relay/AGENTS.md with modularization plan
└── Task 12: Create hotspot scanning script

Wave 3 (Scaffold + Tests - depends on Wave 2):
├── Task 13: Implement new relay module stubs
├── Task 14: Add unit tests for new module interfaces
├── Task 15: Add integration tests for relay pathways
├── Task 16: Update src/services/AGENTS.md
└── Task 17: Create onboarding documentation

Wave 4 (Final - depends on Wave 3):
├── Task 18: Final verification - tsc + lint + tests
├── Task 19: Plan compliance audit
├── Task 20: Scope fidelity check
└── Task 21: Commit all changes
```

### Dependency Matrix
- **1**: — — 2, 3, 4
- **2**: 1 — 7, 6
- **3**: 1 — 7, 6
- **4**: 1 — 7
- **5**: 1 — 7
- **6**: 2, 3, 4, 5 — —
- **7**: 2, 3, 4 — 8, 9
- **8**: 7 — 13
- **9**: 7 — 13
- **10**: 6 — —
- **11**: 6 — —
- **12**: 6 — —
- **13**: 8, 9 — 14, 15
- **14**: 13 — 18
- **15**: 13 — 18
- **16**: 10, 11 — 17
- **17**: 15, 16 — 18
- **18**: 14, 15, 17 — 19, 20
- **19**: 18 — 21
- **20**: 18 — 21
- **21**: 19, 20 — —

---

## TODOs

- [ ] 1. Create hotspot brief template

  **What to do**:
  - Design a reusable Markdown template for hotspot briefs
  - Include sections: Overview, Metrics, Hotspots, Risks, Recommendations, Tests, Migration Notes
  - Save to .sisyphus/templates/hotspot-brief.md
  - Include template for migration risk assessment

  **Must NOT do**:
  - Don't include any sensitive information

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None

  **References**:
  - Existing AGENTS.md files for style reference

  **Acceptance Criteria**:
  - [ ] Template file created at .sisyphus/templates/hotspot-brief.md
  - [ ] Template includes all required sections
  - [ ] QA: Reviewer approves template structure

  **Commit**: NO

- [ ] 2. Analyze src/relay/index.ts hotspots

  **What to do**:
  - Read the full file (~1015 lines)
  - Identify: large functions, complex logic, areas needing extraction
  - Document findings in hotspot brief format
  - Focus on: message handling, Ollama flow, extraction flow, image generation
  - Map to event-driven pattern opportunities

  **Must NOT do**:
  - Don't modify the source file
  - Don't create tests yet

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6)
  - **Blocks**: Task 7 (relay design)
  - **Blocked By**: Task 1

  **References**:
  - src/relay/index.ts - the file being analyzed
  - Research: EventEmitter pattern, RelayEventBus interface

  **Acceptance Criteria**:
  - [ ] Hotspot brief created for relay/index.ts
  - [ ] Lists all functions >50 lines
  - [ ] Identifies 3+ extraction opportunities
  - [ ] Maps to event-driven architecture recommendations

  **Commit**: NO

- [ ] 3. Analyze src/db/index.ts hotspots

  **What to do**:
  - Read the full file (~533 lines)
  - Identify: complex queries, data models, potential performance issues
  - Document findings in hotspot brief format
  - Suggest repository pattern per domain

  **Must NOT do**:
  - Don't modify the source file

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: Task 1

  **References**:
  - src/db/index.ts - the file being analyzed

  **Acceptance Criteria**:
  - [ ] Hotspot brief created for db/index.ts
  - [ ] Documents query patterns
  - [ ] Notes any performance concerns

  **Commit**: NO

- [ ] 4. Analyze additional hotspots

  **What to do**:
  - Read and analyze: src/index.ts, src/relay/discord.ts, src/relay/ollama.ts, src/commands/index.ts
  - Create mini-briefs for each (1-2 paragraphs each)
  - Identify extraction opportunities

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: Task 1

  **Acceptance Criteria**:
  - [ ] Mini-briefs created for 4 additional files

  **Commit**: NO

- [ ] 5. Document discord.js-selfbot-v13 migration risk

  **What to do**:
  - Create migration risk assessment document
  - Include: current status (archived Oct 2025), risks, migration options
  - Recommend: eris (already in use for main bot) or discord.js (bot API)
  - Document rate limiting considerations

  **Must NOT do**:
  - Don't make changes yet

  **Recommended Agent Profile**:
  - **Category**: `writing`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: Task 1

  **Acceptance Criteria**:
  - [ ] Migration risk document created
  - [ ] Options documented with pros/cons

  **Commit**: NO

- [ ] 6. Update Root AGENTS.md with hotspot section

  **What to do**:
  - Read current Root AGENTS.md
  - Add new "Hotspots" section referencing the briefs
  - Add "Code Governance" subsection for scanning cadence
  - Add migration risk summary

  **Must NOT do**:
  - Don't remove existing content

  **Recommended Agent Profile**:
  - **Category**: `writing`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocked By**: Tasks 2, 3, 4, 5

  **Acceptance Criteria**:
  - [ ] New Hotspots section added
  - [ ] Links to hotspot briefs
  - [ ] Scanning policy documented

  **Commit**: NO

- [ ] 7. Design relay modularization architecture

  **What to do**:
  - Based on hotspot analysis and research findings
  - Design module boundaries using EventEmitter pattern
  - Propose: src/relay/core/, src/relay/discord/, src/relay/ollama/, src/relay/router/
  - Define interfaces: IDiscordRelay, IOllamaBridge, IPlanRouter, IRelayService, RelayEventBus
  - Create architecture document with diagrams (text-based)

  **Must NOT do**:
  - Don't implement yet

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 2, 3, 4

  **Acceptance Criteria**:
  - [ ] Architecture document created
  - [ ] Interfaces defined (matching research recommendations)
  - [ ] Migration path outlined

  **Commit**: NO

- [ ] 8. Define interfaces for new modules

  **What to do**:
  - Create TypeScript interfaces for each module based on research
  - Place in src/relay/core/interfaces.ts
  - Include: IDiscordRelay, IOllamaBridge, IPlanRouter, IRelayService, RelayEventBus, StreamManager

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 7

  **Acceptance Criteria**:
  - [ ] All interfaces defined matching research recommendations
  - [ ] TypeScript compiles

  **Commit**: NO

- [ ] 9. Create new relay module folder structure

  **What to do**:
  - Create directories: src/relay/core, src/relay/discord, src/relay/ollama, src/relay/router
  - Create index.ts barrel files for each
  - Create placeholder files matching interface definitions

  **Must NOT do**:
  - Don't add full implementation yet

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 7

  **Acceptance Criteria**:
  - [ ] Directories created
  - [ ] Index files exist
  - [ ] TypeScript compiles

  **Commit**: NO

- [ ] 10. Update src/AGENTS.md

  **What to do**:
  - Read current src/AGENTS.md
  - Add hotspot findings summary
  - Reference relay and db briefs

  **Recommended Agent Profile**:
  - **Category**: `writing`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: Task 6

  **Acceptance Criteria**:
  - [ ] Hotspot summary added

  **Commit**: NO

- [ ] 11. Update src/relay/AGENTS.md

  **What to do**:
  - Add hotspot findings to relay AGENTS.md
  - Document proposed modularization
  - Include migration risk notes

  **Recommended Agent Profile**:
  - **Category**: `writing`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: Task 6

  **Acceptance Criteria**:
  - [ ] Hotspot section added
  - [ ] Modularization plan referenced

  **Commit**: NO

- [ ] 12. Create hotspot scanning script

  **What to do**:
  - Create scripts/scan-hotspots.sh
  - Exclude: node_modules, dist, .git, package-lock.json
  - Include: .ts, .tsx, .js, .jsx, .py, .go, .rs
  - Output: sorted list with line counts

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: Task 6

  **Acceptance Criteria**:
  - [ ] Script created
  - [ ] Excludes package-lock.json
  - [ ] Runs without error

  **Commit**: NO

- [ ] 13. Implement new relay module stubs

  **What to do**:
  - Add minimal implementations for each interface
  - Keep simple - will be filled in later
  - Ensure TypeScript compiles

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 14, 15
  - **Blocked By**: Tasks 8, 9

  **Acceptance Criteria**:
  - [ ] Stub implementations exist
  - [ ] TypeScript compiles

  **Commit**: NO

- [ ] 14. Add unit tests for new modules

  **What to do**:
  - Create test files for each new module
  - Use vitest (existing infrastructure)
  - Test interface contracts

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 18
  - **Blocked By**: Task 13

  **Acceptance Criteria**:
  - [ ] Tests exist for each module
  - [ ] Tests pass

  **Commit**: NO

- [ ] 15. Add integration tests for relay pathways

  **What to do**:
  - Create integration tests for:
    - Discord → Ollama message flow
    - Image generation flow (ComfyUI)
    - DM sending flow
  - Mock external services

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 18
  - **Blocked By**: Task 13

  **Acceptance Criteria**:
  - [ ] Integration tests exist
  - [ ] Tests pass

  **Commit**: NO

- [ ] 16. Update src/services/AGENTS.md

  **What to do**:
  - Add any relevant hotspot findings
  - Document service boundaries

  **Recommended Agent Profile**:
  - **Category**: `writing`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 10, 11

  **Acceptance Criteria**:
  - [ ] Updated with relevant info

  **Commit**: NO

- [ ] 17. Create onboarding documentation

  **What to do**:
  - Create docs/hotspot-onboarding.md
  - Include: architecture overview, how to contribute, how to run scans, migration notes

  **Recommended Agent Profile**:
  - **Category**: `writing`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 15, 16

  **Acceptance Criteria**:
  - [ ] Onboarding doc created
  - [ ] Clear instructions

  **Commit**: NO

- [ ] 18. Final verification

  **What to do**:
  - Run TypeScript compile
  - Run lint
  - Run tests
  - Verify all deliverables

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (Final)
  - **Blocks**: None
  - **Blocked By**: Tasks 14, 15, 17

  **Acceptance Criteria**:
  - [ ] tsc passes
  - [ ] lint passes
  - [ ] tests pass
  - [ ] All deliverables verified

  **Commit**: YES

- [ ] 19. Plan compliance audit

  **What to do**:
  - Verify all planned deliverables created
  - Check AGENTS.md updates
  - Verify hotspot briefs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 21
  - **Blocked By**: Task 18

  **Acceptance Criteria**:
  - [ ] All planned items complete

  **Commit**: NO

- [ ] 20. Scope fidelity check

  **What to do**:
  - Verify no scope creep
  - Verify all planned items done

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 21
  - **Blocked By**: Task 18

  **Acceptance Criteria**:
  - [ ] No scope creep
  - [ ] All planned items done

  **Commit**: NO

- [ ] 21. Commit all changes

  **What to do**:
  - Stage all changes
  - Create commit with descriptive message
  - Push to remote

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: git-master

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 19, 20

  **Acceptance Criteria**:
  - [ ] Changes committed
  - [ ] Pushed to remote

  **Commit**: YES (this IS the commit)

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — Verify all deliverables created
- [ ] F2. **Code Quality Review** — tsc + lint + tests
- [ ] F3. **Documentation Review** — All AGENTS.md files updated
- [ ] F4. **Scope Fidelity Check** — No creep, all planned items done

---

## Commit Strategy

- **21**: `docs: add hotspot analysis, AGENTS.md updates, and relay architecture` — src/, docs/, scripts/

---

## Success Criteria

### Verification Commands
```bash
npm run build  # TypeScript compiles
npm test      # Tests pass
./scripts/scan-hotspots.sh  # Scanning script works
```

### Final Checklist
- [ ] All hotspot briefs created
- [ ] AGENTS.md files updated
- [ ] Relay architecture designed (EventEmitter pattern)
- [ ] Module scaffolding exists
- [ ] Tests pass
- [ ] Scanning script works (excludes package-lock.json)
- [ ] Migration risk assessment documented
