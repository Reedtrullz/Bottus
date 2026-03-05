# Bottus 🤖

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/Reedtrullz/Bottus)](https://github.com/Reedtrullz/Bottus/stargazers)
[![GitHub license](https://github/license/Reed://img.shields.iotrullz/Bottus)](https://github.com/Reedtrullz/Bottus/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/18)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org)

**Your AI-powered Discord companion with local LLM, image generation, and shared calendar for group chats.**

</div>

---

## What is Bottus?

**Bottus is NanoBot's Discord interface** — the ears that listen, the mouth that speaks, and the limbs that act in the real world.

NanoBot provides the brain: it decides *what* to do, remembers context, and defines capabilities (skills). Bottus provides *how* to do it: receiving messages from Discord, executing actions, and returning responses.

The skill system originates from NanoBot. Bottus implements a compatible dispatch layer that maps NanoBot skill decisions to actual service calls.

### Real-Time Context

Bottus injects live status into every prompt so NanoBot knows what's possible:

```
[System Status]
- Services: calendar ✓, images ✓, memory ✓
- Online members: 4/5
- Recent: event "Middag" created, 2 RSVPs

[User Context]
(from USER.md + role from RBAC)
```

Bottus runs in your **group DM** and uses a **local LLM** (Ollama) to have natural conversations. No API keys, no cloud dependencies, no monthly bills—just you, your friends, and AI that actually understands context.

### ✨ Demo

```
📸 "lag et bilde av en cyberpunk by i regn"
→ Generates image via ComfyUI

📅 "lag arrangement Middag imorgen kl 18"
→ Creates event, checks for conflicts

👍 "rsvp Middag yes"
→ Tracks who's coming

🤝 "propose tid for gaming"
→ Starts time poll, finds best time for everyone

💬 "husk at Oda liker sushi"
→ Remembers user preferences
```

---

## Features

### 💬 Smart Conversations

- **Local LLM** via Ollama (no cloud, total privacy)
- Understands **Norwegian and English** natively
- Remembers context within chat sessions
- Adapts tone to your group's style
- Low resource usage - runs on your own hardware

### 🎨 Image Generation

- **ComfyUI** integration for high-quality images
- LLM-enhanced prompts (the bot improves your idea before generating)
- Norwegian triggers: `lag et bilde av...`
- English triggers: `generate an image of...`

### 📅 Shared Calendar

- **Group coordination**: Events are shared across the group DM
- **RSVP tracking**: See who's attending (✅/❌/🤔)
- **Conflict detection**: Warns when scheduling overlaps
- **Time proposals**: Poll the group for best times
- **Consensus delete**: Remove stale events with 2/3 vote
- **ICS export**: Import to Google Calendar, Apple Calendar, etc.
- Natural language: `lag arrangement møte på fredag kl 14`

### 🧠 Memory

- Remember user preferences: `husk at jeg liker pizza`
- Recall memories: `hva liker jeg?`
- Clarification flow for uncertain memories

### 🛡️ Self-Healing

- Automatic retry with exponential backoff
- Service health monitoring
- Graceful degradation when services fail
- Error classification and recovery strategies

### 🔐 Role-Based Access Control

- Channel-level permissions: member → contributor → admin → owner
- Role persistence in SQLite database
- Permission enforcement on calendar, proposals, skill installation
- Integrated with NanoBot via prompt context

### 🔌 Two Running Modes

| Mode | Description |
|------|-------------|
| **Relay Bot** | Standalone selfbot, direct Discord access for Group DMs |
| **NanoBot Gateway** | Full agent loop with skills + tools (experimental) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Ollama with a model (default: `qwen3-14b`)
- Optional: ComfyUI for image generation

### 1. Clone & Install

```bash
git clone https://github.com/Reedtrullz/Bottus.git
cd Bottus
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Required: Discord bot token
DISCORD_BOT_TOKEN=your_bot_token

# Required for Relay mode (Group DM access)
DISCORD_EMAIL=your_email
DISCORD_PASSWORD=your_password

# Required: Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning

# Optional: ComfyUI for image generation
COMFYUI_URL=http://localhost:8188
```

### 3. Run

```bash
# Development (watch mode)
npm run dev

# Production
npm run build
npm start

# Relay bot only (for Group DMs)
npm run start:relay

# Experimental gateway mode
npm run start:gateway
```

Or use Docker Compose for all services:

```bash
docker-compose up -d
```

---

## Commands

### 📅 Calendar

| Action | Trigger | Norwegian Example | English Example |
|--------|---------|-------------------|-----------------|
| Create event | `lag arrangement` / `create event` | `lag arrangement Middag imorgen kl 18` | `create event Dinner tomorrow at 6pm` |
| List events | `mine arrangementer` / `my events` | `mine arrangementer` | `my events` |
| View week | `kalender uke` / `calendar week` | `kalender uke` | `calendar week` |
| View month | `kalender måned` / `calendar month` | `kalender måned` | `calendar month` |
| RSVP | `rsvp` | `rsvp Middag yes` / `no` / `maybe` | `rsvp Dinner yes` / `no` / `maybe` |
| Event details | `event` / `arrangement` | `event Middag` | `event Dinner` |
| Time poll | `foreslå tid` / `propose time` | `foreslå tid for gaming` | `propose time for gaming` |
| Delete | `slett` / `delete` | `slett Middag` | `delete Dinner` |
| Export | `eksport` / `export` | `eksport kalender` | `export calendar` |

### 🖼️ Image Generation

| Trigger | Example |
|---------|---------|
| `lag et bilde av` | `lag et bilde av en katt i hatt` |
| `generate an image of` | `generate an image of a sunset` |

### 💭 Memory

| Action | Trigger | Norwegian Example | English Example |
|--------|---------|-------------------|-----------------|
| Store | `husk at` / `remember that` | `husk at jeg liker pizza` | `remember that I like pizza` |
| Recall | `hva` / `what` | `hva liker jeg?` | `what do I like?` |

### ❓ Help

| Trigger | Example |
|---------|---------|
| `hjelp` / `help` | `hjelp` or `help calendar` |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│            Discord Group DM                  │
│            (ears: listening)                  │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│              Bottus                           │
│  ┌─────────────────────────────────────────┐ │
│  │  NanoBot (brain)                         │ │
│  │  - Skills (capability definitions)       │ │
│  │  - Decisions (what to do)                │ │
│  │  - Personality (SOUL.md)                │ │
│  │  - User context (USER.md)                │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────────────┐   │
│  │  Skills    │  │  Message Handlers   │   │
│  │  Dispatch  │  │  - Extraction       │   │
│  │ (limbs)    │  │  - Confirmation     │   │
│  └─────────────┘  └─────────────────────┘   │
│  (mouth: responding)                          │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌────────┐
│Ollama│ │ComfyUI│ │SQLite  │
│ Brain│ │Images │ │  DB    │
└───────┘ └───────┘ └────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ (TypeScript) |
| Discord | Eris + discord.js-selfbot-v13 |
| LLM | Ollama (local) |
| Image | ComfyUI |
| Database | sql.js (SQLite in-memory) |
| Testing | Vitest |
| Deployment | Docker Compose |

---

## Why Local LLM?

| Feature | Cloud API | Bottus |
|---------|-----------|--------|
| **Cost** | Monthly API bills | One-time GPU cost |
| **Privacy** | Data leaves your machine | Everything stays local |
| **Limits** | Rate limits | Your hardware, your rules |
| **Availability** | Internet required | Works offline (mostly) |

---

## Documentation

### NanoBot Integration
- [NanoBot Integration](docs/nanobot-integration.md) - How Bottus connects to NanoBot (brain) as ears, mouth, and limbs

### Getting Started
- [Environment Variables](docs/env-variables.md) - All configuration options
- [Development Setup](docs/development-setup.md) - Local development guide

### Features
- [Calendar Skill](docs/calendar-skill.md) - Calendar functionality
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

---

## Project Structure

```
src/
├── index.ts           # Main entry (Eris client)
├── relay/            # Discord↔Ollama relay
│   ├── index.ts      # Relay entry point
│   ├── discord.ts    # Discord client
│   ├── ollama.ts     # Ollama client
│   ├── skills/       # Skill system
│   ├── handlers/     # Message handlers
│   └── plan-router.ts
├── services/         # 21 domain services
│   ├── calendar.ts   # Calendar operations
│   ├── comfyui.ts   # Image generation
│   ├── extraction.ts # Date/event extraction
│   └── ...
├── commands/         # Slash commands
├── db/              # Database layer
└── gateway/         # Experimental gateway
```

---

## ⚠️ Known Issues

### Selfbot Risk

The relay uses `discord.js-selfbot-v13` which was **archived in October 2025** and is no longer maintained. Using selfbots violates Discord's Terms of Service and may result in account bans.

**Mitigations:**
- Minimal message history (5 messages)
- Consider migrating to official bot API

See [Relay AGENTS.md](src/relay/AGENTS.md#migration-risk) for migration options.

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing-feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Ollama](https://ollama.ai) - Local LLM runtime
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - Image generation
- [Eris](https://github.com/abalabahaha/eris) - Discord library
