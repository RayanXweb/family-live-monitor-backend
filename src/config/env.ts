import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '8080', 10),
  IS_PROD: (process.env.NODE_ENV ?? 'development') === 'production',

  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? '30d',

  FRONTEND_URL: required('FRONTEND_URL'),

  FIREBASE_PROJECT_ID: optional('FIREBASE_PROJECT_ID'),
  FIREBASE_CLIENT_EMAIL: optional('FIREBASE_CLIENT_EMAIL'),
  FIREBASE_PRIVATE_KEY: optional('FIREBASE_PRIVATE_KEY'),
  FIREBASE_API_KEY: optional('FIREBASE_API_KEY'),
  FIREBASE_AUTH_DOMAIN: optional('FIREBASE_AUTH_DOMAIN'),
  FIREBASE_MESSAGING_SENDER_ID: optional('FIREBASE_MESSAGING_SENDER_ID'),
  FIREBASE_APP_ID: optional('FIREBASE_APP_ID'),

  PAIRING_CODE_TTL_SECONDS: parseInt(process.env.PAIRING_CODE_TTL_SECONDS ?? '300', 10),
  INVITATION_DEFAULT_TTL_SECONDS: parseInt(process.env.INVITATION_DEFAULT_TTL_SECONDS ?? '86400', 10),
  MONITORING_SESSION_TTL_SECONDS: parseInt(process.env.MONITORING_SESSION_TTL_SECONDS ?? '3600', 10),
  DEVICE_HEARTBEAT_TIMEOUT_SECONDS: parseInt(process.env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS ?? '90', 10),
};

export const firebaseEnabled = Boolean(
  env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY
);
