export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'disabled' | 'pending';

export type DeviceStatus = 'online' | 'offline' | 'pending';

export type PermissionName = 'view_status' | 'view_screen';

export type InvitationStatus = 'active' | 'used' | 'expired' | 'revoked';

export type MonitoringStatus =
  | 'requested'
  | 'approved'
  | 'active'
  | 'stopped'
  | 'expired'
  | 'rejected';

export type PairingStatus = 'active' | 'used' | 'expired' | 'revoked';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DeviceRow {
  id: string;
  owner_id: string;
  name: string;
  platform: string | null;
  model: string | null;
  os_version: string | null;
  app_version: string | null;
  status: DeviceStatus;
  battery_level: number | null;
  network_type: string | null;
  last_seen_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
