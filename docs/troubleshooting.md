# Troubleshooting Guide

This guide covers common issues and their solutions.

## Connection Issues

### Ollama Connection Failed

**Symptoms:**
- Bot responds with "Could not connect to Ollama"
- Error: `ECONNREFUSED` or `Connection refused`

**Solutions:**
1. Check if Ollama is running:
   ```bash
   docker ps | grep ollama
   ```

2. Verify the API is accessible:
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. Check the URL in your `.env`:
   ```
   OLLAMA_URL=http://localhost:11434
   ```

4. For Docker, ensure network access:
   ```bash
   docker network ls
   ```

### ComfyUI Not Responding

**Symptoms:**
- Image generation fails silently
- Error: ComfyUI timeout

**Solutions:**
1. Check ComfyUI container:
   ```bash
   docker ps | grep comfyui
   ```

2. Test API:
   ```bash
   curl http://localhost:8188/system_stats
   ```

3. Check workflow files exist in ComfyUI

4. For CPU mode, generation takes longer - increase timeout:
   ```
   COMFYUI_TIMEOUT=120000
   ```

## Authentication Issues

### Discord Login Failed

**Symptoms:**
- "Login failed" in console
- 401 Unauthorized errors

**Solutions:**
1. Verify credentials in `.env`:
   ```
   DISCORD_EMAIL=your_email@example.com
   DISCORD_PASSWORD=your_password
   ```

2. Regenerate bot token at https://discord.com/developers/applications

3. Check if account has 2FA enabled - may need app password

4. For selfbot: ensure you're using user credentials, not bot token

### Token Expired

**Symptoms:**
- "Token expired" errors
- Repeated re-authentication attempts

**Solutions:**
1. Regenerate token in Discord Developer Portal
2. Update `.env` with new token
3. Restart the bot

## Database Issues

### Database Locked

**Symptoms:**
- Error: "Database is locked"
- Write operations fail

**Solutions:**
1. Check for multiple bot instances running
2. Kill stale processes:
   ```bash
   pkill -f "tsx src"
   ```
3. Delete lock file if exists:
   ```bash
   rm -f data/*.lock
   ```

### Corrupted Database

**Symptoms:**
- Invalid data errors
- Query failures

**Solutions:**
1. Backup current database:
   ```bash
   cp data/calendar.db data/calendar.db.backup
   ```

2. Delete database to recreate:
   ```bash
   rm data/calendar.db
   ```

3. Restart bot - it will create fresh database

## Performance Issues

### Slow Response Times

**Symptoms:**
- Bot takes >10s to respond
- High CPU usage

**Solutions:**
1. Check Ollama model - larger models are slower
2. Reduce `HISTORY_MAX_MESSAGES` in `.env`
3. Increase `RELAY_TIMEOUT_MS`
4. Check system resources:
   ```bash
   htop
   ```

### Memory Leaks

**Symptoms:**
- Bot crashes after running for hours/days
- Increasing memory usage

**Solutions:**
1. Check for unclosed database connections
2. Review long-running intervals in code
3. Restart bot periodically with a cron job

## Selfbot Detection

### Discord Warning Messages

**Symptoms:**
- "Account flagged" warnings
- Rate limiting kicks in immediately
- Cannot send messages

**Solutions:**
1. **Reduce activity**:
   - Lower message frequency
   - Don't respond to every message

2. **Add rate limiting**:
   ```typescript
   // In src/relay/utils/rate-limit.ts
   const RATE_LIMIT = {
     maxRequests: 10,
     windowMs: 60000 // 1 minute
   };
   ```

3. **Use separate account** - Never use your main Discord account

4. **Consider migrating** to official bot API (see [Relay AGENTS.md](../src/relay/AGENTS.md#migration-risk))

## Extraction Issues

### Dates Not Being Parsed

**Symptoms:**
- Calendar events created with wrong dates
- Extraction returns no results

**Solutions:**
1. Check chrono-node is working:
   ```typescript
   import * as chrono from 'chrono-node';
   const result = chrono.parse('imorgen kl 18');
   console.log(result);
   ```

2. Supported formats:
   - Norwegian: "imorgen", "på fredag", "15. mars kl 18"
   - English: "tomorrow", "next friday", "march 15 at 3pm"

3. Check extraction service logs

### Events Created Without Title

**Symptoms:**
- Events appear as "Arrangement" or "Avtale"

**Solutions:**
1. This is expected for medium-confidence extractions
2. Bot asks for clarification automatically
3. Check Plan Router confidence threshold (default: 0.5)

## Health Monitoring

### Services Showing as Unhealthy

**Check health status:**
```typescript
import { healthMonitor } from './services/health-monitor.js';

const report = await healthMonitor.getOverallHealth(true);
console.log(report);
```

**Status types:**
- `healthy`: Service responding normally
- `degraded`: Service responding but slow
- `unhealthy`: Service not responding
- `unknown`: Not yet checked

## Getting Help

1. Check logs in `logs/` directory
2. Review [Hotspot Onboarding](hotspot-onboarding.md) for known issues
3. Check source code in `src/services/`
4. Review Docker logs:
   ```bash
   docker logs ine-ollama
   docker logs ine-comfyui
   ```
