import { query } from '../config/database';

export const notificationRepo = {
  async create(n: { id: string; user_id: string; type: string; title: string; body?: string; data?: unknown }) {
    const { rows } = await query(
      `INSERT INTO notifications (id, user_id, type, title, body, data)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [n.id, n.user_id, n.type, n.title, n.body ?? null, n.data ? JSON.stringify(n.data) : null]
    );
    return rows[0];
  },
  async listForUser(userId: string, limit = 50) {
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows;
  },
  async markRead(id: string, userId: string) {
    await query('UPDATE notifications SET read_at = NOW() WHERE id=$1 AND user_id=$2', [id, userId]);
  },
  async markAllRead(userId: string) {
    await query('UPDATE notifications SET read_at = NOW() WHERE user_id=$1 AND read_at IS NULL', [userId]);
  },
};
