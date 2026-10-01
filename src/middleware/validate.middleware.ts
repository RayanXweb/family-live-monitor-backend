import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'query' | 'params';

export const validate =
  (schema: AnyZodObject, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      (req as any)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          ApiError.badRequest('VALIDATION_ERROR', 'Invalid request', err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })))
        );
      }
      next(err);
    }
  };
