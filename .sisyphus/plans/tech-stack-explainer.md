# Plan: Tech Stack Explainer Feature

## TL;DR
Add trigger detection for tech stack questions and respond with rich embed showing the tech stack.

## Context
- Existing: Bot already has AGENTS.md with full tech stack documentation
- Need: Bot should be able to explain its own tech stack when asked

## Work Objectives

### Core Objective
When user asks about tech stack (in Norwegian or English), bot responds with rich embed showing:
- Language: TypeScript (ESM)
- Discord libraries: Eris, discord.js-selfbot-v13
- AI: Ollama (mistral:7b-instruct)
- Database: SQLite (sql.js)
- Date handling: date-fns, chrono-node
- Other: Docker, zod, uuid

### Trigger Detection
Detect patterns like:
- "tech stack"
- "teknologi"
- "hva kjører du på"
- "what technology"
- "which libraries"

### Response Format
Rich embed with:
- Title: "Tech Stack" / "Teknologistack"
- Description with bullet list
- Color: Blue (0x5865F2)

---

## TODOs

- [x] 1. Add tech stack trigger detection in relay/index.ts
  **What to do**: Add isTechStackQuery() function to detect tech stack questions
  **Triggers**: "tech stack", "teknologi", "hva kjører du på", "what technology"
  **Files**: src/relay/index.ts

- [x] 2. Add tech stack embed response
  **What to do**: Create buildTechStackEmbed() function returning rich embed
  **Format**: Rich embed with bullet list of technologies
  **Files**: src/relay/index.ts

---

## Final Verification Wave

- [ ] F1: "@inebotten what tech stack do you use?" → rich embed appears
- [ ] F2: "@inebotten hva kjører du på?" → rich embed appears
- [ ] F3: Build passes

## Success Criteria

```bash
# Test English trigger
@inebotten what tech stack do you use?
# Expected: Rich embed with tech stack

# Test Norwegian trigger  
@inebotten hva kjører du på?
# Expected: Rich embed with tech stack
```
