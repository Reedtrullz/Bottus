# Learnings: OpenClaw image and env var modernization
- Task: Update docker-compose OpenClaw service image and env vars to new format.
- Change: image from openclaw/gateway:latest to coollabsio/openclaw:latest.
- Change: CLAW_GATEWAY_AUTH_TOKEN env variable renamed to OPENCLAW_GATEWAY_TOKEN and still sourced from OPENCLAW_TOKEN with the same default.
- Verification: Read docker-compose.yml shows image: coollabsio/openclaw:latest and OPENCLAW_GATEWAY_TOKEN line present.
- Rationale: Align with updated OpenClaw image provider and standardized environment variable naming.

Date: 2026-02-22
