import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodObject } from 'zod';

/**
 * Zod şemasına göre isteği doğrular.
 *
 * İki mod desteklenir:
 *  - Şema `body` anahtarı içeriyorsa (örn. authSchemas, contentSchemas),
 *    `{ body }` nesnesini parse eder ve `req.body`'yi şemanın çıktısıyla değiştirir.
 *  - Aksi hâlde sadece `req.body`'yi doğrudan parse eder (geriye dönük uyumluluk).
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const hasBodyKey =
        schema instanceof ZodObject && 'body' in schema.shape;

      if (hasBodyKey) {
        const parsed = schema.parse({ body: req.body }) as { body: unknown };
        req.body = parsed.body;
      } else {
        req.body = schema.parse(req.body);
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: err.errors.map((e) => ({
            // body.fieldName → fieldName olarak temizle
            field: e.path.filter((p) => p !== 'body').join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
