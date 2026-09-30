type Level = 'debug' | 'info' | 'warn' | 'error';

function ts() {
  return new Date().toISOString();
}

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  const safeMeta = meta ? sanitize(meta) : undefined;
  const line = JSON.stringify({
    ts: ts(),
    level,
    msg,
    ...(safeMeta ?? {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const SENSITIVE_KEYS = [
  'password',
  'pass',
  'authorization',
  'cookie',
  'token',
  'accessToken',
  'refreshToken',
  'privateKey',
  'secret',
  'jwt',
  'apiKey',
];

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
};
