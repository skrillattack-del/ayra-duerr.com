import '../src/env';
import { bootstrapCommunity } from '../src/services/communityBootstrap';
import { prisma } from '../src/db/client';

// Standalone runner for fresh local databases:
//   npx ts-node scripts/seed-community.ts
// (Production seeds itself at server boot via the same bootstrapCommunity.)

bootstrapCommunity()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
