import { query } from '../config/database';

export interface InvitationRow {
  id: string;
  token_hash: string;
  device_id: string;
  creator_id: string;
  permissions: string[];
  expiration: Date;
  max_uses: number;
  used_count: number;
  status: 'active' | 'used' | 'expired' | 'revoked';
  created_at: Date;
}

export const invitationRepo = {
  async create(i: Omit<InvitationRow, 'created_at'>) {
    const { rows } = await query<InvitationRow>(
      `INSERT INTO invitations (id, token_hash, device_id, creator_id, permissions, expiration, max_uses, used_count, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [i.id, i.token_hash, i.device_id, i.creator_id, i.permissions, i.expiration, i.max_uses, i.used_count, i.status]
    );
    return rows[0];
  },
  async findById(id: string): Promise<InvitationRow | null> {
    const { rows } = await query<InvitationRow>('SELECT * FROM invitations WHERE id=$1', [id]);
    return rows[0] ?? null;
  },
  async findByHash(hash: string): Promise<InvitationRow | null> {
    const { rows } = await query<InvitationRow>('SELECT * FROM invitations WHERE token_hash=$1', [hash]);
    return rows[0] ?? null;
  },
  async listByCreator(userId: string): Promise<InvitationRow[]> {
    const { rows } = await query<InvitationRow>(
      'SELECT * FROM invitations WHERE creator_id=$1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },
  async incrementUse(id: string) {
    const { rows } = await query<InvitationRow>(
      `UPDATE invitations
         SET used_count = used_count + 1,
             status = CASE WHEN used_count + 1 >= max_uses THEN 'used' ELSE status END
       WHERE id=$1 RETURNING *`,
      [id]
    );
    return rows[0];
  },
  async revoke(id: string, creatorId: string) {
    const { rowCount } = await query(
      `UPDATE invitations SET status='revoked' WHERE id=$1 AND creator_id=$2 AND status='active'`,
      [id, creatorId]
    );
    return (rowCount ?? 0) > 0;
  },
  async expireStale(): Promise<number> {
    const { rowCount } = await query(
      `UPDATE invitations SET status='expired' WHERE status='active' AND expiration <= NOW()`
    );
    return rowCount ?? 0;
  },
};
