import { userRepo } from '../repositories/user.repo';
import { refreshTokenRepo } from '../repositories/refreshToken.repo';
import { query } from '../config/database';
import { hashPassword, verifyPassword } from '../auth/password';
import { signAccess, signRefresh } from '../auth/jwt';
import { generateRefreshTokenRaw, hashRefreshToken } from '../auth/tokens';
import { ApiError } from '../utils/ApiError';
import { newId } from '../utils/ids';
import { env } from '../config/env';
import { randomToken, sha256 } from '../utils/crypto';
import { auditService } from './audit.service';
import { firebaseService } from './firebase.service';
import { logger } from '../config/logger';

const REFRESH_TTL_MS = () => {
  // parse simple TTL like "30d", "12h", "15m"
  const raw = env.JWT_REFRESH_TTL;
  const m = /^(\d+)([smhd])$/.exec(raw);
  if (!m) return 30 * 24 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const mult = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
};

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await userRepo.findByEmail(input.email);
    if (existing) throw ApiError.conflict('EMAIL_TAKEN', 'Email already registered');

    const id = newId();
    const password_hash = await hashPassword(input.password);
    const user = await userRepo.create({
      id,
      name: input.name,
      email: input.email,
      password_hash,
      avatar: null,
      role: 'user',
      status: 'active',
      email_verified: false,
    });

    // create email verification token
    const raw = randomToken(32);
    await query(
      `INSERT INTO one_time_tokens (id, user_id, purpose, token_hash, expires_at)
       VALUES ($1,$2,'email_verify',$3, NOW() + INTERVAL '24 hours')`,
      [newId(), user.id, sha256(raw)]
    );

    // In production, send email. We only log a redacted hint.
    logger.info('Email verification token generated', { userId: user.id });

    return { user, verificationToken: raw };
  },

  async login(input: { email: string; password: string }, meta: SessionMeta) {
    const user = await userRepo.findByEmail(input.email);
    if (!user) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    if (user.status === 'disabled') throw ApiError.forbidden('ACCOUNT_DISABLED', 'Account disabled');

    const okPw = await verifyPassword(input.password, user.password_hash);
    if (!okPw) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');

    return this.issueSession(user.id, user.role, meta);
  },

  async issueSession(userId: string, role: 'user' | 'admin', meta: SessionMeta) {
    const sessionId = newId();
    const accessToken = signAccess({ sub: userId, role, sid: sessionId });
    const { raw, hash } = generateRefreshTokenRaw();
    const refreshToken = signRefresh({ sub: userId, sid: sessionId, jti: newId() });

    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS());

    await refreshTokenRepo.create({
      id: sessionId,
      user_id: userId,
      token_hash: hash, // store hash of random part
      user_agent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      revoked: false,
      replaced_by: null,
      expires_at: expiresAt,
    });

    // Combine JWT jti + random for extra entropy client-side
    return {
      accessToken,
      refreshToken: `${refreshToken}.${raw}`,
      sessionId,
      expiresAt: expiresAt.toISOString(),
    };
  },

  async refresh(rawCombined: string, meta: SessionMeta) {
    const parts = rawCombined.split('.');
    if (parts.length !== 2) throw ApiError.unauthorized('INVALID_REFRESH', 'Invalid refresh token');
    const [jwtPart, randPart] = parts;

    const { verifyRefresh } = await import('../auth/jwt');
    let payload;
    try {
      payload = verifyRefresh(jwtPart);
    } catch {
      throw ApiError.unauthorized('INVALID_REFRESH', 'Invalid refresh token');
    }

    const row = await refreshTokenRepo.findById(payload.sid);
    if (!row || row.revoked || row.expires_at.getTime() < Date.now()) {
      throw ApiError.unauthorized('REFRESH_EXPIRED', 'Refresh token expired or revoked');
    }

    if (hashRefreshToken(randPart) !== row.token_hash) {
      // possible token theft -> revoke all sessions for user
      await refreshTokenRepo.revokeAllForUser(row.user_id);
      throw ApiError.unauthorized('REFRESH_MISMATCH', 'Refresh token mismatch');
    }

    const user = await userRepo.findById(row.user_id);
    if (!user) throw ApiError.unauthorized('USER_NOT_FOUND', 'User not found');
    if (user.status === 'disabled') throw ApiError.forbidden('ACCOUNT_DISABLED', 'Account disabled');

    // rotate
    const newSessionId = newId();
    const newAccess = signAccess({ sub: user.id, role: user.role, sid: newSessionId });
    const { raw: newRaw, hash: newHash } = generateRefreshTokenRaw();
    const newJti = newId();
    const newRefresh = signRefresh({ sub: user.id, sid: newSessionId, jti: newJti });
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS());

    await refreshTokenRepo.revoke(row.id, newSessionId);
    await refreshTokenRepo.create({
      id: newSessionId,
      user_id: user.id,
      token_hash: newHash,
      user_agent: meta.userAgent ?? row.user_agent,
      ip: meta.ip ?? row.ip,
      revoked: false,
      replaced_by: null,
      expires_at: expiresAt,
    });

    return {
      accessToken: newAccess,
      refreshToken: `${newRefresh}.${newRaw}`,
      sessionId: newSessionId,
      expiresAt: expiresAt.toISOString(),
    };
  },

  async logout(sessionId: string, userId: string) {
    const row = await refreshTokenRepo.findById(sessionId);
    if (row && row.user_id === userId) {
      await refreshTokenRepo.revoke(sessionId);
    }
  },

  async logoutAll(userId: string) {
    await refreshTokenRepo.revokeAllForUser(userId);
  },

  async listSessions(userId: string) {
    const rows = await refreshTokenRepo.listActiveForUser(userId);
    return rows.map((r) => ({
      sessionId: r.id,
      userAgent: r.user_agent,
      ip: r.ip,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    }));
  },

  async revokeSession(userId: string, sessionId: string) {
    const row = await refreshTokenRepo.findById(sessionId);
    if (!row || row.user_id !== userId) throw ApiError.notFound('SESSION_NOT_FOUND', 'Session not found');
    await refreshTokenRepo.revoke(sessionId);
  },

  async requestPasswordReset(email: string) {
    const user = await userRepo.findByEmail(email);
    if (!user) return { ok: true }; // do not leak existence
    const raw = randomToken(32);
    await query(
      `INSERT INTO one_time_tokens (id, user_id, purpose, token_hash, expires_at)
       VALUES ($1,$2,'password_reset',$3, NOW() + INTERVAL '1 hour')`,
      [newId(), user.id, sha256(raw)]
    );
    logger.info('Password reset token generated', { userId: user.id });
    return { ok: true, resetToken: raw };
  },

  async resetPassword(token: string, newPassword: string) {
    const hash = sha256(token);
    const { rows } = await query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM one_time_tokens
       WHERE token_hash=$1 AND purpose='password_reset' AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [hash]
    );
    const row = rows[0];
    if (!row) throw ApiError.badRequest('INVALID_TOKEN', 'Invalid or expired token');
    const password_hash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash=$2, updated_at=NOW() WHERE id=$1', [row.user_id, password_hash]);
    await query('UPDATE one_time_tokens SET used_at=NOW() WHERE id=$1', [row.id]);
    await refreshTokenRepo.revokeAllForUser(row.user_id);
    return { ok: true };
  },

  async verifyEmail(token: string) {
    const hash = sha256(token);
    const { rows } = await query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM one_time_tokens
       WHERE token_hash=$1 AND purpose='email_verify' AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [hash]
    );
    const row = rows[0];
    if (!row) throw ApiError.badRequest('INVALID_TOKEN', 'Invalid or expired token');
    await query('UPDATE users SET email_verified=TRUE, updated_at=NOW() WHERE id=$1', [row.user_id]);
    await query('UPDATE one_time_tokens SET used_at=NOW() WHERE id=$1', [row.id]);
    return { ok: true };
  },

  async registerDevicePushToken(userId: string, deviceId: string, token: string) {
    await query(
      `UPDATE devices SET push_token=$3, updated_at=NOW()
       WHERE id=$1 AND owner_id=$2`,
      [deviceId, userId, token]
    );
  },
};
