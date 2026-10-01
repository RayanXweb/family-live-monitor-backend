import { groupRepo } from '../repositories/group.repo';
import { newId } from '../utils/ids';
import { ApiError } from '../utils/ApiError';

export const groupService = {
  async create(ownerId: string, name: string) {
    return groupRepo.create(newId(), name, ownerId);
  },
  async list(userId: string) {
    return groupRepo.listForUser(userId);
  },
  async addMember(actorId: string, groupId: string, userId: string, role: 'admin' | 'member' = 'member') {
    const groups = await groupRepo.listForUser(actorId);
    const g = groups.find((x: any) => x.id === groupId);
    if (!g) throw ApiError.forbidden('NOT_MEMBER', 'You are not a member of this group');
    if (g.member_role !== 'owner' && g.member_role !== 'admin') {
      throw ApiError.forbidden('NOT_ADMIN', 'Only group admins can add members');
    }
    return groupRepo.addMember(groupId, userId, role);
  },
  async removeMember(actorId: string, groupId: string, userId: string) {
    const groups = await groupRepo.listForUser(actorId);
    const g = groups.find((x: any) => x.id === groupId);
    if (!g) throw ApiError.forbidden('NOT_MEMBER', 'You are not a member of this group');
    if (g.member_role !== 'owner' && g.member_role !== 'admin') {
      throw ApiError.forbidden('NOT_ADMIN', 'Only group admins can remove members');
    }
    if (g.owner_id === userId) throw ApiError.badRequest('CANNOT_REMOVE_OWNER', 'Cannot remove group owner');
    await groupRepo.removeMember(groupId, userId);
  },
  async listMembers(actorId: string, groupId: string) {
    const groups = await groupRepo.listForUser(actorId);
    if (!groups.find((x: any) => x.id === groupId)) {
      throw ApiError.forbidden('NOT_MEMBER', 'You are not a member of this group');
    }
    return groupRepo.listMembers(groupId);
  },
};
