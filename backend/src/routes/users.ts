import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// ─── Multer (avatar upload) ───────────────────────────────────────────────────

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'public', 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Sadece JPEG, PNG, WebP veya GIF yükleyebilirsiniz.'));
  },
});

// ─── Schemas ─────────────────────────────────────────────────────────────────

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  language: z.string().min(2).max(5).optional(),
});

const updateProfileSchema = z.object({
  username: z.string().min(3, 'En az 3 karakter').max(30).optional(),
  email: z.string().email('Geçerli e-posta giriniz').optional(),
  phone: z.string().max(20).optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Yeni şifre en az 6 karakter olmalı'),
});

const onboardingSchema = z.object({
  genres: z.array(z.string()),
  contentIds: z.array(z.number().int()).optional().default([]),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// PUT /api/users/:id  (dil güncelleme — Layout'tan çağrılır)
router.put(
  '/:id',
  authMiddleware,
  validate(updateUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.user!.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }

      const { username, language } = req.body as z.infer<typeof updateUserSchema>;

      const user = await prisma.user.update({
        where: { id },
        data: { username, language },
        select: { id: true, email: true, username: true, language: true },
      });

      res.json({ data: user });
    } catch (err) { next(err); }
  }
);

// PATCH /api/users/:id/profile  (username, email, phone)
router.patch(
  '/:id/profile',
  authMiddleware,
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.user!.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }

      const { username, email, phone } = req.body as z.infer<typeof updateProfileSchema>;

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(username !== undefined ? { username } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
        select: { id: true, email: true, username: true, language: true, phone: true, avatarUrl: true },
      });

      res.json({ data: user });
    } catch (err) { next(err); }
  }
);

// PATCH /api/users/:id/password
router.patch(
  '/:id/password',
  authMiddleware,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.user!.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }

      const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;

      const user = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
      if (!user) { res.status(404).json({ error: 'Kullanıcı bulunamadı' }); return; }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) { res.status(400).json({ error: 'Mevcut şifre yanlış' }); return; }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id }, data: { passwordHash } });

      res.json({ data: { message: 'Şifre başarıyla güncellendi' } });
    } catch (err) { next(err); }
  }
);

// POST /api/users/:id/avatar
router.post(
  '/:id/avatar',
  authMiddleware,
  upload.single('avatar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.user!.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }

      if (!req.file) { res.status(400).json({ error: 'Dosya bulunamadı' }); return; }

      // Delete old avatar file if exists
      const existing = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
      if (existing?.avatarUrl) {
        const oldFile = path.join(process.cwd(), 'public', 'avatars', path.basename(existing.avatarUrl));
        fs.unlink(oldFile, () => {});
      }

      const avatarUrl = `/avatars/${req.file.filename}`;
      const user = await prisma.user.update({
        where: { id },
        data: { avatarUrl },
        select: { id: true, email: true, username: true, language: true, phone: true, avatarUrl: true },
      });

      res.json({ data: user });
    } catch (err) { next(err); }
  }
);

// POST /api/users/:id/onboarding
router.post(
  '/:id/onboarding',
  authMiddleware,
  validate(onboardingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.user!.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }

      const { genres, contentIds } = req.body as z.infer<typeof onboardingSchema>;

      await prisma.userPreference.upsert({
        where: { userId: id },
        create: { userId: id, preferredGenres: genres, onboardingDone: true },
        update: { preferredGenres: genres, onboardingDone: true },
      });

      if (contentIds && contentIds.length > 0) {
        const upsertOps = contentIds.map((contentId) =>
          prisma.userContent.upsert({
            where: { userId_contentId: { userId: id, contentId } },
            create: { userId: id, contentId, status: 'watched', rating: null },
            update: {},
          })
        );
        await Promise.all(upsertOps);
      }

      res.json({ data: { onboardingDone: true } });
    } catch (err) { next(err); }
  }
);

// GET /api/users/:id/preferences
router.get(
  '/:id/preferences',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.user!.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }
      const pref = await prisma.userPreference.findUnique({ where: { userId: id } });
      res.json({ data: { preferredGenres: pref?.preferredGenres ?? [], onboardingDone: pref?.onboardingDone ?? false } });
    } catch (err) { next(err); }
  }
);

// GET /api/users/:id/stats
router.get(
  '/:id/stats',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.user!.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }

      const userContents = await prisma.userContent.findMany({
        where: { userId: id },
        include: { content: { select: { genres: true } } },
      });

      const total = userContents.length;
      const ratingsArr = userContents.map((uc) => uc.rating).filter((r): r is number => r !== null);
      const avgRating = ratingsArr.length > 0 ? ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length : null;

      const genreCount: Record<string, number> = {};
      for (const uc of userContents) {
        for (const genre of uc.content.genres) {
          genreCount[genre] = (genreCount[genre] ?? 0) + 1;
        }
      }

      res.json({ data: { total, averageRating: avgRating, genreDistribution: genreCount } });
    } catch (err) { next(err); }
  }
);

export default router;
