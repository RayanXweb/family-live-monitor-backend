import bcrypt from 'bcryptjs';
const ROUNDS = 12;
export const hashPassword = (p: string) => bcrypt.hash(p, ROUNDS);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);
