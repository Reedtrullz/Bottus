# Discord Selfbot Channel for NanoBot

This document explains how to set up the Discord selfbot channel to enable seamless communication with NanoBot directly from Discord DMs, without requiring an external relay.

## Overview

The Discord selfbot channel replaces NanoBot's broken Gateway-based Discord implementation with a proper selfbot integration using `discord.js-selfbot-v13`. This solves the issue where NanoBot couldn't respond to Discord DMs.

### Problem Solved

- **Original issue**: NanoBot sends replies to user ID instead of DM channel ID
- **Root cause**: Discord Gateway uses different IDs than selfbot for DMs
- **Solution**: Use discord.js-selfbot-v13 which correctly handles DM channel IDs

## Files Created

| File | Purpose |
|------|---------|
| `scripts/discord-client.js` | Node.js Discord client wrapper |
| `scripts/discord-selfbot-channel.py` | Python NanoBot channel class |
| `scripts/setup-discord-selfbot.py` | Installation script |
| `.sisyphus/plans/ipc-protocol-design.md` | IPC protocol documentation |

## Installation

### Prerequisites

1. **Node.js** with `discord.js-selfbot-v13` installed (already in package.json)
2. **NanoBot** installed (`pip install nanobot`)
3. **Discord user token** (not bot token)

### Getting Your Discord User Token

⚠️ **Warning**: User tokens are sensitive. Never share them.

1. Open Discord in your browser (desktop app works too)
2. Press `Ctrl+Shift+I` to open Developer Tools
3. Go to the **Network** tab
4. Filter by `https://discord.com/api/v9/users/@me`
5. Click on any request to that endpoint
6. Look for `Authorization` in Request Headers - that's your token

### Step 1: Run Setup Script

```bash
cd /home/reed/Projects/Ine-Discord
python scripts/setup-discord-selfbot.py
```

This will:
- Copy `discord_selfbot.py` to your NanoBot channels directory
- Add `DiscordSelfbotConfig` to the config schema
- Add channel initialization to `manager.py`

## Ollama Cloud Provider Configuration

To use Ollama Cloud (or any OpenAI-compatible API) as the LLM provider:

### Get Your API Key

1. Log in to [ollama.com](https://ollama.com)
2. Go to Settings → Tokens
3. Create a new API token

### Configure Provider

Edit `~/.nanobot/config.json`:

```json
{
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "minimax-m2.5",
      "maxTokens": 8192,
      "temperature": 0.1
    }
  },
  "channels": {
    "discord": {
      "enabled": false
    },
    "discord_selfbot": {
      "enabled": true,
      "token": "YOUR_DISCORD_USER_TOKEN",
      "allowFrom": [],
      "clientPath": "/home/reed/Projects/Ine-Discord/scripts/discord-client.js"
    }
  },
  "providers": {
    "openai": {
      "apiKey": "YOUR_OLLAMA_CLOUD_TOKEN",
      "apiBase": "https://ollama.com/v1"
    }
  }
}
```

### Available Models

Run this to see available models:

```bash
curl -s https://api.ollama.com/v1/models \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Popular models include:
- `minimax-m2.5` - Fast, good reasoning
- `kimi-k2.5` - Strong performance
- `qwen3.5:397b` - Large model
- `glm-5` - Google model

### Notes

- Use `openai` provider with `apiBase: "https://ollama.com/v1"`
- The `vllm` provider may not work with Ollama Cloud due to auth issues
- Disable the regular `discord` channel to avoid message loops


### Step 2: Configure NanoBot

Edit your `~/.nanobot/config.json`:

```json
{
  "channels": {
    "discord_selfbot": {
      "enabled": true,
      "token": "YOUR_DISCORD_USER_TOKEN_HERE",
      "allow_from": [],
      "client_path": "/home/reed/Projects/Ine-Discord/scripts/discord-client.js"
    }
  }
}
```

Or use environment variable:

```bash
export DISCORD_USER_TOKEN="YOUR_TOKEN_HERE"
```

### Step 3: Start NanoBot

```bash
nanobot gateway -p 18790
```

Or if using the Ine-Discord project:

```bash
npm run start:gateway
```

## How It Works

### Architecture

```
┌──────────────┐    JSONL     ┌──────────────┐
│   Discord    │ ◄──────────► │   Node.js    │
│   (User)     │              │  (discord-  │
│              │    DM/       │   client.js)│
│              │   Group      └──────┬───────┘
│              │                      │ stdin/stdout
└──────────────┘                      │
                                      ┌─▼──────────┐
                                      │  Python    │
                                      │ (NanoBot)  │
                                      └────────────┘
```

### Message Flow

1. **Incoming**:
   - User sends DM to bot
   - Node.js receives via `client.on('message')`
   - Parses and sends JSON to Python via stdout
   - Python forwards to NanoBot message bus

2. **Outgoing**:
   - NanoBot processes message, creates OutboundMessage
   - Python sends JSON to Node.js via stdin
   - Node.js calls `channel.send()` to correct DM channel

### Key Fix

The critical difference from the broken Gateway implementation:

```python
# BROKEN (Gateway): Uses sender_id as channel_id
url = f"{DISCORD_API_BASE}/channels/{sender_id}/messages"  # ❌

# FIXED (Selfbot): Uses actual DM channel ID from message
channel_id = msg.channel.id  # ✅
```

## Troubleshooting

### "401 Unauthorized" Error

- **Cause**: Using bot token instead of user token
- **Fix**: Make sure you're using a Discord user token, not a bot token

### "404 Not Found" Error

- **Cause**: Using user ID instead of channel ID for responses
- **Fix**: This should be resolved with the selfbot implementation

### "Channel not found" Error

- **Cause**: Discord client not logged in properly
- **Fix**: Check that your user token is valid

### Node.js not found

- **Cause**: `node` command not in PATH
- **Fix**: Update `client_path` in config to point to your node binary

### Check Logs

```bash
# NanoBot logs
tail -f ~/.nanobot/nanobot.log

# Or run with verbose logging
nanobot gateway -p 18790 --log-level debug
```

## Testing

### Manual Test

1. Start NanoBot with Discord selfbot enabled
2. Open Discord and send a DM to your bot account
3. Bot should respond (through NanoBot's LLM)

### Verify Setup

Check that the channel is loaded:

```bash
nanobot gateway -p 18790 2>&1 | grep -i discord
```

Should see: `Discord selfbot channel enabled`

## Security Considerations

⚠️ **Important**:

1. **Discord ToS**: Using a selfbot violates Discord's Terms of Service
2. **Token security**: User tokens are high-value targets for attackers
3. **Rate limiting**: The implementation doesn't include rate limiting
4. **Account risk**: Discord may ban accounts using selfbots

### Recommendations

- Use a separate Discord account for the bot
- Keep your token secure (environment variable, not in config file)
- Don't share the account
- Consider migrating to official Bot API in the future

## Uninstallation

```bash
python scripts/setup-discord-selfbot.py --uninstall
```

Then remove the channel from your config.json.

## Files Reference

- **Node.js client**: `scripts/discord-client.js`
- **Python channel**: `scripts/discord-selfbot-channel.py` (installed to site-packages)
- **IPC Protocol**: `.sisyphus/plans/ipc-protocol-design.md`
- **Bottus reference**: `src/relay/discord.ts` (working implementation)
