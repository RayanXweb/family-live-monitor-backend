import { z } from 'zod';

export const generateCodeSchema = z.object({
  deviceId: z.string().uuid(),
});

export const verifyPairingSchema = z.object({
  code: z.string().min(4).max(12),
});
