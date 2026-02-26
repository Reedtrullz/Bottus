# Role-Based Access Control (RBAC)

Bottus supports role-based permissions for channel-level access control.

## Roles

| Role | Permissions |
|------|-------------|
| `member` | Query calendar, memory, images |
| `contributor` | + Create events, create memory, RSVP |
| `admin` | + Delete events/memory, clear channel memory, export data, manage roles, approve/reject proposals |
| `owner` | Full access (Discord owner only) |

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

## Persistence

Roles are stored in SQLite database (`channel_user_roles` table) and persist across restarts.

## Owner Setup

Set the bot owner in `.env`:
```
DISCORD_OWNER_ID=your-discord-user-id
```

The owner automatically has full permissions (OWNER role).
