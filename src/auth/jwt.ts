import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessPayload {
  sub: string;
  role: 'user' | 'admin';
  sid: string; // session id
}

export interface RefreshPayload {
  sub: string;
  sid: string;
  jti: string;
}

export function signAccess(p: AccessPayload): string {
  return jwt.sign(p, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as SignOptions);
}

export function signRefresh(p: RefreshPayload): string {
  return jwt.sign(p, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL } as SignOptions);
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessPayload;
}

export function verifyRefresh(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
}
