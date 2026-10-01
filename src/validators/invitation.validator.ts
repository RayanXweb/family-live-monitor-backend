import { z } from 'zod';

export const createInvitationSchema = z.object({
  deviceId: z.string().uuid(),
  permissions: z.array(z.enum(['view_status', 'view_screen'])).min(1),
  ttlSeconds: z.number().int().min(60).max(60 * 60 * 24 * 30).optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
});
