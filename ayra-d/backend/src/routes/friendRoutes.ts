import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { authenticateJWT } from '../middleware/authMiddleware';
import { friendRequestLimiter } from '../middleware/rateLimiters';
import { awardXp } from '../services/xpService';
import { notify } from '../services/notificationService';
import { getIO } from '../socket/socketServer';

const router: Router = Router();

const requestSchema = z.object({
  userId: z.string().uuid(),
});

const peerSelect = {
  id: true,
  display_name: true,
  avatar_url: true,
  role: true,
  membership_tier: true,
  stats: { select: { level: true } },
} as const;

/** Canonical ordering so the [user_a_id, user_b_id] unique constraint holds. */
function orderPair(a: string, b: string): { user_a_id: string; user_b_id: string } {
  return a < b ? { user_a_id: a, user_b_id: b } : { user_a_id: b, user_b_id: a };
}

function peerOf(friendship: { user_a_id: string; user_b_id: string }, userId: string): string {
  return friendship.user_a_id === userId ? friendship.user_b_id : friendship.user_a_id;
}

/**
 * GET /api/friends
 * Accepted friendships as peer user summaries.
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ user_a_id: userId }, { user_b_id: userId }],
      },
      orderBy: { accepted_at: 'desc' },
    });

    const peerIds = friendships.map((f) => peerOf(f, userId));
    const peers = await prisma.user.findMany({
      where: { id: { in: peerIds }, is_active: true },
      select: peerSelect,
    });
    const peerById = new Map(peers.map((p) => [p.id, p]));

    res.json({
      friends: friendships
        .filter((f) => peerById.has(peerOf(f, userId)))
        .map((f) => ({
          friendshipId: f.id,
          since: f.accepted_at,
          user: peerById.get(peerOf(f, userId))!,
        })),
    });
  } catch (error) {
    console.error('List friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

/**
 * GET /api/friends/requests
 * Pending requests split by direction.
 */
router.get('/requests', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const pending = await prisma.friendship.findMany({
      where: {
        status: 'PENDING',
        OR: [{ user_a_id: userId }, { user_b_id: userId }],
      },
      orderBy: { created_at: 'desc' },
    });

    const peerIds = pending.map((f) => peerOf(f, userId));
    const peers = await prisma.user.findMany({
      where: { id: { in: peerIds } },
      select: peerSelect,
    });
    const peerById = new Map(peers.map((p) => [p.id, p]));

    const incoming = [];
    const outgoing = [];
    for (const f of pending) {
      const peer = peerById.get(peerOf(f, userId));
      if (!peer) continue;
      const entry = { friendshipId: f.id, createdAt: f.created_at, user: peer };
      if (f.initiated_by === userId) {
        outgoing.push(entry);
      } else {
        incoming.push(entry);
      }
    }

    res.json({ incoming, outgoing });
  } catch (error) {
    console.error('List friend requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * POST /api/friends/requests
 * Send a friend request.
 */
router.post('/requests', authenticateJWT, friendRequestLimiter, async (req, res) => {
  try {
    const { userId: targetId } = requestSchema.parse(req.body);
    const userId = req.user!.userId;

    if (targetId === userId) {
      return res.status(400).json({ error: 'You cannot friend yourself' });
    }

    const target = await prisma.user.findFirst({
      where: { id: targetId, is_active: true },
      select: { id: true, display_name: true },
    });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const pair = orderPair(userId, targetId);
    const existing = await prisma.friendship.findUnique({
      where: { user_a_id_user_b_id: pair },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') return res.status(409).json({ error: 'Already friends' });
      if (existing.status === 'BLOCKED') return res.status(403).json({ error: 'Cannot send request' });
      // PENDING: if the other side already asked, accept instead of duplicating.
      if (existing.initiated_by !== userId) {
        return res.status(409).json({ error: 'This user already sent you a request — accept it instead', code: 'INCOMING_EXISTS' });
      }
      return res.status(409).json({ error: 'Request already sent' });
    }

    const friendship = await prisma.friendship.create({
      data: { ...pair, status: 'PENDING', initiated_by: userId },
    });

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { display_name: true } });

    try {
      getIO().to(`user:${targetId}`).emit('friend:request', { friendshipId: friendship.id, from: userId });
    } catch { /* socket not up in tests */ }

    void notify(targetId, {
      type: 'FRIEND_REQUEST',
      actorId: userId,
      title: `${me?.display_name ?? 'Someone'} sent you a friend request`,
      link: '/dashboard/community?view=friends',
      refId: friendship.id,
    });

    res.status(201).json({ friendship: { id: friendship.id, status: friendship.status } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

/**
 * POST /api/friends/requests/:friendshipId/accept
 */
router.post('/requests/:friendshipId/accept', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: req.params.friendshipId,
        status: 'PENDING',
        initiated_by: { not: userId },
        OR: [{ user_a_id: userId }, { user_b_id: userId }],
      },
    });
    if (!friendship) return res.status(404).json({ error: 'Request not found' });

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED', accepted_at: new Date() },
    });

    const requesterId = friendship.initiated_by;
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { display_name: true } });

    try {
      getIO().to(`user:${requesterId}`).emit('friend:accepted', { friendshipId: friendship.id, by: userId });
    } catch { /* ignore */ }

    void notify(requesterId, {
      type: 'FRIEND_ACCEPTED',
      actorId: userId,
      title: `${me?.display_name ?? 'Someone'} accepted your friend request`,
      link: '/dashboard/community?view=friends',
      refId: friendship.id,
    });

    void awardXp(userId, 'FRIEND_ADDED', { refId: `friend:${friendship.id}` });
    void awardXp(requesterId, 'FRIEND_ADDED', { refId: `friend:${friendship.id}` });

    res.json({ friendship: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

/**
 * POST /api/friends/requests/:friendshipId/decline
 */
router.post('/requests/:friendshipId/decline', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: req.params.friendshipId,
        status: 'PENDING',
        initiated_by: { not: userId },
        OR: [{ user_a_id: userId }, { user_b_id: userId }],
      },
    });
    if (!friendship) return res.status(404).json({ error: 'Request not found' });

    await prisma.friendship.delete({ where: { id: friendship.id } });
    res.json({ message: 'Request declined' });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

/**
 * DELETE /api/friends/:friendshipId
 * Unfriend (either party).
 */
router.delete('/:friendshipId', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: req.params.friendshipId,
        status: 'ACCEPTED',
        OR: [{ user_a_id: userId }, { user_b_id: userId }],
      },
    });
    if (!friendship) return res.status(404).json({ error: 'Friendship not found' });

    await prisma.friendship.delete({ where: { id: friendship.id } });

    // Friend counters go down for both sides.
    await prisma.userStats.updateMany({
      where: { user_id: { in: [friendship.user_a_id, friendship.user_b_id] }, friends_count: { gt: 0 } },
      data: { friends_count: { decrement: 1 } },
    });

    res.json({ message: 'Unfriended' });
  } catch (error) {
    console.error('Unfriend error:', error);
    res.status(500).json({ error: 'Failed to unfriend' });
  }
});

/**
 * POST /api/friends/:friendshipId/block
 * Block the other party (works on any existing friendship row).
 */
router.post('/:friendshipId/block', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: req.params.friendshipId,
        OR: [{ user_a_id: userId }, { user_b_id: userId }],
      },
    });
    if (!friendship) return res.status(404).json({ error: 'Friendship not found' });

    await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'BLOCKED', initiated_by: userId }, // initiated_by records the blocker
    });

    res.json({ message: 'User blocked' });
  } catch (error) {
    console.error('Block error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

export default router;
