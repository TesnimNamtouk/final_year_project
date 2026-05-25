import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logActivity } from '../lib/activityLogger';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ─── Schema ──────────────────────────────────────────────────────────────────

const feedbackSchema = z.object({
  liked: z.boolean(),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/recommendations
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      // Try to fetch fresh recommendations from ML service
      try {
        // Fetch user's genre preferences to pass to ML service
        const userPref = await prisma.userPreference.findUnique({
          where: { userId },
          select: { preferredGenres: true },
        });

        const startMs = Date.now();
        const mlRes = await axios.post(
          `${ML_SERVICE_URL}/recommend`,
          { user_id: userId, preferred_genres: userPref?.preferredGenres ?? [], top_n: 60 },
          { timeout: 10000 }
        );
        const executionMs = Date.now() - startMs;

        const mlData = mlRes.data as { algorithm: string; recommendations: Array<{
          content_id: number;
          hybrid_score: number;
          cbf_score: number;
          cf_score: number;
        }> };
        const mlItems = mlData.recommendations ?? (mlRes.data as Array<{ content_id: number; hybrid_score: number; cbf_score: number; cf_score: number }>);

        // Upsert each recommendation returned by the ML service
        const upsertOps = mlItems.map((item) =>
          prisma.recommendation.upsert({
            where: { userId_contentId: { userId, contentId: item.content_id } },
            create: {
              userId,
              contentId: item.content_id,
              hybridScore: item.hybrid_score,
              cbfScore: item.cbf_score,
              cfScore: item.cf_score,
            },
            update: {
              hybridScore: item.hybrid_score,
              cbfScore: item.cbf_score,
              cfScore: item.cf_score,
              generatedAt: new Date(),
            },
          })
        );
        await Promise.all(upsertOps);

        // Log recommendation session
        const algorithm = mlData.algorithm ?? 'hybrid';
        const isColdStart = algorithm.includes('cold_start');
        await prisma.recommendationLog.create({
          data: { userId, algorithm, itemCount: mlItems.length, executionMs, isColdStart },
        });
        logActivity({ userId, action: 'get_recommendations', metadata: { algorithm, itemCount: mlItems.length } });
      } catch {
        // ML service is unreachable – fall back to DB data silently
      }

      // Return top-60 recommendations from DB (sorted by hybrid_score desc)
      const recommendations = await prisma.recommendation.findMany({
        where: { userId },
        orderBy: { hybridScore: 'desc' },
        take: 60,
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
      });

      res.json({ data: recommendations });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/recommendations/:id/feedback
router.post(
  '/:id/feedback',
  authMiddleware,
  validate(feedbackSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id, 10);
      const { liked } = req.body as z.infer<typeof feedbackSchema>;

      const existing = await prisma.recommendation.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Recommendation not found' });
        return;
      }
      if (existing.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const updated = await prisma.recommendation.update({
        where: { id },
        data: { liked },
      });

      logActivity({ userId, action: 'feedback_recommendation', entityType: 'recommendation', entityId: id, metadata: { liked } });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
