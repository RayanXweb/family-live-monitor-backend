import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../types/domain';

export const requireRole = (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('FORBIDDEN_ROLE', 'Insufficient role'));
    next();
  };
