import { prisma } from './lib/prisma';

async function check() {
  try {
    const candidates = await prisma.clientProfile.findMany({
      where: {
        candidateName: {
          contains: 'Kasturi',
          mode: 'insensitive'
        }
      }
    });
    console.log("=== KASTURI PROFILES ===");
    console.log(JSON.stringify(candidates, null, 2));

    const apps = await prisma.jobApplication.findMany({
      where: {
        profile: {
          candidateName: {
            contains: 'Kasturi',
            mode: 'insensitive'
          }
        }
      },
      include: {
        profile: true,
        recruiter: true
      } as any
    });
    console.log("=== KASTURI APPLICATIONS ===");
    for (const app of apps) {
      console.log(`ID: ${app.id}, Candidate: ${app.profile?.candidateName}, Recruiter: ${app.recruiter?.name}, Verified: ${app.verified}, Score: ${app.verificationScore}, Hash: ${app.verificationHash}, Method: ${app.verificationMethod}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
