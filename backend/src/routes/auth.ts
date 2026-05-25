import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { logActivity } from '../lib/activityLogger';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta giriniz'),
  password: z
    .string()
    .min(6, 'Şifre en az 6 karakter olmalı')
    .max(72, 'Şifre çok uzun'),
  username: z
    .string()
    .min(3, 'Kullanıcı adı en az 3 karakter')
    .max(30, 'Kullanıcı adı en fazla 30 karakter')
    .regex(/^[a-zA-Z0-9_]+$/, 'Sadece harf, rakam ve alt çizgi'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function persistRefreshToken(userId: number): Promise<string> {
  const token = generateRefreshToken({ userId });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  return token;
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, username } = req.body as z.infer<typeof registerSchema>;

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: { email, passwordHash, username },
        select: { id: true, email: true, username: true },
      });

      const accessToken = generateAccessToken({ userId: user.id, email: user.email });
      const refreshToken = await persistRefreshToken(user.id);

      logActivity({ userId: user.id, action: 'register' });

      setRefreshCookie(res, refreshToken);
      res.status(201).json({ data: { user, accessToken } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, username: true, passwordHash: true },
      });

      if (!user) {
        res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
        return;
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email });
      const refreshToken = await persistRefreshToken(user.id);

      logActivity({ userId: user.id, action: 'login' });

      setRefreshCookie(res, refreshToken);

      const { passwordHash: _ph, ...userSafe } = user;
      res.json({ data: { user: userSafe, accessToken } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, username: true, language: true,
          preferences: { select: { onboardingDone: true } },
        },
      });

      if (!user) {
        res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        return;
      }

      const { preferences, ...userFields } = user;
      res.json({ data: { ...userFields, onboardingDone: preferences?.onboardingDone ?? false } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token: string | undefined = req.cookies?.refreshToken;

      if (!token) {
        res.status(401).json({ error: 'Refresh token bulunamadı' });
        return;
      }

      // Verify JWT signature first
      let payload: { userId: number };
      try {
        payload = verifyRefreshToken(token);
      } catch {
        res.status(401).json({ error: 'Geçersiz veya süresi dolmuş refresh token' });
        return;
      }

      // Then check the DB record exists and hasn't expired
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        res.status(401).json({ error: 'Refresh token geçersiz veya süresi dolmuş' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true },
      });

      if (!user) {
        res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        return;
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email });
      res.json({ data: { accessToken } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token: string | undefined = req.cookies?.refreshToken;

      if (token) {
        const stored = await prisma.refreshToken.findUnique({ where: { token }, select: { userId: true } });
        await prisma.refreshToken.deleteMany({ where: { token } });
        if (stored) logActivity({ userId: stored.userId, action: 'logout' });
      }

      res.clearCookie('refreshToken');
      res.json({ data: { message: 'Başarıyla çıkış yapıldı' } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
