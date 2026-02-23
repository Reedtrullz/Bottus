# Ine-Discord Bot (Bottus)

AI Discord bot with calendar management, image generation via ComfyUI, and Ollama LLM integration.

## Features

- **Image Generation** - Generate images using ComfyUI ( Norwegian: "lag et bilde av...")
- **Calendar Management** - Create, list, and delete events (Norwegian: "lag arrangement...", "mine arrangementer")
- **AI Chat** - Conversational responses via Ollama
- **Event Extraction** - Automatically extracts dates/events from messages
- **Task Reminders** - Scheduled notifications for calendar events

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

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | - |
| `OLLAMA_URL` | Ollama API endpoint | http://localhost:11434 |
| `COMFYUI_URL` | ComfyUI API endpoint | http://localhost:8188 |
| `COMFYUI_MODEL` | Primary image model | v1-5-pruned-emaonly.safetensors |
| `COMFYUI_FALLBACK_MODEL` | Fallback image model | sd15_default.yaml |

## Project Structure

```
src/
├── index.ts           # Main bot entry (Eris)
├── relay/             # Selfbot relay (discord.js-selfbot-v13)
│   ├── skills/        # Skill system (image, calendar, memory)
│   ├── handlers/      # Message handlers
│   └── ollama.ts     # Ollama client
├── services/          # Domain services (calendar, memory, etc.)
├── db/                # SQLite via sql.js
└── commands/          # Slash commands
```

## Technology

- **Discord**: Eris + discord.js-selfbot-v13
- **Database**: sql.js (SQLite in-memory with file persistence)
- **LLM**: Ollama (local)
- **Image**: ComfyUI
- **Language**: TypeScript (ESM)

## License

MIT
