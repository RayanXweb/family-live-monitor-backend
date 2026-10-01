import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: true,
  legacyHeaders: false,
};

export const generalLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 300,
});

export const authLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 10,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } },
});

export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60_000,
  limit: 10,
});

export const invitationLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 30,
});

export const pairingLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 30,
});

export const monitoringRequestLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 20,
});
