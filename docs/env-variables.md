# Environment Variables Reference

This document lists all environment variables used by the Ine-Discord bot. Copy `.env.example` to `.env` and fill in your values.

## Discord Configuration

### DISCORD_BOT_TOKEN
- **Required**: Yes (Gateway mode)
- **Description**: Bot token from the Discord Developer Portal
- **Default**: None
- **Example**: `DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.Gexample`

### DISCORD_EMAIL
- **Required**: Yes (Relay mode)
- **Description**: Discord account email for selfbot authentication
- **Default**: None
- **Security**: ⚠️ Sensitive. Never commit this file to version control.

### DISCORD_PASSWORD
- **Required**: Yes (Relay mode)
- **Description**: Discord account password for selfbot authentication
- **Default**: None
- **Security**: ⚠️ Sensitive. Never commit this file to version control. Consider using a separate account for relay bots.

## OpenClaw Gateway

### OPENCLAW_TOKEN
- **Required**: No
- **Description**: Authentication token for OpenClaw Gateway (enables agent loop mode)
- **Default**: None
- **Security**: ⚠️ Sensitive

### OPENCLAW_URL
- **Required**: No
- **Description**: URL of the OpenClaw Gateway server
- **Default**: `http://localhost:18789`
- **Example**: `OPENCLAW_URL=http://localhost:18789`

## Ollama (Local LLM)

### OLLAMA_URL
- **Required**: Yes
- **Description**: Base URL for the Ollama API
- **Default**: `http://localhost:11434`
- **Docker Default**: `http://127.0.0.1:11434`

### OLLAMA_MODEL
- **Required**: Yes
- **Description**: Model to use for conversations
- **Default**: None (must be set)
- **Docker Example**: `OLLAMA_MODEL=bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning`

## ComfyUI (Image Generation)

### COMFYUI_URL
- **Required**: No
- **Description**: Base URL for ComfyUI API
- **Default**: `http://localhost:8188`
- **Docker Default**: `http://127.0.0.1:8188`

## Relay Configuration

### RELAY_TIMEOUT_MS
- **Required**: No
- **Description**: Timeout for relay message operations in milliseconds
- **Default**: `30000` (30 seconds)
- **Docker Default**: `120000` (2 minutes)

### HISTORY_MAX_MESSAGES
- **Required**: No
- **Description**: Maximum number of messages to fetch from Discord history
- **Default**: `5`
- **Docker Default**: `5`

## Google Calendar API

### GOOGLE_CLIENT_ID
- **Required**: No
- **Description**: OAuth2 client ID from Google Cloud Console
- **Default**: None
- **Security**: ⚠️ Sensitive

### GOOGLE_CLIENT_SECRET
- **Required**: No
- **Description**: OAuth2 client secret from Google Cloud Console
- **Default**: None
- **Security**: ⚠️ Sensitive

### GOOGLE_REDIRECT_URI
- **Required**: No
- **Description**: OAuth2 redirect URI for the application
- **Default**: `http://localhost:3000/oauth/callback`
- **Example**: `GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback`

## Complete Example .env File

```bash
# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# Discord User Account (for Group DM relay)
DISCORD_EMAIL=your_discord_email@example.com
DISCORD_PASSWORD=your_discord_password

# OpenClaw Gateway
OPENCLAW_TOKEN=your_openclaw_gateway_token
OPENCLAW_URL=http://localhost:18789

# Ollama (Local LLM)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning

# ComfyUI (Image Generation)
COMFYUI_URL=http://localhost:8188

# Relay Configuration
RELAY_TIMEOUT_MS=30000
HISTORY_MAX_MESSAGES=5

# Google Calendar API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
```

## Security Notes

1. **Never commit `.env` files** to version control. The `.gitignore` should include `.env`.
2. **Use separate Discord accounts** for relay bots. Discord's Terms of Service prohibit selfbots on user accounts.
3. **Rotate tokens periodically** especially if using Gateway bot mode.
4. **Store secrets securely** in production. Consider using Docker secrets or a secret manager.
5. **OAuth credentials** should be treated as sensitive data. The Google client secret in particular should never be exposed.

## Docker-Specific Variables

When running with `docker-compose`, the following variables are automatically set:

| Variable | Docker Value |
|----------|--------------|
| `OLLAMA_URL` | `http://127.0.0.1:11434` |
OLLAMA_MODEL | `bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning` |
| `RELAY_TIMEOUT_MS` | `120000` |
| `HISTORY_MAX_MESSAGES` | `5` |
| `COMFYUI_URL` | `http://127.0.0.1:8188` |

These can be overridden in your `.env` file if needed.
