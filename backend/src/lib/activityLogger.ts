import { ActivityAction } from '@prisma/client';
import { prisma } from './prisma';

interface LogOptions {
  userId?: number;
  action: ActivityAction;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown> | null;
}

export function logActivity(opts: LogOptions): void {
  prisma.activityLog
    .create({
      data: {
        userId: opts.userId ?? null,
        action: opts.action,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        metadata: opts.metadata ? (opts.metadata as object) : undefined,
      },
    })
    .catch(() => {
      // log failure must never crash the request
    });
}
