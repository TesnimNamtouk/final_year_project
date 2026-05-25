import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ContentType, ContentStatus } from '@prisma/client';
import { logActivity } from '../lib/activityLogger';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createUserContentSchema = z.object({
  externalId: z.string(),
  type: z.nativeEnum(ContentType),
  title: z.string(),
  description: z.string().optional().nullable(),
  genres: z.array(z.string()).optional().default([]),
  year: z.number().int().optional().nullable(),
  posterUrl: z.string().url().optional().nullable(),
  rating: z.number().int().min(1).max(10).optional().nullable(),
  status: z.nativeEnum(ContentStatus).optional().default('watched'),
});

const updateUserContentSchema = z.object({
  rating: z.number().int().min(1).max(10).optional().nullable(),
  status: z.nativeEnum(ContentStatus).optional(),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/user-content
router.post(
  '/',
  authMiddleware,
  validate(createUserContentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const {
        externalId,
        type,
        title,
        description,
        genres,
        year,
        posterUrl,
        rating,
        status,
      } = req.body as z.infer<typeof createUserContentSchema>;

      // Upsert content
      const content = await prisma.content.upsert({
        where: { externalId_type: { externalId, type } },
        create: {
          externalId,
          type,
          title,
          description: description ?? null,
          genres: genres ?? [],
          year: year ?? null,
          posterUrl: posterUrl ?? null,
          rating: null,
        },
        update: {
          ...(genres && genres.length > 0 ? { genres, posterUrl: posterUrl ?? undefined } : {}),
          ...(description ? { description } : {}),
        },
      });

      // Upsert userContent
      const userContent = await prisma.userContent.upsert({
        where: { userId_contentId: { userId, contentId: content.id } },
        create: {
          userId,
          contentId: content.id,
          rating: rating ?? null,
          status: status ?? 'watched',
        },
        update: {
          rating: rating ?? null,
          status: status ?? 'watched',
        },
        include: { content: true },
      });

      logActivity({ userId, action: 'add_to_list', entityType: 'content', entityId: content.id, metadata: { status, rating } });

      res.status(201).json({ data: userContent });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/user-content
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const type = req.query.type as ContentType | undefined;

      const userContents = await prisma.userContent.findMany({
        where: {
          userId,
          ...(type ? { content: { type } } : {}),
        },
        include: {
          content: {
            select: {
              id: true,
              externalId: true,
              type: true,
              title: true,
              description: true,
              genres: true,
              year: true,
              posterUrl: true,
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ data: userContents });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/user-content/:id
router.patch(
  '/:id',
  authMiddleware,
  validate(updateUserContentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id, 10);
      const { rating, status } = req.body as z.infer<typeof updateUserContentSchema>;

      const existing = await prisma.userContent.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (existing.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const updated = await prisma.userContent.update({
        where: { id },
        data: {
          ...(rating !== undefined ? { rating } : {}),
          ...(status !== undefined ? { status } : {}),
        },
        include: { content: true },
      });

      if (rating !== undefined) logActivity({ userId, action: 'rate_content', entityType: 'content', entityId: existing.contentId, metadata: { rating } });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/user-content/:id
router.delete(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id, 10);

      const existing = await prisma.userContent.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (existing.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      await prisma.userContent.delete({ where: { id } });
      logActivity({ userId, action: 'remove_from_list', entityType: 'content', entityId: existing.contentId });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
