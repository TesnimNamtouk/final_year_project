import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from './asyncHandler';

/**
 * Kullanıcının kendi kaynağına eriştiğini doğrular.
 *
 * @param getUserId - İstekten kaynak sahibinin userId'sini döndüren fonksiyon.
 *
 * Kullanım:
 *   router.delete('/:id', authMiddleware, requireOwnership((req) => Number(req.params.id)), handler);
 */
export const requireOwnership = (getUserId: (req: Request) => number) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.userId !== getUserId(req)) {
      res
        .status(403)
        .json({ error: 'Bu kaynağa erişim yetkiniz yok' });
      return;
    }
    next();
  });
