import { auditRepo } from '../repositories/audit.repo';
import { newId } from '../utils/ids';
import { Request } from 'express';
import { logger } from '../config/logger';

export const auditService = {
  async log(
    action: string,
    opts: {
      req?: Request;
      actorId?: string | null;
      targetType?: string;
      targetId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    try {
      await auditRepo.log({
        id: newId(),
        actor_id: opts.actorId ?? opts.req?.user?.id ?? null,
        action,
        target_type: opts.targetType,
        target_id: opts.targetId,
        ip: opts.req?.ip,
        user_agent: opts.req?.headers['user-agent'],
        metadata: opts.metadata,
      });
    } catch (err) {
      logger.warn('Audit log failed', { action, error: (err as Error).message });
    }
  },
};
