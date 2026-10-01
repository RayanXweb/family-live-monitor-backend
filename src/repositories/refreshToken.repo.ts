import { query } from '../config/database';

export interface RefreshRow {
  id: string;
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  ip: string | null;
  revoked: boolean;
  replaced_by: string | null;
  expires_at: Date;
  created_at: Date;
}

export const refreshTokenRepo = {
  async create(r: Omit<RefreshRow, 'created_at'>) {
    await query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, user_agent, ip, revoked, replaced_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [r.id, r.user_id, r.token_hash, r.user_agent, r.ip, r.revoked, r.replaced_by, r.expires_at]
    );
  },
  async findById(id: string): Promise<RefreshRow | null> {
    const { rows } = await query<RefreshRow>('SELECT * FROM refresh_tokens WHERE id = $1', [id]);
    return rows[0] ?? null;
  },
  async findByHash(hash: string): Promise<RefreshRow | null> {
    const { rows } = await query<RefreshRow>('SELECT * FROM refresh_tokens WHERE token_hash = $1', [hash]);
    return rows[0] ?? null;
  },
  async revoke(id: string, replacedBy?: string) {
    await query('UPDATE refresh_tokens SET revoked = TRUE, replaced_by = $2 WHERE id = $1', [id, replacedBy ?? null]);
  },
  async revokeAllForUser(userId: string) {
    await query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE', [userId]);
  },
  async listActiveForUser(userId: string): Promise<RefreshRow[]> {
    const { rows } = await query<RefreshRow>(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW() ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },
  async countActiveSessions(): Promise<number> {
    const { rows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM refresh_tokens WHERE revoked = FALSE AND expires_at > NOW()'
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  },
};
