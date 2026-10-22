import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { authenticateJWT } from '../middleware/authMiddleware';
import { loadFreshTier, rejectMuted } from '../middleware/entitlementsMiddleware';
import { messageSendLimiter } from '../middleware/rateLimiters';
import { canReadChannel, canPostChannel, limitsFor } from '../utils/entitlements';
import { levelProgress } from '../utils/leveling';
import { senderSelect, withReactionSummary } from '../utils/messageTransforms';
import { awardXp } from '../services/xpService';
import { notify } from '../services/notificationService';
import { getIO } from '../socket/socketServer';

const router: Router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const sendChannelMessageSchema = z.object({
  content: z.string().max(2000).default(''),
  mediaUrls: z.array(z.string()).max(10).optional(),
  parentId: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).max(10).optional(),
}).refine((data) => data.content.trim().length > 0 || (data.mediaUrls && data.mediaUrls.length > 0), {
  message: 'Message must have content or media',
});

// =============================================================================
// CHANNELS
// =============================================================================

/**
 * GET /api/community/channels
 * Global (non-squad) channels with per-caller lock state.
 */
router.get('/channels', authenticateJWT, loadFreshTier, async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({
      where: { squad_id: null, is_active: true },
      orderBy: { sort_order: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        emoji: true,
        required_tier: true,
        posting_policy: true,
        is_default: true,
        sort_order: true,
      },
    });

    const user = req.user!;
    res.json({
      channels: channels.map((ch) => ({
        ...ch,
        locked: !canReadChannel(user, ch),
        canPost: canPostChannel(user, ch),
      })),
    });
  } catch (error) {
    console.error('List channels error:', error);
    res.status(500).json({ error: 'Failed to list channels' });
  }
});

/**
 * GET /api/community/channels/:channelId/messages?cursor&limit&pinned
 * Paginated channel feed (or pinned list with ?pinned=1).
 */
router.get('/channels/:channelId/messages', authenticateJWT, loadFreshTier, async (req, res) => {
  try {
    const channel = await prisma.channel.findFirst({
      where: { id: req.params.channelId, is_active: true },
    });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    if (channel.squad_id) {
      const membership = await prisma.squadMember.findUnique({
        where: { squad_id_user_id: { squad_id: channel.squad_id, user_id: req.user!.userId } },
      });
      if (!membership) return res.status(403).json({ error: 'You are not a member of this squad' });
    } else if (!canReadChannel(req.user!, channel)) {
      return res.status(403).json({ error: 'Upgrade to PRO to access this channel', code: 'TIER_LOCKED' });
    }

    const userId = req.user!.userId;

    if (req.query.pinned === '1') {
      const pinned = await prisma.message.findMany({
        where: { channel_id: channel.id, is_pinned: true, is_deleted: false },
        orderBy: { pinned_at: 'desc' },
        take: 20,
        include: {
          sender: { select: senderSelect },
          reactions: { select: { emoji: true, user_id: true } },
          _count: { select: { replies: true } },
        },
      });
      return res.json({ messages: pinned.map((m) => withReactionSummary(m, userId)) });
    }

    const { cursor, limit = '50' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);

    const whereClause: any = {
      channel_id: channel.id,
      is_deleted: false,
      parent_id: null,
    };
    if (cursor) {
      whereClause.created_at = { lt: new Date(cursor as string) };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: limitNum,
      include: {
        sender: { select: senderSelect },
        reactions: { select: { emoji: true, user_id: true } },
        replies: {
          where: { is_deleted: false },
          take: 3,
          orderBy: { created_at: 'desc' },
          include: { sender: { select: { id: true, display_name: true, avatar_url: true } } },
        },
        _count: { select: { replies: true } },
      },
    });

    const nextCursor = messages.length === limitNum
      ? messages[messages.length - 1].created_at.toISOString()
      : null;

    if (cursor) {
      res.set('Cache-Control', 'private, max-age=300');
    } else {
      res.set('Cache-Control', 'no-cache');
    }

    res.json({
      messages: messages.map((m) => withReactionSummary(m, userId)),
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (error) {
    console.error('Get channel messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/community/channels/:channelId/messages
 * Send a message to a channel (tier/policy/mute enforced, threads, mentions).
 */
router.post(
  '/channels/:channelId/messages',
  authenticateJWT,
  loadFreshTier,
  rejectMuted,
  messageSendLimiter,
  async (req, res) => {
    try {
      const validated = sendChannelMessageSchema.parse(req.body);

      const channel = await prisma.channel.findFirst({
        where: { id: req.params.channelId, is_active: true },
      });
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      if (channel.squad_id) {
        const membership = await prisma.squadMember.findUnique({
          where: { squad_id_user_id: { squad_id: channel.squad_id, user_id: req.user!.userId } },
        });
        if (!membership) return res.status(403).json({ error: 'You are not a member of this squad' });
      }

      if (!canPostChannel(req.user!, channel)) {
        const code = canReadChannel(req.user!, channel) ? 'ADMIN_ONLY' : 'TIER_LOCKED';
        return res.status(403).json({
          error: code === 'ADMIN_ONLY' ? 'Only admins can post in this channel' : 'Upgrade to PRO to post in this channel',
          code,
        });
      }

      const limits = limitsFor(req.user!);
      const mediaUrls = validated.mediaUrls || [];
      if (mediaUrls.length > limits.maxMediaPerMessage) {
        return res.status(403).json({
          error: `Your plan allows up to ${limits.maxMediaPerMessage} attachments per message`,
          code: 'TIER_LIMIT',
        });
      }

      // Threads inherit the parent's channel; parent must live here.
      let parent: { id: string; sender_id: string; channel_id: string | null } | null = null;
      if (validated.parentId) {
        parent = await prisma.message.findFirst({
          where: { id: validated.parentId, is_deleted: false },
          select: { id: true, sender_id: true, channel_id: true },
        });
        if (!parent || parent.channel_id !== channel.id) {
          return res.status(400).json({ error: 'Parent message not found in this channel' });
        }
      }

      // Only keep mentions that reference real, active users.
      let mentions: string[] = [];
      if (validated.mentions && validated.mentions.length > 0) {
        const found = await prisma.user.findMany({
          where: { id: { in: validated.mentions }, is_active: true },
          select: { id: true },
        });
        mentions = found.map((u) => u.id);
      }

      const message = await prisma.message.create({
        data: {
          content: validated.content,
          sender_id: req.user!.userId,
          channel_type: channel.squad_id ? 'TEXT' : 'GLOBAL',
          channel_id: channel.id,
          squad_id: channel.squad_id,
          parent_id: validated.parentId,
          media_urls: mediaUrls,
          mentions,
        },
        include: {
          sender: { select: senderSelect },
          _count: { select: { replies: true } },
        },
      });

      const io = getIO();
      io.to(`channel:${channel.id}`).emit('message:channel', { channelId: channel.id, message });
      if (channel.is_default) {
        // Legacy alias so older clients on the global feed keep updating.
        io.emit('message:global', message);
      }

      res.status(201).json({ message });

      // Post-response side effects: XP + notifications (never block the send).
      const senderId = req.user!.userId;
      const senderName = message.sender.display_name;
      void (async () => {
        await awardXp(senderId, 'MESSAGE');

        if (parent && parent.sender_id !== senderId) {
          await awardXp(parent.sender_id, 'REPLY_RECEIVED', { refId: `reply:${message.id}` });
          await notify(parent.sender_id, {
            type: 'REPLY',
            actorId: senderId,
            title: `${senderName} replied to your message`,
            body: validated.content.slice(0, 140) || '📷 Media',
            link: `/dashboard/community?channel=${channel.slug || channel.id}&message=${parent.id}`,
            refId: message.id,
          });
        }

        for (const mentionedId of mentions) {
          if (mentionedId === senderId) continue;
          if (parent && mentionedId === parent.sender_id) continue; // already notified as reply
          await notify(mentionedId, {
            type: 'MENTION',
            actorId: senderId,
            title: `${senderName} mentioned you in #${channel.name}`,
            body: validated.content.slice(0, 140),
            link: `/dashboard/community?channel=${channel.slug || channel.id}&message=${message.id}`,
            refId: message.id,
          });
        }

        // Admin posts in announcements fan out as notifications.
        if (channel.posting_policy === 'ADMIN_ONLY' && !channel.squad_id) {
          const users = await prisma.user.findMany({
            where: { is_active: true, id: { not: senderId } },
            select: { id: true },
          });
          await prisma.notification.createMany({
            data: users.map((u) => ({
              user_id: u.id,
              actor_id: senderId,
              type: 'ANNOUNCEMENT' as const,
              title: `📣 New announcement`,
              body: validated.content.slice(0, 140),
              link: `/dashboard/community?channel=${channel.slug || channel.id}`,
              ref_id: message.id,
            })),
          });
          io.emit('announcement:new', { channelId: channel.id, messageId: message.id });
        }
      })().catch((err) => console.error('post-send side effects error:', err));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      console.error('Send channel message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  },
);

// =============================================================================
// GAMIFICATION
// =============================================================================

/**
 * GET /api/community/me
 * Caller's stats, level progress, and achievement catalog with earned state.
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [stats, achievements, earned] = await Promise.all([
      prisma.userStats.upsert({ where: { user_id: userId }, create: { user_id: userId }, update: {} }),
      prisma.achievement.findMany({ orderBy: [{ category: 'asc' }, { created_at: 'asc' }] }),
      prisma.userAchievement.findMany({ where: { user_id: userId } }),
    ]);

    const earnedById = new Map(earned.map((e) => [e.achievement_id, e]));

    res.json({
      stats,
      levelProgress: levelProgress(stats.xp),
      achievements: achievements.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        tier: a.tier,
        category: a.category,
        criteria: a.criteria,
        earned: earnedById.has(a.id),
        earnedAt: earnedById.get(a.id)?.earned_date ?? null,
      })),
    });
  } catch (error) {
    console.error('Get community profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/community/leaderboard?period=week|all
 */
router.get('/leaderboard', authenticateJWT, async (req, res) => {
  try {
    const period = req.query.period === 'all' ? 'all' : 'week';
    const userId = req.user!.userId;

    const userSummarySelect = {
      id: true,
      display_name: true,
      avatar_url: true,
      role: true,
      membership_tier: true,
      stats: { select: { level: true, current_streak: true } },
    } as const;

    if (period === 'week') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const grouped = await prisma.xpEvent.groupBy({
        by: ['user_id'],
        where: { created_at: { gte: since } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 20,
      });

      const users = await prisma.user.findMany({
        where: { id: { in: grouped.map((g) => g.user_id) } },
        select: userSummarySelect,
      });
      const userById = new Map(users.map((u) => [u.id, u]));

      const entries = grouped
        .filter((g) => userById.has(g.user_id))
        .map((g, i) => ({ rank: i + 1, xp: g._sum.amount || 0, user: userById.get(g.user_id)! }));

      const mineAgg = await prisma.xpEvent.aggregate({
        where: { user_id: userId, created_at: { gte: since } },
        _sum: { amount: true },
      });
      const myXp = mineAgg._sum.amount || 0;
      const [{ count: ahead }] = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM (
          SELECT user_id, SUM(amount) as total FROM xp_events
          WHERE created_at >= ${since}
          GROUP BY user_id
          HAVING SUM(amount) > ${myXp}
        ) t
      `;

      return res.json({ period, entries, me: { xp: myXp, rank: Number(ahead) + 1 } });
    }

    const top = await prisma.userStats.findMany({
      orderBy: { xp: 'desc' },
      take: 20,
      include: { user: { select: userSummarySelect } },
    });
    const entries = top.map((s, i) => ({ rank: i + 1, xp: s.xp, user: s.user }));

    const mine = await prisma.userStats.findUnique({ where: { user_id: userId } });
    const myXp = mine?.xp || 0;
    const ahead = await prisma.userStats.count({ where: { xp: { gt: myXp } } });

    res.json({ period, entries, me: { xp: myXp, rank: ahead + 1 } });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/community/users/:userId/stats
 * Public mini-profile for peek cards.
 */
router.get('/users/:userId/stats', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.userId, is_active: true },
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        role: true,
        membership_tier: true,
        created_at: true,
        stats: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const recentAchievements = await prisma.userAchievement.findMany({
      where: { user_id: user.id },
      orderBy: { earned_date: 'desc' },
      take: 6,
      include: { achievement: { select: { id: true, name: true, icon: true, tier: true } } },
    });

    res.json({
      user: {
        id: user.id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        role: user.role,
        membership_tier: user.membership_tier,
        member_since: user.created_at,
      },
      stats: user.stats ?? null,
      levelProgress: levelProgress(user.stats?.xp ?? 0),
      achievements: recentAchievements.map((ua) => ({ ...ua.achievement, earnedAt: ua.earned_date })),
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

export default router;
