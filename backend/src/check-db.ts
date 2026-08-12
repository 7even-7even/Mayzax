import { prisma } from './lib/prisma';
import { env } from './config/env';

async function check() {
  console.log("Loaded VERIFICATION_THRESHOLD:", env.VERIFICATION_THRESHOLD);
  console.log("Process VERIFICATION_THRESHOLD:", process.env.VERIFICATION_THRESHOLD);
  try {
    const apps = await prisma.jobApplication.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        profile: true,
      } as any
    });
    console.log("=== RECENT APPLICATIONS ===");
    for (const app of apps) {
      console.log(`Candidate: ${app.profile?.candidateName}`);
      console.log(`Verified: ${app.verified}`);
      console.log(`Score: ${app.verificationScore}`);
      console.log(`Hash: ${app.verificationHash}`);
      console.log("------------------------");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
