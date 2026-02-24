# Ine-Discord Bot (Bottus)

AI Discord bot with calendar management, image generation via ComfyUI, and Ollama LLM integration.

## Features

- **Image Generation** - Generate images using ComfyUI with LLM prompt enhancement (Norwegian: "lag et bilde av...")
- **Calendar Management** - Create, list, and delete events (Norwegian: "lag arrangement...", "mine arrangementer")
- **AI Chat** - Conversational responses via Ollama
- **Event Extraction** - Automatically extracts dates/events from messages
- **Task Reminders** - Scheduled notifications for calendar events
- **Self-Healing** - Automatic retry with exponential backoff for failed operations
- **Health Monitoring** - Built-in health check endpoint for external services
- **Rate Limiting** - Per-user rate limiting (15 requests/minute)

## Prerequisites

- Node.js >= 18.0.0
- Docker (for Ollama)
- ComfyUI (optional, for image generation)

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Discord bot token, Ollama endpoint, etc.

# Build
npm run build
```

## Running

```bash
# Main bot (Eris client)
npm run start

# Relay bot (discord.js-selfbot-v13)
npm run start:relay

# Development mode
npm run dev
```

## Commands

| Feature | Trigger | Example |
|---------|---------|---------|
| Image | "lag et bilde av" | "lag et bilde av en katt" |
| Calendar | "lag arrangement" | "lag arrangement møte imorgen kl 14" |
| List | "mine arrangementer" | "mine arrangementer" |
| Delete | "slett arrangement" | "slett møte" |

## Health Endpoint

The relay bot includes a health check endpoint on port 3001:

```bash
# Check health status
curl localhost:3001/health

# Check readiness
curl localhost:3001/health/ready
```

Response includes status of Ollama and ComfyUI services.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | - |
| `OLLAMA_URL` | Ollama API endpoint | http://localhost:11434 |
| `OLLAMA_MODEL` | Ollama model for prompt enhancement | llama3.2 |
| `COMFYUI_URL` | ComfyUI API endpoint | http://localhost:8188 |
| `COMFYUI_MODEL` | Primary image model | v1-5-pruned-emaonly.safetensors |
| `COMFYUI_FALLBACK_MODEL` | Fallback image model | sd15_default.yaml |

## Project Structure

```
src/
├── index.ts           # Main bot entry (Eris)
├── relay/             # Selfbot relay (discord.js-selfbot-v13)
│   ├── skills/       # Skill system (image, calendar, memory)
│   ├── handlers/      # Message handlers
│   ├── health.ts     # Health endpoint
│   └── ollama.ts    # Ollama client
├── services/          # Domain services
│   ├── self-healer.ts    # Self-healing wrapper
│   ├── health-monitor.ts # Service health checks
│   └── error-classifier.ts # Error categorization
├── db/               # SQLite via sql.js
└── commands/         # Slash commands
```

## Technology

- **Discord**: Eris + discord.js-selfbot-v13
- **Database**: sql.js (SQLite in-memory with file persistence)
- **LLM**: Ollama (local)
- **Image**: ComfyUI
- **Language**: TypeScript (ESM)
- **Testing**: Vitest

## License

MIT
