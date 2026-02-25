# Health Monitoring

The health monitoring system tracks the status of external dependencies (Ollama, ComfyUI) and provides unified health reporting.

## Overview

```
src/services/health-monitor.ts
```

The HealthMonitor class provides:
- Periodic health checks for Ollama and ComfyUI
- Status caching with configurable intervals
- Overall health aggregation
- Response time tracking

## Status Types

```typescript
type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
```

| Status | Meaning |
|--------|---------|
| healthy | Service responding normally |
| degraded | Service responding but slowly |
| unhealthy | Service not responding |
| unknown | Not yet checked |

## API Reference

### checkOllama()

```typescript
async checkOllama(force = false): Promise<HealthStatus>
```

Check Ollama service health.

**Parameters:**
- `force` (boolean): Skip cache and force a fresh check

**Returns:** HealthStatus object

### checkComfyUI()

```typescript
async checkComfyUI(force = false): Promise<HealthStatus>
```

Check ComfyUI service health.

**Parameters:**
- `force` (boolean): Skip cache and force a fresh check

**Returns:** HealthStatus object

### getOverallHealth()

```typescript
async getOverallHealth(force = false): Promise<HealthReport>
```

Get aggregated health report for all services.

**Returns:**
```typescript
interface HealthReport {
  overall: ServiceStatus;
  services: HealthStatus[];
  timestamp: number;
}
```

### getCachedStatus()

```typescript
getCachedStatus(service: 'ollama' | 'comfyui'): HealthStatus
```

Get cached status without making a new request.

## Usage Examples

### Basic Health Check

```typescript
import { healthMonitor } from './services/health-monitor.js';

// Check individual services
const ollamaStatus = await healthMonitor.checkOllama();
console.log(`Ollama: ${ollamaStatus.status}`);

// Check all services
const report = await healthMonitor.getOverallHealth();
console.log(`Overall: ${report.overall}`);
```

### Response Example

```typescript
{
  overall: 'degraded',
  services: [
    {
      service: 'ollama',
      status: 'healthy',
      responseTimeMs: 150,
      lastChecked: 1706123456789
    },
    {
      service: 'comfyui',
      status: 'degraded',
      responseTimeMs: 5000,
      lastChecked: 1706123456789,
      error: 'HTTP 503'
    }
  ],
  timestamp: 1706123456789
}
```

## Integration with Self-Healing

The health monitor integrates with the self-healing system:

```typescript
import { selfHealer } from './services/self-healer.js';
import { healthMonitor } from './services/health-monitor.js';

// Check before operation
const { healthy, status } = await selfHealer.checkHealthBeforeExecute('ollama');

if (!healthy) {
  // Use fallback or queue for later
  console.log(`Ollama is ${status.status}: ${status.error}`);
}
```

## Custom Health Checks

### Adding New Services

```typescript
class HealthMonitor {
  // Add new service check
  async checkMyService(): Promise<HealthStatus> {
    const url = process.env.MY_SERVICE_URL || 'http://localhost:9000';
    
    try {
      const response = await fetch(`${url}/health`);
      return {
        service: 'my-service',
        status: response.ok ? 'healthy' : 'degraded',
        lastChecked: Date.now()
      };
    } catch (error) {
      return {
        service: 'my-service',
        status: 'unhealthy',
        lastChecked: Date.now(),
        error: error.message
      };
    }
  }
}
```

### HTTP Endpoint for Health

```typescript
// Express route example
app.get('/health', async (req, res) => {
  const report = await healthMonitor.getOverallHealth();
  
  const statusCode = report.overall === 'healthy' ? 200 
    : report.overall === 'degraded' ? 200 
    : 503;
  
  res.status(statusCode).json(report);
});
```

## Configuration

### Check Interval

Default check interval is 30 seconds:

```typescript
private checkIntervalMs = 30000;
```

Modify in source to adjust.

### Timeout

Default timeout for health checks is 5 seconds:

```typescript
const timeoutId = setTimeout(() => controller.abort(), 5000);
```

### URLs

Configured via environment variables:

```typescript
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
```

## Health Check Endpoints

### Ollama

```
GET {OLLAMA_URL}/api/tags
```

Returns list of available models.

### ComfyUI

```
GET {COMFYUI_URL}/system_stats
```

Returns system statistics.

## Monitoring Integration

### Prometheus

```typescript
// metrics.ts
import { healthMonitor } from './services/health-monitor.js';

app.get('/metrics', async (req, res) => {
  const report = await healthMonitor.getOverallHealth();
  
  const metrics = [
    `# HELP health_status Service health status`,
    `# TYPE health_status gauge`,
    `health_status{service="ollama"} ${statusToNumber(report.services[0].status)}`,
    `health_status{service="comfyui"} ${statusToNumber(report.services[1].status)}`,
  ];
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n'));
});

function statusToNumber(status: string): number {
  switch (status) {
    case 'healthy': return 1;
    case 'degraded': return 0.5;
    case 'unhealthy': return 0;
    default: return -1;
  }
}
```

### Grafana Dashboard

Recommended panels:
- Overall health gauge (0-1)
- Response time per service
- Last check timestamp
- Error count

## Best Practices

### DO

- Check health before critical operations
- Use cached status when possible (avoids extra requests)
- Handle all status types in UI
- Log health changes for debugging

### DON'T

- Don't call health checks on every request (use caching)
- Don't ignore degraded status
- Don't hardcode URLs (use env vars)

## Troubleshooting

### Service Shows Unknown

1. Check service is running: `docker ps`
2. Verify URL is correct in `.env`
3. Test manually: `curl http://localhost:11434/api/tags`
4. Check firewall rules

### Service Shows Degraded

1. Check response time: `curl -w "%{time_total}" ...`
2. Check service logs: `docker logs ine-ollama`
3. Check system resources

### Service Shows Unhealthy

1. Check service is running: `docker ps`
2. Check network connectivity
3. Check firewall
4. Review service logs

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { healthMonitor } from './health-monitor.js';

describe('HealthMonitor', () => {
  it('should return healthy status for running Ollama', async () => {
    const status = await healthMonitor.checkOllama(true);
    expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
  });
  
  it('should aggregate overall health', async () => {
    const report = await healthMonitor.getOverallHealth();
    expect(report.services).toHaveLength(2);
    expect(report.timestamp).toBeLessThanOrEqual(Date.now());
  });
});
```

## References

- [Health Monitor Source](src/services/health-monitor.ts)
- [Self-Healing System](self-healing.md)
- [Environment Variables](env-variables.md)
