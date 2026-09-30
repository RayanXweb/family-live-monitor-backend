import { randomToken, sha256 } from '../utils/crypto';
import { newId } from '../utils/ids';

export function generateRefreshTokenRaw() {
  const raw = randomToken(48);
  const hash = sha256(raw);
  const jti = newId();
  return { raw, hash, jti };
}

export function hashRefreshToken(raw: string) {
  return sha256(raw);
}
