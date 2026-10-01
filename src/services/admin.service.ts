import { refreshTokenRepo } from '../repositories/refreshToken.repo';
import { auditRepo } from '../repositories/audit.repo';
import { deviceRepo } from '../repositories/device.repo';
import { monitoringRepo } from '../repositories/monitoring.repo';
import { pool } from '../config/database';

export const adminService = {
  async stats() {
    const [{ rows: users }, activeSessions, { rows: devices }] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
      refreshTokenRepo.countActiveSessions(),
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM devices'),
    ]);
    const sessions = await monitoringRepo.listActiveSessions();
    return {
      users: parseInt(users[0]?.count ?? '0', 10),
      devices: parseInt(devices[0]?.count ?? '0', 10),
      activeSessions,
      activeMonitoring: sessions.length,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
    };
  },
  async listAudit(limit = 100, offset = 0) {
    return auditRepo.list(limit, offset);
  },
  async listDevices(limit = 100, offset = 0) {
    return deviceRepo.listAll(limit, offset);
  },
  async revokeSession(sessionId: string) {
    await refreshTokenRepo.revoke(sessionId);
  },
};
