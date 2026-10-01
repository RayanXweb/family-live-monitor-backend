import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { ok } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const userController = {
  async me(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    return ok(res, await userService.me(req.user.id));
  },
  async updateMe(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const { name, avatar } = req.body;
    return ok(res, await userService.updateMe(req.user.id, { name, avatar }));
  },
};
