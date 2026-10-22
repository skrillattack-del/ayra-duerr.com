import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { authenticateJWT } from '../middleware/authMiddleware';

const router: Router = Router();

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).max(100).optional(),
});

/**
 * GET /api/notifications?cursor&unreadOnly
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { cursor, unreadOnly } = req.query;
    const limit = 50;

    const whereClause: any = { user_id: req.user!.userId };
    if (unreadOnly === '1' || unreadOnly === 'true') {
      whereClause.read_at = null;
    }
    if (cursor) {
      whereClause.created_at = { lt: new Date(cursor as string) };
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, display_name: true, avatar_url: true } },
      },
    });

    const nextCursor = notifications.length === limit
      ? notifications[notifications.length - 1].created_at.toISOString()
      : null;

    res.json({ notifications, nextCursor, hasMore: !!nextCursor });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', authenticateJWT, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { user_id: req.user!.userId, read_at: null },
    });
    res.json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

/**
 * POST /api/notifications/read
 * Mark given ids as read; omit ids to mark everything read.
 */
router.post('/read', authenticateJWT, async (req, res) => {
  try {
    const { ids } = markReadSchema.parse(req.body ?? {});

    await prisma.notification.updateMany({
      where: {
        user_id: req.user!.userId,
        read_at: null,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      },
      data: { read_at: new Date() },
    });

    res.json({ message: 'Marked as read' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

export default router;
