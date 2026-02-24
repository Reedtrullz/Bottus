import http from 'http';
import { healthMonitor } from '../services/health-monitor.js';

const PORT = process.env.HEALTH_PORT || 3001;

export function startHealthEndpoint(): void {
  const server = http.createServer(async (req, res) => {
    const url = req.url || '';
    
    if (url === '/health' || url === '/health/ready') {
      const report = await healthMonitor.getOverallHealth();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      if (url === '/health/ready') {
        const ready = report.overall !== 'unhealthy';
        res.statusCode = ready ? 200 : 503;
        res.end(JSON.stringify({ ready }));
      } else {
        res.statusCode = 200;
        res.end(JSON.stringify({
          status: report.overall,
          services: report.services,
          timestamp: report.timestamp,
        }));
      }
      return;
    }
    
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  
  server.listen(PORT, () => {
    console.log(`[Health] Health endpoint running on port ${PORT}`);
  });
}

export default startHealthEndpoint;
