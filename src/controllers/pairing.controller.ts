import { Request, Response } from 'express';
import { pairingService } from '../services/pairing.service';
import { ok } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { auditService } from '../services/audit.service';

export const pairingController = {
  async generateCode(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const out = await pairingService.generateCode(req.user.id, req.body.deviceId);
    await auditService.log('pairing.generate', { req, targetType: 'device', targetId: req.body.deviceId });
    return ok(res, out);
  },
  async verifyPairing(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const out = await pairingService.verifyPairing(req.user.id, req.body.code);
    await auditService.log('pairing.verify', { req, targetType: 'device', targetId: out.device?.id });
    return ok(res, out);
  },
  async revoke(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await pairingService.revoke(req.user.id, req.params.id);
    await auditService.log('pairing.revoke', { req, targetType: 'device', targetId: req.params.id });
    return ok(res, { ok: true });
  },
};
