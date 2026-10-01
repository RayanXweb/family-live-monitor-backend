import { query } from '../config/database';

export interface PairingRow {
  id: string;
  device_id: string;
  code_hash: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  expires_at: Date;
  used_at: Date | null;
  created_by: string;
  created_at: Date;
}

export const pairingRepo = {
  async create(p: Omit<PairingRow, 'created_at'>) {
    await query(
      `INSERT INTO pairing_codes (id, device_id, code_hash, status, expires_at, used_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [p.id, p.device_id, p.code_hash, p.status, p.expires_at, p.used_at, p.created_by]
    );
  },
  async findActiveByDevice(deviceId: string): Promise<PairingRow | null> {
    const { rows } = await query<PairingRow>(
      `SELECT * FROM pairing_codes WHERE device_id=$1 AND status='active' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [deviceId]
    );
    return rows[0] ?? null;
  },
  async findActiveByCodeHash(hash: string): Promise<PairingRow | null> {
    const { rows } = await query<PairingRow>(
      `SELECT * FROM pairing_codes WHERE code_hash=$1 AND status='active' AND expires_at > NOW() LIMIT 1`,
      [hash]
    );
    return rows[0] ?? null;
  },
  async markUsed(id: string) {
    await query(`UPDATE pairing_codes SET status='used', used_at=NOW() WHERE id=$1`, [id]);
  },
  async revoke(id: string) {
    await query(`UPDATE pairing_codes SET status='revoked' WHERE id=$1`, [id]);
  },
  async expireStale(): Promise<number> {
    const { rowCount } = await query(
      `UPDATE pairing_codes SET status='expired' WHERE status='active' AND expires_at <= NOW()`
    );
    return rowCount ?? 0;
  },
};
