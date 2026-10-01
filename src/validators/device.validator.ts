import { z } from 'zod';

export const deviceCreateSchema = z.object({
  name: z.string().min(1).max(100),
  platform: z.string().max(40).optional(),
  model: z.string().max(80).optional(),
  osVersion: z.string().max(40).optional(),
  appVersion: z.string().max(40).optional(),
});

export const deviceUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['online', 'offline', 'pending']).optional(),
  batteryLevel: z.number().int().min(0).max(100).optional(),
  networkType: z.string().max(40).optional(),
});

export const heartbeatSchema = z.object({
  battery: z.number().int().min(0).max(100).nullable().optional(),
  network: z.string().max(40).nullable().optional(),
});
