import { getFirebaseMessaging } from '../config/firebase';
import { logger } from '../config/logger';

export const firebaseService = {
  async sendPushToToken(token: string, title: string, body: string, data?: Record<string, string>) {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      logger.debug('Skip push (Firebase disabled)', { title });
      return;
    }
    try {
      await messaging.send({
        token,
        notification: { title, body },
        data: data ?? {},
      });
    } catch (err) {
      logger.warn('FCM send failed', { error: (err as Error).message });
    }
  },
};
