import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/logs?category=&limit=&offset=
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const where = category ? { category } : {};

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
  }
);

// GET /api/logs/categories
router.get(
  '/categories',
  authMiddleware,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await prisma.systemLog.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });
      res.json({ data: result.map((r) => ({ category: r.category, count: r._count.id })) });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
