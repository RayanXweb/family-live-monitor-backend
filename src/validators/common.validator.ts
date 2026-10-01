import { z } from 'zod';
export const idParam = z.object({ id: z.string().uuid() });
export const tokenParam = z.object({ token: z.string().min(10).max(200) });
