/**
 * ONE-TIME SCRIPT: Promote user to ADMIN
 * Run with: npx ts-node scripts/promote-admin.ts
 * DELETE THIS FILE AFTER USE
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL_TO_PROMOTE = 'matuxynhoj@gmail.com';

async function main() {
  console.log(`🔍 Looking for user: ${EMAIL_TO_PROMOTE}`);
  
  const user = await prisma.user.findUnique({
    where: { email: EMAIL_TO_PROMOTE },
  });

  if (!user) {
    console.error('❌ User not found!');
    process.exit(1);
  }

  console.log(`📋 Current role: ${user.role}`);

  if (user.role === 'ADMIN') {
    console.log('✅ User is already ADMIN!');
    process.exit(0);
  }

  const updated = await prisma.user.update({
    where: { email: EMAIL_TO_PROMOTE },
    data: { role: 'ADMIN' },
  });

  console.log(`✅ Promoted ${updated.email} to ADMIN!`);
  console.log('');
  console.log('⚠️  IMPORTANT: Log out and log back in to get a fresh JWT with the new role!');
  console.log('⚠️  DELETE THIS SCRIPT after use!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
