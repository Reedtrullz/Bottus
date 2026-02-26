# NanoBot Integration

Bottus integrates with external NanoBot configuration files from `~/.nanobot/workspace/`.

## Files Integrated

| File | Purpose |
|------|---------|
| `USER.md` | User profile - personalizes interactions |
| `SOUL.md` | Bot persona - defines personality and behavior |

## USER.md

Located at `~/.nanobot/workspace/USER.md`. Defines user preferences:

```markdown
## Basic Information
- **Name**: Your name
- **Timezone**: Europe/Oslo
- **Language**: nb-NO

## Preferences
### Communication Style
- [x] Casual
- [ ] Professional
- [ ] Technical

### Response Length
- [ ] Brief and concise
- [x] Adaptive based on question

## Work Context
- **Primary Role**: developer
- **Main Projects**: Bottus
- **Tools You Use**: TypeScript, Node.js

## Special Instructions
Your custom instructions here...
```

### What Bottus Uses

- **Name**: Personalizes responses ("Hi John!")
- **Language**: Sets response language preference
- **Timezone**: Used for event scheduling
- **Communication Style**: Adjusts tone
- **Discord role**: Automatically included in context

## SOUL.md

Located at `~/.nanobot/workspace/SOUL.md`. Defines bot personality:

```markdown
# Soul

I am nanobot 🐈, a personal AI assistant.

## Personality

- Helpful and friendly
- Concise and to the point
- Curious and eager to learn

## Values

- Accuracy over speed
- User privacy and safety
- Transparency in actions

## Communication Style

- Be clear and direct
- Explain reasoning when helpful
- Ask clarifying questions when needed
```

## How It Works

1. On startup, Bottus reads `~/.nanobot/workspace/USER.md` and `SOUL.md`
2. Parses profile and persona into structured data
3. Injects context into every LLM prompt:

```
You are Ine 🐈, AI assistant. Personality: Helpful and friendly...

[User Context]
Discord role: member
User: John
Language: nb-NO
Timezone: Europe/Oslo

(user message...)
```

## Cache

Files are cached for 1-5 minutes. Edit files and the changes will be picked up automatically.
