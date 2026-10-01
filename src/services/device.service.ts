import { deviceRepo } from '../repositories/device.repo';
import { ApiError } from '../utils/ApiError';
import { newId } from '../utils/ids';
import { DeviceRow } from '../types/domain';
import { io } from '../websocket';

export const deviceService = {
  async register(ownerId: string, input: {
    name: string;
    platform?: string;
    model?: string;
    osVersion?: string;
    appVersion?: string;
  }): Promise<DeviceRow> {
    const device: DeviceRow = {
      id: newId(),
      owner_id: ownerId,
      name: input.name,
      platform: input.platform ?? null,
      model: input.model ?? null,
      os_version: input.osVersion ?? null,
      app_version: input.appVersion ?? null,
      status: 'pending',
      battery_level: null,
      network_type: null,
      last_seen_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const created = await deviceRepo.create(device);
    io?.to(`user:${ownerId}`).emit('device:registered', { deviceId: created.id });
    return created;
  },

  async list(ownerId: string) {
    return deviceRepo.listByOwner(ownerId);
  },

  async get(ownerId: string, deviceId: string) {
    const d = await deviceRepo.findById(deviceId);
    if (!d) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Device not found');
    if (d.owner_id !== ownerId) throw ApiError.forbidden('NOT_OWNER', 'You do not own this device');
    return d;
  },

  async update(ownerId: string, deviceId: string, patch: Partial<DeviceRow>) {
    const d = await deviceRepo.findById(deviceId);
    if (!d) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Device not found');
    if (d.owner_id !== ownerId) throw ApiError.forbidden('NOT_OWNER', 'You do not own this device');
    const updated = await deviceRepo.update(deviceId, patch);
    io?.to(`device:${deviceId}`).emit('device:updated', { deviceId });
    io?.to(`user:${ownerId}`).emit('device:updated', { deviceId });
    return updated;
  },

  async remove(ownerId: string, deviceId: string) {
    const d = await deviceRepo.findById(deviceId);
    if (!d) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Device not found');
    if (d.owner_id !== ownerId) throw ApiError.forbidden('NOT_OWNER', 'You do not own this device');
    await deviceRepo.update(deviceId, { status: 'offline' });
    // Hard delete device
    const { query } = await import('../config/database');
    await query('DELETE FROM devices WHERE id=$1', [deviceId]);
    io?.to(`user:${ownerId}`).emit('device:removed', { deviceId });
  },

  async heartbeat(deviceId: string, ownerId: string, battery: number | null, network: string | null) {
    const d = await deviceRepo.findById(deviceId);
    if (!d) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Device not found');
    if (d.owner_id !== ownerId) throw ApiError.forbidden('NOT_OWNER', 'You do not own this device');
    const updated = await deviceRepo.heartbeat(deviceId, battery, network);
    io?.to(`device:${deviceId}`).emit('device:heartbeat', {
      deviceId,
      battery,
      network,
      at: new Date().toISOString(),
    });
    io?.to(`user:${d.owner_id}`).emit('device:heartbeat', { deviceId, battery, network });
    return updated;
  },
};
