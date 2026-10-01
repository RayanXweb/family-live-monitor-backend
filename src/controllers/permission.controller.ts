import { Request, Response } from 'express';
import { permissionService } from '../services/permission.service';
import { ok } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const permissionController = {
  async list(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    return ok(res, await permissionService.listForDevice(req.params.deviceId));
  },
  async revoke(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const { deviceId, viewerId, permission } = req.params;
    await permissionService.revoke(deviceId, viewerId, permission as any);
    return ok(res, { ok: true });
  },
};
