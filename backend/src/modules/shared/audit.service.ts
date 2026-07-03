import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface AuditInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Writes an audit trail record. Never throws (failures are logged, not propagated),
 * so audit logging can never break a primary business operation.
 */
export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? undefined,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? undefined,
        metadata: input.metadata as any,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  } catch (err) {
    logger.error({ err, input }, 'Failed to write audit log');
  }
}
