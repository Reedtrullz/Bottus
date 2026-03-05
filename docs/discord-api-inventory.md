# Discord API Inventory

**Generated:** 2026-03-05  
**Purpose:** Document all Discord API features used for migration planning  
**Library:** discord.js-selfbot-v13 v3.7.1 (archived)

---

## Overview

This document catalogs all Discord API features used by the Bottus relay system to facilitate future migration efforts.

---

## Client Connection

### Authentication
| Feature | Method | Usage | Critical? |
|---------|--------|-------|-----------|
| User Token Login | `client.login(token)` | Authentication | ✅ YES |

### Events (Client)
| Event | Handler Location | Purpose | Critical? |
|-------|-----------------|---------|-----------|
| `ready` | `discord.ts:41` | Connection established, capture user info | ✅ YES |
| `error` | `discord.ts:47` | Error handling | ✅ YES |
| `disconnect` | `discord.ts:52` | Connection lost | ✅ YES |
| `message` | `discord.ts:57` | Incoming messages (DM/Group DM) | ✅ YES |

---

## Message Operations

### Sending Messages
| Feature | Method | Location | Purpose | Critical? |
|---------|--------|----------|---------|-----------|
| Send to Channel | `channel.send()` | `discord.ts:171-198` | Send messages | ✅ YES |
| Send DM | `user.createDM().send()` | `discord.ts:129` | Direct messages | ✅ YES |
| Attach File | `send({ file })` | `discord.ts:184-186` | Image uploads | ✅ YES |
| Send Embed | `send({ embed })` | `discord.ts:187-189` | Rich embeds | ✅ YES |
| Send Components | `send({ components })` | `discord.ts:190-192` | Buttons | ✅ YES |

### Message Features
| Feature | Usage | Critical? |
|---------|-------|-----------|
| Message Content | Text content | ✅ YES |
| File Attachments | Image generation results | ✅ YES |
| Embeds | Calendar views, help | ✅ YES |
| Components (Buttons) | Calendar navigation | ✅ YES |

---

## Channel Operations

### Channel Types
| Type | Value | Usage | Critical? |
|------|-------|-------|-----------|
| DM | `type === 1` | Direct messages | ✅ YES |
| Group DM | `type === 1` + `recipients` | Group chats | ✅ YES |
| Guild | `guild === null` check | Filter non-DMs | ✅ YES |

### Channel Access
| Feature | Method | Location | Purpose | Critical? |
|---------|--------|----------|---------|-----------|
| Get from Cache | `client.channels.cache.get()` | `discord.ts:178` | Channel lookup | ✅ YES |
| DM Creation | `user.createDM()` | `discord.ts:129` | Create DM channel | ✅ YES |

---

## User Operations

### User Data
| Feature | Method | Location | Purpose | Critical? |
|---------|--------|----------|---------|-----------|
| Get Current User | `client.user` | `discord.ts:43` | Bot identity | ✅ YES |
| Get User ID | `user.id` | `discord.ts:44` | Mention detection | ✅ YES |
| Get Username | `user.username` | `discord.ts:45` | Mention detection | ✅ YES |
| Find by Username | `client.users.cache.find()` | `discord.ts:107` | DM lookup | ✅ YES |
| Fetch User | `client.users.fetch()` | `discord.ts:115` | User lookup | ⚠️ Medium |

### Mention Detection
| Feature | Pattern | Location | Purpose | Critical? |
|---------|---------|----------|---------|-----------|
| User Mention | `<@!userId>` | `discord.ts:75` | Detect mentions | ✅ YES |
| Username Mention | `@username` | `discord.ts:75` | Detect mentions | ✅ YES |

---

## Reaction Operations

### Adding Reactions
| Feature | Method | Location | Purpose | Critical? |
|---------|--------|----------|---------|-----------|
| Add Reaction | `message.react(emoji)` | `plan-router.ts:140-142` | RSVP buttons | ✅ YES |

### Reaction Events
| Event | Handler | Location | Purpose | Critical? |
|-------|---------|----------|---------|-----------|
| `messageReactionAdd` | `client.on()` | `index.ts:160` | RSVP handling | ✅ YES |
| `messageReactionRemove` | `client.on()` | `index.ts:179` | RSVP removal | ✅ YES |

### Emoji Handling
| Feature | Usage | Critical? |
|---------|-------|-----------|
| Unicode Emoji | '✅', '❌', '🤔', '👍', '👎' | ✅ YES |

---

## Interaction Operations

### Button Interactions
| Feature | Method | Location | Purpose | Critical? |
|---------|--------|----------|---------|-----------|
| `interactionCreate` event | `client.on()` | `index.ts:117` | Button clicks | ✅ YES |
| `isButton()` check | `interaction.isButton()` | `index.ts:119` | Filter buttons | ✅ YES |
| `deferUpdate()` | `interaction.deferUpdate()` | `index.ts:147` | Acknowledge | ⚠️ Medium |
| `customId` | `interaction.customId` | `index.ts:113` | Button identification | ✅ YES |

---

## Data Structures

### Message Object
| Property | Usage | Critical? |
|----------|-------|-----------|
| `msg.id` | Message identification | ✅ YES |
| `msg.content` | Message text | ✅ YES |
| `msg.author` | Sender info | ✅ YES |
| `msg.author.id` | User ID | ✅ YES |
| `msg.author.username` | Username | ✅ YES |
| `msg.author.bot` | Bot filter | ✅ YES |
| `msg.channel` | Channel info | ✅ YES |
| `msg.channel.id` | Channel ID | ✅ YES |
| `msg.channel.type` | Channel type | ✅ YES |
| `msg.channel.recipients` | Group DM members | ✅ YES |
| `msg.guild` | Guild check (null for DMs) | ✅ YES |

### Reaction Object
| Property | Usage | Critical? |
|----------|-------|-----------|
| `reaction.message` | Associated message | ✅ YES |
| `reaction.message.id` | Message ID | ✅ YES |
| `reaction.emoji.name` | Emoji identifier | ✅ YES |

### User Object
| Property | Usage | Critical? |
|----------|-------|-----------|
| `user.id` | User identification | ✅ YES |
| `user.username` | Username | ✅ YES |

### Channel Object
| Property | Usage | Critical? |
|----------|-------|-----------|
| `channel.id` | Channel ID | ✅ YES |
| `channel.type` | Channel type (1=DM) | ✅ YES |
| `channel.recipients` | Group DM members | ✅ YES |
| `channel.send()` | Send message | ✅ YES |

---

## Rate Limits & Error Handling

### Current Protections
| Feature | Implementation | Location |
|---------|---------------|----------|
| Rate Limiting | Custom RateLimiter class | `utils/rate-limit.ts` |
| Circuit Breaker | Custom CircuitBreaker class | `utils/circuit-breaker.ts` |
| Error Logging | Logger utility | `utils/logger.ts` |

### Discord Rate Limits
| Endpoint | Known Limit | Our Handling |
|----------|-------------|--------------|
| Message Send | 5/5s per channel | 15/min per channel |
| DM Send | 10/min per user | 15/min per user |
| Reaction Add | 1/0.25s | N/A (best effort) |

---

## Migration Assessment

### Critical Features (Must Have)
1. ✅ User token authentication
2. ✅ DM channel support (`type === 1`)
3. ✅ Group DM support (`recipients`)
4. ✅ Message sending (text + files)
5. ✅ Message receiving
6. ✅ Reaction add/remove
7. ✅ Button interactions
8. ✅ User lookup by username

### Nice to Have (Can Degrade)
1. ⚠️ Fetch user by username (cache fallback exists)
2. ⚠️ Interaction defer (can skip)

### Not Used (Can Drop)
- Guild operations
- Voice channels
- Thread operations
- Slash commands (as bot)
- Webhook operations

---

## Alternative Library Support

### discord.py-self
| Feature | Supported | Notes |
|---------|-----------|-------|
| User tokens | ✅ Yes | Primary use case |
| Group DMs | ✅ Yes | Supported |
| Message operations | ✅ Yes | Full support |
| Reactions | ✅ Yes | Full support |
| Components | ✅ Yes | Buttons supported |

### Eris
| Feature | Supported | Notes |
|---------|-----------|-------|
| User tokens | ❌ No | Bot-only |
| Group DMs | ❌ No | Bot-only |

---

## Migration Risk Assessment

### High Risk
- **discord.js-selfbot-v13 archived**: No security patches
- **Discord API changes**: Could break without warning
- **Account ban risk**: ToS violation

### Mitigation
- Monitor Discord API changelog
- Implement circuit breakers ✅ Done
- Add connection monitoring ✅ Done
- Document all API usage ✅ This document
- Create Python spike branch (Phase 2)

---

## Next Steps

1. ✅ Document API usage (this inventory)
2. Create Python proof-of-concept
3. Test feature parity
4. Plan data migration
5. Create migration runbook

---

## References

- discord.js-selfbot-v13 docs: (archived)
- Discord API docs: https://discord.com/developers/docs
- discord.py-self: https://pypi.org/project/discord.py-self/
