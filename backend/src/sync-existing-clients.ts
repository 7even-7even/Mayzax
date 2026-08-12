import { prisma } from './lib/prisma';
import { hashPassword } from './modules/auth/auth.service';
import { Role } from '@prisma/client';

async function main() {
  console.log('=== SYNCING EXISTING CLIENT USER CREDENTIALS ===');
  const profiles = await prisma.clientProfile.findMany({
    where: { deletedAt: null }
  });

  console.log(`Found ${profiles.length} client profiles. Checking credentials...`);
  const defaultHash = await hashPassword('Pass@123');

  for (const profile of profiles) {
    const email = profile.email.toLowerCase();
    // 1. Try to find by clientProfileId
    let user = await prisma.user.findFirst({
      where: { clientProfileId: profile.id }
    });

    // 2. If not found by ID, try finding by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email }
      });
    }

    if (user) {
      // Update link and make sure it has Role.CLIENT and default password
      await prisma.user.update({
        where: { id: user.id },
        data: {
          clientProfileId: profile.id,
          role: Role.CLIENT,
          passwordHash: defaultHash,
          isActive: true
        }
      });
      console.log(`Linked and reset credentials for existing user: ${email}`);
    } else {
      // Create new user
      await prisma.user.create({
        data: {
          name: profile.candidateName,
          email,
          passwordHash: defaultHash,
          role: Role.CLIENT,
          isActive: true,
          clientProfileId: profile.id
        }
      });
      console.log(`Created new credentials for: ${email}`);
    }
  }

  console.log('=== CREDENTIALS SYNC COMPLETE ===');
}

main()
  .catch((err) => {
    console.error('Error running credentials sync:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
