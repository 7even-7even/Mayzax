/**
 * Mayzax ATS - Database Seed Script
 * ------------------------------------------------------------------
 * Two modes:
 *
 *   1. Default (production-safe):
 *        npm run seed
 *      Creates ONLY the initial Admin account. Idempotent - safe to
 *      re-run in any environment, including production.
 *
 *   2. Demo/test data (local development & QA only):
 *        SEED_DEMO_DATA=true npm run seed
 *      Additionally creates:
 *        - 5 Recruiters
 *        - 10 Client Profiles (assigned across the 5 recruiters)
 *        - 50 Job Applications (spread across multiple business dates,
 *          statuses, and job portals - respecting the real
 *          UNIQUE(profileId, normalizedJobLink) duplicate constraint)
 *        - Matching AuditLog entries for every create action, exactly
 *          as the real application layer would produce them.
 *
 *      Demo data generation is intentionally gated behind an explicit
 *      env flag so it can NEVER accidentally run in production.
 * ------------------------------------------------------------------
 */
import { PrismaClient, Role, ApplicationStatus, JobPortal, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

// Reuse the exact same production utilities the API uses, so seeded data
// is guaranteed consistent with real business-date / duplicate-detection logic.
import { getBusinessDate } from '../src/utils/businessDate';
import { normalizeJobLink } from '../src/utils/normalizeJobLink';

dotenv.config();

const prisma = new PrismaClient();

const SEED_DEMO_DATA = process.env.SEED_DEMO_DATA === 'true';
const BCRYPT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'Recruiter@123';

// ---------------------------------------------------------------------------
// Deterministic-ish random helpers (no external faker dependency required)
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random timestamp within the last `days` days, biased toward business-shift hours. */
function randomRecentTimestamp(daysBack: number): Date {
  const now = Date.now();
  const past = now - daysBack * 24 * 60 * 60 * 1000;
  const timestamp = randomInt(past, now);
  return new Date(timestamp);
}

// ---------------------------------------------------------------------------
// Static demo dataset definitions
// ---------------------------------------------------------------------------

const RECRUITERS = [
  { name: 'Riya Sharma', email: 'riya.sharma@mayzaxsolutions.com' },
  { name: 'Karan Mehta', email: 'karan.mehta@mayzaxsolutions.com' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@mayzaxsolutions.com' },
  { name: 'Vikram Singh', email: 'vikram.singh@mayzaxsolutions.com' },
  { name: 'Sneha Reddy', email: 'sneha.reddy@mayzaxsolutions.com' },
] as const;

const CLIENT_PROFILES = [
  { candidateName: 'John Doe', email: 'john.doe@example.com', phone: '+91-9876543210', technology: 'Java Full Stack' },
  { candidateName: 'Jane Smith', email: 'jane.smith@example.com', phone: '+91-9876500000', technology: 'React' },
  { candidateName: 'Alex Kumar', email: 'alex.kumar@example.com', phone: '+91-9123456780', technology: 'DevOps' },
  { candidateName: 'Priya Nair', email: 'priya.nair@example.com', phone: '+91-9988776655', technology: '.NET' },
  { candidateName: 'Rahul Verma', email: 'rahul.verma@example.com', phone: '+91-9871234560', technology: 'Python' },
  { candidateName: 'Sara Khan', email: 'sara.khan@example.com', phone: '+91-9012345678', technology: 'Data Engineering' },
  { candidateName: 'Amit Patel', email: 'amit.patel@example.com', phone: '+91-9765432109', technology: 'AWS Cloud' },
  { candidateName: 'Neha Gupta', email: 'neha.gupta@example.com', phone: '+91-9345678901', technology: 'React Native' },
  { candidateName: 'David Fernandes', email: 'david.fernandes@example.com', phone: '+91-9456789012', technology: 'QA Automation' },
  { candidateName: 'Meera Iyengar', email: 'meera.iyengar@example.com', phone: '+91-9567890123', technology: 'Salesforce' },
] as const;

const COMPANIES = [
  'Acme Corp',
  'Globex Inc',
  'Initech',
  'Umbrella Corp',
  'Stark Industries',
  'Wayne Enterprises',
  'Oscorp',
  'Hooli',
  'Pied Piper',
  'Massive Dynamic',
  'Cyberdyne Systems',
  'Soylent Corp',
] as const;

const JOB_TITLES = [
  'Senior Backend Engineer',
  'Frontend Developer',
  'Full Stack Engineer',
  'DevOps Engineer',
  'Cloud Solutions Architect',
  'QA Automation Engineer',
  'Data Engineer',
  'Mobile App Developer',
  'Site Reliability Engineer',
  'Platform Engineer',
] as const;

const JOB_PORTALS: readonly JobPortal[] = [
  JobPortal.LINKEDIN,
  JobPortal.INDEED,
  JobPortal.GLASSDOOR,
  JobPortal.JOBRIGHT,
  JobPortal.SIMPLIFY,
  JobPortal.SIMPLYHIRED,
  JobPortal.WELLFOUND,
  JobPortal.HANDSHAKE,
  JobPortal.LEVER,
  JobPortal.GREENHOUSE,
];

const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.IN_REVIEW,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW_SCHEDULED,
  ApplicationStatus.INTERVIEWED,
  ApplicationStatus.OFFERED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
  ApplicationStatus.ON_HOLD,
];

const PORTAL_URL_BUILDERS: Record<JobPortal, (jobId: string) => string> = {
  LINKEDIN: (id) => `https://www.linkedin.com/jobs/view/${id}`,
  INDEED: (id) => `https://www.indeed.com/viewjob?jk=${id}`,
  GLASSDOOR: (id) => `https://www.glassdoor.com/job-listing/${id}`,
  JOBRIGHT: (id) => `https://jobright.ai/jobs/info/${id}`,
  SIMPLIFY: (id) => `https://simplify.jobs/p/${id}`,
  SIMPLYHIRED: (id) => `https://www.simplyhired.com/job/${id}`,
  WELLFOUND: (id) => `https://wellfound.com/jobs/${id}`,
  HANDSHAKE: (id) => `https://app.joinhandshake.com/stu/jobs/${id}`,
  NAUKRI: (id) => `https://www.naukri.com/job-listings-${id}`,
  DICE: (id) => `https://www.dice.com/jobs/detail/${id}`,
  MONSTER: (id) => `https://www.monster.com/job-openings/${id}`,
  ZIPRECRUITER: (id) => `https://www.ziprecruiter.com/jobs/${id}`,
  COMPANY_WEBSITE: (id) => `https://careers.example-company.com/jobs/${id}`,
  CAREERBUILDER: (id) => `https://www.careerbuilder.com/job/${id}`,
  LEVER: (id) => `https://jobs.lever.co/example/${id}`,
  GREENHOUSE: (id) => `https://boards.greenhouse.io/example/jobs/${id}`,
  SPEEDY_APPLY: (id) => `https://speedyapply.example.com/jobs/${id}`,
  THE_MUSE: (id) => `https://www.themuse.com/jobs/example/${id}`,
  Y_COMBINATOR: (id) => `https://www.ycombinator.com/companies/example/jobs/${id}`,
  CAREER_SITE: (id) => `https://careers.example-company.com/jobs/${id}`,
  OTHER: (id) => `https://jobs.example.com/${id}`,
};

// ---------------------------------------------------------------------------
// Seed: Admin account (always runs, production-safe, idempotent)
// ---------------------------------------------------------------------------

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@mayzaxsolutions.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe@123';
  const name = process.env.SEED_ADMIN_NAME ?? 'Mayzax Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ️  Admin account already exists: ${email}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.user.create({
    data: { name, email, passwordHash, role: Role.ADMIN, isActive: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'ADMIN_SEEDED',
      entity: 'User',
      entityId: admin.id,
      metadata: { name: admin.name, email: admin.email },
    },
  });

  console.log('✅ Admin account created:');
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: ${password}`);
  console.log('⚠️  Please log in and change this password immediately.');

  return admin;
}

// ---------------------------------------------------------------------------
// Seed: Demo data (recruiters, profiles, applications, audit logs)
// Only runs when SEED_DEMO_DATA=true
// ---------------------------------------------------------------------------

async function seedRecruiters(adminId: string) {
  const recruiters = [];
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  for (const r of RECRUITERS) {
    const email = r.email.toLowerCase();
    let recruiter = await prisma.user.findUnique({ where: { email } });

    if (!recruiter) {
      recruiter = await prisma.user.create({
        data: {
          name: r.name,
          email,
          passwordHash,
          role: Role.RECRUITER,
          isActive: true,
          createdById: adminId,
          lastActiveAt: randomRecentTimestamp(3),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'RECRUITER_CREATED',
          entity: 'User',
          entityId: recruiter.id,
          metadata: { name: recruiter.name, email: recruiter.email, role: recruiter.role },
        },
      });
    }

    recruiters.push(recruiter);
  }

  console.log(`✅ Seeded ${recruiters.length} recruiters (default password: ${DEFAULT_PASSWORD})`);
  return recruiters;
}

async function seedClientProfiles(recruiters: { id: string }[], adminId: string) {
  const profiles = [];

  for (let i = 0; i < CLIENT_PROFILES.length; i++) {
    const p = CLIENT_PROFILES[i];
    let profile = await prisma.clientProfile.findFirst({ where: { email: p.email } });

    if (!profile) {
      // Distribute profiles round-robin across recruiters (2 profiles each for 5 recruiters/10 profiles)
      const assignedRecruiter = recruiters[i % recruiters.length];

      profile = await prisma.clientProfile.create({
        data: {
          candidateName: p.candidateName,
          email: p.email,
          phone: p.phone,
          technology: p.technology,
          notes: `Sourced candidate profile for ${p.technology} roles.`,
          assignedRecruiterId: assignedRecruiter.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'PROFILE_CREATED',
          entity: 'ClientProfile',
          entityId: profile.id,
          metadata: { candidateName: profile.candidateName, assignedRecruiterId: assignedRecruiter.id },
        },
      });
    }

    profiles.push(profile);
  }

  console.log(`✅ Seeded ${profiles.length} client profiles`);
  return profiles;
}

async function seedApplications(
  profiles: { id: string; candidateName: string; assignedRecruiterId: string | null }[],
  recruiters: { id: string }[],
  targetCount: number,
) {
  const recruiterIds = recruiters.map((r) => r.id);

  const existingCount = await prisma.jobApplication.count({
    where: { recruiterId: { in: recruiterIds } },
  });

  if (existingCount >= targetCount) {
    console.log(
      `ℹ️  Found ${existingCount} existing applications for seeded recruiters (target: ${targetCount}). Skipping - seed is idempotent.`,
    );
    return existingCount;
  }

  const remaining = targetCount - existingCount;
  let created = 0;
  let attempts = 0;
  const maxAttempts = remaining * 5; // generous ceiling to absorb duplicate collisions

  // Track (profileId, normalizedJobLink) pairs already used so we don't even
  // attempt an insert that we know will violate the unique constraint.
  const seenPairs = new Set<string>();

  const existing = await prisma.jobApplication.findMany({
    select: { profileId: true, normalizedJobLink: true },
  });
  for (const row of existing) {
    seenPairs.add(`${row.profileId}::${row.normalizedJobLink}`);
  }

  while (created < remaining && attempts < maxAttempts) {
    attempts++;

    const profile = pick(profiles);
    // Prefer the recruiter actually assigned to this profile (realistic), else a random recruiter.
    const recruiter = profile.assignedRecruiterId
      ? recruiters.find((r) => r.id === profile.assignedRecruiterId) ?? pick(recruiters)
      : pick(recruiters);

    const portal = pick(JOB_PORTALS);
    const jobId = randomInt(100000, 999999).toString();
    const jobLink = PORTAL_URL_BUILDERS[portal](jobId);
    const normalizedJobLink = normalizeJobLink(jobLink);
    const dedupeKey = `${profile.id}::${normalizedJobLink}`;

    if (seenPairs.has(dedupeKey)) {
      continue; // extremely unlikely with random 6-digit IDs, but guard anyway
    }

    const appliedAt = randomRecentTimestamp(45); // spread across the last 45 days
    const businessDate = getBusinessDate(appliedAt);
    const status = pick(APPLICATION_STATUSES);
    const companyName = pick(COMPANIES);
    const jobTitle = pick(JOB_TITLES);

    try {
      const application = await prisma.jobApplication.create({
        data: {
          id: randomUUID(),
          profileId: profile.id,
          recruiterId: recruiter.id,
          jobLink,
          normalizedJobLink,
          companyName,
          jobTitle,
          jobPortal: portal,
          status,
          appliedAt,
          businessDate,
        },
      });

      seenPairs.add(dedupeKey);
      created++;

      await prisma.auditLog.create({
        data: {
          userId: recruiter.id,
          action: 'APPLICATION_CREATED',
          entity: 'JobApplication',
          entityId: application.id,
          metadata: {
            profileId: profile.id,
            candidateName: profile.candidateName,
            companyName,
            jobTitle,
            jobPortal: portal,
            businessDate: businessDate.toISOString().slice(0, 10),
          },
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Duplicate constraint hit a race with itself - just retry with a new random job link.
        continue;
      }
      throw err;
    }
  }

  console.log(`✅ Seeded ${created} new job applications (total for seeded recruiters: ${existingCount + created}, target: ${targetCount})`);
  return existingCount + created;
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main() {
  const admin = await seedAdmin();

  if (!SEED_DEMO_DATA) {
    console.log('\nℹ️  Skipping demo data (recruiters/profiles/applications).');
    console.log('   Run with SEED_DEMO_DATA=true to generate a full demo dataset, e.g.:');
    console.log('     SEED_DEMO_DATA=true npm run seed');
    return;
  }

  console.log('\n🌱 SEED_DEMO_DATA=true - generating full demo dataset...\n');

  const recruiters = await seedRecruiters(admin.id);
  const profiles = await seedClientProfiles(recruiters, admin.id);
  await seedApplications(profiles, recruiters, 50);

  const [userCount, profileCount, applicationCount, auditLogCount] = await Promise.all([
    prisma.user.count(),
    prisma.clientProfile.count(),
    prisma.jobApplication.count(),
    prisma.auditLog.count(),
  ]);

  console.log('\n📊 Final database state:');
  console.log(`   Users (admin + recruiters): ${userCount}`);
  console.log(`   Client Profiles:            ${profileCount}`);
  console.log(`   Job Applications:           ${applicationCount}`);
  console.log(`   Audit Log entries:          ${auditLogCount}`);
  console.log('\n✅ Demo data seed complete.');
  console.log(`   Recruiter login password for all seeded recruiters: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
