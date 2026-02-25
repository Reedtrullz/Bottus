# Development Setup Guide

This guide covers setting up a local development environment for the Ine-Discord bot.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | ES modules required |
| npm | 9+ | Comes with Node.js |
| Docker | Latest | For Ollama and ComfyUI |
| Docker Compose | Latest | For running services |

## Services Setup

The bot depends on two external services that run in Docker:

### Ollama (Local LLM)

```bash
# Pull and run Ollama
docker pull ollama/ollama:latest
docker run -d -v ollama-data:/root/.ollama -p 11434:11434 --name ine-ollama ollama/ollama:latest

# Pull your
docker exec model ine-ollama ollama pull bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning
```

### ComfyUI (Image Generation)

```bash
# Run ComfyUI (CPU mode)
docker run -d -p 8188:8188 --name ine-comfyui ardenius/comfyui-cpu:latest
```

Or use docker-compose for all services:

```bash
docker-compose up -d ollama comfyui
```

## Project Setup

### 1. Clone and Install

```bash
git clone https://github.com/Reedtrullz/Bottus.git
cd Bottus
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_EMAIL` - Discord account email (for relay mode)
- `DISCORD_PASSWORD` - Discord account password (for relay mode)
- `OLLAMA_URL` - Ollama API URL (default: http://localhost:11434)

Optional variables:
- `COMFYUI_URL` - ComfyUI API URL (default: http://localhost:8188)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google Calendar integration

### 3. Run Development Server

**Main Bot (Eris):**
```bash
npm run dev
```

**Relay Bot (Selfbot):**
```bash
npm run start:relay
```

**Gateway Mode:**
```bash
npm run start:gateway
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/relay/calendar-skill-v2.test.ts
```

## Project Structure

```
src/
├── index.ts           # Main bot entry (Eris)
├── relay/             # Discord↔Ollama relay
│   ├── index.ts       # Relay entry point
│   ├── discord.ts     # Discord client
│   ├── ollama.ts      # Ollama client
│   ├── skills/        # Skill system
│   ├── handlers/      # Message handlers
│   └── plan-router.ts # Action routing
├── services/          # 12 domain services
│   ├── calendar*.ts   # Calendar services
│   ├── comfyui.ts     # Image generation
│   ├── extraction.ts  # Date/event extraction
│   └── ...
├── commands/          # Slash commands
├── db/               # Database layer (sql.js)
└── gateway/          # Experimental gateway
```

## Common Issues

### Ollama Connection Failed

1. Check Ollama is running: `docker ps | grep ollama`
2. Verify URL: `curl http://localhost:11434/api/tags`
3. Check firewall: Ensure port 11434 is accessible

### ComfyUI Not Generating Images

1. Check ComfyUI is running: `docker ps | grep comfyui`
2. Verify URL: `curl http://localhost:8188/system_stats`
3. Check workflow files are loaded

### Discord Authentication Failed

1. Verify credentials in `.env`
2. Check Discord account has 2FA disabled or properly configured
3. Token may be expired - regenerate from Discord Developer Portal

### TypeScript Errors

```bash
# Rebuild types
npm run build

# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Debugging

### Enable Debug Logging

Set in `.env`:
```bash
DEBUG=*
```

### Health Checks

The bot provides health monitoring for Ollama and ComfyUI:
- Check `src/services/health-monitor.ts` for integration
- Status: healthy | degraded | unhealthy

## Next Steps

- See [Environment Variables](env-variables.md) for all configuration options
- See [Troubleshooting](troubleshooting.md) for common issues
- See [Deployment](deployment.md) for production setup
