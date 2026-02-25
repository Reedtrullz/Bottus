# Bottus 🤖

Your AI-powered Discord companion with local LLM, image generation, and shared calendar for group chats.

## What is Bottus?

Bottus runs in your **group DM** and uses a **local LLM** (Ollama) to have natural conversations. No API keys, no cloud dependencies, no monthly bills—just you, your friends, and AI that actually understands context.

### Demo

```
📸 "lag et bilde av en cyberpunk by i regn"
→ Generates image via ComfyUI

📅 "lag arrangement Middag imorgen kl 18"
→ Creates event, checks for conflicts

👍 "rsvp Middag yes"
→ Tracks who's coming

🤝 "propose tid for gaming"
→ Starts time poll, finds best time for everyone
```

## Features

### 💬 Smart Conversations
- **Local LLM** via Ollama (no cloud, total privacy)
- Understands Norwegian and English
- Remembers context within chat
- Adapts tone to your group's style

### 🎨 Image Generation
- **ComfyUI** integration for high-quality images
- LLM-enhanced prompts (the bot improves your idea before generating)
- Norwegian triggers: "lag et bilde av..."

### 📅 Shared Calendar
- **Group coordination**: Events are shared across the group DM
- **RSVP tracking**: See who's attending
- **Conflict detection**: Warns when scheduling overlaps
- **Time proposals**: Poll the group for best times
- **Consensus delete**: Remove stale events with 2/3 vote
- Natural language: "lag arrangement møte på fredag kl 14"

### 🛡️ Self-Healing
- Automatic retry with exponential backoff
- Service health monitoring
- Graceful degradation when services fail

### 🔌 Two Running Modes

| Mode | Description |
|------|-------------|
| **Relay Bot** | Standalone selfbot, direct Discord access |
| **NanoBot Gateway** | Full agent loop with skills + tools |

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Reedtrullz/Bottus.git
cd Bottus
npm install

# 2. Copy config
cp .env.example .env
# Edit .env with your Discord token and Ollama URL

# 3. Run
npm run start:relay
```

Requires: Node.js 18+, Ollama running locally

## Commands

| Feature | Trigger | Example |
|---------|---------|---------|
| Image | `lag et bilde av` | `lag et bilde av en katt i hatt` |
| Create Event | `lag arrangement` | `lag arrangement middag imorgen kl 18` |
| RSVP | `rsvp` | `rsvp middag yes` |
| Event Details | `event` | `event middag` |
| Time Poll | `propose tid` | `propose tid for gaming` |
| List Events | `mine arrangementer` | `hva skjer` |
| Delete | `slett` | `slett middag` |
| Export | `eksport` | `eksport kalender` |

## Architecture

```
┌─────────────────────────────────────────────┐
│            Discord Group DM                  │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│         Relay Bot (selfbot)                  │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Skills    │  │  Message Handlers   │  │
│  │  - Calendar│  │  - Extraction       │  │
│  │  - Image   │  │  - Confirmation     │  │
│  │  - Memory  │  │  - Reminders       │  │
│  └─────────────┘  └─────────────────────┘  │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌────────┐
│Ollama│ │ComfyUI│ │SQLite  │
│  LLM │ │ Images│ │  DB    │
└───────┘ └───────┘ └────────┘
```

## Tech Stack

- **Runtime**: Node.js (TypeScript)
- **Discord**: discord.js-selfbot-v13 + Eris
- **LLM**: Ollama (local)
- **Image**: ComfyUI
- **Database**: sql.js (SQLite)
- **Testing**: Vitest

## Why Local LLM?

| Cloud API | Bottus |
|-----------|--------|
| Monthly API bills | One-time GPU cost |
| Data leaves your machine | Everything stays local |
| Rate limits | Your hardware, your rules |
| Internet required | Works offline (mostly) |

## Documentation

### Getting Started
- [Environment Variables](docs/env-variables.md) - All configuration options
- [Development Setup](docs/development-setup.md) - Local development guide

### Features
- [Calendar Skill Guide](docs/calendar-skill.md) - Calendar functionality
- [Skills System](docs/skills-system.md) - Modular skill architecture
- [Plan Router](docs/plan-router.md) - Action routing logic

### Operations
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Deployment](docs/deployment.md) - Production deployment guide
- [Self-Healing](docs/self-healing.md) - Error recovery system
- [Health Monitoring](docs/health-monitoring.md) - Service health tracking

### Contributing
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Testing](docs/testing.md) - Testing strategy and patterns
- [Hotspot Onboarding](docs/hotspot-onboarding.md) - Working with complex code

### Reference
- [CI/CD](.github/workflows/ci.yml)
- [Code Proposal System](.github/workflows/code-proposal.yml)

- [Calendar Skill Guide](docs/calendar-skill.md)
- [Discord Selfbot Setup](docs/discord-selfbot-setup.md)
- [CI/CD](.github/workflows/ci.yml)
- [Code Proposal System](.github/workflows/code-proposal.yml)

## License

MIT
