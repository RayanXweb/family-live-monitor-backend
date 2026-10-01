import { NextFunction, Request, Response } from 'express';
import { verifyAccess } from '../auth/jwt';
import { ApiError } from '../utils/ApiError';

export function authRequired(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('MISSING_TOKEN', 'Missing bearer token'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, role: payload.role, sessionId: payload.sid };
    next();
  } catch {
    next(ApiError.unauthorized('INVALID_TOKEN', 'Invalid or expired token'));
  }
}

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, role: payload.role, sessionId: payload.sid };
  } catch {
    // ignore
  }
  next();
}
