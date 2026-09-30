import admin from 'firebase-admin';
import { env, firebaseEnabled } from './env';
import { logger } from './logger';

let initialized = false;

export function initFirebase() {
  if (!firebaseEnabled) {
    logger.warn('Firebase disabled (missing env). Push notifications will be no-op.');
    return;
  }
  if (initialized) return;
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID!,
        clientEmail: env.FIREBASE_CLIENT_EMAIL!,
        privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
    initialized = true;
    logger.info('Firebase Admin initialized');
  } catch (err) {
    logger.error('Firebase init failed', { error: (err as Error).message });
  }
}

export function getFirebaseMessaging() {
  if (!initialized) return null;
  return admin.messaging();
}
