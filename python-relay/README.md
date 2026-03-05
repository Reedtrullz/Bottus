# Discord.py-self Spike Test

Proof of concept for migrating from discord.js-selfbot-v13 to discord.py-self

## Setup

1. Install Python 3.10+
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create `.env` file:
   ```
   DISCORD_USER_TOKEN=your_user_token_here
   TEST_CHANNEL_ID=optional_channel_id_for_testing
   ```

## Running

```bash
python src/spike_bot.py
```

## Features Tested

- User token authentication
- DM and Group DM support
- Message receiving and sending
- Reaction handling
- Channel listing

## Expected Output

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

   Group DM details:
      - Group Chat Name (ID: 987654321098765432)
        Recipients: 4

📩 New message:
   From: TestUser
   Channel Type: Group DM
   Content: ping...
   ✉️  Replied: Pong! 🏓
```

## Success Criteria

- [ ] Bot connects with user token
- [ ] Can list Group DMs
- [ ] Can receive messages from Group DMs
- [ ] Can send messages to Group DMs
- [ ] Can add reactions
- [ ] No errors during 5-minute test

## Migration Assessment

If all criteria pass:
- discord.py-self is VIABLE for migration
- Proceed to Phase 3 (architecture design)

If any criteria fail:
- Document blocking issues
- Consider alternative strategies
