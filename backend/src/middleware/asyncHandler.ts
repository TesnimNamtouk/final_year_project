import { Request, Response, NextFunction } from 'express';

/**
 * Async route handler wrapper.
 * Yakalanan hataları Express error middleware'ine iletir;
 * her route'da try/catch yazmayı gereksiz kılar.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
