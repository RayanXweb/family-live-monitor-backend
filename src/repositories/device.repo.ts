import { query } from '../config/database';
import { DeviceRow } from '../types/domain';

export const deviceRepo = {
  async findById(id: string): Promise<DeviceRow | null> {
    const { rows } = await query<DeviceRow>('SELECT * FROM devices WHERE id = $1', [id]);
    return rows[0] ?? null;
  },
  async listByOwner(ownerId: string): Promise<DeviceRow[]> {
    const { rows } = await query<DeviceRow>(
      'SELECT * FROM devices WHERE owner_id = $1 ORDER BY created_at DESC',
      [ownerId]
    );
    return rows;
  },
  async create(d: DeviceRow): Promise<DeviceRow> {
    const { rows } = await query<DeviceRow>(
      `INSERT INTO devices (id, owner_id, name, platform, model, os_version, app_version, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [d.id, d.owner_id, d.name, d.platform, d.model, d.os_version, d.app_version, d.status]
    );
    return rows[0];
  },
  async update(id: string, patch: Partial<DeviceRow>): Promise<DeviceRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(patch)) {
      fields.push(`${k} = $${i++}`);
      values.push(v);
    }
    if (fields.length === 0) return this.findById(id);
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await query<DeviceRow>(
      `UPDATE devices SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },
  async heartbeat(id: string, battery: number | null, network: string | null): Promise<DeviceRow | null> {
    const { rows } = await query<DeviceRow>(
      `UPDATE devices
         SET status = 'online', last_seen_at = NOW(), battery_level = COALESCE($2, battery_level),
             network_type = COALESCE($3, network_type), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, battery, network]
    );
    return rows[0] ?? null;
  },
  async markOffline(id: string) {
    await query(`UPDATE devices SET status='offline', updated_at=NOW() WHERE id=$1`, [id]);
  },
  async listAll(limit = 100, offset = 0): Promise<DeviceRow[]> {
    const { rows } = await query<DeviceRow>(
      'SELECT * FROM devices ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return rows;
  },
};
