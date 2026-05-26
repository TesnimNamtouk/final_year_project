import { Router, Request, Response, NextFunction } from 'express';
import { ContentType } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { searchMovies, getMovieDetail } from '../services/omdbService';
import { searchSeries, getShowDetail } from '../services/tvmazeService';
import { searchBooks, getBookDetail } from '../services/openLibraryService';
import { translateToTurkish } from '../utils/translate';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/content/detail?id=...&type=...
router.get(
  '/detail',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.query.id as string | undefined;
      const type = req.query.type as string | undefined;

      if (!id) {
        res.status(400).json({ error: 'id parametresi gerekli' });
        return;
      }

      let detail = null;

      if (type === 'movie' || (!type && id.startsWith('tt'))) {
        detail = await getMovieDetail(id);
      } else if (type === 'series' || (!type && id.startsWith('tvmaze-'))) {
        detail = await getShowDetail(id);
      } else if (type === 'book' || (!type && id.startsWith('/works/'))) {
        detail = await getBookDetail(id);
      }

      if (!detail) {
        res.status(404).json({ error: 'İçerik bulunamadı' });
        return;
      }

      // Translate description to Turkish if requested
      const lang = req.query.lang as string | undefined;
      if (lang === 'tr' && detail.description) {
        detail = { ...detail, description: await translateToTurkish(detail.description) };
      }

      res.json({ data: detail });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/content/search?q=&type=&genre=
router.get(
  '/search',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string | undefined)?.trim();
      const type = req.query.type as string | undefined;
      const genre = (req.query.genre as string | undefined)?.trim();

      const validTypes = ['movie', 'series', 'book', 'all'];
      const resolvedType = type && validTypes.includes(type) ? type : 'all';

      // Genre filter: query DB for content with that genre
      if (genre) {
        const dbResults = await prisma.content.findMany({
          where: {
            genres: { has: genre },
            ...(resolvedType !== 'all' ? { type: resolvedType as ContentType } : {}),
          },
          take: 60,
          orderBy: { year: 'desc' },
        });
        res.json({
          data: dbResults.map((c) => ({
            id: c.externalId,
            title: c.title,
            type: c.type,
            year: c.year ?? undefined,
            genres: c.genres,
            posterUrl: c.posterUrl ?? undefined,
            rating: c.rating ?? undefined,
            description: c.description ?? undefined,
          })),
        });
        return;
      }

      if (!q) {
        res.status(400).json({ error: 'Query parameter "q" is required' });
        return;
      }

      // Search local DB first (supports Turkish titles)
      const dbMatches = await prisma.content.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { titleEn: { contains: q, mode: 'insensitive' } },
          ],
          ...(resolvedType !== 'all' ? { type: resolvedType as ContentType } : {}),
        },
        take: 20,
        orderBy: { rating: 'desc' },
      });

      const dbResults = dbMatches.map((c) => ({
        id: c.externalId,
        title: c.title,
        type: c.type,
        year: c.year ?? undefined,
        genres: c.genres,
        posterUrl: c.posterUrl ?? undefined,
        rating: c.rating ?? undefined,
        description: c.description ?? undefined,
      }));

      let apiResults: unknown[] = [];

      if (resolvedType === 'movie') {
        apiResults = await searchMovies(q);
      } else if (resolvedType === 'series') {
        apiResults = await searchSeries(q);
      } else if (resolvedType === 'book') {
        apiResults = await searchBooks(q);
      } else {
        const [movies, series, books] = await Promise.allSettled([
          searchMovies(q),
          searchSeries(q),
          searchBooks(q),
        ]);
        apiResults = [
          ...(movies.status === 'fulfilled' ? movies.value : []),
          ...(series.status === 'fulfilled' ? series.value : []),
          ...(books.status === 'fulfilled' ? books.value : []),
        ];
      }

      // Merge: DB results first, then API results (skip duplicates by externalId)
      const dbExternalIds = new Set(dbResults.map((r) => r.id));
      const merged = [
        ...dbResults,
        ...(apiResults as { id: string }[]).filter((r) => !dbExternalIds.has(r.id)),
      ];

      res.json({ data: merged });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
