import { prisma } from './lib/prisma';

async function check() {
  const profiles = await prisma.clientProfile.findMany({
    where: { deletedAt: null },
    select: { candidateName: true, email: true }
  });
  console.log('All Profiles:', profiles);
}

check().catch(console.error).finally(() => prisma.$disconnect());
