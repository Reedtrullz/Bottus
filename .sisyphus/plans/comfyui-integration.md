# ComfyUI Image Generation Integration

## TL;DR

> **Quick Summary**: Wire ComfyUI into the relay bot for local AI image generation. Users can trigger image generation with Norwegian phrases like "lag et bilde av..." or "tegn...".
> 
> **Deliverables**:
> - ComfyUI Docker container running
> - Image generation wired into relay (detection + handler)
> - Discord readiness message when bot restarts with ComfyUI enabled
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential (depends on Docker start)
> **Critical Path**: Start ComfyUI → Build → Restart relay → Test

---

## Context

### Original Request
Enhance Inebotten Discord bot with image generation using ComfyUI (local/free only). Also fix the self-improvement system that was previously built but not wired into the relay.

### User Requirements
- Use local Ollama for AI (skip OpenClaw complexity)
- Image generation must be LOCAL/FREE only (no paid APIs)
- **IMPORTANT**: Send a Discord message when the bot is ready to generate images
- Never auto-apply code improvements without human approval
- All features must work locally without external dependencies

### Research Findings
- **Existing ComfyUI service**: `src/services/comfyui.ts` - has rate limiting (5/hour), workflow builder, polling for completion
- **docker-compose.yml**: Has ComfyUI service defined (lines 59-70) using `zhangp365/comfyui:latest`
- **Relay entry**: `src/relay/index.ts` - where detection and handler need to be added

---

## Work Objectives

### Core Objective
Add local image generation capability to the relay bot using ComfyUI, with Norwegian trigger phrases.

### Concrete Deliverables
1. ComfyUI Docker container running and healthy
2. `ComfyUIClient` imported in relay/index.ts
3. `extractImagePrompt()` detection function added
4. Image generation handler in message flow (before Ollama)
5. Readiness message sent to Discord on startup

### Definition of Done
- [ ] ComfyUI container running: `docker compose ps` shows "Up"
- [ ] Build passes: `npm run build` succeeds
- [ ] Relay starts without errors
- [ ] Readiness message appears in Discord after startup
- [ ] Test phrase generates an image

### Must Have
- ComfyUI integration works locally (no external APIs)
- Norwegian trigger phrases work ("lag et bilde av", "tegn")
- Readiness message on startup

### Must NOT Have
- No paid APIs (OpenAI DALL-E, etc.)
- No auto-code improvements without approval

---

## Verification Strategy

> **Agent-Executed QA** - All verification is agent-executed. No human intervention.

### Test Decision
- **Infrastructure exists**: YES (vitest in project)
- **Automated tests**: None needed for this integration
- **Agent-Executed QA**: Manual verification via Discord

### QA Policy
Every task includes agent-executed QA scenarios. For this integration:
- **Discord**: Use the relay bot directly - send test messages
- **Docker**: Verify containers are running
- **Build**: Verify TypeScript compiles

---

## Execution Strategy

### Sequential Tasks (not parallelizable)

```
Wave 1 (Start ComfyUI container):
├── Task 1: Start ComfyUI Docker container
├── Task 2: Wait for ComfyUI to be healthy
├── Task 3: Build the project
└── Task 4: Add ComfyUI import to relay/index.ts

Wave 2 (Add detection + handler):
├── Task 5: Add extractImagePrompt() detection function
├── Task 6: Add image generation handler in message flow
└── Task 7: Add readiness message on startup

Wave 3 (Restart + verify):
├── Task 8: Restart relay bot
├── Task 9: Verify readiness message received
└── Task 10: Test image generation phrase
```

---

## TODOs

- [ ] 1. Start ComfyUI Docker container

  **What to do**:
  - Run `docker compose up -d comfyui` to start the ComfyUI service
  - Wait for container to download and start (zhangp365/comfyui is ~3GB)
  - Verify with `docker compose ps` - should show status "Up"

  **Must NOT do**:
  - Don't modify any code yet

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple Docker command execution
  > **Skills**: []
  > **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - docker-compose.yml lines 59-70 - ComfyUI service definition

  **Acceptance Criteria**:
  - [ ] `docker compose ps` shows ComfyUI container "Up"
  - [ ] `curl http://localhost:8188/system_stats` returns healthy response

  **QA Scenarios**:

  ```
  Scenario: ComfyUI container is running
    Tool: Bash
    Preconditions: Docker daemon running
    Steps:
      1. docker compose ps
      2. curl -s http://localhost:8188/system_stats
    Expected Result: Container "Up", curl returns JSON with status
    Evidence: .sisyphus/evidence/task-1-comfyui-running.{ext}
  ```

  **Commit**: NO

  ---

- [ ] 2. Wait for ComfyUI to be healthy

  **What to do**:
  - Poll ComfyUI health endpoint until ready
  - May take 30-60 seconds on first start (model loading)
  - Check with: `curl http://localhost:8188/system_stats`

  **Must NOT do**:
  - Don't proceed until healthy

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple health check polling

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - ComfyUI API: `/system_stats` endpoint

  **Acceptance Criteria**:
  - [ ] `curl http://localhost:8188/system_stats` returns 200 OK

  **QA Scenarios**:

  ```
  Scenario: ComfyUI API is responding
    Tool: Bash
    Preconditions: Container running
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:8188/system_stats
    Expected Result: HTTP 200
    Evidence: .sisyphus/evidence/task-2-comfyui-healthy.{ext}
  ```

  **Commit**: NO

  ---

- [ ] 3. Build the project

  **What to do**:
  - Run `npm run build` to compile TypeScript
  - Verify build passes without errors

  **Must NOT do**:
  - Don't deploy yet

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Standard build command

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:
  - package.json scripts - build command

  **Acceptance Criteria**:
  - [ ] `npm run build` exits with code 0
  - [ ] dist/relay/index.js exists

  **QA Scenarios**:

  ```
  Scenario: TypeScript builds successfully
    Tool: Bash
    Preconditions: None
    Steps:
      1. npm run build
    Expected Result: Exit code 0, no errors
    Evidence: .sisyphus/evidence/task-3-build-pass.{ext}
  ```

  **Commit**: NO

  ---

- [ ] 4. Add ComfyUI import to relay/index.ts

  **What to do**:
  - Add import at top of `src/relay/index.ts`:
    ```typescript
    import { ComfyUIClient } from '../services/comfyui.js';
    ```
  - Initialize client after Ollama client:
    ```typescript
    const comfyui = new ComfyUIClient();
    ```
  - Add COMFYUI_URL env var support

  **Must NOT do**:
  - Don't add detection/handler yet (separate tasks)

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple import addition

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **References**:
  - src/services/comfyui.ts - ComfyUIClient class
  - src/relay/index.ts lines 1-10 - existing imports pattern

  **Acceptance Criteria**:
  - [ ] Import added to src/relay/index.ts
  - [ ] ComfyUIClient initialized
  - [ ] Build still passes

  **QA Scenarios**:

  ```
  Scenario: Import compiles without errors
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. npm run build
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-4-import-added.{ext}
  ```

  **Commit**: NO

  ---

- [ ] 5. Add extractImagePrompt() detection function

  **What to do**:
  - Add detection function in `src/relay/index.ts`:
    ```typescript
    function extractImagePrompt(message: string): string | null {
      if (!message) return null;
      const m = message.toLowerCase();
      const patterns = [
        'lag et bilde av',
        'generer et bilde av',
        'tegn',
        'generate image of',
        'lag bilde av',
        'tegn et bilde av'
      ];
      for (const pattern of patterns) {
        if (m.includes(pattern)) {
          const idx = m.indexOf(pattern);
          const after = message.substring(idx + pattern.length).trim();
          if (after.length > 0) return after;
        }
      }
      return null;
    }
    ```

  **Must NOT do**:
  - Don't wire into message flow yet

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple function addition

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Task 4

  **References**:
  - src/relay/index.ts - existing detection functions (isQueryMessage, isMemoryStore, etc.)

  **Acceptance Criteria**:
  - [ ] Function added to src/relay/index.ts
  - [ ] Build passes
  - [ ] Function correctly extracts prompt from trigger phrases

  **QA Scenarios**:

  ```
  Scenario: Detection function works
    Tool: Bash (node REPL test)
    Preconditions: Function added
    Steps:
      1. node -e "const {extractImagePrompt} = require('./dist/relay/index.js'); console.log(extractImagePrompt('lag et bilde av et ekorn'))"
    Expected Result: Returns "et ekorn"
    Evidence: .sisyphus/evidence/task-5-detection-works.{ext}
  ```

  **Commit**: NO

  ---

- [ ] 6. Add image generation handler in message flow

  **What to do**:
  - In the `discord.onMention` handler (around line 547), add image handling BEFORE the normal Ollama flow
  - Add after the extraction flow check:
    ```typescript
    // Image generation trigger
    const imagePrompt = extractImagePrompt(userMessage);
    if (imagePrompt) {
      await discord.sendMessage(channelId, '🎨 Genererer bilde...');
      const result = await comfyui.generateImage(imagePrompt, userId);
      if (result.success && result.imageUrl) {
        await discord.sendMessage(channelId, `Her er bildet: ${result.imageUrl}`);
      } else {
        await discord.sendMessage(channelId, `Kunne ikke generere bilde: ${result.error}`);
      }
      return;
    }
    ```

  **Must NOT do**:
  - Don't break existing functionality

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Adding handler in existing flow

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Task 5

  **References**:
  - src/relay/index.ts lines 547-866 - onMention handler flow
  - src/services/comfyui.ts - generateImage method

  **Acceptance Criteria**:
  - [ ] Handler added before Ollama flow
  - [ ] Build passes

  **QA Scenarios**:

  ```
  Scenario: Handler code compiles
    Tool: Bash
    Preconditions: Handler code added
    Steps:
      1. npm run build
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-6-handler-compiles.{ext}
  ```

  **Commit**: NO

  ---

- [ ] 7. Add readiness message on startup

  **What to do**:
  - In the `main()` function, after Ollama health check (around line 542), add:
    ```typescript
    // Check ComfyUI and send readiness message
    const comfyuiHealthy = await comfyui.checkHealth();
    if (comfyuiHealthy) {
      console.log('[Relay] ComfyUI is ready for image generation');
      // Send message to a configured channel or log
      // Option: Check for a READY_CHANNEL_ID env var
      const readyChannelId = process.env.READY_CHANNEL_ID;
      if (readyChannelId) {
        await discord.sendMessage(readyChannelId, '🎨 **Bildegenerering er klar!**\n\nJeg kan nå lage bilder for deg. Prøv f.eks:\n• "lag et bilde av et ekorn"\n• "tegn en koselig katt"\n• "generer et bilde av en strand i solnedgang"');
      }
    } else {
      console.warn('[Relay] ComfyUI not available - image generation disabled');
    }
    ```

  **Must NOT do**:
  - Don't require ComfyUI - should work without it

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple message sending

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Task 6

  **References**:
  - src/relay/index.ts lines 536-542 - existing health check pattern

  **Acceptance Criteria**:
  - [ ] Readiness check added
  - [ ] Optional READY_CHANNEL_ID env var
  - [ ] Build passes

  **QA Scenarios**:

  ```
  Scenario: Readiness code compiles
    Tool: Bash
    Preconditions: Code added
    Steps:
      1. npm run build
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-7-readiness-compiles.{ext}
  ```

  **Commit**: NO

  ---

- [ ] 8. Restart relay bot

  **What to do**:
  - Restart the relay container or process to pick up new code
  - If using Docker: `docker compose restart ine-relay`
  - If local: `npm run start:relay`

  **Must NOT do**:
  - Don't break the running bot

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple restart command

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Task 7

  **References**:
  - docker-compose.yml - relay service definition

  **Acceptance Criteria**:
  - [ ] Relay restarts successfully
  - [ ] No errors in logs

  **QA Scenarios**:

  ```
  Scenario: Relay restarts without crash
    Tool: Bash
    Preconditions: Code deployed
    Steps:
      1. docker compose restart ine-relay
      2. sleep 5
      3. docker compose logs ine-relay --tail 20
    Expected Result: No error messages, starts successfully
    Evidence: .sisyphus/evidence/task-8-restart.{ext}
  ```

  **Commit**: NO

  ---

- [ ] 9. Verify readiness message received

  **What to do**:
  - Check Discord channel for the readiness message
  - If READY_CHANNEL_ID was set, verify message appears

  **Must NOT do**:
  - Don't skip this verification

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: Discord message verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10
  - **Blocked By**: Task 8

  **References**:
  - Discord channel configured via READY_CHANNEL_ID

  **Acceptance Criteria**:
  - [ ] Message appears in Discord (if channel configured)

  **QA Scenarios**:

  ```
  Scenario: Readiness message in Discord
    Tool: Manual (Discord)
    Preconditions: Relay running, channel ID set
    Steps:
      1. Check configured Discord channel
      2. Look for message starting with "🎨 Bildegenerering er klar!"
    Expected Result: Message visible
    Evidence: .sisyphus/evidence/task-9-ready-message.{ext}
  ```

  **Commit**: NO

  ---

- [ ] 10. Test image generation phrase

  **What to do**:
  - Send a test message to the bot: "@inebotten lag et bilde av et ekorn"
  - Verify image is generated and returned

  **Must NOT do**:
  - Don't test with offensive prompts

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: End-to-end testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 9

  **References**:
  - Discord - the bot should respond with image URL

  **Acceptance Criteria**:
  - [ ] Bot responds with "🎨 Genererer bilde..."
  - [ ] Bot returns image URL or error message

  **QA Scenarios**:

  ```
  Scenario: Image generation works
    Tool: Manual (Discord)
    Preconditions: Bot running, ComfyUI healthy
    Steps:
      1. Send: "@inebotten lag et bilde av et ekorn"
      2. Wait for response
    Expected Result: Bot returns image URL after ~30-60 seconds
    Evidence: .sisyphus/evidence/task-10-image-test.{ext}
  ```

  **Commit**: NO

  ---

## Final Verification Wave

- [ ] F1. **Integration Complete** — Verify all tasks done
  Check: Docker running, code added, build passes, bot restarted, readiness message sent, test works
  Output: `VERDICT: APPROVE/REJECT`

---

## Commit Strategy

After all tasks complete:
- Commit message: `feat(relay): add ComfyUI image generation`
- Files: `src/relay/index.ts`, `docker-compose.yml` (if changes)

---

## Success Criteria

### Verification Commands
```bash
docker compose ps  # ComfyUI "Up"
npm run build      # Exit 0
docker compose logs ine-relay  # No errors
```

### Final Checklist
- [ ] ComfyUI container running
- [ ] Image generation wired into relay
- [ ] Readiness message sent to Discord
- [ ] Test phrase produces image
