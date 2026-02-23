# Image Generation Skill - Technical Schema

## Overview

The image generation feature allows users to generate images using ComfyUI (Stable Diffusion) via Discord. The system uses an LLM (Ollama) to enhance Norwegian prompts before sending them to the image model.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

  Discord Message
       │
       ▼
┌──────────────────┐
│  extractImage    │  Detects "lag et bilde av", "tegn", etc.
│    Prompt()      │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE IMAGE PIPELINE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

       │
       ▼
┌──────────────────┐
│  enhancePrompt() │  ┌─────────────────────────────────────────────────────┐
│   (NEW)          │──│ 1. Send Norwegian prompt to Ollama                  │
└────────┬─────────┘  │ 2. System prompt: "Convert to English SD prompt..."  │
         │            │ 3. Add quality keywords (detailed, high quality)   │
         │            │ 4. Return enhanced prompt (or original if fails)    │
         ▼            │                                                      │
  "A cute cat in    │  Timeout: 10 seconds                                  │
   sunlight,        │  Fallback: Original prompt if Ollama fails            │
   detailed,        └─────────────────────────────────────────────────────┘
   high quality"    │
         │
         ▼
┌──────────────────┐
│ generateImage()  │  ┌─────────────────────────────────────────────────────┐
│                  │──│ 1. Circuit breaker check                           │
└────────┬─────────┘  │ 2. Health check (/system_stats)                    │
         │            │ 3. Rate limit check (5 images/hour per user)        │
         ▼            │ 4. Build ComfyUI workflow JSON                      │
  ┌─────────────┐    │ 5. POST to /prompt endpoint                        │
  │   ComfyUI   │    │ 6. Poll /history/{prompt_id} for completion        │
  │  (SD 1.5)  │    │ 7. Return image URL                                │
  └──────┬──────┘    │                                                      │
         │            │  Fallback: Try alternate workflow if primary fails   │
         ▼            │  Circuit breaker: Open after 3 consecutive failures │
  Image URL        └─────────────────────────────────────────────────────┘
  (ComfyUI view)
         │
         ▼
┌──────────────────┐
│ Discord Response │  ┌─────────────────────────────────────────────────────┐
│                  │──│ 1. Download image from ComfyUI URL                 │
└──────────────────┘  │ 2. Save to temp file (/tmp)                       │
                      │ 3. Send as Discord attachment                       │
                      │ 4. Delete temp file after sending                   │
                      │                                                      │
                      │  Fallback: Send URL as text if download fails       │
                      └─────────────────────────────────────────────────────┘
```

---

## Components

### 1. Message Detection (`src/relay/utils/detectors.ts`)

```typescript
export function extractImagePrompt(message: string): string | null {
  const patterns = [
    'lag et bilde av',
    'generer et bilde av',
    'tegn',
    'generate image of',
    'lag bilde av',
    'tegn et bilde av'
  ];
  // Returns text after the trigger phrase
}
```

### 2. Prompt Enhancement (`src/services/comfyui.ts`)

```typescript
async enhancePrompt(prompt: string): Promise<string> {
  // Uses Ollama to convert Norwegian → English
  const systemPrompt = `Convert this Norwegian text to a concise 
    English prompt suitable for Stable Diffusion. Add quality keywords 
    like 'detailed, high quality, 4k, beautiful'. 
    Return ONLY the enhanced prompt, nothing else.`;

  // Returns: "A cute cat in sunlight, detailed, high quality, beautiful"
  // Falls back to original if Ollama fails or times out
}
```

### 3. Image Generation (`src/services/comfyui.ts`)

**Features:**
- Circuit breaker (opens after 3 failures)
- Rate limiting (5 images/hour per user)
- Dual workflow support (primary + fallback)
- Result caching (5 min)

**Workflow Structure:**
```typescript
{
  "3": { "class_type": "KSampler", ... },   // Sampling
  "4": { "class_type": "CheckpointLoaderSimple", ... },  // Model
  "5": { "class_type": "CLIPTextEncode", ... },  // Positive prompt
  "6": { "class_type": "CLIPTextEncode", ... },  // Negative prompt
  "7": { "class_type": "EmptyLatentImage", ... }, // Latent space
  "8": { "class_type": "VAEDecode", ... },       // Decode
  "9": { "class_type": "SaveImage", ... }        // Output
}
```

### 4. Discord Response (`src/relay/skills/image-skill.ts`)

```typescript
async handle(message: string, ctx: HandlerContext): Promise<SkillResponse> {
  // 1. Download image from ComfyUI URL
  const tempFilePath = await downloadToTempFile(imageUrl);

  // 2. Send as Discord attachment
  await discord.sendMessage(channelId, '🎨 Bildet ditt:', { file: tempFilePath });

  // 3. Cleanup temp file
  fs.unlinkSync(tempFilePath);
}
```

---

## Entry Points

There are **two** image handling paths in the codebase:

### Path 1: Direct Handler (Primary - Used)
- Location: `src/relay/index.ts:561-578`
- Triggered before skill registry
- Uses `enhancePrompt()` (new)
- Has early returns to prevent duplicates

### Path 2: Skill Registry (Backup)
- Location: `src/relay/index.ts:616-622` → `src/relay/skills/image-skill.ts`
- Not currently used due to early return in Path 1
- Does NOT use prompt enhancement (legacy)

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COMFYUI_URL` | ComfyUI API endpoint | http://localhost:8188 |
| `COMFYUI_MODEL` | Primary SD model | v1-5-pruned-emaonly.safetensors |
| `COMFYUI_FALLBACK_MODEL` | Fallback SD model | sd15_default.yaml |
| `OLLAMA_URL` | Ollama API endpoint | http://localhost:11434 |
| `OLLAMA_MODEL` | Model for prompt enhancement | llama3.2 |

---

## Error Handling

| Error | Handling |
|-------|----------|
| Ollama timeout (10s) | Use original prompt |
| Ollama error | Use original prompt |
| ComfyUI unavailable | Circuit breaker opens |
| Rate limit exceeded | Return error, suggest wait |
| Image download fails | Send URL as text |
| Workflow fails (400) | Try fallback workflow |

---

## Data Flow Example

```
User: "@inebotten lag et bilde av en koselig katt"

1. extractImagePrompt()
   → "en koselig katt"

2. enhancePrompt()
   → System: "Convert to English SD prompt..."
   → Input: "en koselig katt"
   → Output: "A cozy cat, detailed, high quality, beautiful, cute"

3. generateImage()
   → Build workflow with enhanced prompt
   → POST to ComfyUI /prompt
   → Poll /history for completion
   → Return: "http://localhost:8188/view?filename=..."

4. Discord response
   → Download image to /tmp/inebot_image_123456.png
   → Send as Discord file attachment
   → Delete temp file
   → User sees: 🎨 Bildet ditt: [image]
```

---

## Files

| File | Purpose |
|------|---------|
| `src/services/comfyui.ts` | ComfyUIClient with generateImage(), enhancePrompt() |
| `src/relay/index.ts` | Entry point, calls enhancePrompt before generateImage |
| `src/relay/skills/image-skill.ts` | Skill-based handler (legacy, not used) |
| `src/relay/utils/detectors.ts` | extractImagePrompt() function |
| `src/relay/ollama.ts` | OllamaClient used by enhancePrompt() |
