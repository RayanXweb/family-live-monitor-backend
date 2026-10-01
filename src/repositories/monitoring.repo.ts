import { query } from '../config/database';
import { MonitoringStatus, PermissionName } from '../types/domain';

export interface RequestRow {
  id: string;
  owner_id: string;
  viewer_id: string;
  device_id: string;
  permission: PermissionName;
  status: 'requested' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  message: string | null;
  expires_at: Date;
  created_at: Date;
  responded_at: Date | null;
}

export interface SessionRow {
  id: string;
  request_id: string | null;
  owner_id: string;
  viewer_id: string;
  device_id: string;
  permission: PermissionName;
  status: MonitoringStatus;
  started_at: Date | null;
  ended_at: Date | null;
  duration_seconds: number | null;
  expires_at: Date;
  created_at: Date;
}

export const monitoringRepo = {
  async createRequest(r: Omit<RequestRow, 'created_at' | 'responded_at'>) {
    const { rows } = await query<RequestRow>(
      `INSERT INTO monitoring_requests (id, owner_id, viewer_id, device_id, permission, status, message, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [r.id, r.owner_id, r.viewer_id, r.device_id, r.permission, r.status, r.message, r.expires_at]
    );
    return rows[0];
  },
  async findRequest(id: string): Promise<RequestRow | null> {
    const { rows } = await query<RequestRow>('SELECT * FROM monitoring_requests WHERE id=$1', [id]);
    return rows[0] ?? null;
  },
  async respondRequest(id: string, status: 'approved' | 'rejected' | 'cancelled') {
    const { rows } = await query<RequestRow>(
      `UPDATE monitoring_requests SET status=$2, responded_at=NOW() WHERE id=$1 RETURNING *`,
      [id, status]
    );
    return rows[0] ?? null;
  },
  async listRequestsForOwner(ownerId: string): Promise<RequestRow[]> {
    const { rows } = await query<RequestRow>(
      'SELECT * FROM monitoring_requests WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100',
      [ownerId]
    );
    return rows;
  },

  async createSession(s: Omit<SessionRow, 'created_at' | 'ended_at' | 'started_at' | 'duration_seconds'>) {
    const { rows } = await query<SessionRow>(
      `INSERT INTO monitoring_sessions (id, request_id, owner_id, viewer_id, device_id, permission, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [s.id, s.request_id, s.owner_id, s.viewer_id, s.device_id, s.permission, s.status, s.expires_at]
    );
    return rows[0];
  },
  async findSession(id: string): Promise<SessionRow | null> {
    const { rows } = await query<SessionRow>('SELECT * FROM monitoring_sessions WHERE id=$1', [id]);
    return rows[0] ?? null;
  },
  async startSession(id: string): Promise<SessionRow | null> {
    const { rows } = await query<SessionRow>(
      `UPDATE monitoring_sessions
         SET status='active', started_at=COALESCE(started_at, NOW())
       WHERE id=$1 AND status IN ('approved','active') RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },
  async stopSession(id: string): Promise<SessionRow | null> {
    const { rows } = await query<SessionRow>(
      `UPDATE monitoring_sessions
         SET status='stopped', ended_at=NOW(),
             duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, NOW())))::int)
       WHERE id=$1 AND status IN ('active','approved') RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },
  async expireStale(): Promise<number> {
    const { rowCount } = await query(
      `UPDATE monitoring_sessions
         SET status = CASE WHEN status = 'active' THEN 'stopped' ELSE 'expired' END,
             ended_at = COALESCE(ended_at, NOW()),
             duration_seconds = COALESCE(duration_seconds,
               GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, NOW())))::int))
       WHERE status IN ('approved','active') AND expires_at <= NOW()`
    );
    return rowCount ?? 0;
  },
  async listActiveSessions(): Promise<SessionRow[]> {
    const { rows } = await query<SessionRow>(
      `SELECT * FROM monitoring_sessions WHERE status IN ('approved','active') ORDER BY created_at DESC`
    );
    return rows;
  },
};
