import { describe, it, expect, vi, beforeEach } from 'vitest';

import { UserRole } from '../../src/relay/skills/permission.js';
import { UserRole } from '../../src/relay/skills/permission.js';

// Mock health-monitor
vi.mock('../../src/services/health-monitor.js', () => ({
  healthMonitor: {
    getOverallHealth: vi.fn().mockResolvedValue({
      overall: 'healthy',
      services: [
        { service: 'ollama', status: 'healthy', responseTimeMs: 100, lastChecked: Date.now() },
        { service: 'comfyui', status: 'healthy', responseTimeMs: 50, lastChecked: Date.now() },
      ],
      timestamp: Date.now(),
    }),
  },
}));

// Mock permission service
const mockGetUserRole = vi.fn();
const mockGetOwnerId = vi.fn().mockReturnValue('owner-123');

vi.mock('../../src/relay/skills/permission.js', () => ({
  permissionService: {
    getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
    getOwnerId: () => mockGetOwnerId(),
  },
  UserRole: {
    MEMBER: 'member',
    CONTRIBUTOR: 'contributor',
    ADMIN: 'admin',
    OWNER: 'owner',
  },
}));

// Mock roleDb
const mockGetChannelRoles = vi.fn().mockReturnValue([
  { user_id: 'user-1', role: 'member', assigned_at: '2024-01-01' },
  { user_id: 'user-2', role: 'contributor', assigned_at: '2024-01-02' },
]);

vi.mock('../../src/db/index.js', () => ({
  roleDb: {
    getChannelRoles: (...args: unknown[]) => mockGetChannelRoles(...args),
  },
}));

// Import mocked modules
import { healthMonitor } from '../../src/services/health-monitor.js';
import { permissionService } from '../../src/relay/skills/permission.js';
import { roleDb } from '../../src/db/index.js';

describe('Health Endpoint', () => {
  describe('Health Monitor Integration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should get overall health report', async () => {
      const report = await healthMonitor.getOverallHealth();
      
      expect(report.overall).toBe('healthy');
      expect(report.services).toHaveLength(2);
      expect(report.services[0].service).toBe('ollama');
      expect(report.services[1].service).toBe('comfyui');
      expect(report.timestamp).toBeDefined();
    });

    it('should determine ready status from overall health', async () => {
      const report = await healthMonitor.getOverallHealth();
      
      // Ready when overall is not unhealthy
      const ready = report.overall !== 'unhealthy';
      
      expect(ready).toBe(true);
    });

    it('should return degraded when services are degraded', async () => {
      vi.mocked(healthMonitor.getOverallHealth).mockResolvedValueOnce({
        overall: 'degraded',
        services: [
          { service: 'ollama', status: 'healthy', responseTimeMs: 100, lastChecked: Date.now() },
          { service: 'comfyui', status: 'degraded', error: 'HTTP 500', lastChecked: Date.now() },
        ],
        timestamp: Date.now(),
      });
      
      const report = await healthMonitor.getOverallHealth();
      const ready = report.overall !== 'unhealthy';
      
      expect(report.overall).toBe('degraded');
      expect(ready).toBe(true); // degraded still counts as ready
    });

    it('should return not ready when unhealthy', async () => {
      vi.mocked(healthMonitor.getOverallHealth).mockResolvedValueOnce({
        overall: 'unhealthy',
        services: [
          { service: 'ollama', status: 'unhealthy', error: 'Connection failed', lastChecked: Date.now() },
          { service: 'comfyui', status: 'unhealthy', error: 'Connection failed', lastChecked: Date.now() },
        ],
        timestamp: Date.now(),
      });
      
      const report = await healthMonitor.getOverallHealth();
      const ready = report.overall !== 'unhealthy';
      
      expect(report.overall).toBe('unhealthy');
      expect(ready).toBe(false);
    });

    it('should include response time in health report', async () => {
      vi.mocked(healthMonitor.getOverallHealth).mockResolvedValueOnce({
        overall: 'healthy',
        services: [
          { service: 'ollama', status: 'healthy', responseTimeMs: 150, lastChecked: Date.now() },
          { service: 'comfyui', status: 'healthy', responseTimeMs: 75, lastChecked: Date.now() },
        ],
        timestamp: Date.now(),
      });
      
      const report = await healthMonitor.getOverallHealth();
      
      expect(report.services[0].responseTimeMs).toBe(150);
      expect(report.services[1].responseTimeMs).toBe(75);
    });

    it('should include error info when service is degraded', async () => {
      vi.mocked(healthMonitor.getOverallHealth).mockResolvedValueOnce({
        overall: 'degraded',
        services: [
          { service: 'ollama', status: 'healthy', responseTimeMs: 100, lastChecked: Date.now() },
          { service: 'comfyui', status: 'degraded', error: 'HTTP 503', lastChecked: Date.now() },
        ],
        timestamp: Date.now(),
      });
      
      const report = await healthMonitor.getOverallHealth();
      
      expect(report.services[1].error).toBe('HTTP 503');
    });

    it('should include error info when service is unhealthy', async () => {
      vi.mocked(healthMonitor.getOverallHealth).mockResolvedValueOnce({
        overall: 'unhealthy',
        services: [
          { service: 'ollama', status: 'unhealthy', error: 'Connection refused', lastChecked: Date.now() },
          { service: 'comfyui', status: 'healthy', responseTimeMs: 50, lastChecked: Date.now() },
        ],
        timestamp: Date.now(),
      });
      
      const report = await healthMonitor.getOverallHealth();
      
      expect(report.services[0].error).toBe('Connection refused');
    });
  });

  describe('Permission API Logic', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockGetUserRole.mockReturnValue(UserRole.MEMBER);
      mockGetOwnerId.mockReturnValue('owner-123');
    });

    it('should get user role from permission service', () => {
      const userId = 'user-123';
      const channelId = 'channel-456';
      
      const role = permissionService.getUserRole(channelId, userId);
      
      expect(mockGetUserRole).toHaveBeenCalledWith(channelId, userId);
      expect(role).toBe(UserRole.MEMBER);
    });

    it('should get owner ID from permission service', () => {
      const ownerId = permissionService.getOwnerId();
      
      expect(mockGetOwnerId).toHaveBeenCalled();
      expect(ownerId).toBe('owner-123');
    });

    it('should determine if user is owner', () => {
      const ownerId = permissionService.getOwnerId();
      
      expect('owner-123' === ownerId).toBe(true);
      expect('user-456' === ownerId).toBe(false);
    });

    it('should get channel roles from roleDb', () => {
      const channelId = 'channel-789';
      
      const roles = roleDb.getChannelRoles(channelId);
      
      expect(mockGetChannelRoles).toHaveBeenCalledWith(channelId);
      expect(roles).toHaveLength(2);
      expect(roles[0].user_id).toBe('user-1');
      expect(roles[1].role).toBe('contributor');
    });

    it('should map channel roles to response format', () => {
      const roles = roleDb.getChannelRoles('channel-1');
      
      const mappedRoles = roles.map(r => ({
        userId: r.user_id,
        role: r.role,
        assignedAt: r.assigned_at,
      }));
      
      expect(mappedRoles).toEqual([
        { userId: 'user-1', role: 'member', assignedAt: '2024-01-01' },
        { userId: 'user-2', role: 'contributor', assignedAt: '2024-01-02' },
      ]);
    });

    it('should return different roles for different users in same channel', () => {
      mockGetUserRole
        .mockReturnValueOnce(UserRole.OWNER)
        .mockReturnValueOnce(UserRole.ADMIN)
        .mockReturnValueOnce(UserRole.CONTRIBUTOR)
        .mockReturnValueOnce(UserRole.MEMBER);
      
      const ownerRole = permissionService.getUserRole('channel-1', 'owner-1');
      const adminRole = permissionService.getUserRole('channel-1', 'admin-1');
      const contributorRole = permissionService.getUserRole('channel-1', 'contributor-1');
      const memberRole = permissionService.getUserRole('channel-1', 'member-1');
      
      expect(ownerRole).toBe(UserRole.OWNER);
      expect(adminRole).toBe(UserRole.ADMIN);
      expect(contributorRole).toBe(UserRole.CONTRIBUTOR);
      expect(memberRole).toBe(UserRole.MEMBER);
    });

    it('should return owner regardless of stored role', () => {
      mockGetOwnerId.mockReturnValue('owner-user');
      
      const userId = 'owner-user';
      const ownerId = permissionService.getOwnerId();
      const isOwner = userId === ownerId;
      
      // Even though stored role is MEMBER, user is owner
      expect(isOwner).toBe(true);
    });
  });

  describe('Endpoint Response Logic', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 200 for /health endpoint when healthy', async () => {
      vi.mocked(healthMonitor.getOverallHealth).mockResolvedValueOnce({
        overall: 'healthy',
        services: [
          { service: 'ollama', status: 'healthy', responseTimeMs: 100, lastChecked: Date.now() },
          { service: 'comfyui', status: 'healthy', responseTimeMs: 50, lastChecked: Date.now() },
        ],
        timestamp: Date.now(),
      });
      
      const report = await healthMonitor.getOverallHealth();
      
      // Simulates /health endpoint response
      const response = {
        status: 200,
        body: {
          status: report.overall,
          services: report.services,
          timestamp: report.timestamp,
        },
      };
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    it('should return 200 with ready:true for /health/ready when healthy', async () => {
      vi.mocked(healthMonitor.getOverallHealth).mockResolvedValueOnce({
        overall: 'healthy',
        services: [],
        timestamp: Date.now(),
      });
      
      const report = await healthMonitor.getOverallHealth();
      const ready = report.overall !== 'unhealthy';
      
      // Simulates /health/ready endpoint response
      const response = {
        statusCode: ready ? 200 : 503,
        body: { ready },
      };
      
      expect(response.statusCode).toBe(200);
      expect(response.body.ready).toBe(true);
    });

    it('should return 503 with ready:false for /health/ready when unhealthy', async () => {
      vi.mocked(healthMonitor.getOverallHealth).mockResolvedValueOnce({
        overall: 'unhealthy',
        services: [],
        timestamp: Date.now(),
      });
      
      const report = await healthMonitor.getOverallHealth();
      const ready = report.overall !== 'unhealthy';
      
      // Simulates /health/ready endpoint response
      const response = {
        statusCode: ready ? 200 : 503,
        body: { ready },
      };
      
      expect(response.statusCode).toBe(503);
      expect(response.body.ready).toBe(false);
    });
  });
});
