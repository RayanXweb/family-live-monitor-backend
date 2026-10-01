import { invitationRepo } from '../repositories/invitation.repo';
import { deviceRepo } from '../repositories/device.repo';
import { permissionRepo } from '../repositories/permission.repo';
import { newId } from '../utils/ids';
import { randomToken, sha256 } from '../utils/crypto';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { addSeconds } from '../utils/time';
import { PermissionName } from '../types/domain';
import { io } from '../websocket';

const ALLOWED_PERMS: PermissionName[] = ['view_status', 'view_screen'];

export const invitationService = {
  async create(creatorId: string, input: {
    deviceId: string;
    permissions: PermissionName[];
    ttlSeconds?: number;
    maxUses?: number;
  }) {
    const device = await deviceRepo.findById(input.deviceId);
    if (!device) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Device not found');
    if (device.owner_id !== creatorId) throw ApiError.forbidden('NOT_OWNER', 'You do not own this device');

    const permissions = (input.permissions ?? ['view_status']).filter((p) => ALLOWED_PERMS.includes(p));
    if (permissions.length === 0) throw ApiError.badRequest('INVALID_PERMISSION', 'No valid permissions');

    const ttl = input.ttlSeconds ?? env.INVITATION_DEFAULT_TTL_SECONDS;
    const raw = randomToken(32);
    const token_hash = sha256(raw);
    const expiration = addSeconds(new Date(), ttl);

    const invitation = await invitationRepo.create({
      id: newId(),
      token_hash,
      device_id: input.deviceId,
      creator_id: creatorId,
      permissions,
      expiration,
      max_uses: input.maxUses ?? 1,
      used_count: 0,
      status: 'active',
    });

    io?.to(`user:${creatorId}`).emit('invitation:created', { invitationId: invitation.id });

    return {
      invitation,
      token: raw, // returned ONCE, not stored in plaintext
      url: `${env.FRONTEND_URL}/invite/${raw}`,
    };
  },

  async getByToken(token: string) {
    const hash = sha256(token);
    const inv = await invitationRepo.findByHash(hash);
    if (!inv) throw ApiError.notFound('INVITATION_NOT_FOUND', 'Invitation not found');
    if (inv.status !== 'active' || inv.expiration.getTime() <= Date.now()) {
      throw ApiError.badRequest('INVITATION_INACTIVE', 'Invitation is not active');
    }
    const device = await deviceRepo.findById(inv.device_id);
    return {
      id: inv.id,
      deviceId: inv.device_id,
      device: device ? { id: device.id, name: device.name } : null,
      permissions: inv.permissions,
      expiration: inv.expiration,
      maxUses: inv.max_uses,
      usedCount: inv.used_count,
      status: inv.status,
    };
  },

  async accept(token: string, acceptorId: string) {
    const hash = sha256(token);
    const inv = await invitationRepo.findByHash(hash);
    if (!inv) throw ApiError.notFound('INVITATION_NOT_FOUND', 'Invitation not found');
    if (inv.status !== 'active') throw ApiError.badRequest('INVITATION_INACTIVE', 'Invitation is not active');
    if (inv.expiration.getTime() <= Date.now()) throw ApiError.badRequest('INVITATION_EXPIRED', 'Invitation expired');
    if (inv.used_count >= inv.max_uses) throw ApiError.badRequest('INVITATION_USED', 'Invitation fully used');

    for (const p of inv.permissions as PermissionName[]) {
      await permissionRepo.grant(inv.device_id, acceptorId, p, inv.creator_id);
    }

    const updated = await invitationRepo.incrementUse(inv.id);

    io?.to(`user:${inv.creator_id}`).emit('invitation:accepted', {
      invitationId: inv.id,
      acceptorId,
      deviceId: inv.device_id,
    });

    return { invitation: updated, deviceId: inv.device_id, permissions: inv.permissions };
  },

  async revoke(creatorId: string, invitationId: string) {
    const ok = await invitationRepo.revoke(invitationId, creatorId);
    if (!ok) throw ApiError.notFound('INVITATION_NOT_FOUND', 'Invitation not found or already inactive');
    io?.to(`user:${creatorId}`).emit('invitation:revoked', { invitationId });
  },

  async listMine(creatorId: string) {
    return invitationRepo.listByCreator(creatorId);
  },
};
