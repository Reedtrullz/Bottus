# Bottus Skills Documentation

This document describes each skill in the Bottus Discord bot, including how they work, how users interact with them, and future expansion possibilities.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Skill System](#skill-system)
3. [Image Skill](#image-skill)
4. [Calendar Skill (v1)](#calendar-skill-v1)
5. [Calendar Skill V2](#calendar-skill-v2)
6. [Memory Skill](#memory-skill)
7. [Extraction Skill](#extraction-skill)
8. [Message Flow Diagrams](#message-flow-diagrams)
9. [Future Expansions](#future-expansions)

---

## Architecture Overview

### How Messages Flow Through Bottus

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────────┐
     │  Discord │      │   Relay  │      │  Skills  │      │   Ollama/    │
     │  User   │─────▶│  (index) │─────▶│ Registry │─────▶│   ComfyUI    │
     └──────────┘      └──────────┘      └──────────┘      └──────────────┘
                            │                                        │
                            │                                        │
                            ▼                                        ▼
                     ┌──────────┐                              ┌──────────┐
                     │ Message  │                              │  Output  │
                     │ Handler  │                              │  Response│
                     └──────────┘                              └──────────┘
                            │
                            ▼
                     ┌──────────────────────────────────────────────┐
                     │           SKILL DISPATCH FLOW                │
                     │  1. User sends message to channel             │
                     │  2. Relay receives via onMention handler      │
                     │  3. Each skill's canHandle() is checked      │
                     │  4. First matching skill handle() is called  │
                     │  5. Skill returns response                  │
                     │  6. Relay sends response back to Discord      │
                     └──────────────────────────────────────────────┘
```

### Skill Interface

All skills implement the `Skill` interface:

```typescript
interface Skill {
  readonly name: string;           // Unique identifier
  readonly description: string;    // Human-readable description
  
  // Check if this skill should handle the message
  canHandle(message: string, ctx: HandlerContext): boolean;
  
  // Process the message and return a response
  handle(message: string, ctx: HandlerContext): Promise<SkillResponse>;
  
  // Optional: Persistence methods
  getMemory?(channelId: string): any;
  setMemory?(channelId: string, memory: any): void;
}

interface SkillResponse {
  handled: boolean;           // Did this skill handle the message?
  response?: string;          // The response to send to user
  shouldContinue?: boolean;   // Should other skills also try to handle?
}

interface HandlerContext {
  userId: string;              // Discord user ID
  channelId: string;           // Channel/DM ID
  message: string;             // The raw message
  discord: any;                // Discord client instance
  ollama?: any;                // Ollama API client
  extraction?: any;            // Date/event extraction service
  memory?: any;                // Memory service
}
```

---

## Skill System

### Registry Pattern

Bottus uses a `SkillRegistry` to manage all skills:

```typescript
class InMemorySkillRegistry implements SkillRegistry {
  register(skill: Skill): void;      // Add a skill
  unregister(name: string): boolean; // Remove a skill
  getSkill(name: string): Skill;      // Get by name
  getAllSkills(): Skill[];            // List all
  findHandler(message: string, ctx: HandlerContext): Skill;  // Find first match
}
```

**Current Skills:**
| Skill | File | Status |
|-------|------|--------|
| ImageSkill | `image-skill.ts` | Active |
| CalendarSkill | `calendar-skill.ts` | Legacy (redirects to v2) |
| CalendarSkillV2 | `calendar-skill-v2.ts` | Active |
| MemorySkill | `memory-skill.ts` | Active |
| ExtractionSkill | `extraction-skill.ts` | Active |

---

## Image Skill

### Overview

The **Image Skill** generates images using ComfyUI based on natural language prompts. It is one of the most visual and interactive skills in Bottus.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMAGE GENERATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  User: "lag et bilde av en katt i romdrakt"

  ┌─────────────┐
  │ ImageSkill  │
  │canHandle()  │  ✓ Pattern matched: "lag et bilde av"
  └──────┬──────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────┐
  │ 1. Extract prompt: "en katt i romdrakt"            │
  │ 2. Send "🎨 Genererer bilde..." to Discord          │
  │ 3. Call ComfyUIClient.generateImage(prompt, userId) │
  └──────────────────────┬──────────────────────────────┘
                         │
                         ▼
              ┌────────────────────────┐
              │    ComfyUI Service     │
              ├────────────────────────┤
              │ 1. Health check        │
              │ 2. Rate limit check     │
              │ 3. Build workflow       │
              │ 4. POST to /prompt      │
              │ 5. Wait for completion │
              │ 6. Get image URL        │
              └───────────┬────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
   ┌─────────────┐                 ┌─────────────┐
   │   Success  │                 │    Error    │
   │  imageUrl  │                 │  error msg  │
   └──────┬──────┘                 └──────┬──────┘
          │                                │
          ▼                                ▼
   ┌─────────────────────────────────────────────┐
   │ Relay sends: "🎨 Bildet ditt: {imageUrl}"  │
   │ Or: "Bildegenerering feilet: {error}"       │
   └─────────────────────────────────────────────┘
```

### User Commands

The Image Skill triggers on these Norwegian/English patterns:

| Pattern | Example |
|---------|---------|
| `lag et bilde av` | "lag et bilde av en hund" |
| `generer et bilde av` | "generer et bilde av solnedgang" |
| `lag bilde av` | "lag bilde av landskap" |
| `tegn` | "tegn en katt" |
| `tegn et bilde av` | "tegn et bilde av en drage" |
| `generate image of` | "generate image of a robot" |

### Current Capabilities

- ✅ Natural language prompt parsing
- ✅ ComfyUI workflow execution
- ✅ Primary + fallback workflow support
- ✅ Rate limiting (5 images/hour per user)
- ✅ Health check before generation
- ✅ Error handling with user-friendly messages
- ✅ Norwegian language support

### Code Reference

**File:** `src/relay/skills/image-skill.ts`

```typescript
const IMAGE_PATTERNS = [
  'lag et bilde av',
  'generer et bilde av',
  'tegn',
  'generate image of',
  'lag bilde av',
  'tegn et bilde av'
];

class ImageSkill implements Skill {
  readonly name = 'image';
  readonly description = 'Generate images using ComfyUI';
  
  canHandle(message: string, ctx: HandlerContext): boolean {
    return IMAGE_PATTERNS.some(p => message.toLowerCase().includes(p));
  }
  
  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    // Extract prompt after pattern
    // Generate image via ComfyUI
    // Return response with image URL or error
  }
}
```

### Future Expansions

| Feature | Description | Complexity |
|---------|-------------|------------|
| Image variations | Generate multiple versions of same prompt | Medium |
| Style presets | Apply artistic styles (anime, realistic, abstract) | Low |
| Inpainting | Edit existing images | High |
| Image-to-image | Transform uploaded images | Medium |
| Negative prompts | Exclude elements from generation | Low |
| Aspect ratios | Support portrait, landscape, square | Low |
| Upscaling | Increase resolution after generation | Medium |
| Prompt history | Remember and reuse past prompts | Low |

---

## Calendar Skill V1

### Overview

The **Calendar Skill (v1)** is a legacy skill that redirects to the V2 calendar. It provides basic calendar functionality and acts as a transitional layer.

### User Commands

| Pattern | Example | Response |
|---------|---------|----------|
| `hva skjer i dag` | "hva skjer i dag" | "Kalenderfunksjoner er under utvikling" |
| `kalender` | "vis kalender" | "Kalender visning er tilgjengelig via /kalender" |
| `når er` | "når er møtet" | "Du kan spørre om spesifikke hendelser" |

### Status

⚠️ **Deprecated** - Use Calendar Skill V2 instead.

---

## Calendar Skill V2

### Overview

The **Calendar Skill V2** is a fully-featured local calendar system that handles event creation, listing, and ICS export. It uses `chrono-node` for natural language date parsing and stores events in SQLite.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CALENDAR OPERATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  User: "lag en avtale på mandag kl 10"

  ┌─────────────────┐
  │ CalendarSkillV2 │
  │  canHandle()    │  ✓ Pattern matched: "avtale", "mandag", "kl"
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────────────────────────────────┐
  │ 1. Parse natural language (chrono-node)              │
  │    → { start: Date(2024-01-15T10:00), recurrence } │
  │ 2. Extract title from message                        │
  │    → "lag en avtale på mandag kl 10" → "Untitled"  │
  │ 3. Call calendar.createEvent(title, start, options) │
  └──────────────────────┬──────────────────────────────┘
                         │
                         ▼
              ┌────────────────────────┐
              │ CalendarServiceV2      │
              ├────────────────────────┤
              │ 1. Initialize DB        │
              │ 2. Generate UUID        │
              │ 3. INSERT event         │
              │ 4. Schedule reminders  │
              └───────────┬────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   SQLite    │
                   │  (sql.js)   │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────────────────────────┐
                   │ Response: "📅 Created event:    │
                   │   Untitled Event                │
                   │   Monday Jan 15 at 10:00"       │
                   └─────────────────────────────────┘
```

### User Commands

| Action | Patterns | Example |
|--------|----------|---------|
| **Create Event** | `lag en avtale`, `planlegg`, `remind me to` | "lag en avtale på mandag kl 10" |
| **List Events** | `hva skjer`, `what's coming`, `list` | "hva skjer i dag?" |
| **Today** | `today`, `idag` | "vis kalender for today" |
| **Export** | `export`, `ics`, `eksport` | "export kalender til ics" |
| **Delete** | `delete`, `slett`, `remove` | "slett event mandag" |

### Natural Language Parsing

The calendar uses **chrono-node** to understand Norwegian and English dates:

| Input | Parsed Output |
|-------|---------------|
| "mandag kl 10" | Next Monday at 10:00 |
| "15. januar" | January 15th |
| "om 2 uker" | 2 weeks from now |
| "hver fredag" | Recurring Friday (FREQ=WEEKLY) |
| "kl 14:30" | Today at 14:30 |

### Recurring Events

Supported recurrence patterns (via RFC 5545 RRule):

| Pattern | RRule Output |
|---------|--------------|
| "hver dag" | FREQ=DAILY |
| "hver uke" | FREQ=WEEKLY |
| "hver mandag" | FREQ=WEEKLY;BYDAY=MO |
| "månedlig" | FREQ=MONTHLY |

### Reminders

When an event is created, reminders are automatically scheduled:

| Default Reminders | Timing |
|-------------------|--------|
| 15 min | 15 minutes before event |
| 60 min | 1 hour before event |
| 1440 min | 1 day before event |

### ICS Export

Events can be exported to iCalendar format for import into other calendar apps:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Bottus//Calendar//EN
BEGIN:VEVENT
UID:abc123@bottus
DTSTART:20240115T100000
SUMMARY:Team Meeting
END:VEVENT
END:VCALENDAR
```

### Code Reference

**File:** `src/relay/skills/calendar-skill-v2.ts`

```typescript
class CalendarSkillV2 implements Skill {
  readonly name = 'calendar-v2';
  readonly description = 'Local calendar with recurring events, reminders, and ICS export';
  
  canHandle(message: string, ctx: HandlerContext): boolean {
    // Matches: calendar, event, remind, schedule, planlegg, møte, avtale, kalender
    // OR chrono-node can parse a date from message
  }
  
  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    // Route to: createEvent, listEvents, exportCalendar, deleteEvent
  }
}
```

### Future Expansions

| Feature | Description | Complexity |
|---------|-------------|------------|
| RSVP tracking | Let users respond yes/no/maybe | Medium |
| Location field | Store event location | Low |
| Event description | Rich text descriptions | Low |
| Recurrence end | Set end date for recurring events | Medium |
| Custom reminders | User-configurable reminder times | Medium |
| Calendar views | Month view, agenda view | High |
| Sharing | Share events to other channels | Medium |
| Integration | Sync with Google/Apple Calendar | High |

---

## Memory Skill

### Overview

The **Memory Skill** stores and retrieves persistent user memories. It provides a simple key-value store for facts about users.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MEMORY FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  SCENARIO 1: Storing a Memory
  
  User: "husk at jeg er allergisk mot nøtter"
  
  ┌──────────────┐
  │ MemorySkill  │
  │ canHandle()  │  ✓ Pattern matched: "husk"
  └──────┬───────┘
         │
         ▼
  ┌─────────────────────────────────┐
  │ Extract: "jeg er allergisk     │
  │          mot nøtter"            │
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │ memories.set(userId, [          │
  │   { text: "...", timestamp }    │
  │ ])                              │
  └──────────────┬──────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ In-Memory Map │
         └───────┬───────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │ Response: "Lagret minne:        │
  │   jeg er allergisk mot nøtter"  │
  └─────────────────────────────────┘

  ─────────────────────────────────────────────────

  SCENARIO 2: Retrieving Memories
  
  User: "husker du?"
  
  ┌──────────────┐
  │ MemorySkill  │
  │ canHandle()  │  ✓ Pattern matched: "husker du"
  └──────┬───────┘
         │
         ▼
  ┌─────────────────────────────────┐
  │ memories.get(userId)            │
  └──────────────┬──────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
   ┌──────────┐    ┌──────────┐
   │ Has data │    │ No data  │
   └──────┬───┘    └──────┬───┘
          │               │
          ▼               ▼
   ┌──────────────┐ ┌──────────────────┐
   │ "Husker jeg: │ │ "Ingen minner    │
   │ 1. ..."      │ │ funnet."         │
   └──────────────┘ └──────────────────┘
```

### User Commands

| Action | Patterns | Example |
|--------|----------|---------|
| **Store** | `husk`, `husk at`, `husk jeg er` | "husk at jeg liker katt" |
| **Query** | `husker du`, `hva husker du` | "hva husker du om meg?" |

### Storage

Currently uses in-memory `Map` storage:
- Data is lost on bot restart
- Per-user, per-channel storage

### Code Reference

**File:** `src/relay/skills/memory-skill.ts`

```typescript
const MEMORY_STORE_PATTERNS = [/\b(husk|husk at|husk jeg er)\b/i];
const MEMORY_QUERY_PATTERNS = [/\b(hva husker du|husker du)\b/i];

class MemorySkill implements Skill {
  private memories: Map<string, any[]> = new Map();
  
  canHandle(message: string, ctx: HandlerContext): boolean {
    return MEMORY_STORE_PATTERNS.some(p => p.test(message)) ||
           MEMORY_QUERY_PATTERNS.some(p => p.test(message));
  }
  
  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    // Store or retrieve memories
  }
}
```

### Future Expansions

| Feature | Description | Complexity |
|---------|-------------|------------|
| Persistent storage | Save to SQLite/file | Low |
| Search | Find memories containing keyword | Low |
| Categories | Organize memories by type | Medium |
| Expiration | Auto-delete old memories | Medium |
| Context awareness | Use memories in Ollama prompts | Medium |

---

## Extraction Skill

### Overview

The **Extraction Skill** uses natural language processing to identify dates, events, and tasks within messages. It works as a preprocessing layer that can trigger calendar prompts.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTRACTION FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  User: "Vi burde møtes på mandag for å diskutere prosjektet"

  ┌──────────────────┐
  │ ExtractionSkill  │
  │ canHandle()      │  ✓ Date pattern detected: "mandag"
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────────────────────────────────────────┐
  │ ctx.extraction.extract(message)                     │
  │                                                     │
  │ Input: "Vi burde møtes på mandag..."              │
  │                                                     │
  │ Output: [                                          │
  │   {                                                │
  │     type: "DATE",                                  │
  │     title: "mandag",                               │
  │     confidence: 0.85                               │
  │   },                                               │
  │   {                                                │
  │     type: "TASK",                                  │
  │     title: "diskutere prosjektet",                 │
  │     confidence: 0.72                               │
  │   }                                                │
  │ ]                                                  │
  └──────────────────────┬──────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────────┐
  │ Response: "Extracted: DATE: mandag (85%),          │
  │                 TASK: diskutere prosjektet (72%)"  │
  │ shouldContinue: true  ← Other skills can still run │
  └─────────────────────────────────────────────────────┘
```

### Detection Patterns

The skill triggers on these date/time patterns:

| Language | Patterns |
|----------|----------|
| Norwegian | `mandag`, `tirsdag`, `onsdag`, `torsdag`, `fredag`, `lørdag`, `søndag` |
| Norwegian | `januar`, `februar`, `mars`, `april`, `mai`, `juni`, `juli`, `august`, `september`, `oktober`, `november`, `desember` |
| Numeric | `dd.mm.yyyy`, `dd/mm/yyyy`, `dd-mm-yyyy` |
| Time | `kl 10`, `kl 10:30`, `kl. 14` |

### Current Capabilities

- ✅ Date extraction (weekdays, months)
- ✅ Task extraction
- ✅ Confidence scoring (0-100%)
- ✅ Norwegian language support
- ✅ Continues to other skills (non-blocking)

### Code Reference

**File:** `src/relay/skills/extraction-skill.ts`

```typescript
const datePatterns = /\d{1,2}[\/.\-]\d{1,2}|\d{4}|januar|februar|mars|...|kl\s*\d/i;

class ExtractionSkill implements Skill {
  canHandle(message: string, ctx: HandlerContext): boolean {
    return ctx.extraction?.extract && datePatterns.test(message);
  }
  
  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    const result = ctx.extraction.extract(message);
    return { handled: true, response: "...", shouldContinue: true };
  }
}
```

### Future Expansions

| Feature | Description | Complexity |
|---------|-------------|------------|
| Auto-calendar | Prompt to create event when date found | Medium |
| Location extraction | Extract venues/addresses | Medium |
| People extraction | Extract mentioned users | Low |
| Reminder extraction | Extract "påminnelse om" tasks | Medium |
| Confidence threshold | Only extract above X% confidence | Low |

---

## Message Flow Diagrams

### Complete Example: Image Generation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE MESSAGE FLOW: IMAGE GENERATION                   │
└─────────────────────────────────────────────────────────────────────────────┘

 1. USER WRITES MESSAGE
    ┌────────────────────────────────────────┐
    │ Channel: #general                      │
    │ User: "lag et bilde av en katt i Dress │
    │        som spiller guitar"              │
    └────────────────────────────────────────┘
                              │
                              ▼
 2. DISCORD RELAY RECEIVES MESSAGE
    ┌────────────────────────────────────────┐
    │ discord.on('messageCreate')            │
    │ - Extract userId, channelId, content   │
    │ - Check if bot was mentioned           │
    └────────────────────────────────────────┘
                              │
                              ▼
 3. SKILL DISPATCH
    ┌────────────────────────────────────────┐
    │ for skill in skills:                   │
    │   if skill.canHandle(message):         │
    │     return skill.handle(message)       │
    └────────────────────────────────────────┘
                              │
                              ▼
 4. IMAGE SKILL HANDLES
    ┌────────────────────────────────────────┐
    │ ImageSkill.handle():                   │
    │ - Pattern: "lag et bilde av" ✓         │
    │ - Prompt: "en katt i Dress            │
    │           som spiller guitar"          │
    └────────────────────────────────────────┘
                              │
                              ▼
 5. SEND "GENERATING" MESSAGE
    ┌────────────────────────────────────────┐
    │ discord.sendMessage(channelId,         │
    │   "🎨 Genererer bilde...")             │
    └────────────────────────────────────────┘
                              │
                              ▼
 6. COMFYUI PROCESSING
    ┌────────────────────────────────────────┐
    │ ComfyUIClient.generateImage():          │
    │ a. Health check: GET /system_stats      │
    │ b. Rate limit: 5 req/hour              │
    │ c. Build workflow JSON                  │
    │ d. POST /prompt { prompt: {...} }       │
    │ e. Poll /history for completion        │
    │ f. Extract output image path           │
    │ g. Return { success, imageUrl, error } │
    └────────────────────────────────────────┘
                              │
          ┌──────────────────┴──────────────────┐
          │                                     │
          ▼                                     ▼
    ┌─────────────┐                     ┌─────────────┐
    │   SUCCESS   │                     │    ERROR    │
    │ imageUrl:   │                     │ error:      │
    │ /view/xyz   │                     │ "ComfyUI    │
    └──────┬──────┘                     │  not ready" │
           │                             └──────┬──────┘
           │                                    │
           ▼                                    ▼
 7. SEND RESPONSE TO USER
    ┌────────────────────────────────────────┐
    │ discord.sendMessage(channelId,         │
    │   "🎨 Bildet ditt: {imageUrl}")        │
    │                                          │
    │ OR                                      │
    │                                          │
    │ "Bildegenerering feilet: {error}"      │
    └────────────────────────────────────────┘
                              │
                              ▼
 8. USER SEES RESPONSE
    ┌────────────────────────────────────────┐
    │ Channel: #general                      │
    │ Bot: "🎨 Bildet ditt:                  │
    │      https://comfyui.internal/         │
    │      view/abc123.png"                  │
    └────────────────────────────────────────┘
```

### Complete Example: Calendar Event Creation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 COMPLETE MESSAGE FLOW: CALENDAR EVENT                       │
└─────────────────────────────────────────────────────────────────────────────┘

 1. USER WRITES MESSAGE
    ┌────────────────────────────────────────┐
    │ Channel: #general                      │
    │ User: "husk at vi har møte på mandag  │
    │        kl 14:00"                       │
    └────────────────────────────────────────┘
                              │
                              ▼
 2. EXTRACTION SKILL (First)
    ┌────────────────────────────────────────┐
    │ ExtractionSkill.canHandle(): ✓         │
    │ - Detects: "mandag kl 14:00"           │
    │ - Extracts: DATE, TASK                 │
    │ - Returns: "Extracted: DATE: mandag..."│
    │ - shouldContinue: TRUE                  │
    └────────────────────────────────────────┘
                              │
                              ▼
 3. MEMORY SKILL (Second)
    ┌────────────────────────────────────────┐
    │ MemorySkill.canHandle(): ✓             │
    │ - Pattern: "husk at"                   │
    │ - Stores: "vi har møte på mandag      │
    │           kl 14:00"                     │
    │ - Returns: "Lagret minne: ..."         │
    │ - shouldContinue: FALSE                │
    └────────────────────────────────────────┘
                              │
                              ▼
 4. (If user explicitly creates event)
    User: "lag en avtale på tirsdag kl 10"
    
    ┌────────────────────────────────────────┐
    │ CalendarSkillV2.handle():              │
    │ - Parse: chrono.parse("tirsdag kl 10") │
    │   → { start: Date, recurrence: null }  │
    │ - Title: "Untitled Event"              │
    │ - Create event in SQLite               │
    │ - Schedule reminders                   │
    │ - Return: "📅 Created: Tirsdag 10:00"  │
    └────────────────────────────────────────┘
                              │
                              ▼
 5. CALENDAR SERVICE
    ┌────────────────────────────────────────┐
    │ CalendarServiceV2.createEvent():       │
    │ 1. Initialize DB (if needed)           │
    │ 2. Generate UUID                        │
    │ 3. INSERT INTO calendar_events          │
    │ 4. Parse reminders → schedule jobs     │
    │ 5. Return CalendarEvent object         │
    └────────────────────────────────────────┘
                              │
                              ▼
 6. RESPONSE
    ┌────────────────────────────────────────┐
    │ discord.sendMessage(channelId,        │
    │   "📅 Created event: Untitled Event   │
    │    Tuesday Feb 20 at 10:00")           │
    └────────────────────────────────────────┘
```

---

## Future Expansions

### Skill System Enhancements

| Feature | Description |
|---------|-------------|
| **Skill chaining** | Multiple skills process same message |
| **Skill priority** | Order skills by priority |
| **Hot-reloading** | Add skills without restart |
| **Skill config** | Per-channel skill enable/disable |

### New Skill Ideas

| Skill | Description |
|-------|-------------|
| **WeatherSkill** | Local weather via wttr.in |
| **URLSkill** | Link preview and summarization |
| **TranslateSkill** | Translate messages |
| **PollSkill** | Create Discord polls |
| **ReminderSkill** | Set one-time reminders |
| **CodeSkill** | Execute and explain code snippets |
| **SearchSkill** | Local SearXNG integration |

### Ollama Integration

The skills can leverage Ollama for more intelligent responses:

- **Smart extraction**: Ask Ollama to extract dates/events
- **Response generation**: Use Ollama for natural responses
- **Memory synthesis**: Ollama summarizes user preferences

---

## Troubleshooting

### Image Generation Fails

| Error | Cause | Solution |
|-------|-------|----------|
| "ComfyUI is not available" | ComfyUI not running | Start ComfyUI Docker |
| "Rate limit exceeded" | >5 images/hour | Wait 1 hour |
| "400 Bad Request" | Invalid workflow | Check ComfyUI nodes |

### Calendar Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Date not parsed | Unrecognized format | Use "mandag", "kl 10", "15. januar" |
| No events shown | Wrong channel | Calendar is per-channel |

### Memory Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Memories lost | Bot restarted | Memories are in-memory only |
| Not triggering | Wrong pattern | Use "husk at" or "husker du" |

---

## Adding New Skills

To add a new skill:

1. Create `src/relay/skills/my-skill.ts`
2. Implement the `Skill` interface
3. Register in `src/relay/index.ts`:

```typescript
import { MySkill } from './skills/my-skill.js';

const mySkill = new MySkill();
skillRegistry.register(mySkill);
```

### Skill Template

```typescript
import { Skill, HandlerContext, SkillResponse } from './interfaces.js';

const TRIGGER_PATTERNS = ['pattern1', 'pattern2'];

export class MySkill implements Skill {
  readonly name = 'my-skill';
  readonly description = 'What this skill does';
  
  private memories: Map<string, any> = new Map();
  
  canHandle(message: string, _ctx: HandlerContext): boolean {
    const lower = message.toLowerCase();
    return TRIGGER_PATTERNS.some(p => lower.includes(p));
  }
  
  async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
    // Your skill logic here
    return {
      handled: true,
      response: 'Your response',
      shouldContinue: false  // true if other skills should also run
    };
  }
  
  getMemory(channelId: string): any {
    return this.memories.get(channelId);
  }
  
  setMemory(channelId: string, memory: any): void {
    this.memories.set(channelId, memory);
  }
}
```

---

*Last updated: 2026-02-23*
*Part of Bottus v2 Documentation*
