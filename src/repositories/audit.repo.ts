import { query } from '../config/database';

export const auditRepo = {
  async log(entry: {
    id: string;
    actor_id?: string | null;
    action: string;
    target_type?: string;
    target_id?: string;
    ip?: string;
    user_agent?: string;
    metadata?: unknown;
  }) {
    await query(
      `INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, ip, user_agent, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        entry.id,
        entry.actor_id ?? null,
        entry.action,
        entry.target_type ?? null,
        entry.target_id ?? null,
        entry.ip ?? null,
        entry.user_agent ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ]
    );
  },
  async list(limit = 100, offset = 0) {
    const { rows } = await query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return rows;
  },
};
