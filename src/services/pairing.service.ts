import { pairingRepo } from '../repositories/pairing.repo';
import { deviceRepo } from '../repositories/device.repo';
import { newId } from '../utils/ids';
import { randomNumericCode, sha256 } from '../utils/crypto';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { io } from '../websocket';
import { addSeconds } from '../utils/time';

export const pairingService = {
  async generateCode(ownerId: string, deviceId: string) {
    const device = await deviceRepo.findById(deviceId);
    if (!device) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Device not found');
    if (device.owner_id !== ownerId) throw ApiError.forbidden('NOT_OWNER', 'You do not own this device');

    // revoke previous active code
    const prev = await pairingRepo.findActiveByDevice(deviceId);
    if (prev) await pairingRepo.revoke(prev.id);

    const code = randomNumericCode(6);
    const expiresAt = addSeconds(new Date(), env.PAIRING_CODE_TTL_SECONDS);

    await pairingRepo.create({
      id: newId(),
      device_id: deviceId,
      code_hash: sha256(code),
      status: 'active',
      expires_at: expiresAt,
      used_at: null,
      created_by: ownerId,
    });

    return {
      code,
      deviceId,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: env.PAIRING_CODE_TTL_SECONDS,
    };
  },

  async verifyPairing(ownerId: string, code: string) {
    const hash = sha256(code);
    const row = await pairingRepo.findActiveByCodeHash(hash);
    if (!row) throw ApiError.badRequest('INVALID_CODE', 'Invalid or expired pairing code');
    const device = await deviceRepo.findById(row.device_id);
    if (!device) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Device not found');
    if (device.owner_id !== ownerId) throw ApiError.forbidden('NOT_OWNER', 'You do not own this device');

    await pairingRepo.markUsed(row.id);
    const updated = await deviceRepo.update(device.id, { status: 'online' });
    io?.to(`device:${device.id}`).emit('pairing:verified', { deviceId: device.id });
    io?.to(`user:${device.owner_id}`).emit('pairing:verified', { deviceId: device.id });
    return { device: updated };
  },

  async revoke(ownerId: string, deviceId: string) {
    const device = await deviceRepo.findById(deviceId);
    if (!device) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Device not found');
    if (device.owner_id !== ownerId) throw ApiError.forbidden('NOT_OWNER', 'You do not own this device');
    const active = await pairingRepo.findActiveByDevice(deviceId);
    if (active) await pairingRepo.revoke(active.id);
  },
};
