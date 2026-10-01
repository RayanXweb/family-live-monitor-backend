import { query } from '../config/database';
import { PermissionName } from '../types/domain';

export interface PermissionRow {
  id: string;
  device_id: string;
  viewer_id: string;
  permission: PermissionName;
  granted_by: string;
  granted_at: Date;
  revoked_at: Date | null;
}

export const permissionRepo = {
  async grant(deviceId: string, viewerId: string, permission: PermissionName, grantedBy: string) {
    const { rows } = await query<PermissionRow>(
      `INSERT INTO device_permissions (id, device_id, viewer_id, permission, granted_by)
       VALUES (gen_random_uuid(), $1,$2,$3,$4)
       ON CONFLICT (device_id, viewer_id, permission)
       DO UPDATE SET revoked_at = NULL, granted_at = NOW(), granted_by = EXCLUDED.granted_by
       RETURNING *`,
      [deviceId, viewerId, permission, grantedBy]
    );
    return rows[0];
  },
  async revoke(deviceId: string, viewerId: string, permission: PermissionName) {
    await query(
      `UPDATE device_permissions SET revoked_at = NOW()
       WHERE device_id=$1 AND viewer_id=$2 AND permission=$3 AND revoked_at IS NULL`,
      [deviceId, viewerId, permission]
    );
  },
  async hasPermission(deviceId: string, viewerId: string, permission: PermissionName): Promise<boolean> {
    const { rows } = await query<{ ok: boolean }>(
      `SELECT TRUE AS ok FROM device_permissions
       WHERE device_id=$1 AND viewer_id=$2 AND permission=$3 AND revoked_at IS NULL LIMIT 1`,
      [deviceId, viewerId, permission]
    );
    return rows.length > 0;
  },
  async listForDevice(deviceId: string): Promise<PermissionRow[]> {
    const { rows } = await query<PermissionRow>(
      'SELECT * FROM device_permissions WHERE device_id=$1 AND revoked_at IS NULL',
      [deviceId]
    );
    return rows;
  },
};
