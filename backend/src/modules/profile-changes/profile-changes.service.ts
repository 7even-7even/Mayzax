import { Role } from '@prisma/client';
export const ChangeRequestStatus = {
  PENDING: 'PENDING' as const,
  APPROVED: 'APPROVED' as const,
  REJECTED: 'REJECTED' as const,
};
export type ChangeRequestStatus = keyof typeof ChangeRequestStatus;
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/apiError';
import { writeAuditLog } from '@/modules/shared/audit.service';
import { CreateChangeRequestInput, ListChangeRequestsQuery, ReviewChangeRequestInput } from './profile-changes.validation';

interface Actor { id: string; role: Role; }
interface Meta { ip?: string; userAgent?: string; }

// Allowed fields that a client can request changes for
const ALLOWED_CLIENT_CHANGE_FIELDS = [
  'candidateName', 'phone', 'currentLocation', 'visaStatus', 'entryToUS',
  'dateOfBirth', 'gender', 'technology', 'skills', 'experienceDetails',
  'certifications', 'education', 'addressHistory',
];

export async function submitChangeRequest(
  profileId: string,
  input: CreateChangeRequestInput,
  actor: Actor,
  meta?: Meta,
) {
  // Only the linked client user can submit for their own profile
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user || user.clientProfileId !== profileId) {
    throw ApiError.forbidden('You can only submit change requests for your own profile');
  }

  // Filter to allowed fields only
  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_CLIENT_CHANGE_FIELDS) {
    if (key in input.changes) {
      sanitized[key] = input.changes[key];
    }
  }
  if (Object.keys(sanitized).length === 0) {
    throw ApiError.badRequest('No valid fields to update');
  }

  // Check if there's already a pending request
  const existing = await prisma.clientProfileChangeRequest.findFirst({
    where: { profileId, status: ChangeRequestStatus.PENDING },
  });
  if (existing) {
    // Update the existing pending request with new changes
    const updated = await prisma.clientProfileChangeRequest.update({
      where: { id: existing.id },
      data: { changes: sanitized, updatedAt: new Date() },
    });
    return updated;
  }

  const request = await prisma.clientProfileChangeRequest.create({
    data: {
      profileId,
      requestedById: actor.id,
      changes: sanitized,
    },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      profile: { select: { id: true, candidateName: true, email: true } },
    },
  });

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_CHANGE_REQUESTED',
    entity: 'ClientProfileChangeRequest',
    entityId: request.id,
    metadata: { profileId },
    ...meta,
  });

  return request;
}

export async function submitPlanUpgradeRequest(
  profileId: string,
  targetPlan: string,
  actor: Actor,
  meta?: Meta,
) {
  const PLAN_ORDER = ['Basic', 'Gold', 'Premium'];
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user || user.clientProfileId !== profileId) {
    throw ApiError.forbidden('You can only upgrade your own plan');
  }

  const profile = await prisma.clientProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw ApiError.notFound('Profile not found');

  const currentIdx = PLAN_ORDER.indexOf(profile.planSelected ?? '');
  const targetIdx = PLAN_ORDER.indexOf(targetPlan);

  if (targetIdx <= currentIdx) {
    throw ApiError.badRequest('Target plan must be higher than current plan');
  }

  // Check for pending plan upgrade
  const existing = await prisma.clientProfileChangeRequest.findFirst({
    where: { profileId, status: ChangeRequestStatus.PENDING, changes: { path: ['_type'], equals: 'PLAN_UPGRADE' } },
  });
  if (existing) throw ApiError.badRequest('A plan upgrade request is already pending approval');

  const request = await prisma.clientProfileChangeRequest.create({
    data: {
      profileId,
      requestedById: actor.id,
      changes: { _type: 'PLAN_UPGRADE', targetPlan },
    },
  });

  await writeAuditLog({
    userId: actor.id,
    action: 'PLAN_UPGRADE_REQUESTED',
    entity: 'ClientProfileChangeRequest',
    entityId: request.id,
    metadata: { profileId, targetPlan },
    ...meta,
  });

  return request;
}

export async function listChangeRequests(query: ListChangeRequestsQuery, actor: Actor) {
  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.profileId) where.profileId = query.profileId;

  const [items, total] = await prisma.$transaction([
    prisma.clientProfileChangeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
        profile: { select: { id: true, candidateName: true, email: true, planSelected: true } },
      },
    }),
    prisma.clientProfileChangeRequest.count({ where }),
  ]);

  return {
    items,
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
  };
}

export async function getPendingRequestForProfile(profileId: string) {
  return prisma.clientProfileChangeRequest.findFirst({
    where: { profileId, status: ChangeRequestStatus.PENDING },
  });
}

export async function approveChangeRequest(id: string, actor: Actor, meta?: Meta) {
  const req = await prisma.clientProfileChangeRequest.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!req) throw ApiError.notFound('Change request not found');
  if (req.status !== ChangeRequestStatus.PENDING) {
    throw ApiError.badRequest('This request has already been reviewed');
  }

  const changes = req.changes as Record<string, unknown>;

  await prisma.$transaction(async (tx) => {
    // Apply changes to live profile
    if (changes._type === 'PLAN_UPGRADE') {
      const PLAN_PRICES: Record<string, number> = { Basic: 1500, Gold: 2500, Premium: 3500 };
      const newPlan = changes.targetPlan as string;
      const targetPrice = PLAN_PRICES[newPlan] ?? 1500;

      const currentPayments = await tx.clientPayment.findMany({
        where: { profileId: req.profileId }
      });
      const totalPaid = currentPayments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0);

      const diff = targetPrice - totalPaid;

      await tx.clientProfile.update({
        where: { id: req.profileId },
        data: {
          planSelected: newPlan,
          amountPaid: targetPrice,
        },
      });

      if (diff > 0) {
        const nextInstallmentNo = currentPayments.length + 1;
        const now = new Date();
        await tx.clientPayment.create({
          data: {
            profileId: req.profileId,
            amount: diff,
            status: 'PENDING',
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 1 month later
            installmentNo: nextInstallmentNo,
          }
        });
      }
    } else {
      // Strip any metadata keys before applying
      const { _type, ...profileChanges } = changes;
      await tx.clientProfile.update({
        where: { id: req.profileId },
        data: profileChanges as any,
      });
    }

    await tx.clientProfileChangeRequest.update({
      where: { id },
      data: {
        status: ChangeRequestStatus.APPROVED,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });
  });

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_CHANGE_APPROVED',
    entity: 'ClientProfileChangeRequest',
    entityId: id,
    metadata: { profileId: req.profileId },
    ...meta,
  });

  return { message: 'Change request approved and profile updated' };
}

export async function rejectChangeRequest(
  id: string,
  input: ReviewChangeRequestInput,
  actor: Actor,
  meta?: Meta,
) {
  const req = await prisma.clientProfileChangeRequest.findUnique({ where: { id } });
  if (!req) throw ApiError.notFound('Change request not found');
  if (req.status !== ChangeRequestStatus.PENDING) {
    throw ApiError.badRequest('This request has already been reviewed');
  }

  await prisma.clientProfileChangeRequest.update({
    where: { id },
    data: {
      status: ChangeRequestStatus.REJECTED,
      reviewedById: actor.id,
      reviewedAt: new Date(),
      rejectionNote: input.rejectionNote ?? null,
    },
  });

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_CHANGE_REJECTED',
    entity: 'ClientProfileChangeRequest',
    entityId: id,
    metadata: { profileId: req.profileId, reason: input.rejectionNote },
    ...meta,
  });

  return { message: 'Change request rejected' };
}
