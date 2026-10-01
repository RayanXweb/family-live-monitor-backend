import { Request, Response } from 'express';
import { invitationService } from '../services/invitation.service';
import { ok, created } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { auditService } from '../services/audit.service';

export const invitationController = {
  async create(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const out = await invitationService.create(req.user.id, req.body);
    await auditService.log('invitation.create', { req, targetType: 'invitation', targetId: out.invitation.id });
    return created(res, out);
  },
  async getByToken(req: Request, res: Response) {
    const out = await invitationService.getByToken(req.params.token);
    return ok(res, out);
  },
  async accept(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const out = await invitationService.accept(req.params.token, req.user.id);
    await auditService.log('invitation.accept', { req, targetType: 'invitation', targetId: out.invitation?.id });
    return ok(res, out);
  },
  async revoke(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await invitationService.revoke(req.user.id, req.params.id);
    await auditService.log('invitation.revoke', { req, targetType: 'invitation', targetId: req.params.id });
    return ok(res, { ok: true });
  },
  async listMine(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    return ok(res, await invitationService.listMine(req.user.id));
  },
};
