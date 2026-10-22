#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');

const MIGRATION_NAME = '20260628030334_init';

const expectedTypes = [
  'ChannelType',
  'SquadVisibility',
  'SquadRole',
  'InviteStatus',
  'FriendshipStatus',
  'WeightUnit',
  'LiftGoalType',
  'GoalStatus',
  'WorkoutType',
  'WorkoutStatus',
  'TrainerClientStatus',
];

const expectedTables = [
  'messages',
  'message_reactions',
  'squads',
  'squad_members',
  'squad_invites',
  'squad_challenges',
  'friendships',
  'user_lifts',
  'set_logs',
  'lift_goals',
  'workout_templates',
  'scheduled_workouts',
  'trainer_clients',
];

function runPrismaResolve() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    npx,
    ['prisma', 'migrate', 'resolve', '--applied', MIGRATION_NAME],
    {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: false,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }

  const prisma = new PrismaClient();

  try {
    const migrations = await prisma.$queryRawUnsafe(
      `
        select migration_name, finished_at, rolled_back_at, logs
        from "_prisma_migrations"
        where migration_name = $1
        order by started_at desc
      `,
      MIGRATION_NAME,
    );

    const appliedMigration = migrations.find(
      (migration) => migration.finished_at && !migration.rolled_back_at,
    );

    if (appliedMigration) {
      console.log(`[recover] ${MIGRATION_NAME} is already marked applied.`);
      return;
    }

    const existingTypeRows = await prisma.$queryRawUnsafe(
      `
        select typname
        from pg_type
        where typname = any($1)
      `,
      expectedTypes,
    );
    const existingTableRows = await prisma.$queryRawUnsafe(
      `
        select tablename
        from pg_tables
        where schemaname = 'public' and tablename = any($1)
      `,
      expectedTables,
    );

    const existingTypes = new Set(existingTypeRows.map((row) => row.typname));
    const existingTables = new Set(existingTableRows.map((row) => row.tablename));
    const missingTypes = expectedTypes.filter((name) => !existingTypes.has(name));
    const missingTables = expectedTables.filter((name) => !existingTables.has(name));

    if (missingTypes.length || missingTables.length) {
      console.log(`[recover] ${MIGRATION_NAME} is not fully present in this database.`);
      if (missingTypes.length) {
        console.log(`[recover] Missing enum types: ${missingTypes.join(', ')}`);
      }
      if (missingTables.length) {
        console.log(`[recover] Missing tables: ${missingTables.join(', ')}`);
      }
      console.log('[recover] Not marking the migration applied. Let prisma migrate deploy retry it, or roll forward with migrate diff first.');
      return;
    }

    console.log(`[recover] All objects from ${MIGRATION_NAME} already exist.`);
    console.log('[recover] Marking the Prisma migration as applied.');
    runPrismaResolve();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`[recover] ${error.message || error}`);
  process.exit(1);
});
