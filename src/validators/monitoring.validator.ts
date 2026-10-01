import { z } from 'zod';

export const requestMonitoringSchema = z.object({
  deviceId: z.string().uuid(),
  permission: z.enum(['view_status', 'view_screen']),
  message: z.string().max(280).optional(),
});
