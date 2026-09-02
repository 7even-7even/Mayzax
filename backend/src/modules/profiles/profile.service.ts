import { Role, NotificationType } from '@prisma/client';
import { ApiError } from '@/utils/apiError';
import { writeAuditLog } from '@/modules/shared/audit.service';
import * as repo from './profile.repository';
import { prisma } from '@/lib/prisma';
import { CreateProfileInput, UpdateProfileInput, ListProfilesQuery } from './profile.validation';
import { hashPassword } from '@/modules/auth/auth.service';
import { createNotification } from '@/modules/notifications/notifications.service';

interface Requester {
  id: string;
  role: Role;
}

interface Meta {
  ip?: string;
  userAgent?: string;
}

async function assertRecruitersExist(recruiterIds: string[], actor?: Requester) {
  const uniqueIds = [...new Set(recruiterIds)];
  if (uniqueIds.length === 0) throw ApiError.badRequest('Assign at least 1 recruiter');
  if (uniqueIds.length > 5) throw ApiError.badRequest('You can assign up to 5 recruiters');

  const recruiters = await prisma.user.findMany({
    where: {
      id: { in: uniqueIds },
      deletedAt: null,
      role: { in: [Role.RECRUITER, Role.TEAM_LEADER] },
      ...(actor?.role === Role.TEAM_LEADER
        ? {
            OR: [
              { createdById: actor.id },
              { id: actor.id },
            ],
          }
        : {}),
    },
    select: { id: true, isActive: true },
  });

  if (recruiters.length !== uniqueIds.length) {
    throw ApiError.badRequest(
      actor?.role === Role.TEAM_LEADER
        ? 'One or more assigned recruiters were not found or do not belong to your team'
        : 'One or more assigned recruiters were not found'
    );
  }
  const inactive = recruiters.find((r) => !r.isActive);
  if (inactive) throw ApiError.badRequest('Cannot assign profile to an inactive recruiter');
}

async function isProfileInTeam(profileId: string, teamLeaderId: string): Promise<boolean> {
  const profile = await prisma.clientProfile.findFirst({
    where: {
      id: profileId,
      deletedAt: null,
      OR: [
        { assignedRecruiterId: teamLeaderId },
        { assignedRecruiter: { createdById: teamLeaderId } },
        { assignedRecruiterAssignments: { some: { recruiterId: teamLeaderId } } },
        { assignedRecruiterAssignments: { some: { recruiter: { createdById: teamLeaderId } } } },
      ],
    },
  });
  return !!profile;
}

async function syncProfileAssignments(profileId: string, recruiterIds: string[]) {
  const uniqueIds = [...new Set(recruiterIds)];
  const primaryRecruiterId = uniqueIds[0] ?? null;
  await repo.replaceRecruiterAssignments(profileId, uniqueIds);
  await repo.update(profileId, { assignedRecruiterId: primaryRecruiterId } as any);
}

async function assertResumeAssistExists(id?: string | null) {
  if (!id) return;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt || user.role !== Role.RESUME_ASSIST) {
    throw ApiError.badRequest('Selected Resume Assist user does not exist or does not have the required role');
  }
}

export async function createProfile(input: CreateProfileInput, actor: Requester, meta?: Meta) {
  if (actor.role === Role.RECRUITER || actor.role === Role.RESUME_ASSIST) {
    throw ApiError.forbidden('Only admins and team leaders can create new client profiles');
  }
  const recruiterIds = input.assignedRecruiterIds ?? (input.assignedRecruiterId ? [input.assignedRecruiterId] : []);
  await assertRecruitersExist(recruiterIds, actor);

  // Check if active profile with same email or phone number already exists
  const duplicate = await prisma.clientProfile.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: { equals: input.email, mode: 'insensitive' as const } },
        { phone: input.phone },
      ],
    },
  });

  if (duplicate) {
    throw ApiError.badRequest('Existing Client with same Email/Phone Number');
  }

  await assertResumeAssistExists(input.assignedResumeAssistId);

  const profile = await repo.create({
    candidateName: input.candidateName,
    email: input.email,
    phone: input.phone,
    technology: input.technology,
    notes: input.notes ?? null,
    assignedRecruiterId: recruiterIds[0] ?? null,
    assignedResumeAssistId: input.assignedResumeAssistId ?? null,
  });

  // Create User for Client login by default
  const defaultHash = await hashPassword('Pass@123');
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
  });
  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: Role.CLIENT,
        clientProfileId: profile.id,
        passwordHash: defaultHash,
        isActive: true,
      }
    });
  } else {
    await prisma.user.create({
      data: {
        name: input.candidateName,
        email: input.email.toLowerCase(),
        passwordHash: defaultHash,
        role: Role.CLIENT,
        isActive: true,
        clientProfileId: profile.id,
      }
    });
  }

  if (recruiterIds.length > 0) {
    await syncProfileAssignments(profile.id, recruiterIds);
  }

  const refreshed = await repo.findActiveById(profile.id);

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_CREATED',
    entity: 'ClientProfile',
    entityId: profile.id,
    metadata: { candidateName: profile.candidateName },
    ...meta,
  });

  return refreshed ?? profile;
}

export async function updateProfile(id: string, input: UpdateProfileInput, actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  const assignedRecruiterIds = [
    ...(existing.assignedRecruiterId ? [existing.assignedRecruiterId] : []),
    ...(existing.assignedRecruiterAssignments?.map((row) => row.recruiterId) ?? []),
  ];

  if (actor.role === Role.RECRUITER) {
    if (!assignedRecruiterIds.includes(actor.id)) {
      throw ApiError.forbidden('You can only edit profiles assigned to you');
    }
    if (input.candidateName && input.candidateName.trim() !== existing.candidateName) {
      throw ApiError.forbidden('Recruiters are not allowed to edit candidate name');
    }
  }

  if (actor.role === Role.RESUME_ASSIST) {
    if (existing.assignedResumeAssistId !== actor.id) {
      throw ApiError.forbidden('You can only edit profiles assigned to you');
    }
  }

  if (actor.role === Role.CLIENT) {
    const user = await prisma.user.findUnique({ where: { id: actor.id } });
    if (!user || user.clientProfileId !== id) {
      throw ApiError.forbidden('You can only edit your own client profile');
    }
  }

  if (actor.role === Role.TEAM_LEADER) {
    const inTeam = await isProfileInTeam(id, actor.id);
    if (!inTeam) throw ApiError.forbidden('You can only edit profiles belonging to your team');
  }

  if (input.assignedRecruiterIds !== undefined || input.assignedRecruiterId !== undefined) {
    if (actor.role === Role.RECRUITER || actor.role === Role.CLIENT || actor.role === Role.RESUME_ASSIST) {
      throw ApiError.forbidden('Only admins and team leaders can reassign profiles');
    }
    const recruiterIds = input.assignedRecruiterIds ?? (input.assignedRecruiterId ? [input.assignedRecruiterId] : []);
    await assertRecruitersExist(recruiterIds, actor);
    await syncProfileAssignments(id, recruiterIds);
  }

  if (input.assignedResumeAssistId !== undefined) {
    if (actor.role === Role.RECRUITER || actor.role === Role.CLIENT || actor.role === Role.RESUME_ASSIST) {
      throw ApiError.forbidden('Only admins and team leaders can reassign resume assists');
    }
    await assertResumeAssistExists(input.assignedResumeAssistId);
  }

  // Check if active profile with same email or phone number already exists (excluding current profile)
  // Only validate if email or phone has actually changed
  const emailChanged = input.email && input.email.toLowerCase() !== existing.email.toLowerCase();
  const phoneChanged = input.phone && input.phone !== existing.phone;

  if (emailChanged || phoneChanged) {
    const duplicate = await prisma.clientProfile.findFirst({
      where: {
        deletedAt: null,
        id: { not: id },
        OR: [
          ...(emailChanged ? [{ email: { equals: input.email, mode: 'insensitive' as const } }] : []),
          ...(phoneChanged ? [{ phone: input.phone }] : []),
        ],
      },
    });

    if (duplicate) {
      throw ApiError.badRequest('Existing Client with same Email/Phone Number');
    }
  }

  const rest = { ...(input as any) };
  delete rest.assignedRecruiterId;
  delete rest.assignedRecruiterIds;
  await repo.update(id, rest);
  const refreshed = await repo.findActiveById(id);

  // Sync client User credentials
  const defaultHash = await hashPassword('Pass@123');
  const clientUser = await prisma.user.findFirst({ where: { clientProfileId: id } });
  if (clientUser) {
    await prisma.user.update({
      where: { id: clientUser.id },
      data: {
        name: input.candidateName ?? clientUser.name,
        email: (input.email ?? clientUser.email).toLowerCase(),
        passwordHash: defaultHash,
      }
    });
  } else {
    await prisma.user.create({
      data: {
        name: input.candidateName ?? refreshed?.candidateName ?? existing.candidateName,
        email: (input.email ?? refreshed?.email ?? existing.email).toLowerCase(),
        passwordHash: defaultHash,
        role: Role.CLIENT,
        isActive: true,
        clientProfileId: id,
      }
    });
  }

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_UPDATED',
    entity: 'ClientProfile',
    entityId: id,
    metadata: input,
    ...meta,
  });

  return refreshed ?? existing;
}

export async function deleteProfile(id: string, actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  if (actor.role === Role.TEAM_LEADER) {
    throw ApiError.forbidden('Team Leaders cannot delete client profiles');
  }

  await repo.softDelete(id);

  // Also soft-delete corresponding client user as well
  const clientUser = await prisma.user.findFirst({ where: { clientProfileId: id, deletedAt: null } });
  if (clientUser) {
    await prisma.user.update({
      where: { id: clientUser.id },
      data: { deletedAt: new Date(), isActive: false }
    });
  }

  await writeAuditLog({ userId: actor.id, action: 'PROFILE_DELETED', entity: 'ClientProfile', entityId: id, ...meta });

  return { message: 'Profile deleted successfully' };
}

export async function assignRecruiter(id: string, assignedRecruiterIds: string[], actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  if (actor.role === Role.TEAM_LEADER) {
    const inTeam = await isProfileInTeam(id, actor.id);
    if (!inTeam) throw ApiError.forbidden('You can only reassign profiles belonging to your team');
  }

  await assertRecruitersExist(assignedRecruiterIds, actor);
  await syncProfileAssignments(id, assignedRecruiterIds);

  const updated = await repo.findActiveById(id);
  if (!updated) throw ApiError.notFound('Client profile not found');

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_REASSIGNED',
    entity: 'ClientProfile',
    entityId: id,
    metadata: { assignedRecruiterIds },
    ...meta,
  });

  return updated;
}

export async function bulkAssignProfiles(
  profileIds: string[],
  assignedRecruiterIds: string[],
  actor: Requester,
  meta?: Meta,
) {
  if (actor.role === Role.RECRUITER) {
    throw ApiError.forbidden('Only admins and team leaders can reassign profiles');
  }

  await assertRecruitersExist(assignedRecruiterIds, actor);

  for (const id of profileIds) {
    const profile = await repo.findActiveById(id);
    if (!profile) continue;
    if (actor.role === Role.TEAM_LEADER) {
      const inTeam = await isProfileInTeam(id, actor.id);
      if (!inTeam) throw ApiError.forbidden(`Profile "${profile.candidateName}" does not belong to your team`);
    }
    await repo.update(id, { assignedRecruiterId: assignedRecruiterIds[0] });
    await repo.replaceRecruiterAssignments(id, assignedRecruiterIds);
  }

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILES_BULK_REASSIGNED',
    entity: 'ClientProfile',
    metadata: { count: profileIds.length, profileIds, assignedRecruiterIds },
    ...meta,
  });

  return { updatedCount: profileIds.length };
}

export async function bulkDeleteProfiles(profileIds: string[], actor: Requester, meta?: Meta) {
  if (actor.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only admins can bulk delete client profiles');
  }

  for (const id of profileIds) {
    await repo.softDelete(id);

    // Also soft-delete corresponding client user
    const clientUser = await prisma.user.findFirst({ where: { clientProfileId: id, deletedAt: null } });
    if (clientUser) {
      await prisma.user.update({
        where: { id: clientUser.id },
        data: { deletedAt: new Date(), isActive: false }
      });
    }
  }

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILES_BULK_DELETED',
    entity: 'ClientProfile',
    metadata: { count: profileIds.length, profileIds },
    ...meta,
  });

  return { deletedCount: profileIds.length };
}

export async function getProfile(id: string, actor: Requester) {
  const profile = await repo.findActiveById(id);
  if (!profile) throw ApiError.notFound('Client profile not found');

  if (actor.role === Role.CLIENT) {
    const clientUser = await prisma.user.findFirst({
      where: { id: actor.id, clientProfileId: id, deletedAt: null }
    });
    if (!clientUser) {
      throw ApiError.forbidden('You do not have access to this profile');
    }
  }

  const assignedRecruiterIds = [
    ...(profile.assignedRecruiterId ? [profile.assignedRecruiterId] : []),
    ...(profile.assignedRecruiterAssignments?.map((row) => row.recruiterId) ?? []),
  ];
  if (actor.role === Role.RECRUITER && !assignedRecruiterIds.includes(actor.id)) {
    throw ApiError.forbidden('You do not have access to this profile');
  }

  if (actor.role === Role.TEAM_LEADER) {
    const inTeamOrSelf = await prisma.clientProfile.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { assignedRecruiterId: actor.id },
          { assignedRecruiterAssignments: { some: { recruiterId: actor.id } } },
          { assignedRecruiter: { createdById: actor.id } },
          { assignedRecruiterAssignments: { some: { recruiter: { createdById: actor.id } } } },
        ],
      },
    });
    if (!inTeamOrSelf) {
      throw ApiError.forbidden('You do not have access to this profile');
    }
  }

  return profile;
}

export async function listProfiles(query: ListProfilesQuery, actor: Requester) {
  if (actor.role === Role.TEAM_LEADER && query.assignedRecruiterId && query.assignedRecruiterId !== actor.id) {
    const recruiter = await prisma.user.findFirst({
      where: { id: query.assignedRecruiterId, createdById: actor.id, deletedAt: null }
    });
    if (!recruiter) {
      throw ApiError.forbidden('You can only filter by recruiters in your own team');
    }
  }

  const [items, total] = await repo.list(query, actor);
  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function resetPassword(id: string, actor: Requester, meta?: Meta) {
  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  const clientUser = await prisma.user.findFirst({ where: { clientProfileId: id } });
  if (!clientUser) {
    throw ApiError.badRequest('No login credentials exist for this client profile');
  }

  const defaultHash = await hashPassword('Pass@123');
  await prisma.user.update({
    where: { id: clientUser.id },
    data: { passwordHash: defaultHash }
  });

  await writeAuditLog({
    userId: actor.id,
    action: 'PASSWORD_RESET',
    entity: 'User',
    entityId: clientUser.id,
    metadata: { clientProfileId: id },
    ...meta,
  });

  return { message: 'Password reset to Pass@123 successfully' };
}

export async function getPaymentHistory(profileId: string, actor: { id: string; role: Role }) {
  const profile = await prisma.clientProfile.findUnique({
    where: { id: profileId },
  });
  if (!profile) throw ApiError.notFound('Profile not found');

  const payments = await prisma.clientPayment.findMany({
    where: { profileId },
    orderBy: { installmentNo: 'asc' },
  });

  return payments;
}

export async function postPaymentDetails(
  profileId: string,
  planSelected: string,
  payments: Array<{
    amount: number;
    status: 'PAID' | 'PENDING' | 'FAILED';
    dueDate: string;
    paidAt?: string | null;
    paymentRef?: string | null;
    installmentNo: number;
  }>,
  actor: { id: string; role: Role }
) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEAM_LEADER) {
    throw ApiError.forbidden('Only Admins or Team Leaders can update payment details');
  }

  const profile = await prisma.clientProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw ApiError.notFound('Profile not found');

  const result = await prisma.$transaction(async (tx) => {
    // Delete existing payment history for this client
    await tx.clientPayment.deleteMany({
      where: { profileId }
    });

    const createdPayments: any[] = [];
    let totalPaid = 0;
    for (const p of payments) {
      const created = await tx.clientPayment.create({
        data: {
          profileId,
          amount: p.amount,
          status: p.status,
          dueDate: new Date(p.dueDate),
          paidAt: p.paidAt ? new Date(p.paidAt) : null,
          paymentRef: p.paymentRef || null,
          installmentNo: p.installmentNo,
        }
      });
      createdPayments.push(created);
      if (p.status === 'PAID') {
        totalPaid += p.amount;
      }
    }

    await tx.clientProfile.update({
      where: { id: profileId },
      data: {
        amountPaid: totalPaid,
        planSelected,
      }
    });

    return createdPayments;
  });

  // Send notification to Client User
  const clientUser = await prisma.user.findFirst({
    where: { clientProfileId: profileId, deletedAt: null }
  });
  if (clientUser) {
    await createNotification({
      userId: clientUser.id,
      type: NotificationType.SYSTEM,
      title: 'Payment Details Updated',
      body: `Your payment plan details have been updated. Plan: ${planSelected}.`,
      data: { profileId }
    }).catch(err => {
      console.error('[Mayzax] Failed to create payment update notification', err);
    });
  }

  return result;
}

export async function payInstallment(
  profileId: string,
  paymentId: string,
  paymentRef: string,
  actor: { id: string; role: Role }
) {
  const payment = await prisma.clientPayment.findUnique({
    where: { id: paymentId },
  });
  if (!payment || payment.profileId !== profileId) {
    throw ApiError.notFound('Payment record not found');
  }
  if (payment.status === 'PAID') {
    throw ApiError.badRequest('Payment has already been paid');
  }

  const updatedPayment = await prisma.$transaction(async (tx) => {
    const updated = await tx.clientPayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentRef,
      },
    });

    await tx.clientProfile.update({
      where: { id: profileId },
      data: {
        amountPaid: { increment: payment.amount }
      }
    });

    return updated;
  });

  // Send notification to Client User
  const clientUser = await prisma.user.findFirst({
    where: { clientProfileId: profileId, deletedAt: null }
  });
  if (clientUser) {
    await createNotification({
      userId: clientUser.id,
      type: NotificationType.SYSTEM,
      title: 'Payment Received',
      body: `Payment of $${payment.amount} for installment ${payment.installmentNo} was marked as PAID.`,
      data: { profileId, paymentId }
    }).catch(err => {
      console.error('[Mayzax] Failed to create payment received notification', err);
    });
  }

  return updatedPayment;
}

export async function unblockPayment(id: string, actor: { id: string; role: Role }) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEAM_LEADER) {
    throw ApiError.forbidden('Only Admins or Team Leaders can reactivate payment-blocked profiles');
  }

  const profile = await prisma.clientProfile.update({
    where: { id },
    data: { paymentBlocked: false },
  });

  return profile;
}

export async function archiveProfile(id: string, actor: { id: string; role: Role }, meta?: Meta) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEAM_LEADER) {
    throw ApiError.forbidden('Only Admins and Team Leaders can archive client profiles');
  }

  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  const profile = await prisma.clientProfile.update({
    where: { id },
    data: { isArchived: true },
  });

  // Suspend client user login access
  const clientUser = await prisma.user.findFirst({ where: { clientProfileId: id } });
  if (clientUser) {
    await prisma.user.update({
      where: { id: clientUser.id },
      data: { isActive: false },
    });
  }

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_ARCHIVED',
    entity: 'ClientProfile',
    entityId: id,
    ...meta,
  });

  return profile;
}

export async function unarchiveProfile(id: string, actor: { id: string; role: Role }, meta?: Meta) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEAM_LEADER) {
    throw ApiError.forbidden('Only Admins and Team Leaders can restore archived client profiles');
  }

  const existing = await repo.findActiveById(id);
  if (!existing) throw ApiError.notFound('Client profile not found');

  const profile = await prisma.clientProfile.update({
    where: { id },
    data: { isArchived: false },
  });

  // Restore client user login access
  const clientUser = await prisma.user.findFirst({ where: { clientProfileId: id } });
  if (clientUser) {
    await prisma.user.update({
      where: { id: clientUser.id },
      data: { isActive: true },
    });
  }

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILE_UNARCHIVED',
    entity: 'ClientProfile',
    entityId: id,
    ...meta,
  });

  return profile;
}

export async function bulkArchiveProfiles(profileIds: string[], actor: { id: string; role: Role }, meta?: Meta) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEAM_LEADER) {
    throw ApiError.forbidden('Only admins and team leaders can bulk archive client profiles');
  }

  for (const id of profileIds) {
    const profile = await repo.findActiveById(id);
    if (!profile) continue;

    await prisma.clientProfile.update({
      where: { id },
      data: { isArchived: true },
    });

    const clientUser = await prisma.user.findFirst({ where: { clientProfileId: id } });
    if (clientUser) {
      await prisma.user.update({
        where: { id: clientUser.id },
        data: { isActive: false },
      });
    }
  }

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILES_BULK_ARCHIVED',
    entity: 'ClientProfile',
    metadata: { count: profileIds.length, profileIds },
    ...meta,
  });

  return { archivedCount: profileIds.length };
}

export async function mergeProfiles(
  targetProfileId: string,
  sourceProfileIds: string[],
  actor: { id: string; role: Role },
  meta?: Meta
) {
  if (actor.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only Admins can merge client profiles');
  }

  const target = await repo.findActiveById(targetProfileId);
  if (!target) throw ApiError.notFound('Target client profile not found');

  const sourceProfiles = await prisma.clientProfile.findMany({
    where: {
      id: { in: sourceProfileIds },
      deletedAt: null,
    },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  if (sourceProfiles.length !== sourceProfileIds.length) {
    throw ApiError.badRequest('One or more source client profiles were not found or have been deleted');
  }

  if (sourceProfileIds.includes(targetProfileId)) {
    throw ApiError.badRequest('Target profile cannot be included in the source profiles to merge');
  }

  const currentHistory = (target.mergeHistory as any[]) || [];
  const addedHistory: any[] = [];

  // Transaction for safe database updates
  await prisma.$transaction(async (tx) => {
    for (const source of sourceProfiles) {
      // 1. Migrate job applications.
      // To prevent duplicate violations (unique constraint on profileId + normalizedJobLink),
      // we check for existing target applications before updating, or catch/ignore them.
      const applications = await tx.jobApplication.findMany({
        where: { profileId: source.id },
      });

      for (const app of applications) {
        const hasDuplicate = await tx.jobApplication.findFirst({
          where: {
            profileId: targetProfileId,
            normalizedJobLink: app.normalizedJobLink,
          },
        });

        if (!hasDuplicate) {
          await tx.jobApplication.update({
            where: { id: app.id },
            data: { profileId: targetProfileId },
          });
        } else {
          // If duplicate, delete the duplicate source application so the merge doesn't leave orphaned apps
          await tx.jobApplication.delete({
            where: { id: app.id },
          });
        }
      }

      // 2. Add history record
      addedHistory.push({
        sourceProfileId: source.id,
        sourceCandidateName: source.candidateName,
        sourceEmail: source.email,
        sourcePhone: source.phone,
        applicationCount: source._count.applications,
        mergedAt: new Date(),
        mergedBy: actor.id,
      });

      // 3. Soft delete source profile
      await tx.clientProfile.update({
        where: { id: source.id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });

      // 4. Suspend client login
      const clientUser = await tx.user.findFirst({ where: { clientProfileId: source.id } });
      if (clientUser) {
        await tx.user.update({
          where: { id: clientUser.id },
          data: { isActive: false, clientProfileId: null },
        });
      }
    }

    // 5. Update target profile with combined history
    const mergedHistory = [...currentHistory, ...addedHistory];
    await tx.clientProfile.update({
      where: { id: targetProfileId },
      data: {
        mergeHistory: mergedHistory,
      },
    });
  });

  await writeAuditLog({
    userId: actor.id,
    action: 'PROFILES_MERGED',
    entity: 'ClientProfile',
    entityId: targetProfileId,
    metadata: {
      targetProfileId,
      sourceProfileIds,
      mergedCount: sourceProfileIds.length,
    },
    ...meta,
  });

  return repo.findActiveById(targetProfileId);
}

