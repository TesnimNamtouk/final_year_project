import { Request } from 'express';

export interface JwtPayload {
  userId: number;
  email: string;
}

// Augment Express's Request interface globally
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Convenience alias – routes can type their req as AuthRequest
export interface AuthRequest extends Request {
  user?: JwtPayload;
}
