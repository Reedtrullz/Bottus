# NanoBot Permissions Integration

When NanoBot receives a prompt via Bottus, the user's role is included in the context.

## Context Format

```
[User Context]
Discord role: owner
User: John
...
```

## Role Behavior

| Role in Context | Action |
|-----------------|--------|
| `owner` | Perform directly (install skill, etc.) |
| `admin` | Can modify permissions |
| `member` / `contributor` | Create proposal instead |

## API (Optional)

For direct verification:
```
GET http://localhost:3001/api/permissions/{userId}/{channelId}
```

## Files

- `SOUL.md` - Bot persona with permission instructions
- `USER.md` - User profile template with Discord role placeholder
