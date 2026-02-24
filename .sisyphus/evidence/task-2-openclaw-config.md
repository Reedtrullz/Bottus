# Evidence: Task 2 - OpenClaw Configuration with Ollama

**Date**: 2026-02-21

## Acceptance Criteria Status

### AC1: OpenClaw can connect to local Ollama instance
- **Status**: ⏳ PENDING (requires running services)
- **Configuration**: Set `OLLAMA_BASE_URL` environment variable

### AC2: HTTP endpoint responds to test requests
- **Status**: ⏳ PENDING (requires running services)
- **Configuration**: Set `OPENCLAW_GATEWAY_HTTP_ENDPOINTS_RESPONSES_ENABLED=true`

### AC3: Authentication token configured and working
- **Status**: ⏳ PENDING (requires running services)
- **Configuration**: Set `OPENCLAW_GATEWAY_AUTH_TOKEN` environment variable

## Configuration Files Created

1. **config/openclaw.json** - OpenClaw agent configuration:
   - Configures Ollama as the model provider
   - Defines available models (llama3.2, qwen2.5)
   - User can modify to select different Ollama models

## Docker Compose Updates

Updated `docker-compose.yml` with:

### Environment Variables for OpenClaw:
```yaml
environment:
  OLLAMA_BASE_URL: "http://host.docker.internal:11434"
  OPENCLAW_GATEWAY_PORT: "18789"
  OPENCLAW_GATEWAY_BIND: "0.0.0.0"
  OPENCLAW_GATEWAY_AUTH_MODE: "token"
  OPENCLAW_GATEWAY_AUTH_TOKEN: "${OPENCLAW_TOKEN:-}"
  OPENCLAW_GATEWAY_HTTP_ENDPOINTS_RESPONSES_ENABLED: "true"
```

### Volume Mounts:
```yaml
volumes:
  - ./config/openclaw.json:/home/node/.openclaw/openclaw.json:ro
```

## Setup Instructions

### First Run (Generate Token)
1. Start OpenClaw without a token to generate one:
   ```bash
   docker compose up -d openclaw-gateway
   ```
2. Check logs for the generated token:
   ```bash
   docker compose logs openclaw-gateway | grep token
   ```
3. Set the token in `.env`:
   ```
   OPENCLAW_TOKEN=generated_token_here
   ```

### Select Ollama Model
Edit `config/openclaw.json` to change the model:
```json
{
  "agents": {
    "defaults": {
      "models": {
        "ollama/YOUR_MODEL_NAME": {
          "alias": "my-model"
        }
      }
    }
  }
}
```

## Verification Commands

```bash
# Start OpenClaw
docker compose up -d openclaw-gateway

# Check logs for token
docker compose logs openclaw-gateway

# Test HTTP endpoint
curl -sS -H "Authorization: Bearer $OPENCLAW_TOKEN" \
  http://localhost:18789/v1/responses \
  -H 'Content-Type: application/json' \
  -d '{"input":"Hello"}'
```

## Notes

- The config file is mounted read-only (`:ro`)
- Token can also be set via `OPENCLAW_TOKEN` env var
- Default model selection can be changed in the config file
- User will need to pull the desired Ollama model before use
