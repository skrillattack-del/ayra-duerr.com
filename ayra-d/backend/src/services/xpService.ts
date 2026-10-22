import { prisma } from '../db/client';
import { getIO } from '../socket/socketServer';
import { levelFromXp } from '../utils/leveling';
import { notify } from './notificationService';

// =============================================================================
// XP CONFIG
// =============================================================================

type XpSourceName =
  | 'MESSAGE'
  | 'REPLY_RECEIVED'
  | 'REACTION_RECEIVED'
  | 'REACTION_GIVEN'
  | 'WORKOUT_COMPLETED'
  | 'PROGRESS_LOG'
  | 'CHALLENGE_JOINED'
  | 'SQUAD_JOINED'
  | 'SQUAD_CREATED'
  | 'FRIEND_ADDED'
  | 'ACHIEVEMENT'
  | 'STREAK_BONUS';

interface XpRule {
  amount: number;
  /** Max awarded events per UTC day. undefined = uncapped (rely on dedupe). */
  dailyCap?: number;
  /** UserStats counter incremented alongside the award (even when capped). */
  counter?:
    | 'messages_sent'
    | 'reactions_given'
    | 'reactions_received'
    | 'workouts_completed'
    | 'progress_logs'
    | 'challenges_joined'
    | 'squads_joined'
    | 'squads_created'
    | 'friends_count';
}

export const XP_RULES: Record<XpSourceName, XpRule> = {
  MESSAGE: { amount: 5, dailyCap: 20, counter: 'messages_sent' },
  REPLY_RECEIVED: { amount: 3, dailyCap: 20 },
  REACTION_RECEIVED: { amount: 2, dailyCap: 40, counter: 'reactions_received' },
  REACTION_GIVEN: { amount: 1, dailyCap: 20, counter: 'reactions_given' },
  WORKOUT_COMPLETED: { amount: 50, dailyCap: 2, counter: 'workouts_completed' },
  PROGRESS_LOG: { amount: 15, dailyCap: 3, counter: 'progress_logs' },
  CHALLENGE_JOINED: { amount: 25, counter: 'challenges_joined' },
  SQUAD_JOINED: { amount: 20, counter: 'squads_joined' },
  SQUAD_CREATED: { amount: 25, counter: 'squads_created' },
  FRIEND_ADDED: { amount: 10, dailyCap: 5, counter: 'friends_count' },
  ACHIEVEMENT: { amount: 0 }, // amount comes from the achievement tier
  STREAK_BONUS: { amount: 0, dailyCap: 1 }, // computed from streak length
};

export const ACHIEVEMENT_TIER_XP: Record<string, number> = {
  BRONZE: 50,
  SILVER: 100,
  GOLD: 200,
  PLATINUM: 350,
  DIAMOND: 500,
  LEGENDARY: 1000,
};

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function safeIO() {
  try {
    return getIO();
  } catch {
    return null;
  }
}

// =============================================================================
// AWARD PATH
// =============================================================================

export interface AwardResult {
  awarded: boolean;
  amount: number;
  leveledUp: boolean;
  level: number;
}

/**
 * The single XP award path. Handles dedupe, daily caps, counters, streaks,
 * level-ups, and achievement checks. Never throws — XP must not break the
 * primary action; wrap-and-log instead.
 */
export async function awardXp(
  userId: string,
  source: XpSourceName,
  opts: { refId?: string; amountOverride?: number } = {},
): Promise<AwardResult> {
  const noAward: AwardResult = { awarded: false, amount: 0, leveledUp: false, level: 1 };
  try {
    const rule = XP_RULES[source];
    if (!rule) return noAward;

    // Dedupe by (user, source, refId) — lifetime, survives toggle farming.
    if (opts.refId) {
      const existing = await prisma.xpEvent.findFirst({
        where: { user_id: userId, source, ref_id: opts.refId },
        select: { id: true },
      });
      if (existing) return noAward;
    }

    // Daily cap (still bump raw counters below when capped).
    let capped = false;
    if (rule.dailyCap !== undefined) {
      const todayCount = await prisma.xpEvent.count({
        where: { user_id: userId, source, created_at: { gte: startOfUtcDay() } },
      });
      capped = todayCount >= rule.dailyCap;
    }

    // Load-or-create stats and work out the streak tick.
    const stats = await prisma.userStats.upsert({
      where: { user_id: userId },
      create: { user_id: userId },
      update: {},
    });

    const today = startOfUtcDay();
    const last = stats.last_active_date ? startOfUtcDay(stats.last_active_date) : null;
    const dayMs = 24 * 60 * 60 * 1000;
    let newStreak = stats.current_streak;
    let dayTicked = false;
    if (source !== 'STREAK_BONUS') {
      if (!last || today.getTime() - last.getTime() >= 2 * dayMs) {
        newStreak = 1;
        dayTicked = true;
      } else if (today.getTime() - last.getTime() === dayMs) {
        newStreak = stats.current_streak + 1;
        dayTicked = true;
      }
    }

    let amount = 0;
    if (!capped) {
      if (source === 'STREAK_BONUS') {
        amount = 10 + Math.min(newStreak, 30);
      } else if (source === 'ACHIEVEMENT') {
        amount = opts.amountOverride ?? 0;
      } else {
        amount = opts.amountOverride ?? rule.amount;
      }
    }

    const newXp = stats.xp + amount;
    const newLevel = levelFromXp(newXp);
    const leveledUp = newLevel > stats.level;

    await prisma.$transaction(async (tx) => {
      if (amount > 0) {
        await tx.xpEvent.create({
          data: { user_id: userId, amount, source, ref_id: opts.refId },
        });
      }
      await tx.userStats.update({
        where: { user_id: userId },
        data: {
          xp: newXp,
          level: newLevel,
          current_streak: newStreak,
          longest_streak: Math.max(stats.longest_streak, newStreak),
          ...(source !== 'STREAK_BONUS' ? { last_active_date: today } : {}),
          ...(rule.counter ? { [rule.counter]: { increment: 1 } } : {}),
        },
      });
    });

    const io = safeIO();

    if (leveledUp) {
      io?.to(`user:${userId}`).emit('level:up', { level: newLevel, xp: newXp });
      void notify(userId, {
        type: 'LEVEL_UP',
        title: `Level up! You reached level ${newLevel} 🎉`,
        link: '/dashboard/community',
      });
    }

    // First qualifying activity of a new day earns the streak bonus.
    if (dayTicked && source !== 'STREAK_BONUS') {
      await awardXp(userId, 'STREAK_BONUS');
    }

    // Evaluate achievements touched by this award.
    const touched: string[] = [];
    if (rule.counter) touched.push(rule.counter);
    if (dayTicked) touched.push('current_streak');
    if (leveledUp) touched.push('level');
    if (touched.length > 0) {
      await checkAchievements(userId, touched);
    }

    return { awarded: amount > 0, amount, leveledUp, level: newLevel };
  } catch (error) {
    console.error(`awardXp(${source}) error:`, error);
    return noAward;
  }
}

// =============================================================================
// ACHIEVEMENTS
// =============================================================================

let winsChannelId: string | null | undefined;

async function getWinsChannelId(): Promise<string | null> {
  if (winsChannelId !== undefined) return winsChannelId;
  const wins = await prisma.channel.findUnique({ where: { slug: 'wins' }, select: { id: true } });
  winsChannelId = wins?.id ?? null;
  return winsChannelId;
}

/**
 * Awards any un-earned achievements whose criteria metric is in
 * `touchedMetrics` and whose threshold the user now meets.
 * criteria Json shape: { "metric": "messages_sent", "gte": 100 }
 */
export async function checkAchievements(userId: string, touchedMetrics: string[]): Promise<void> {
  try {
    const [stats, candidates, earned] = await Promise.all([
      prisma.userStats.findUnique({ where: { user_id: userId } }),
      prisma.achievement.findMany(),
      prisma.userAchievement.findMany({ where: { user_id: userId }, select: { achievement_id: true } }),
    ]);
    if (!stats) return;

    const earnedIds = new Set(earned.map((e) => e.achievement_id));
    const metricValue = (metric: string): number => {
      switch (metric) {
        case 'level': return stats.level;
        case 'current_streak': return stats.current_streak;
        default: return (stats as any)[metric] ?? 0;
      }
    };

    for (const achievement of candidates) {
      if (earnedIds.has(achievement.id)) continue;
      const criteria = achievement.criteria as { metric?: string; gte?: number } | null;
      if (!criteria?.metric || typeof criteria.gte !== 'number') continue;
      if (!touchedMetrics.includes(criteria.metric)) continue;
      if (metricValue(criteria.metric) < criteria.gte) continue;

      await prisma.userAchievement.create({
        data: { user_id: userId, achievement_id: achievement.id, progress_value: metricValue(criteria.metric) },
      });

      const xpBonus = ACHIEVEMENT_TIER_XP[achievement.tier] ?? 50;
      await awardXp(userId, 'ACHIEVEMENT', { refId: `ach:${achievement.id}`, amountOverride: xpBonus });

      const io = safeIO();
      io?.to(`user:${userId}`).emit('achievement:earned', {
        achievement: {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          tier: achievement.tier,
        },
        xpBonus,
      });

      void notify(userId, {
        type: 'ACHIEVEMENT',
        title: `Achievement unlocked: ${achievement.name} ${achievement.icon}`,
        body: achievement.description,
        link: '/dashboard/community?channel=wins',
        refId: achievement.id,
      });

      await postWinsSystemMessage(userId, achievement);
    }
  } catch (error) {
    console.error('checkAchievements error:', error);
  }
}

async function postWinsSystemMessage(
  userId: string,
  achievement: { name: string; description: string; icon: string; tier: string },
): Promise<void> {
  try {
    const channelId = await getWinsChannelId();
    if (!channelId) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { display_name: true },
    });
    if (!user) return;

    const message = await prisma.message.create({
      data: {
        content: `${achievement.icon} ${user.display_name} unlocked "${achievement.name}" — ${achievement.description}`,
        sender_id: userId,
        channel_type: 'GLOBAL',
        channel_id: channelId,
        is_system: true,
      },
      include: {
        sender: {
          select: { id: true, display_name: true, avatar_url: true, role: true, membership_tier: true },
        },
      },
    });

    safeIO()?.to(`channel:${channelId}`).emit('message:channel', { channelId, message });
  } catch (error) {
    console.error('postWinsSystemMessage error:', error);
  }
}
