# Ine-Discord Bot (Bottus)

AI Discord bot with calendar management, image generation via ComfyUI, and Ollama LLM integration. Supports both the native relay bot and NanoBot Gateway integration.

## Features

- **Image Generation** - Generate images using ComfyUI with LLM prompt enhancement (Norwegian: "lag et bilde av...")
- **Calendar Management** - Create, list, and delete events (Norwegian: "lag arrangement...", "mine arrangementer")
- **AI Chat** - Conversational responses via Ollama
- **Event Extraction** - Automatically extracts dates/events from messages
- **Task Reminders** - Scheduled notifications for calendar events
- **Self-Healing** - Automatic retry with exponential backoff for failed operations
- **Health Monitoring** - Built-in health check endpoint for external services
- **Rate Limiting** - Per-user rate limiting (15 requests/minute)
- **NanoBot Integration** - Runs as NanoBot Gateway channel for unified agent loop

## Two Running Modes

### Option 1: Relay Bot (Standalone)
The original selfbot relay that handles Discord DMs/Group DMs directly.

### Option 2: NanoBot Gateway
Runs as a NanoBot channel, enabling the full NanoBot agent loop with skills, memory, and tools.

## Prerequisites

- Node.js >= 18.0.0
- WSL2 (for GPU support with Ollama)
- Ollama (installed in WSL2)
- ComfyUI (optional, for image generation)
- Python >= 3.11 (for NanoBot Gateway mode)

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Discord user token, Ollama endpoint, etc.

# Build
npm run build
```

### NanoBot Gateway Setup (Optional)

To run via NanoBot Gateway:

```bash
# Install NanoBot
pip install nanobot

# Run setup script for Discord selfbot channel
python3 scripts/setup-discord-selfbot.py

# Configure NanoBot
# Edit ~/.nanobot/config.json - see docs/discord-selfbot-setup.md
```

See [Discord Selfbot Setup Guide](docs/discord-selfbot-setup.md) for detailed instructions.

## Running

### Relay Bot (Standalone)

```bash
# Relay bot (discord.js-selfbot-v13)
npm run start:relay
```

### NanoBot Gateway

```bash
# Start NanoBot Gateway (port 18790)
nanobot gateway -p 18790

# Or via npm
npm run start:gateway
```

### Development

```bash
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
| `DISCORD_TOKEN` | Discord user token (selfbot) | - |
| `DISCORD_USER_TOKEN` | Alias for DISCORD_TOKEN | - |
| `OLLAMA_URL` | Ollama API endpoint | http://localhost:11434 |
| `OLLAMA_MODEL` | Ollama model for prompt enhancement | llama3.1:8b |
| `COMFYUI_URL` | ComfyUI API endpoint | http://localhost:8188 |
| `COMFYUI_MODEL` | Primary image model | v1-5-pruned-emaonly.safetensors |
| `COMFYUI_FALLBACK_MODEL` | Fallback image model | sd15_default.yaml |
## NanoBot Provider Configuration

To configure the LLM provider for NanoBot Gateway, edit `~/.nanobot/config.json`:

```json
{
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "minimax-m2.5"
    }
  },
  "providers": {
    "openai": {
      "apiKey": "YOUR_API_KEY",
      "apiBase": "https://ollama.com/v1"
    }
  }
}
```

See `docs/discord-selfbot-setup.md` for detailed configuration options.



## Project Structure

```
src/
├── index.ts           # Main bot entry (Eris)
├── relay/             # Selfbot relay (discord.js-selfbot-v13)
│   ├── skills/       # Skill system (image, calendar, memory)
│   ├── handlers/      # Message handlers
│   ├── health.ts     # Health endpoint
│   └── ollama.ts    # Ollama client
├── gateway/         # NanoGateway skill dispatcher (experimental)
├── services/          # Domain services
│   ├── self-healer.ts    # Self-healing wrapper
│   ├── health-monitor.ts # Service health checks
│   └── error-classifier.ts # Error categorization
├── db/               # SQLite via sql.js
└── commands/         # Slash commands

scripts/
├── discord-client.js       # Node.js Discord selfbot client
├── discord-selfbot-channel.py  # Python NanoBot channel (installed to site-packages)
└── setup-discord-selfbot.py    # Installation script

docs/
└── discord-selfbot-setup.md   # NanoBot Discord selfbot setup guide
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

## WSL2 Setup (for Ollama with GPU)

```bash
# Download and extract Ollama
curl -fsSL https://ollama.com/download/ollama-linux-amd64.tar.zst -o /tmp/ollama.tar.zst
mkdir -p ~/ollama && tar xf /tmp/ollama.tar.zst -C ~/ollama

# Add to PATH (add to ~/.bashrc for persistence)
export PATH=~/ollama/bin:$PATH
export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH

# Start Ollama
nohup ollama serve > ~/ollama/ollama.log 2>&1 &

# Pull your model
ollama pull bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning

# Or use the startup script
bash scripts/start-relay.sh
```
