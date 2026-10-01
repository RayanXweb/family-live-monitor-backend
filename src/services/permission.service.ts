import { permissionRepo } from '../repositories/permission.repo';
import { PermissionName } from '../types/domain';

export const permissionService = {
  async listForDevice(deviceId: string) {
    return permissionRepo.listForDevice(deviceId);
  },
  async revoke(deviceId: string, viewerId: string, permission: PermissionName) {
    await permissionRepo.revoke(deviceId, viewerId, permission);
  },
  async has(deviceId: string, viewerId: string, permission: PermissionName) {
    return permissionRepo.hasPermission(deviceId, viewerId, permission);
  },
};
