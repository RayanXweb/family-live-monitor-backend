-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','pending')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- REFRESH TOKENS (sessions)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  replaced_by UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens (token_hash);

-- EMAIL VERIFICATION / PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS one_time_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('email_verify','password_reset')),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ott_hash ON one_time_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_ott_user ON one_time_tokens (user_id);

-- DEVICES
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT,
  model TEXT,
  os_version TEXT,
  app_version TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','pending')),
  battery_level INT,
  network_type TEXT,
  push_token TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices (owner_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status);

-- DEVICE PERMISSIONS (granted to specific viewer)
CREATE TABLE IF NOT EXISTS device_permissions (
  id UUID PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view_status','view_screen')),
  granted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (device_id, viewer_id, permission)
);
CREATE INDEX IF NOT EXISTS idx_dp_device ON device_permissions (device_id);
CREATE INDEX IF NOT EXISTS idx_dp_viewer ON device_permissions (viewer_id);

-- PAIRING CODES
CREATE TABLE IF NOT EXISTS pairing_codes (
  id UUID PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired','revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pairing_device ON pairing_codes (device_id);
CREATE INDEX IF NOT EXISTS idx_pairing_status_exp ON pairing_codes (status, expires_at);

-- INVITATIONS
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT ARRAY['view_status']::TEXT[],
  expiration TIMESTAMPTZ NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_device ON invitations (device_id);
CREATE INDEX IF NOT EXISTS idx_inv_status_exp ON invitations (status, expiration);

-- MONITORING REQUESTS
CREATE TABLE IF NOT EXISTS monitoring_requests (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view_status','view_screen')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','cancelled','expired')),
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mr_owner ON monitoring_requests (owner_id);
CREATE INDEX IF NOT EXISTS idx_mr_viewer ON monitoring_requests (viewer_id);
CREATE INDEX IF NOT EXISTS idx_mr_status ON monitoring_requests (status);

-- MONITORING SESSIONS
CREATE TABLE IF NOT EXISTS monitoring_sessions (
  id UUID PRIMARY KEY,
  request_id UUID REFERENCES monitoring_requests(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view_status','view_screen')),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','active','stopped','expired','rejected')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ms_owner ON monitoring_sessions (owner_id);
CREATE INDEX IF NOT EXISTS idx_ms_viewer ON monitoring_sessions (viewer_id);
CREATE INDEX IF NOT EXISTS idx_ms_device ON monitoring_sessions (device_id);
CREATE INDEX IF NOT EXISTS idx_ms_status_exp ON monitoring_sessions (status, expires_at);

-- FAMILY GROUPS
CREATE TABLE IF NOT EXISTS family_groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gm_group ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_gm_user ON group_members (user_id);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_created ON notifications (user_id, created_at DESC);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
