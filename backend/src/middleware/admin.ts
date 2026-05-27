import { Request, Response, NextFunction } from 'express';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const email = req.user?.email;
  if (!email || !ADMIN_EMAILS.includes(email)) {
    res.status(403).json({ error: 'Admin yetkisi gerekli' });
    return;
  }
  next();
}
