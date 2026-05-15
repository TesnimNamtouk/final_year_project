import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from '../../routes/auth';
import usersRouter from '../../routes/users';
import userContentRouter from '../../routes/userContent';
import recommendationsRouter from '../../routes/recommendations';
import contentRouter from '../../routes/content';
import { errorHandler } from '../../middleware/errorHandler';

export function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/user-content', userContentRouter);
  app.use('/api/recommendations', recommendationsRouter);
  app.use(errorHandler);
  return app;
}
