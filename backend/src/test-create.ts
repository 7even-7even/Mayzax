import { createApplication } from './modules/applications/application.service';
import { prisma } from './lib/prisma';
import { Role } from '@prisma/client';

async function test() {
  const actor = {
    id: '7a883d9d-b2a7-4f84-8127-0a709a824fe5', // Admin
    role: Role.ADMIN
  };

  const profile = await prisma.clientProfile.create({
    data: {
      candidateName: 'Test Candidate Trace',
      email: 'trace@example.com',
      phone: '+91-9999999999',
      technology: 'NodeJS',
      assignedRecruiterId: actor.id
    }
  });

  const input = {
    profileId: profile.id,
    jobLink: 'https://job-boards.greenhouse.io/accenturefederalservices/jobs/4608068006/confirmation?gh_src=TraceTest',
    companyName: 'Trace Company',
    jobTitle: 'Trace Job',
    jobPortal: 'GREENHOUSE' as any,
    applicationCompleted: true as any,
    status: 'APPLIED' as any,
    verified: false,
    verificationHash: '35a252b339b687e39b424e84d2c32de7a05f7170d519ff73f16058912a0c1a99' // Shared greenhouse hash
  };

  try {
    console.log("=== RUNNING TRACE ===");
    const app = await createApplication(input, actor);
    console.log("Resulting application:", JSON.stringify(app, null, 2));
  } catch (err) {
    console.error("Error creating application:", err);
  } finally {
    // Clean up
    await prisma.jobApplication.deleteMany({ where: { profileId: profile.id } });
    await prisma.clientProfile.delete({ where: { id: profile.id } });
    await prisma.$disconnect();
  }
}

test();
