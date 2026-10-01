import { Request, Response } from 'express';
import { pool } from '../config/database';

export const healthController = {
  async health(_req: Request, res: Response) {
    let dbOk = false;
    try {
      await pool.query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      service: 'family-live-monitor',
      timestamp: new Date().toISOString(),
      checks: { database: dbOk ? 'ok' : 'down' },
    });
  },
};
