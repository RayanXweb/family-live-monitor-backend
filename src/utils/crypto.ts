import crypto from 'crypto';

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomNumericCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10);
  return out;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
