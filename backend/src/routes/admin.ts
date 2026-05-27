import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

router.use(authMiddleware, adminMiddleware);

// GET /api/admin/stats
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalContent,
      totalUserContent,
      totalRecommendations,
      totalSystemLogs,
      totalRecLogs,
      recLogsByAlgorithm,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.content.count(),
      prisma.userContent.count(),
      prisma.recommendation.count(),
      prisma.systemLog.count(),
      prisma.recommendationLog.count(),
      prisma.recommendationLog.groupBy({
        by: ['algorithm'],
        _count: { id: true },
      }),
    ]);

    res.json({
      data: {
        totalUsers,
        totalContent,
        totalUserContent,
        totalRecommendations,
        totalSystemLogs,
        totalRecLogs,
        algorithmBreakdown: recLogsByAlgorithm.map((r) => ({
          algorithm: r.algorithm,
          count: r._count.id,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        language: true,
        createdAt: true,
        preferences: {
          select: { onboardingDone: true, preferredGenres: true },
        },
        _count: {
          select: {
            userContents: true,
            recommendations: true,
            activityLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // For each user, get average rating
    const userIds = users.map((u) => u.id);
    const ratings = await prisma.userContent.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const ratingMap = new Map(ratings.map((r) => [r.userId, r]));

    const result = users.map((u) => {
      const rData = ratingMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        language: u.language,
        createdAt: u.createdAt,
        onboardingDone: u.preferences?.onboardingDone ?? false,
        preferredGenres: u.preferences?.preferredGenres ?? [],
        contentCount: u._count.userContents,
        recommendationCount: u._count.recommendations,
        activityCount: u._count.activityLogs,
        ratedCount: rData?._count.rating ?? 0,
        averageRating: rData?._avg.rating ? Math.round(rData._avg.rating * 10) / 10 : null,
      };
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/logs?category=&limit=&offset=
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const where = {
      ...(category ? { category } : {}),
      ...(userId ? { userId } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.systemLog.count({ where }),
    ]);

    res.json({ data: logs, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/recommendation-logs?limit=&offset=
router.get('/recommendation-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const [logs, total] = await Promise.all([
      prisma.recommendationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { username: true, email: true } },
        },
      }),
      prisma.recommendationLog.count(),
    ]);

    res.json({ data: logs, total });
  } catch (err) {
    next(err);
  }
});

export default router;
