import { notificationRepo } from '../repositories/notification.repo';
import { newId } from '../utils/ids';
import { io } from '../websocket';

export const notificationService = {
  async createAndEmit(userId: string, type: string, title: string, body?: string, data?: Record<string, unknown>) {
    const row = await notificationRepo.create({
      id: newId(),
      user_id: userId,
      type,
      title,
      body,
      data,
    });
    io?.to(`user:${userId}`).emit('notification:new', row);
    return row;
  },
};
