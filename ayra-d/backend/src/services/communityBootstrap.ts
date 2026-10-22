import { prisma } from '../db/client';

// Idempotent provisioning of community data. Runs at server boot (and via
// scripts/seed-community.ts) so fresh databases — local or Railway — get the
// global channels and achievement catalog without a manual seed step.

const GLOBAL_CHANNELS = [
  {
    slug: 'general',
    name: 'general',
    description: 'Global community chat',
    emoji: '💬',
    required_tier: 'FREE',
    posting_policy: 'EVERYONE',
    is_default: true,
    sort_order: 0,
  },
  {
    slug: 'wins',
    name: 'wins',
    description: 'Celebrate PRs, streaks & achievements',
    emoji: '🏆',
    required_tier: 'FREE',
    posting_policy: 'EVERYONE',
    is_default: false,
    sort_order: 1,
  },
  {
    slug: 'live-sessions',
    name: 'live-sessions',
    description: 'Live workout sessions & events',
    emoji: '📡',
    required_tier: 'FREE',
    posting_policy: 'EVERYONE',
    is_default: false,
    sort_order: 2,
  },
  {
    slug: 'pro-lounge',
    name: 'pro-lounge',
    description: 'PRO members only',
    emoji: '👑',
    required_tier: 'PAID',
    posting_policy: 'EVERYONE',
    is_default: false,
    sort_order: 3,
  },
  {
    slug: 'announcements',
    name: 'announcements',
    description: 'Official GongaFit announcements',
    emoji: '📣',
    required_tier: 'FREE',
    posting_policy: 'ADMIN_ONLY',
    is_default: false,
    sort_order: 4,
  },
] as const;

const ACHIEVEMENTS = [
  // SOCIAL
  { name: 'First Words', description: 'Send your first community message', icon: '💬', tier: 'BRONZE', category: 'SOCIAL', criteria: { metric: 'messages_sent', gte: 1 } },
  { name: 'Conversationalist', description: 'Send 100 community messages', icon: '🗣️', tier: 'SILVER', category: 'SOCIAL', criteria: { metric: 'messages_sent', gte: 100 } },
  { name: 'Town Crier', description: 'Send 500 community messages', icon: '📢', tier: 'GOLD', category: 'SOCIAL', criteria: { metric: 'messages_sent', gte: 500 } },
  { name: 'Hype Machine', description: 'Give 100 reactions', icon: '🔥', tier: 'SILVER', category: 'SOCIAL', criteria: { metric: 'reactions_given', gte: 100 } },
  { name: 'Crowd Favorite', description: 'Receive 50 reactions on your messages', icon: '🌟', tier: 'GOLD', category: 'SOCIAL', criteria: { metric: 'reactions_received', gte: 50 } },
  { name: 'Squad Up', description: 'Join your first squad', icon: '🤝', tier: 'BRONZE', category: 'SOCIAL', criteria: { metric: 'squads_joined', gte: 1 } },
  { name: 'Squad Leader', description: 'Create a squad', icon: '👑', tier: 'SILVER', category: 'SOCIAL', criteria: { metric: 'squads_created', gte: 1 } },
  { name: 'Wingman', description: 'Make 5 friends', icon: '🫂', tier: 'SILVER', category: 'SOCIAL', criteria: { metric: 'friends_count', gte: 5 } },
  // CONSISTENCY
  { name: 'Warm-Up', description: 'Reach a 3-day activity streak', icon: '✨', tier: 'BRONZE', category: 'CONSISTENCY', criteria: { metric: 'current_streak', gte: 3 } },
  { name: 'One Week Strong', description: 'Reach a 7-day activity streak', icon: '⚡', tier: 'SILVER', category: 'CONSISTENCY', criteria: { metric: 'current_streak', gte: 7 } },
  { name: 'Iron Month', description: 'Reach a 30-day activity streak', icon: '🛡️', tier: 'GOLD', category: 'CONSISTENCY', criteria: { metric: 'current_streak', gte: 30 } },
  { name: 'Unbreakable', description: 'Reach a 100-day activity streak', icon: '💎', tier: 'DIAMOND', category: 'CONSISTENCY', criteria: { metric: 'current_streak', gte: 100 } },
  // WORKOUT
  { name: 'First Rep', description: 'Complete your first workout', icon: '🏋️', tier: 'BRONZE', category: 'WORKOUT', criteria: { metric: 'workouts_completed', gte: 1 } },
  { name: 'Regular', description: 'Complete 10 workouts', icon: '💪', tier: 'SILVER', category: 'WORKOUT', criteria: { metric: 'workouts_completed', gte: 10 } },
  { name: 'Gym Rat', description: 'Complete 50 workouts', icon: '🐀', tier: 'GOLD', category: 'WORKOUT', criteria: { metric: 'workouts_completed', gte: 50 } },
  { name: 'Machine', description: 'Complete 250 workouts', icon: '🤖', tier: 'PLATINUM', category: 'WORKOUT', criteria: { metric: 'workouts_completed', gte: 250 } },
  // MILESTONE
  { name: 'Rising Star', description: 'Reach level 5', icon: '⭐', tier: 'BRONZE', category: 'MILESTONE', criteria: { metric: 'level', gte: 5 } },
  { name: 'Veteran', description: 'Reach level 10', icon: '🎖️', tier: 'SILVER', category: 'MILESTONE', criteria: { metric: 'level', gte: 10 } },
  { name: 'Legend of the Gonga', description: 'Reach level 25', icon: '🏛️', tier: 'GOLD', category: 'MILESTONE', criteria: { metric: 'level', gte: 25 } },
  { name: 'Challenger', description: 'Join your first challenge', icon: '🎯', tier: 'BRONZE', category: 'MILESTONE', criteria: { metric: 'challenges_joined', gte: 1 } },
] as const;

export async function bootstrapCommunity(): Promise<void> {
  try {
    for (const ch of GLOBAL_CHANNELS) {
      await prisma.channel.upsert({
        where: { slug: ch.slug },
        create: {
          slug: ch.slug,
          name: ch.name,
          description: ch.description,
          emoji: ch.emoji,
          channel_type: 'GLOBAL',
          required_tier: ch.required_tier as any,
          posting_policy: ch.posting_policy as any,
          is_default: ch.is_default,
          sort_order: ch.sort_order,
        },
        update: {
          // keep description/emoji/policy in sync with code; leave name alone
          description: ch.description,
          emoji: ch.emoji,
          required_tier: ch.required_tier as any,
          posting_policy: ch.posting_policy as any,
          is_default: ch.is_default,
          sort_order: ch.sort_order,
          is_active: true,
        },
      });
    }

    // Backfill: attach legacy global-feed messages to #general.
    const general = await prisma.channel.findUnique({ where: { slug: 'general' }, select: { id: true } });
    if (general) {
      const backfilled = await prisma.message.updateMany({
        where: { channel_type: 'GLOBAL', channel_id: null },
        data: { channel_id: general.id },
      });
      if (backfilled.count > 0) {
        console.log(`🧭 Backfilled ${backfilled.count} legacy global messages onto #general`);
      }
    }

    for (const a of ACHIEVEMENTS) {
      const existing = await prisma.achievement.findFirst({ where: { name: a.name }, select: { id: true } });
      if (existing) {
        await prisma.achievement.update({
          where: { id: existing.id },
          data: { description: a.description, icon: a.icon, tier: a.tier as any, category: a.category as any, criteria: a.criteria as any },
        });
      } else {
        await prisma.achievement.create({
          data: { name: a.name, description: a.description, icon: a.icon, tier: a.tier as any, category: a.category as any, criteria: a.criteria as any },
        });
      }
    }

    console.log('✅ Community bootstrap complete (channels + achievements)');
  } catch (error) {
    console.error('Community bootstrap failed (continuing to serve):', error);
  }
}
