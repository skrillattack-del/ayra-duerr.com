import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL || 'matuxynhoj@gmail.com';
const adminPassword = process.env.ADMIN_PASSWORD;
const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Matux';

async function main() {
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD is required. Set it in the shell or backend/.env before running this script.');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      password_hash: passwordHash,
      display_name: adminDisplayName,
      role: 'ADMIN',
    },
    update: {
      password_hash: passwordHash,
      display_name: adminDisplayName,
      role: 'ADMIN',
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      role: true,
    },
  });

  console.log(`Seeded admin account: ${admin.email} (${admin.role})`);
}

main()
  .catch((error) => {
    console.error('Failed to seed admin account:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
