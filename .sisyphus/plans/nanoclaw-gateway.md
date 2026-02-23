# Plan: NanoClaw Gateway for Discord

**Status:** IN PROGRESS  
**Goal:** Build a user-account Discord gateway that runs NanoClaw-style agent from Discord  
**Constraint:** Use user account (NOT bot account) - no ToS concerns

---

## TL;DR

> A modular Discord gateway that maps Discord conversations to isolated NanoClaw-style agents. Each channel/DM gets its own execution context with persistent memory.

**Deliverables:**
- ✅ Gateway module structure (created)
- ✅ Discord connector via user token (created)
- ✅ Message parser/normalizer (created)
- ✅ Skill dispatcher (created)
- ✅ SQLite-backed memory store (created)
- ✅ Ollama integration (created)
- ⏳ Skills integration (remaining)
- ⏳ Entry point script (remaining)
- ⏳ Testing (remaining)

**Estimated Effort:** Medium  
**Parallel Execution:** Yes  
**Critical Path:** Gateway core → Skills → Testing

---

## Context

### Current State

**Completed:**
- `src/gateway/` - Full gateway module created
- Build passes: `npm run build`

**What Works:**
- Discord connection via user token
- Message parsing/normalization
- Skill dispatcher with registry pattern
- SQLite memory persistence
- Ollama client integration

**What Remains:**
- Wire up existing skills (calendar, memory, image, extraction)
- Create run script
- Test end-to-end

---

## Work Objectives

### Core Objective

Build a working gateway that:
1. Connects to Discord via user token
2. Routes messages to skills via dispatcher
3. Persists per-channel memory to SQLite
4. Falls back to Ollama for general queries
5. Reuses existing skill implementations

### Concrete Deliverables

1. ✅ `src/gateway/` - Core gateway modules
2. ⏳ Skills wired to dispatcher
3. ⏳ Entry point script
4. ⏳ End-to-end testing

### Must Have

- User token connection (NOT bot)
- Per-channel memory persistence
- Skill pipeline (calendar, memory, image, extraction)
- Ollama fallback
- HelpHandler (from previous work)

### Must NOT Have

- Bot account migration
- ToS risk assessment (not a concern)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│         Discord (User Account)               │
│           Group DM / DM                      │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  DiscordGateway (user token)                  │
│  - login, sendMessage, onMessage            │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  MessageParser                                │
│  - removeMentions, tokenize                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  SkillDispatcher                             │
│  - register, dispatch                        │
└─────────────────┬───────────────────────────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
   Calendar    Memory     Image
   Skill       Skill      Skill
      │           │           │
      └───────────┴───────────┘
                  │
                  ▼
         ┌───────────────┐
         │ Ollama        │
         │ (fallback)    │
         └───────────────┘
```

---

## Execution Strategy

### Wave 1: Foundation (COMPLETE)
- [x] 1. Create gateway module structure
- [x] 2. Implement Discord connector with user token
- [x] 3. Build message normalization
- [x] 4. Set up skill dispatcher

### Wave 2: Storage & Integration (COMPLETE)
- [x] 5. Create SQLite-backed memory store
- [x] 6. Wire Ollama integration
- [x] 7. Create main entry point (NanoGateway)

### Wave 3: Skills & Testing (REMAINING)
- [ ] 8. Import existing skills to gateway
- [ ] 9. Create run script
- [ ] 10. Test end-to-end flow

---

## Verification

### Test Scenarios

**Scenario: Identity query**
- Send: "hvem er du"
- Verify: HelpHandler responds with identity + examples

**Scenario: Memory storage**
- Send: "husk at jeg liker kaffe"
- Send: "hva husker du?"
- Verify: Second message recalls stored memory

**Scenario: Image generation**
- Send: "lag et bilde av en katt"
- Verify: Image generation triggered

**Scenario: Calendar query**
- Send: "hva skjer i dag?"
- Verify: Calendar skill responds

---

## Success Criteria

- [x] Build passes: `npm run build`
- [x] Gateway connects with user token
- [x] Per-channel memory persists
- [x] Skill dispatcher works
- [x] Ollama integration exists
- [ ] Skills wired to dispatcher
- [ ] End-to-end test passes

---

## Notes

- **User constraint**: Use user account only. No bot migration.
- **HelpHandler**: Already working from previous work. Will integrate.
- **Existing skills**: Can be imported from `src/relay/skills/`
