import http from 'http';
import { logger } from '../utils/logger.js';
import { healthMonitor } from '../services/health-monitor.js';
import { permissionService, UserRole } from './skills/permission.js';
import { roleDb } from '../db/index.js';

const PORT = process.env.HEALTH_PORT || 3001;

export function startHealthEndpoint(): void {
  const server = http.createServer(async (req, res) => {
    const url = req.url || '';
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    
    if (url === '/health' || url === '/health/ready') {
      const report = await healthMonitor.getOverallHealth();
      
      res.setHeader('Content-Type', 'application/json');
      
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
    
    // Permission API for NanoBot
    if (url.startsWith('/api/permissions/')) {
      res.setHeader('Content-Type', 'application/json');
      
      const parts = url.split('/').filter(Boolean); // [api, permissions, userId, channelId?]
      
      // GET /api/permissions/:userId/:channelId
      if (parts.length >= 3) {
        const userId = parts[2];
        const channelId = parts[3] || 'default';
        
        try {
          const role = permissionService.getUserRole(channelId, userId);
          const ownerId = permissionService.getOwnerId();
          
          res.statusCode = 200;
          res.end(JSON.stringify({
            userId,
            channelId,
            role,
            isOwner: userId === ownerId,
            permissions: getPermissionsForRole(role),
          }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to get permissions' }));
        }
        return;
      }
      
      // GET /api/permissions/channels/:channelId
      if (url.startsWith('/api/permissions/channels/')) {
        const channelId = parts[3] || '';
        
        try {
          const roles = roleDb.getChannelRoles(channelId);
          res.statusCode = 200;
          res.end(JSON.stringify({
            channelId,
            roles: roles.map(r => ({
              userId: r.user_id,
              role: r.role,
              assignedAt: r.assigned_at,
            })),
          }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to get channel roles' }));
        }
        return;
      }
    }
    
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  
  server.listen(PORT, () => {
    logger.info(`[Health] Health & API endpoint running on port ${PORT}`);
  });
}

function getPermissionsForRole(role: UserRole): string[] {
  const allPermissions = [
    'query:calendar', 'query:memory', 'query:image',
    'create:event', 'create:memory', 'rsvp',
    'delete:event', 'delete:memory', 'clear:channel_memory',
    'admin:permissions', 'admin:skills', 'admin:export',
    'proposal:approve', 'proposal:reject'
  ];
  
  if (role === UserRole.OWNER) return allPermissions;
  if (role === UserRole.ADMIN) return allPermissions.slice(0, -2); // without proposal perms
  if (role === UserRole.CONTRIBUTOR) return allPermissions.slice(0, 6);
  if (role === UserRole.MEMBER) return allPermissions.slice(0, 3);
  return [];
}

export default startHealthEndpoint;
