# Emergency Migration Runbook

**Version:** 1.0  
**Last Updated:** 2026-03-05  
**Purpose:** Step-by-step guide for migrating from discord.js-selfbot-v13 to discord.py-self

---

## ⚠️ When to Use This Runbook

**Trigger Conditions:**
- Discord announces API deprecation affecting user tokens
- discord.js-selfbot-v13 completely breaks
- Account banned due to library detection
- Critical security vulnerability discovered

**Before Starting:**
- Ensure you have 2-3 days available
- Have a test Discord account ready
- Backup all data first
- Notify users of maintenance window

---

## Pre-Migration Checklist

- [ ] Read entire runbook before starting
- [ ] Backup current codebase (`git backup`)
- [ ] Export all databases
- [ ] Create test environment
- [ ] Have rollback plan ready
- [ ] Notify stakeholders

---

## Phase 1: Preparation (Day 1)

### 1.1 Environment Setup
```bash
# Create new directory for Python version
mkdir bottus-python
cd bottus-python

# Initialize git
git init

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install discord.py-self python-dotenv aiohttp
```

### 1.2 Project Structure
```
bottus-python/
├── src/
│   ├── __init__.py
│   ├── bot.py              # Main entry point
│   ├── config.py           # Configuration
│   ├── relay/
│   │   ├── __init__.py
│   │   ├── discord_client.py    # Discord connection
│   │   ├── message_handler.py   # Message processing
│   │   └── event_handler.py     # Event handling
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ollama.py       # Ollama integration
│   │   ├── calendar.py     # Calendar service
│   │   └── memory.py       # Memory service
│   └── db/
│       ├── __init__.py
│       └── database.py     # Database layer
├── tests/
├── data/                   # Database files
├── .env
├── requirements.txt
└── README.md
```

### 1.3 Core Files

**config.py:**
```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DISCORD_TOKEN = os.getenv('DISCORD_USER_TOKEN')
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
    OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'mistral:7b-instruct')
    DB_PATH = os.getenv('DB_PATH', './data/bottus.db')
```

**discord_client.py:**
```python
import discord
from discord.ext import commands

class DiscordRelay:
    def __init__(self, token, config):
        self.token = token
        self.config = config
        self.client = discord.Client(
            self_bot=True,
            intents=discord.Intents.all()
        )
        
        # Register handlers
        self.client.event(self.on_ready)
        self.client.event(self.on_message)
        
    async def on_ready(self):
        print(f'Connected as {self.client.user}')
        
    async def on_message(self, message):
        if message.author.id == self.client.user.id:
            return
            
        # Handle DM and Group DM
        if isinstance(message.channel, (discord.DMChannel, discord.GroupChannel)):
            await self.handle_dm(message)
            
    async def handle_dm(self, message):
        # Process message and respond
        response = await self.process_message(message.content)
        if response:
            await message.channel.send(response)
            
    async def process_message(self, content):
        # TODO: Integrate with Ollama and services
        return f"Echo: {content}"
        
    def run(self):
        self.client.run(self.token)
```

**bot.py (Entry Point):**
```python
from src.config import Config
from src.relay.discord_client import DiscordRelay

def main():
    relay = DiscordRelay(Config.DISCORD_TOKEN, Config)
    relay.run()

if __name__ == '__main__':
    main()
```

---

## Phase 2: Feature Migration (Day 2)

### 2.1 Service Layer Migration

**Priority Order:**
1. Ollama integration (highest priority - core feature)
2. Calendar service
3. Memory service
4. Image generation
5. Reminders

**For Each Service:**
1. Copy service logic from TypeScript
2. Rewrite in Python
3. Maintain same API interface
4. Test individually

### 2.2 Database Migration

**SQLite Transfer:**
```bash
# Copy database files
cp ../bottus-node/data/*.db ./data/

# Verify with Python
python -c "
import sqlite3
conn = sqlite3.connect('data/bottus.db')
cursor = conn.cursor()
cursor.execute('SELECT name FROM sqlite_master WHERE type=\"table\"')
print(cursor.fetchall())
"
```

### 2.3 Message Handler Migration

**JavaScript to Python Mapping:**

| JS Feature | Python Equivalent |
|------------|-------------------|
| `client.on('message')` | `@client.event async def on_message()` |
| `msg.author.id` | `message.author.id` |
| `msg.channel.id` | `message.channel.id` |
| `msg.content` | `message.content` |
| `msg.react(emoji)` | `message.add_reaction(emoji)` |
| `channel.send()` | `message.channel.send()` |
| `client.users.cache.get()` | `client.get_user()` |

---

## Phase 3: Testing (Day 2-3)

### 3.1 Unit Testing
```python
# tests/test_discord_client.py
import pytest
from src.relay.discord_client import DiscordRelay

class TestDiscordRelay:
    def test_initialization(self):
        relay = DiscordRelay('test_token', {})
        assert relay.token == 'test_token'
        
    def test_dm_detection(self):
        # Test channel type detection
        pass
```

### 3.2 Integration Testing

**Test Scenarios:**
1. Connect with user token
2. Receive DM
3. Receive Group DM
4. Send message
5. Add reaction
6. Handle button click
7. Database operations

### 3.3 Parallel Running

**Shadow Mode:**
```python
# Run both bots simultaneously
# Node.js bot: handles all production traffic
# Python bot: logs what it WOULD do

class ShadowMode:
    def __init__(self, node_relay, python_relay):
        self.node = node_relay
        self.python = python_relay
        
    async def on_message(self, message):
        # Node.js handles it
        node_response = await self.node.handle(message)
        
        # Python logs what it would do
        python_response = await self.python.handle(message)
        
        # Compare responses
        if node_response != python_response:
            print(f"MISMATCH: Node='{node_response}' Python='{python_response}'")
```

---

## Phase 4: Cutover (Day 3)

### 4.1 Pre-Cutover Checklist

- [ ] All features tested
- [ ] No mismatches in shadow mode
- [ ] Database synced
- [ ] Monitoring in place
- [ ] Rollback plan ready
- [ ] Maintenance window announced

### 4.2 Cutover Steps

```bash
# 1. Stop Node.js bot
pm2 stop bottus-node

# 2. Final database sync
rsync -av ../bottus-node/data/ ./data/

# 3. Start Python bot
pm2 start python-relay/src/bot.py --name bottus-python

# 4. Monitor logs
pm2 logs bottus-python

# 5. Test basic functionality
# Send test message to Group DM
```

### 4.3 Validation

**Check These Work:**
- [ ] Bot responds to pings
- [ ] Calendar commands work
- [ ] Memory commands work
- [ ] Image generation works
- [ ] Reactions work
- [ ] No errors in logs

---

## Phase 5: Cleanup (Day 3+)

### 5.1 Post-Migration

```bash
# Keep Node.js backup for 1 week
git tag pre-python-migration
git push origin pre-python-migration

# Update documentation
# Update deployment scripts
# Update CI/CD
```

### 5.2 Monitoring

**First 24 Hours:**
- Monitor error rates
- Check response times
- Verify all features
- User feedback

**First Week:**
- Daily health checks
- Compare metrics to Node.js baseline
- Fix any issues

---

## Rollback Plan

**If Critical Issues:**
```bash
# 1. Stop Python bot
pm2 stop bottus-python

# 2. Restore database (if needed)
cp backup/*.db data/

# 3. Start Node.js bot
pm2 start bottus-node

# 4. Debug Python issues
# Keep Python bot in shadow mode
```

---

## Data Migration

### Database Schema

**SQLite tables to migrate:**
- `calendar_events`
- `memories`
- `rsvps`
- `user_roles`
- `interactions`

**Migration Script:**
```python
import sqlite3
import shutil
from pathlib import Path

def migrate_database(source_path, dest_path):
    '''Copy and verify database'''
    shutil.copy2(source_path, dest_path)
    
    # Verify
    conn = sqlite3.connect(dest_path)
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    # Check row counts
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"{table[0]}: {count} rows")
    
    conn.close()

migrate_database('../bottus-node/data/bottus.db', './data/bottus.db')
```

---

## Troubleshooting

### Common Issues

**Issue:** "Intents required" error
**Solution:**
```python
intents = discord.Intents.all()
client = discord.Client(intents=intents, self_bot=True)
```

**Issue:** Module not found
**Solution:**
```bash
pip install -r requirements.txt
```

**Issue:** Database locked
**Solution:**
```python
# Use WAL mode
conn.execute('PRAGMA journal_mode=WAL')
```

**Issue:** Async/await confusion
**Solution:**
```python
import asyncio

async def main():
    await client.start(token)

asyncio.run(main())
```

---

## Timeline Summary

| Phase | Duration | Owner |
|-------|----------|-------|
| Preparation | Day 1 | Dev |
| Feature Migration | Day 2 | Dev |
| Testing | Day 2-3 | Dev + QA |
| Cutover | Day 3 | Dev + Ops |
| Cleanup | Day 3+ | Dev |

**Total Estimated Time:** 3 days

---

## Success Criteria

- [ ] All features work in Python version
- [ ] No data loss
- [ ] Users don't notice difference
- [ ] Response times equal or better
- [ ] Zero critical bugs in first week

---

## Contact Information

**Migration Team:**
- Lead: [Name]
- Backup: [Name]

**Emergency Contacts:**
- Discord Dev Support
- discord.py-self GitHub issues

---

## Appendices

### A. Code Conversion Examples

**Event Handling:**
```javascript
// Node.js (old)
client.on('message', async (msg) => {
    if (msg.author.bot) return;
    await handleMessage(msg);
});
```

```python
# Python (new)
@client.event
async def on_message(message):
    if message.author.id == client.user.id:
        return
    await handle_message(message)
```

**Message Sending:**
```javascript
// Node.js
await channel.send({ content: 'Hello', embed: embed });
```

```python
# Python
await channel.send('Hello', embed=embed)
```

### B. Environment Variables

Required in `.env`:
```
DISCORD_USER_TOKEN=xxx
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b-instruct
DB_PATH=./data/bottus.db
```

### C. Database Schema Reference

See `docs/database-schema.md`
