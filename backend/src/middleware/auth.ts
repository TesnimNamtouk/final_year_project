import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import '../types';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (err instanceof JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    // Beklenmeyen hata → bir sonraki error handler'a ilet
    next(err);
  }
}
