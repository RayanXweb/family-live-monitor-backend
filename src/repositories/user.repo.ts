import { query } from '../config/database';
import { UserRow } from '../types/domain';

export const userRepo = {
  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  },
  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await query<UserRow>('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    return rows[0] ?? null;
  },
  async create(u: Omit<UserRow, 'created_at' | 'updated_at'>): Promise<UserRow> {
    const { rows } = await query<UserRow>(
      `INSERT INTO users (id, name, email, password_hash, avatar, role, status, email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [u.id, u.name, u.email.toLowerCase(), u.password_hash, u.avatar, u.role, u.status, u.email_verified]
    );
    return rows[0];
  },
  async update(id: string, patch: Partial<Pick<UserRow, 'name' | 'avatar' | 'status' | 'email_verified'>>): Promise<UserRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(patch)) {
      fields.push(`${k} = $${i++}`);
      values.push(v);
    }
    if (fields.length === 0) return this.findById(id);
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },
  async list(limit = 50, offset = 0): Promise<UserRow[]> {
    const { rows } = await query<UserRow>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return rows;
  },
};
