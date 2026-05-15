import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // ── Zod validation error → 400 ────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // ── Prisma known request errors ───────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Bu kayıt zaten mevcut' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Kayıt bulunamadı' });
      return;
    }
  }

  // ── Generic / unexpected errors → 500 ────────────────────────────────────
  console.error(err);

  const isDev = process.env.NODE_ENV !== 'production';
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { details: message, stack }),
  });
}
