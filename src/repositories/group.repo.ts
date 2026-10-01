import { query } from '../config/database';

export const groupRepo = {
  async create(id: string, name: string, ownerId: string) {
    const { rows } = await query(
      `INSERT INTO family_groups (id, name, owner_id) VALUES ($1,$2,$3) RETURNING *`,
      [id, name, ownerId]
    );
    await query(
      `INSERT INTO group_members (id, group_id, user_id, role) VALUES (gen_random_uuid(), $1,$2,'owner')`,
      [id, ownerId]
    );
    return rows[0];
  },
  async listForUser(userId: string) {
    const { rows } = await query(
      `SELECT g.*, gm.role AS member_role
       FROM family_groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [userId]
    );
    return rows;
  },
  async addMember(groupId: string, userId: string, role: 'admin' | 'member' = 'member') {
    const { rows } = await query(
      `INSERT INTO group_members (id, group_id, user_id, role)
       VALUES (gen_random_uuid(), $1,$2,$3)
       ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [groupId, userId, role]
    );
    return rows[0];
  },
  async removeMember(groupId: string, userId: string) {
    await query('DELETE FROM group_members WHERE group_id=$1 AND user_id=$2', [groupId, userId]);
  },
  async listMembers(groupId: string) {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.avatar, gm.role, gm.joined_at
       FROM group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 ORDER BY gm.joined_at ASC`,
      [groupId]
    );
    return rows;
  },
};
