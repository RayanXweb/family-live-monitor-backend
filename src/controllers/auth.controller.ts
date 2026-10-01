import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { ok, created } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { auditService } from '../services/audit.service';

export const authController = {
  async register(req: Request, res: Response) {
    const { name, email, password } = req.body;
    const { user, verificationToken } = await authService.register({ name, email, password });
    await auditService.log('auth.register', { req, actorId: user.id });
    // In real prod, don't return verificationToken. We return it here so dev/testing can work without mail provider.
    return created(res, {
      user: { id: user.id, name: user.name, email: user.email },
      verificationToken,
    });
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const session = await authService.login(
      { email, password },
      { userAgent: req.headers['user-agent'], ip: req.ip }
    );
    await auditService.log('auth.login', { req, actorId: (await import('../auth/jwt')).verifyAccess(session.accessToken).sub });
    return ok(res, session);
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const session = await authService.refresh(refreshToken, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    return ok(res, session);
  },

  async logout(req: Request, res: Response) {
    if (!req.user?.sessionId) throw ApiError.unauthorized();
    await authService.logout(req.user.sessionId, req.user.id);
    await auditService.log('auth.logout', { req });
    return ok(res, { ok: true });
  },

  async logoutAll(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await authService.logoutAll(req.user.id);
    await auditService.log('auth.logout_all', { req });
    return ok(res, { ok: true });
  },

  async sessions(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const sessions = await authService.listSessions(req.user.id);
    return ok(res, sessions);
  },

  async revokeSession(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    await authService.revokeSession(req.user.id, id);
    await auditService.log('auth.revoke_session', { req, targetId: id });
    return ok(res, { ok: true });
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    const out = await authService.requestPasswordReset(email);
    await auditService.log('auth.forgot_password', { req, metadata: { email } });
    return ok(res, out);
  },

  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    const out = await authService.resetPassword(token, newPassword);
    await auditService.log('auth.reset_password', { req });
    return ok(res, out);
  },

  async verifyEmail(req: Request, res: Response) {
    const { token } = req.body;
    const out = await authService.verifyEmail(token);
    await auditService.log('auth.verify_email', { req });
    return ok(res, out);
  },
};
