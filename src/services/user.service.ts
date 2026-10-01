import { userRepo } from '../repositories/user.repo';
import { ApiError } from '../utils/ApiError';

export const userService = {
  async me(userId: string) {
    const u = await userRepo.findById(userId);
    if (!u) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role,
      status: u.status,
      emailVerified: u.email_verified,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };
  },
  async updateMe(userId: string, patch: { name?: string; avatar?: string }) {
    const updated = await userRepo.update(userId, patch);
    if (!updated) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
    return this.me(userId);
  },
  async adminListUsers(limit = 50, offset = 0) {
    const rows = await userRepo.list(limit, offset);
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
    }));
  },
  async adminSetStatus(userId: string, status: 'active' | 'disabled') {
    const updated = await userRepo.update(userId, { status });
    if (!updated) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
    return updated;
  },
};
