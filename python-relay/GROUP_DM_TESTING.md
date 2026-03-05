# Group DM Testing Guide for discord.py-self

## Overview

This document outlines how to test Group DM functionality with discord.py-self.

## Prerequisites

1. Python 3.10+ installed
2. Dependencies installed:
   ```bash
   cd python-relay
   pip install -r requirements.txt
   ```
3. Valid Discord user token in `.env` file

## Test Procedure

### Step 1: Installation Test
```bash
python tests/test_installation.py
```

**Expected Result:**
```
✅ discord.py-self imported successfully
   Version: 2.1.0
✅ Self-bot client created successfully
```

### Step 2: Connection Test
```bash
python src/spike_bot.py
```

**Expected Result:**
```
🚀 Starting discord.py-self spike test...
   Press Ctrl+C to exit

✅ Connected!
   User: YourUsername#1234
   ID: 123456789012345678
   Time: 2026-03-05 16:30:00

📋 Accessible channels:
   DMs: 5
   Group DMs: 3
   Guilds: 10
```

### Step 3: Group DM Features to Verify

#### 3.1 Channel Type Detection
**Test:** Check if GroupChannel is properly detected

**Code:**
```python
from discord import GroupChannel

async def on_message(message):
    if isinstance(message.channel, GroupChannel):
        print(f"Group DM detected: {message.channel.name}")
        print(f"Recipients: {len(message.channel.recipients)}")
```

**Expected:** Group DMs show as `GroupChannel` with `recipients` attribute

#### 3.2 Message Receiving
**Test:** Send message to a Group DM

**Action:** Have someone send "ping" to a Group DM the bot is in

**Expected Output:**
```
📩 New message:
   From: TestUser
   Channel Type: Group DM
   Content: ping...
   ✉️  Replied: Pong! 🏓
```

#### 3.3 Message Sending
**Test:** Bot can reply to Group DM

**Action:** Bot should auto-reply to "ping" with "Pong! 🏓"

**Verify:** Message appears in Group DM

#### 3.4 Reaction Handling
**Test:** Bot can add reactions

**Action:** Send "react" to Group DM

**Expected:** Bot adds ✅ reaction to the message

#### 3.5 Recipients Access
**Test:** Can access Group DM member list

**Code:**
```python
if isinstance(channel, GroupChannel):
    for recipient in channel.recipients:
        print(f"  - {recipient.name}")
```

**Expected:** List of all Group DM members

## Success Criteria

| Feature | Test Method | Expected Result | Status |
|---------|-------------|-----------------|--------|
| Import library | `import discord` | No errors | ⬜ |
| Create client | `discord.Client(self_bot=True)` | Client created | ⬜ |
| User token login | `client.run(token)` | Connected | ⬜ |
| List Group DMs | `client.private_channels` | Shows GroupChannels | ⬜ |
| Receive Group DM message | Send message to Group DM | Bot receives it | ⬜ |
| Send Group DM message | Reply in handler | Message sent | ⬜ |
| Add reaction | `message.add_reaction()` | Reaction added | ⬜ |
| Access recipients | `channel.recipients` | Member list | ⬜ |

## Recording Results

Create a file `TEST_RESULTS.md` with:
```markdown
# Discord.py-self Test Results
Date: 2026-03-05
Tester: Your Name
Token: (last 4 digits only)

## Installation
- [x] Package installs successfully
- Version: 2.1.0

## Connection
- [x] Connects with user token
- Username: YourUsername#1234
- User ID: 123456789012345678

## Group DM Features
- [x] Can list Group DMs (3 found)
- [x] Can receive messages
- [x] Can send messages
- [x] Can add reactions
- [x] Can access recipients

## Conclusion
✅ **VIABLE FOR MIGRATION**
All critical features work correctly.
```

## Troubleshooting

### Issue: "No module named 'discord'"
**Solution:**
```bash
pip install discord.py-self
```

### Issue: "401 Unauthorized"
**Cause:** Invalid token
**Solution:** Verify token is correct and hasn't expired

### Issue: "Intents required"
**Solution:** Use `discord.Intents.all()` when creating client

### Issue: Group DMs not showing
**Cause:** Client hasn't cached them yet
**Solution:** Wait for `on_ready` event, or trigger a refresh

## Security Notes

⚠️ **CRITICAL:**
- Never commit real tokens
- Use `.env` file (already in `.gitignore`)
- Test with a non-critical account
- Be aware of Discord ToS violation risk

## Next Steps

If all tests pass:
1. Document findings in `TEST_RESULTS.md`
2. Commit to spike branch
3. Proceed to Phase 3 (Architecture Design)

If any test fails:
1. Document the failure
2. Determine if it's a blocker
3. Consider alternative approaches
