import { Request, Response } from 'express';
import { deviceService } from '../services/device.service';
import { ok, created, noContent } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { auditService } from '../services/audit.service';

export const deviceController = {
  async register(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const d = await deviceService.register(req.user.id, req.body);
    await auditService.log('device.register', { req, targetType: 'device', targetId: d.id });
    return created(res, d);
  },
  async list(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    return ok(res, await deviceService.list(req.user.id));
  },
  async get(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    return ok(res, await deviceService.get(req.user.id, req.params.id));
  },
  async update(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const updated = await deviceService.update(req.user.id, req.params.id, {
      name: req.body.name,
      status: req.body.status,
      battery_level: req.body.batteryLevel,
      network_type: req.body.networkType,
    });
    await auditService.log('device.update', { req, targetType: 'device', targetId: req.params.id });
    return ok(res, updated);
  },
  async remove(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await deviceService.remove(req.user.id, req.params.id);
    await auditService.log('device.remove', { req, targetType: 'device', targetId: req.params.id });
    return noContent(res);
  },
  async heartbeat(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const updated = await deviceService.heartbeat(
      req.params.id,
      req.user.id,
      req.body.battery ?? null,
      req.body.network ?? null
    );
    return ok(res, updated);
  },
};
