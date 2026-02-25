# Deployment Guide

This guide covers deploying the Ine-Discord bot to production.

## Deployment Options

### 1. Docker Compose (Recommended)

The easiest way to deploy all services:

```bash
# Clone and configure
git clone https://github.com/Reedtrullz/Bottus.git
cd Bottus
cp .env.example .env
# Edit .env with production values

# Start all services
docker-compose up -d
```

### 2. Docker Stack (Swarm/Kubernetes)

For production orchestration, use the Docker Compose file as a base:

```yaml
# docker-compose.production.yml
services:
  ine-relay:
    build:
      context: .
      dockerfile: Dockerfile.relay
    environment:
      - OLLAMA_URL=${OLLAMA_URL}
      - OLLAMA_MODEL=${OLLAMA_MODEL}
      - RELAY_TIMEOUT_MS=120000
      - COMFYUI_URL=${COMFYUI_URL}
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
```

## Production Considerations

### Environment Variables

Use production-grade values:

```
# Increase timeout for production
RELAY_TIMEOUT_MS=120000

# Reduce history for performance
HISTORY_MAX_MESSAGES=3

# Enable logging
DEBUG=*
```

### Security

1. **Never commit `.env` files**
2. **Use Docker secrets** for sensitive values
3. **Rotate tokens** regularly
4. **Use separate Discord account** for relay bot
5. **Enable HTTPS** for any web endpoints

### Resource Requirements

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| Bot | 1 core | 512MB | - |
| Ollama | 4+ cores | 8GB+ VRAM | 10GB |
| ComfyUI (GPU) | 4+ cores | 16GB VRAM | 20GB |
| ComfyUI (CPU) | 8+ cores | 16GB | 20GB |

### Health Checks

The bot includes health monitoring for:
- Ollama API
- ComfyUI API

Configure health check endpoints in your orchestrator:

```
http://bot-host:3000/health  # If HTTP server enabled
```

Or check via logs:
```bash
docker logs ine-relay-bot | grep -i health
```

## Logging

### Application Logs

```bash
# View logs
docker logs ine-relay-bot

# Follow logs
docker logs -f ine-relay-bot

# Filter by level
docker logs ine-relay-bot 2>&1 | grep ERROR
```

### Structured Logging

The bot uses JSON-structured logging. Parse with:

```bash
docker logs ine-relay-bot --tail 100 | jq '.'
```

### Log Levels

Set via `DEBUG` environment variable:
- `*` - All logs
- `info` - Info and above
- `warn` - Warnings and errors
- `error` - Errors only

## Monitoring

### Prometheus Metrics (Future)

Planned metrics endpoint for Prometheus scraping.

### Custom Monitoring

Integrate with health monitor:

```typescript
import { healthMonitor } from './services/health-monitor.js';

const report = await healthMonitor.getOverallHealth();
if (report.overall === 'unhealthy') {
  // Alert your monitoring system
}
```

## Backup Strategies

### Database Backups

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker cp ine-relay-bot:/app/data/calendar.db ./backups/calendar_$DATE.db
```

### Configuration Backups

```bash
# Backup .env (without secrets)
grep -v '^#' .env | grep -v '^$' | sed 's/=.*/=***/' > .env.backup
```

### Docker Volumes

```bash
# Backup volumes
docker run --rm -v ine-ollama-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/ollama_$(date +%Y%m%d).tar.gz /data
```

## Backup and Restore

### Restore Database

```bash
# Stop bot
docker-compose stop ine-relay

# Restore
docker cp calendar_20240101.db ine-relay-bot:/app/data/calendar.db

# Start bot
docker-compose start ine-relay
```

## Scaling

### Horizontal Scaling

The bot is designed for single-instance. For scaling:
1. Use Redis for shared state
2. Implement message queue for tasks
3. Separate services into microservices

### Vertical Scaling

Increase resources:
```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
```

## Maintenance

### Rolling Updates

```bash
# Pull latest
git pull

# Rebuild
docker-compose build ine-relay

# Rolling restart
docker-compose up -d --no-deps --build ine-relay
```

### Log Rotation

Configure in Docker daemon:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## Troubleshooting Production Issues

### Bot Not Responding

1. Check container health: `docker ps`
2. Check logs: `docker logs ine-relay-bot`
3. Verify external services: `docker exec ine-relay-bot curl http://ollama:11434/api/tags`
4. Restart if needed: `docker restart ine-relay-bot`

### High Memory Usage

1. Check container stats: `docker stats`
2. Review logs for memory errors
3. Increase memory limit in docker-compose
4. Consider using swap

### Database Corruption

1. Restore from backup (see Backup Strategies)
2. Or delete and let recreate:
   ```bash
   docker exec ine-relay-bot rm /app/data/calendar.db
   docker restart ine-relay-bot
   ```

## Security Checklist

- [ ] `.env` not committed to git
- [ ] Using separate Discord account
- [ ] Tokens rotated regularly
- [ ] Docker sockets not exposed
- [ ] Network segmentation in place
- [ ] Backups configured
- [ ] Log rotation enabled
- [ ] Monitoring alerts configured
