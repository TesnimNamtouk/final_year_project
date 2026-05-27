import { LogLevel } from '@prisma/client';
import { prisma } from './prisma';

interface SystemLogOptions {
  level?: LogLevel;
  category: string;
  message: string;
  details?: Record<string, unknown> | null;
  userId?: number;
}

export function systemLog(opts: SystemLogOptions): void {
  prisma.systemLog
    .create({
      data: {
        level: opts.level ?? 'INFO',
        category: opts.category,
        message: opts.message,
        details: opts.details ? (opts.details as object) : undefined,
        userId: opts.userId ?? null,
      },
    })
    .catch(() => {});
}
