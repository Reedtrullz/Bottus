# Role-Based Access Control (RBAC)

Bottus supports role-based permissions for channel-level access control. Roles determine what actions users can perform and what information they can access.

## Roles

| Role | Level | Permissions |
|------|-------|-------------|
| `member` | 1 | Query calendar, memory, images |
| `contributor` | 2 | + Create events, create memory, RSVP |
| `admin` | 3 | + Delete events/memory, clear channel memory, export data, manage roles, approve/reject proposals |
| `owner` | 4 | Full access (Discord owner only) |

## Permission Matrix

| Permission | Member | Contributor | Admin | Owner |
|------------|--------|-------------|-------|-------|
| `query:calendar` | ✅ | ✅ | ✅ | ✅ |
| `query:memory` | ✅ | ✅ | ✅ | ✅ |
| `query:image` | ✅ | ✅ | ✅ | ✅ |
| `create:event` | ❌ | ✅ | ✅ | ✅ |
| `create:memory` | ❌ | ✅ | ✅ | ✅ |
| `rsvp` | ❌ | ✅ | ✅ | ✅ |
| `delete:event` | ❌ | ❌ | ✅ | ✅ |
| `delete:memory` | ❌ | ❌ | ✅ | ✅ |
| `clear:channel_memory` | ❌ | ❌ | ✅ | ✅ |
| `admin:permissions` | ❌ | ❌ | ✅ | ✅ |
| `admin:skills` | ❌ | ❌ | ✅ | ✅ |
| `admin:export` | ❌ | ❌ | ✅ | ✅ |
| `proposal:approve` | ❌ | ❌ | ✅ | ✅ |
| `proposal:reject` | ❌ | ❌ | ✅ | ✅ |

## Owner Setup

Set the bot owner in `.env`:
```
DISCORD_OWNER_ID=your-discord-user-id
```

The owner automatically has full permissions (OWNER role).

## Commands

### Role Management

```
@bot promote <user> to <role>   # Assign role (member/contributor/admin)
@bot demote <user>              # Reset to member
@bot remove <user>              # Same as demote
@bot list roles                 # Show all roles in channel
@bot myrole                     # Check your own role
@bot min rolle                  # (Norwegian)
```

### Permission Examples

```
@bot promote @john to admin
@bot myrole
@bot list roles
```

## Enforcement Points

| Component | What it guards |
|-----------|----------------|
| `calendar-skill-v2.ts` | Delete events, clear channel |
| `proposal-engine.ts` | Approve/reject proposals |
| `RoleHandler` | promote/demote commands |
| **LLM prompts** | Role included in context for NanoBot |

## Persistence

Roles are stored in SQLite database (`channel_user_roles` table):

```sql
CREATE TABLE channel_user_roles (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  assigned_by TEXT,
  assigned_at INTEGER,
  UNIQUE(channel_id, user_id)
);
```

## NanoBot Integration

The user's role is included in every LLM prompt via the `[User Context]` section:

```
[User Context]
Discord role: member
User: John
Language: nb-NO

(user message...)
```

**NanoBot should check the role before:**
- Installing/removing skills → owners only
- Modifying system config → owners only
- Managing permissions → admins/owners only
- Creating proposals → allowed for all

See [NanoBot Permissions](./nanobot-permissions.md) for full integration guide.

## API

Query permissions programmatically:

```bash
# Get user's role in a channel
curl http://localhost:3001/api/permissions/{userId}/{channelId}

# Get all roles in a channel
curl http://localhost:3001/api/permissions/channels/{channelId}
```

Response:
```json
{
  "userId": "123456789",
  "channelId": "987654321",
  "role": "admin",
  "isOwner": false,
  "permissions": ["query:calendar", "create:event", "delete:event", ...]
}
```
