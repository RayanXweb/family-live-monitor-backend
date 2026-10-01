import { monitoringRepo } from '../repositories/monitoring.repo';
import { deviceRepo } from '../repositories/device.repo';
import { permissionRepo } from '../repositories/permission.repo';
import { newId } from '../utils/ids';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { addSeconds } from '../utils/time';
import { PermissionName } from '../types/domain';
import { io } from '../websocket';
import { notificationService } from './notification.service';

export const monitoringService = {
  async request(viewerId: string, input: { deviceId: string; permission: PermissionName; message?: string }) {
    const device = await deviceRepo.findById(input.deviceId);
    if (!device) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Device not found');
    if (device.owner_id === viewerId) throw ApiError.badRequest('SELF_REQUEST', 'Cannot request your own device');

    // If permission already granted, skip request -> return existing-grant shortcut
    const alreadyGranted = await permissionRepo.hasPermission(input.deviceId, viewerId, input.permission);
    if (alreadyGranted) {
      throw ApiError.conflict('ALREADY_GRANTED', 'Permission already granted');
    }

    const request = await monitoringRepo.createRequest({
      id: newId(),
      owner_id: device.owner_id,
      viewer_id: viewerId,
      device_id: input.deviceId,
      permission: input.permission,
      status: 'requested',
      message: input.message ?? null,
      expires_at: addSeconds(new Date(), 300), // 5 minutes to respond
    });

    io?.to(`user:${device.owner_id}`).emit('monitoring:request', request);
    await notificationService.createAndEmit(
      device.owner_id,
      'monitoring_request',
      'New monitoring request',
      `A family member is requesting ${input.permission} access.`,
      { requestId: request.id, deviceId: device.id }
    );

    return request;
  },

  async approve(ownerId: string, requestId: string) {
    const req = await monitoringRepo.findRequest(requestId);
    if (!req) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');
    if (req.owner_id !== ownerId) throw ApiError.forbidden('NOT_OWNER', 'Only device owner can approve');
    if (req.status !== 'requested') throw ApiError.badRequest('REQUEST_NOT_PENDING', 'Request not pending');

    await monitoringRepo.respondRequest(requestId, 'approved');
    await permissionRepo.grant(req.device_id, req.viewer_id, req.permission, ownerId);

    const session = await monitoringRepo.createSession({
      id: newId(),
      request_id: req.id,
      owner_id: ownerId,
      viewer_id: req.viewer_id,
      device_id: req.device_id,
      permission: req.permission,
      status: 'approved',
      expires_at: addSeconds(new Date(), env.MONITORING_SESSION_TTL_SECONDS),
    });

    io?.to(`user:${req.viewer_id}`).emit('monitoring:approved', { session });
    io?.to(`user:${ownerId}`).emit('monitoring:session_created', { session });

    return session;
  },

  async reject(ownerId: string, requestId: string) {
    const req = await monitoringRepo.findRequest(requestId);
    if (!req) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');
    if (req.owner_id !== ownerId) throw ApiError.forbidden('NOT_OWNER', 'Only device owner can reject');
    if (req.status !== 'requested') throw ApiError.badRequest('REQUEST_NOT_PENDING', 'Request not pending');

    await monitoringRepo.respondRequest(requestId, 'rejected');
    io?.to(`user:${req.viewer_id}`).emit('monitoring:rejected', { requestId });
    return { ok: true };
  },

  async startSession(actorId: string, sessionId: string) {
    const session = await monitoringRepo.findSession(sessionId);
    if (!session) throw ApiError.notFound('SESSION_NOT_FOUND', 'Session not found');
    if (session.owner_id !== actorId && session.viewer_id !== actorId) {
      throw ApiError.forbidden('NOT_PARTICIPANT', 'Not a session participant');
    }
    if (session.status !== 'approved' && session.status !== 'active') {
      throw ApiError.badRequest('SESSION_NOT_STARTABLE', 'Session cannot be started');
    }
    // Double-check permission is still valid
    const ok = await permissionRepo.hasPermission(session.device_id, session.viewer_id, session.permission);
    if (!ok) throw ApiError.forbidden('PERMISSION_REVOKED', 'Permission no longer valid');

    const updated = await monitoringRepo.startSession(sessionId);
    io?.to(`user:${session.owner_id}`).emit('monitoring:started', { session: updated });
    io?.to(`user:${session.viewer_id}`).emit('monitoring:started', { session: updated });
    io?.to(`session:${session.id}`).emit('monitoring:started', { session: updated });
    return updated;
  },

  async stop(actorId: string, sessionId: string) {
    const session = await monitoringRepo.findSession(sessionId);
    if (!session) throw ApiError.notFound('SESSION_NOT_FOUND', 'Session not found');
    if (session.owner_id !== actorId && session.viewer_id !== actorId) {
      throw ApiError.forbidden('NOT_PARTICIPANT', 'Not a session participant');
    }
    const updated = await monitoringRepo.stopSession(sessionId);
    io?.to(`user:${session.owner_id}`).emit('monitoring:stopped', { session: updated });
    io?.to(`user:${session.viewer_id}`).emit('monitoring:stopped', { session: updated });
    io?.to(`session:${session.id}`).emit('monitoring:stopped', { session: updated });
    return updated;
  },

  async listRequestsForOwner(ownerId: string) {
    return monitoringRepo.listRequestsForOwner(ownerId);
  },

  async getSession(actorId: string, sessionId: string) {
    const session = await monitoringRepo.findSession(sessionId);
    if (!session) throw ApiError.notFound('SESSION_NOT_FOUND', 'Session not found');
    if (session.owner_id !== actorId && session.viewer_id !== actorId) {
      throw ApiError.forbidden('NOT_PARTICIPANT', 'Not a session participant');
    }
    return session;
  },
};
