# NanoBot Integration

Bottus is NanoBot's Discord interface — the ears that listen, the mouth that speaks, and the limbs that act.

## The Relationship

| Component | Role |
|-----------|------|
| **NanoBot** | Brain — decides what to do, remembers context, defines skills |
| **Bottus** | Body — listens to Discord, executes actions, returns responses |

Bottus integrates with external NanoBot configuration files from `~/.nanobot/workspace/`.

## Files Integrated

| File | Purpose |
|------|---------|
| `USER.md` | User profile - personalizes interactions |
| `SOUL.md` | Bot persona - defines personality and behavior |

## USER.md

Located at `~/.nanobot/workspace/USER.md`. Defines user preferences:

```markdown
## Discord
- **Username**: your Discord username
- **Role**: (auto-filled by Bottus)

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
- **Discord role**: Automatically included in context (see Permissions below)

## SOUL.md

Located at `~/.nanobot/workspace/SOUL.md`. Defines bot personality and behavior:

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

## Permissions System

Bottus provides your role in the user context:
- `Discord role: owner` → full access
- `Discord role: admin` → can manage permissions
- `Discord role: member` → should propose changes

Check role before installing skills, modifying system, etc.
```

## Real-Time Context

Bottus injects live status into every prompt so NanoBot knows what's currently possible:

```
[System Status]
- Services: calendar ✓, images ✓, memory ✓
- Online members: 4/5
- Recent: event "Middag" created, 2 RSVPs

[User Context]
(from USER.md + role from RBAC)
```

This allows NanoBot to adapt its responses based on:

- **Service availability**: Skip proposing image generation if ComfyUI is offline
- **Chat activity**: Know recent events/actions in the conversation
- **Member presence**: Understand who's available for scheduling

## How It Works

1. On startup, Bottus reads `~/.nanobot/workspace/USER.md` and `SOUL.md`
2. Parses profile and persona into structured data
3. Adds user role from RBAC system
4. Injects live system status into every prompt
5. Sends enhanced prompt to Ollama for response

### Example Prompt

```
You are Ine 🐈, AI assistant. Personality: Helpful and friendly...

[System Status]
- Services: calendar ✓, images ✓
- Online members: 4/5

[User Context]
Discord role: member
User: John
Language: nb-NO
Timezone: Europe/Oslo

(user message...)
```

## Permissions Integration

The RBAC system provides the user's role in the prompt context. NanoBot should:

| Role in Context | Action |
|----------------|--------|
| `owner` | Perform directly (install skill, etc.) |
| `admin` | Can modify permissions |
| `member` / `contributor` | Create proposal instead |

### Before Sensitive Actions

NanoBot **must check the role** before:

- Installing/removing skills
- Modifying system config
- Managing permissions

If role is `member` or `contributor`, respond:

> "I'll add this as a proposal for the group to vote on instead."

### API (Optional)

For direct verification:

```
GET http://localhost:3001/api/permissions/{userId}/{channelId}
```

Returns:

```json
{
  "userId": "123456789",
  "channelId": "987654321",
  "role": "admin",
  "isOwner": false,
  "permissions": ["query:calendar", "create:event", ...]
}
```

See [RBAC](./rbac.md) for full permission matrix.

## Cache

Files are cached for 1-5 minutes. Edit files and the changes will be picked up automatically.
