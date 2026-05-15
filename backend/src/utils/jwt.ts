import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export function generateAccessToken(payload: { userId: number; email: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: { userId: number }): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  return jwt.sign({ ...payload, jti: randomBytes(16).toString('hex') }, secret, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): { userId: number; email: string } {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.verify(token, secret) as { userId: number; email: string };
}

export function verifyRefreshToken(token: string): { userId: number } {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  return jwt.verify(token, secret) as { userId: number };
}
