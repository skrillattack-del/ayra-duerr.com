import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../db/client';
import { authenticateJWT } from '../middleware/authMiddleware';
import { loadFreshTier, rejectMuted } from '../middleware/entitlementsMiddleware';
import { messageSendLimiter, uploadLimiter, reactionLimiter, reportLimiter } from '../middleware/rateLimiters';
import { limitsFor } from '../utils/entitlements';
import { senderSelect, withReactionSummary } from '../utils/messageTransforms';
import { awardXp } from '../services/xpService';
import { notify } from '../services/notificationService';
import { storageService } from '../services/storageService';
import { getIO } from '../socket/socketServer';

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // hard cap; per-tier limit enforced in handler
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

/** Emit to the narrowest room a message belongs to (channel > squad > DM pair > global). */
function emitScoped(event: string, payload: any, msg: { channel_id?: string | null; squad_id?: string | null; recipient_id?: string | null; sender_id?: string }) {
  const io = getIO();
  if (msg.channel_id) {
    io.to(`channel:${msg.channel_id}`).emit(event, payload);
  } else if (msg.squad_id) {
    io.to(`squad:${msg.squad_id}`).emit(event, payload);
  } else if (msg.recipient_id && msg.sender_id) {
    io.to(`user:${msg.recipient_id}`).to(`user:${msg.sender_id}`).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}

const router: Router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const sendMessageSchema = z.object({
  content: z.string().max(2000).default(''),
  channelType: z.enum(['GLOBAL', 'SQUAD', 'DIRECT', 'TRAINER']).default('GLOBAL'),
  squadId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  mediaUrls: z.array(z.string()).optional(),
}).refine(data => data.content.length > 0 || (data.mediaUrls && data.mediaUrls.length > 0), {
  message: 'Message must have content or media',
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

const addReactionSchema = z.object({
  emoji: z.string().min(1).max(32),
});

const createSquadSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PUBLIC', 'INVITE_ONLY', 'PRIVATE']).default('INVITE_ONLY'),
  maxMembers: z.number().int().min(2).max(100).default(50),
});

const inviteToSquadSchema = z.object({
  userId: z.string().uuid(),
});

const reportMessageSchema = z.object({
  reason: z.enum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'OFF_TOPIC', 'OTHER']),
  details: z.string().max(500).optional(),
});

const deleteMessageSchema = z.object({
  reason: z.string().max(300).optional(),
});

// =============================================================================
// GLOBAL FEED
// =============================================================================

/**
 * GET /api/messages/global
 * Get global feed messages with pagination
 */
router.get('/global', authenticateJWT, async (req, res) => {
  try {
    const { cursor, limit = '50' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);

    const whereClause: any = {
      channel_type: 'GLOBAL',
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
        reactions: {
          select: {
            emoji: true,
            user_id: true,
          },
        },
        replies: {
          where: { is_deleted: false },
          take: 3,
          orderBy: { created_at: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                display_name: true,
                avatar_url: true,
              },
            },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    const userId = req.user!.userId;
    const transformed = messages.map((msg) => withReactionSummary(msg, userId));

    const nextCursor = messages.length === limitNum
      ? messages[messages.length - 1].created_at.toISOString()
      : null;

    // Cache historical pages (with cursor), don't cache latest
    if (cursor) {
      res.set('Cache-Control', 'private, max-age=300');
    } else {
      res.set('Cache-Control', 'no-cache');
    }

    res.json({
      messages: transformed,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (error) {
    console.error('Get global feed error:', error);
    res.status(500).json({ error: 'Failed to fetch global feed' });
  }
});

/**
 * POST /api/messages
 * Send a message to any channel
 */
router.post('/', authenticateJWT, loadFreshTier, rejectMuted, messageSendLimiter, async (req, res) => {
  try {
    const validated = sendMessageSchema.parse(req.body);

    if (validated.channelType === 'SQUAD' && !validated.squadId) {
      return res.status(400).json({ error: 'squadId required for squad messages' });
    }
    if (validated.channelType === 'DIRECT' && !validated.recipientId) {
      return res.status(400).json({ error: 'recipientId required for direct messages' });
    }

    const limits = limitsFor(req.user!);
    if ((validated.mediaUrls?.length || 0) > limits.maxMediaPerMessage) {
      return res.status(403).json({
        error: `Your plan allows up to ${limits.maxMediaPerMessage} attachments per message`,
        code: 'TIER_LIMIT',
      });
    }

    if (validated.squadId) {
      const membership = await prisma.squadMember.findUnique({
        where: {
          squad_id_user_id: {
            squad_id: validated.squadId,
            user_id: req.user!.userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this squad' });
      }
    }

    if (validated.recipientId) {
      const canMessage = await canSendDirectMessage(req.user!.userId, validated.recipientId);
      if (!canMessage) {
        return res.status(403).json({ error: 'Cannot send message to this user', code: 'NOT_FRIENDS' });
      }
    }

    // Legacy global sends attach to the default (#general) channel so the
    // channel-scoped feed and the old global feed stay one and the same.
    let defaultChannel: { id: string } | null = null;
    if (validated.channelType === 'GLOBAL') {
      defaultChannel = await prisma.channel.findFirst({
        where: { squad_id: null, is_default: true, is_active: true },
        select: { id: true },
      });
    }

    let parent: { id: string; sender_id: string } | null = null;
    if (validated.parentId) {
      parent = await prisma.message.findFirst({
        where: { id: validated.parentId, is_deleted: false },
        select: { id: true, sender_id: true },
      });
      if (!parent) {
        return res.status(400).json({ error: 'Parent message not found' });
      }
    }

    const message = await prisma.message.create({
      data: {
        content: validated.content,
        sender_id: req.user!.userId,
        channel_type: validated.channelType,
        channel_id: defaultChannel?.id,
        squad_id: validated.squadId,
        recipient_id: validated.recipientId,
        parent_id: validated.parentId,
        media_urls: validated.mediaUrls || [],
      },
      include: {
        sender: { select: senderSelect },
        _count: { select: { replies: true } },
      },
    });

    const io = getIO();
    if (validated.channelType === 'GLOBAL') {
      io.emit('message:global', message);
      if (defaultChannel) {
        io.to(`channel:${defaultChannel.id}`).emit('message:channel', { channelId: defaultChannel.id, message });
      }
    } else if (validated.squadId) {
      io.to(`squad:${validated.squadId}`).emit('message:squad', message);
    } else if (validated.recipientId) {
      io.to(`user:${validated.recipientId}`).emit('message:direct', message);
      io.to(`user:${req.user!.userId}`).emit('message:direct', message);
    }

    res.status(201).json({ message });

    // Post-response side effects: XP + notifications.
    const senderId = req.user!.userId;
    const recipientId = validated.recipientId;
    void (async () => {
      await awardXp(senderId, 'MESSAGE');

      if (parent && parent.sender_id !== senderId) {
        await awardXp(parent.sender_id, 'REPLY_RECEIVED', { refId: `reply:${message.id}` });
        await notify(parent.sender_id, {
          type: 'REPLY',
          actorId: senderId,
          title: `${message.sender.display_name} replied to your message`,
          body: validated.content.slice(0, 140) || '📷 Media',
          link: `/dashboard/community`,
          refId: message.id,
        });
      }

      // DM: notify the recipient only when they have no live socket.
      if (recipientId) {
        const room = getIO().sockets.adapter.rooms.get(`user:${recipientId}`);
        if (!room || room.size === 0) {
          await notify(recipientId, {
            type: 'DIRECT_MESSAGE',
            actorId: senderId,
            title: `New message from ${message.sender.display_name}`,
            body: validated.content.slice(0, 140) || '📷 Media',
            link: `/dashboard/community?dm=${senderId}`,
            refId: message.id,
          });
        }
      }
    })().catch((err) => console.error('post-send side effects error:', err));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /api/messages/:messageId/thread
 * Get a message thread (replies)
 */
router.get('/:messageId/thread', authenticateJWT, async (req, res) => {
  try {
    const parent = await prisma.message.findFirst({
      where: {
        id: req.params.messageId,
        is_deleted: false,
      },
      include: {
        sender: { select: senderSelect },
        reactions: { select: { emoji: true, user_id: true } },
        _count: { select: { replies: true } },
      },
    });

    if (!parent) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const replies = await prisma.message.findMany({
      where: {
        parent_id: req.params.messageId,
        is_deleted: false,
      },
      orderBy: { created_at: 'asc' },
      include: {
        sender: { select: senderSelect },
        reactions: { select: { emoji: true, user_id: true } },
      },
    });

    const userId = req.user!.userId;
    res.json({
      parent: withReactionSummary(parent, userId),
      replies: replies.map((r) => withReactionSummary(r, userId)),
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

/**
 * PATCH /api/messages/:messageId
 * Edit a message
 */
router.patch('/:messageId', authenticateJWT, async (req, res) => {
  try {
    const validated = editMessageSchema.parse(req.body);

    const message = await prisma.message.findFirst({
      where: {
        id: req.params.messageId,
        sender_id: req.user!.userId,
        is_deleted: false,
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found or not yours' });
    }

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: {
        content: validated.content,
        is_edited: true,
        edited_at: new Date(),
      },
      include: {
        sender: { select: senderSelect },
      },
    });

    emitScoped('message:updated', updated, updated);

    res.json({ message: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

/**
 * DELETE /api/messages/:messageId
 * Soft delete a message. Allowed for: the sender, platform admins, and squad
 * OWNER/ADMIN/MODERATOR for messages inside their squad.
 */
router.delete('/:messageId', authenticateJWT, loadFreshTier, async (req, res) => {
  try {
    const parsedBody = deleteMessageSchema.safeParse(req.body ?? {});
    const reason = parsedBody.success ? parsedBody.data.reason : undefined;

    const message = await prisma.message.findFirst({
      where: { id: req.params.messageId, is_deleted: false },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const userId = req.user!.userId;
    let allowed = message.sender_id === userId || req.user!.role === 'ADMIN';

    if (!allowed && message.squad_id) {
      const membership = await prisma.squadMember.findUnique({
        where: { squad_id_user_id: { squad_id: message.squad_id, user_id: userId } },
      });
      allowed = !!membership && ['OWNER', 'ADMIN', 'MODERATOR'].includes(membership.role);
    }

    if (!allowed) {
      return res.status(403).json({ error: 'No permission to delete this message' });
    }

    await prisma.message.update({
      where: { id: message.id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
        deleted_reason: reason,
        is_pinned: false,
        content: '[Message deleted]',
      },
    });

    emitScoped('message:deleted', { id: message.id, channelId: message.channel_id, squadId: message.squad_id }, message);

    if (message.sender_id !== userId) {
      void notify(message.sender_id, {
        type: 'MODERATION',
        title: 'One of your messages was removed by a moderator',
        body: reason ? `Reason: ${reason}` : undefined,
        refId: message.id,
      });
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * POST /api/messages/:messageId/report
 * Report a message for moderation review.
 */
router.post('/:messageId/report', authenticateJWT, reportLimiter, async (req, res) => {
  try {
    const validated = reportMessageSchema.parse(req.body);

    const message = await prisma.message.findFirst({
      where: { id: req.params.messageId, is_deleted: false },
      select: { id: true, sender_id: true },
    });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.sender_id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot report your own message' });
    }

    const existing = await prisma.messageReport.findUnique({
      where: { message_id_reporter_id: { message_id: message.id, reporter_id: req.user!.userId } },
    });
    if (existing) {
      return res.status(409).json({ error: 'You already reported this message' });
    }

    const report = await prisma.messageReport.create({
      data: {
        message_id: message.id,
        reporter_id: req.user!.userId,
        reason: validated.reason,
        details: validated.details,
      },
    });

    res.status(201).json({ report: { id: report.id, status: report.status } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Report message error:', error);
    res.status(500).json({ error: 'Failed to report message' });
  }
});

/**
 * POST /api/messages/:messageId/pin
 * DELETE /api/messages/:messageId/pin
 * Pin/unpin a message. Platform admins anywhere; squad OWNER/ADMIN/MODERATOR
 * within their squad.
 */
async function canPinMessage(userId: string, role: string, message: { squad_id: string | null }): Promise<boolean> {
  if (role === 'ADMIN') return true;
  if (!message.squad_id) return false;
  const membership = await prisma.squadMember.findUnique({
    where: { squad_id_user_id: { squad_id: message.squad_id, user_id: userId } },
  });
  return !!membership && ['OWNER', 'ADMIN', 'MODERATOR'].includes(membership.role);
}

router.post('/:messageId/pin', authenticateJWT, loadFreshTier, async (req, res) => {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.messageId, is_deleted: false },
    });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (!(await canPinMessage(req.user!.userId, req.user!.role, message))) {
      return res.status(403).json({ error: 'No permission to pin messages here' });
    }

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { is_pinned: true, pinned_at: new Date(), pinned_by: req.user!.userId },
      include: { sender: { select: senderSelect } },
    });

    emitScoped('message:pinned', { messageId: message.id, channelId: message.channel_id, squadId: message.squad_id, message: updated }, message);
    res.json({ message: updated });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

router.delete('/:messageId/pin', authenticateJWT, loadFreshTier, async (req, res) => {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.messageId, is_pinned: true },
    });
    if (!message) return res.status(404).json({ error: 'Pinned message not found' });

    if (!(await canPinMessage(req.user!.userId, req.user!.role, message))) {
      return res.status(403).json({ error: 'No permission to unpin messages here' });
    }

    await prisma.message.update({
      where: { id: message.id },
      data: { is_pinned: false, pinned_at: null, pinned_by: null },
    });

    emitScoped('message:unpinned', { messageId: message.id, channelId: message.channel_id, squadId: message.squad_id }, message);
    res.json({ message: 'Message unpinned' });
  } catch (error) {
    console.error('Unpin message error:', error);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

/**
 * POST /api/messages/:messageId/reactions
 * Add reaction to message
 */
router.post('/:messageId/reactions', authenticateJWT, loadFreshTier, rejectMuted, reactionLimiter, async (req, res) => {
  try {
    const validated = addReactionSchema.parse(req.body);

    const message = await prisma.message.findFirst({
      where: {
        id: req.params.messageId,
        is_deleted: false,
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const existing = await prisma.messageReaction.findUnique({
      where: {
        message_id_user_id_emoji: {
          message_id: req.params.messageId,
          user_id: req.user!.userId,
          emoji: validated.emoji,
        },
      },
    });

    if (existing) {
      await prisma.messageReaction.delete({
        where: { id: existing.id },
      });
      res.json({ action: 'removed', emoji: validated.emoji });
    } else {
      await prisma.messageReaction.create({
        data: {
          message_id: req.params.messageId,
          user_id: req.user!.userId,
          emoji: validated.emoji,
        },
      });
      res.json({ action: 'added', emoji: validated.emoji });
    }

    emitScoped('message:reaction', {
      messageId: req.params.messageId,
      emoji: validated.emoji,
      userId: req.user!.userId,
      action: existing ? 'removed' : 'added',
    }, message);

    // XP: only on add, never for self-reactions; dedupe keys survive
    // toggle-farming (award once per message+emoji lifetime).
    if (!existing) {
      const reactorId = req.user!.userId;
      void (async () => {
        await awardXp(reactorId, 'REACTION_GIVEN', { refId: `reactgiven:${message.id}:${validated.emoji}` });
        if (message.sender_id !== reactorId) {
          await awardXp(message.sender_id, 'REACTION_RECEIVED', {
            refId: `reaction:${message.id}:${validated.emoji}:${reactorId}`,
          });
        }
      })().catch((err) => console.error('reaction XP error:', err));
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Reaction error:', error);
    res.status(500).json({ error: 'Failed to process reaction' });
  }
});

// =============================================================================
// SQUADS
// =============================================================================

/**
 * GET /api/messages/squads
 * Get user's squads
 */
router.get('/squads', authenticateJWT, async (req, res) => {
  try {
    const memberships = await prisma.squadMember.findMany({
      where: { user_id: req.user!.userId },
      include: {
        squad: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    const squadsWithUnread = await Promise.all(
      memberships.map(async (membership) => {
        const unreadCount = await prisma.message.count({
          where: {
            squad_id: membership.squad_id,
            is_deleted: false,
            created_at: { gt: membership.last_seen_at },
            sender_id: { not: req.user!.userId },
          },
        });

        return {
          ...membership.squad,
          memberCount: membership.squad._count.members,
          unreadCount,
          role: membership.role,
        };
      })
    );

    res.json({ squads: squadsWithUnread });
  } catch (error) {
    console.error('Get squads error:', error);
    res.status(500).json({ error: 'Failed to fetch squads' });
  }
});

/**
 * GET /api/messages/squads/discover?q&cursor
 * Browse public squads (must be declared before /squads/:squadId).
 */
router.get('/squads/discover', authenticateJWT, async (req, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const squads = await prisma.squad.findMany({
      where: {
        visibility: 'PUBLIC',
        is_active: true,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 30,
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, display_name: true, avatar_url: true } },
      },
    });

    const myMemberships = await prisma.squadMember.findMany({
      where: { user_id: req.user!.userId, squad_id: { in: squads.map((s) => s.id) } },
      select: { squad_id: true },
    });
    const joined = new Set(myMemberships.map((m) => m.squad_id));

    res.json({
      squads: squads.map((s) => ({
        ...s,
        memberCount: s._count.members,
        isMember: joined.has(s.id),
        isFull: s._count.members >= s.max_members,
      })),
    });
  } catch (error) {
    console.error('Discover squads error:', error);
    res.status(500).json({ error: 'Failed to discover squads' });
  }
});

/**
 * GET /api/messages/squads/invites
 * The caller's pending squad invites (must be declared before /squads/:squadId).
 */
router.get('/squads/invites', authenticateJWT, async (req, res) => {
  try {
    const invites = await prisma.squadInvite.findMany({
      where: { invitee_id: req.user!.userId, status: 'PENDING' },
      orderBy: { created_at: 'desc' },
      include: {
        squad: { select: { id: true, name: true, description: true, avatar_url: true, visibility: true } },
        inviter: { select: { id: true, display_name: true, avatar_url: true } },
      },
    });
    res.json({ invites });
  } catch (error) {
    console.error('Get squad invites error:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

/**
 * POST /api/messages/squads/invites/:inviteId/decline
 */
router.post('/squads/invites/:inviteId/decline', authenticateJWT, async (req, res) => {
  try {
    const invite = await prisma.squadInvite.findFirst({
      where: { id: req.params.inviteId, invitee_id: req.user!.userId, status: 'PENDING' },
    });
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    await prisma.squadInvite.update({
      where: { id: invite.id },
      data: { status: 'DECLINED', responded_at: new Date() },
    });

    res.json({ message: 'Invite declined' });
  } catch (error) {
    console.error('Decline invite error:', error);
    res.status(500).json({ error: 'Failed to decline invite' });
  }
});

/**
 * POST /api/messages/squads
 * Create a new squad
 */
router.post('/squads', authenticateJWT, loadFreshTier, rejectMuted, async (req, res) => {
  try {
    const validated = createSquadSchema.parse(req.body);

    const limits = limitsFor(req.user!);
    if (!limits.canCreateSquads) {
      return res.status(403).json({
        error: 'Creating squads requires a PRO membership',
        code: 'TIER_LOCKED',
      });
    }
    const ownedCount = await prisma.squad.count({
      where: { owner_id: req.user!.userId, is_active: true },
    });
    if (ownedCount >= limits.maxSquadsOwned) {
      return res.status(403).json({
        error: `Your plan allows up to ${limits.maxSquadsOwned} squads`,
        code: 'TIER_LIMIT',
      });
    }

    const squad = await prisma.squad.create({
      data: {
        name: validated.name,
        description: validated.description,
        owner_id: req.user!.userId,
        visibility: validated.visibility,
        max_members: validated.maxMembers,
        members: {
          create: {
            user_id: req.user!.userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    res.status(201).json({ squad });

    void awardXp(req.user!.userId, 'SQUAD_CREATED', { refId: `squadcreate:${squad.id}` });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create squad error:', error);
    res.status(500).json({ error: 'Failed to create squad' });
  }
});

/**
 * GET /api/messages/squads/:squadId
 * Get squad details and messages
 */
router.get('/squads/:squadId', authenticateJWT, async (req, res) => {
  try {
    const membership = await prisma.squadMember.findUnique({
      where: {
        squad_id_user_id: {
          squad_id: req.params.squadId,
          user_id: req.user!.userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this squad' });
    }

    const squad = await prisma.squad.findUnique({
      where: { id: req.params.squadId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                display_name: true,
                avatar_url: true,
                role: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }

    const messages = await prisma.message.findMany({
      where: {
        squad_id: req.params.squadId,
        is_deleted: false,
        parent_id: null,
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        sender: { select: senderSelect },
        reactions: { select: { emoji: true, user_id: true } },
        _count: { select: { replies: true } },
      },
    });

    const userId = req.user!.userId;
    res.json({
      squad,
      messages: messages.reverse().map((m) => withReactionSummary(m, userId)),
      membership,
    });
  } catch (error) {
    console.error('Get squad error:', error);
    res.status(500).json({ error: 'Failed to fetch squad' });
  }
});

/**
 * POST /api/messages/squads/:squadId/seen
 * Mark the squad chat as read (unread counts key off last_seen_at).
 */
router.post('/squads/:squadId/seen', authenticateJWT, async (req, res) => {
  try {
    const updated = await prisma.squadMember.updateMany({
      where: { squad_id: req.params.squadId, user_id: req.user!.userId },
      data: { last_seen_at: new Date() },
    });
    if (updated.count === 0) return res.status(404).json({ error: 'Not a member' });
    res.json({ message: 'Marked as seen' });
  } catch (error) {
    console.error('Squad seen error:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
});

/**
 * POST /api/messages/squads/:squadId/invite
 * Invite user to squad
 */
router.post('/squads/:squadId/invite', authenticateJWT, async (req, res) => {
  try {
    const validated = inviteToSquadSchema.parse(req.body);

    const inviterMembership = await prisma.squadMember.findUnique({
      where: {
        squad_id_user_id: {
          squad_id: req.params.squadId,
          user_id: req.user!.userId,
        },
      },
    });

    if (!inviterMembership || !['OWNER', 'ADMIN', 'MODERATOR'].includes(inviterMembership.role)) {
      return res.status(403).json({ error: 'No permission to invite' });
    }

    const existingMember = await prisma.squadMember.findUnique({
      where: {
        squad_id_user_id: {
          squad_id: req.params.squadId,
          user_id: validated.userId,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    const existingInvite = await prisma.squadInvite.findUnique({
      where: {
        squad_id_invitee_id: {
          squad_id: req.params.squadId,
          invitee_id: validated.userId,
        },
      },
    });

    if (existingInvite && existingInvite.status === 'PENDING') {
      return res.status(400).json({ error: 'User already has pending invite' });
    }

    const invite = await prisma.squadInvite.create({
      data: {
        squad_id: req.params.squadId,
        inviter_id: req.user!.userId,
        invitee_id: validated.userId,
      },
      include: {
        squad: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            id: true,
            display_name: true,
          },
        },
      },
    });

    const io = getIO();
    io.to(`user:${validated.userId}`).emit('squad:invite', invite);

    void notify(validated.userId, {
      type: 'SQUAD_INVITE',
      actorId: req.user!.userId,
      title: `${invite.inviter.display_name} invited you to join ${invite.squad.name}`,
      link: '/dashboard/community?view=squads',
      refId: invite.id,
    });

    res.status(201).json({ invite });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

/**
 * POST /api/messages/squads/:squadId/join
 * Join a public squad or accept invite
 */
router.post('/squads/:squadId/join', authenticateJWT, loadFreshTier, async (req, res) => {
  try {
    const squad = await prisma.squad.findUnique({
      where: { id: req.params.squadId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!squad || !squad.is_active) {
      return res.status(404).json({ error: 'Squad not found' });
    }

    const existingMember = await prisma.squadMember.findUnique({
      where: {
        squad_id_user_id: {
          squad_id: req.params.squadId,
          user_id: req.user!.userId,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member' });
    }

    if (squad._count.members >= squad.max_members) {
      return res.status(400).json({ error: 'Squad is full' });
    }

    const limits = limitsFor(req.user!);
    const joinedCount = await prisma.squadMember.count({
      where: { user_id: req.user!.userId },
    });
    if (joinedCount >= limits.maxSquadsJoined) {
      return res.status(403).json({
        error: `Your plan allows joining up to ${limits.maxSquadsJoined} squads`,
        code: 'TIER_LIMIT',
      });
    }

    if (squad.visibility !== 'PUBLIC') {
      const invite = await prisma.squadInvite.findUnique({
        where: {
          squad_id_invitee_id: {
            squad_id: req.params.squadId,
            invitee_id: req.user!.userId,
          },
        },
      });

      if (!invite || invite.status !== 'PENDING') {
        return res.status(403).json({ error: 'Invite required to join this squad' });
      }

      await prisma.squadInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          responded_at: new Date(),
        },
      });
    }

    const membership = await prisma.squadMember.create({
      data: {
        squad_id: req.params.squadId,
        user_id: req.user!.userId,
        role: 'MEMBER',
      },
    });

    const io = getIO();
    io.to(`squad:${req.params.squadId}`).emit('squad:member-joined', {
      squadId: req.params.squadId,
      userId: req.user!.userId,
    });

    res.json({ membership });

    void awardXp(req.user!.userId, 'SQUAD_JOINED', { refId: `squad:${req.params.squadId}` });
  } catch (error) {
    console.error('Join squad error:', error);
    res.status(500).json({ error: 'Failed to join squad' });
  }
});

/**
 * DELETE /api/messages/squads/:squadId/leave
 * Leave a squad
 */
router.delete('/squads/:squadId/leave', authenticateJWT, async (req, res) => {
  try {
    const membership = await prisma.squadMember.findUnique({
      where: {
        squad_id_user_id: {
          squad_id: req.params.squadId,
          user_id: req.user!.userId,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member' });
    }

    if (membership.role === 'OWNER') {
      return res.status(400).json({ error: 'Owner cannot leave. Transfer ownership first.' });
    }

    await prisma.squadMember.delete({
      where: { id: membership.id },
    });

    const io = getIO();
    io.to(`squad:${req.params.squadId}`).emit('squad:member-left', {
      squadId: req.params.squadId,
      userId: req.user!.userId,
    });

    res.json({ message: 'Left squad' });
  } catch (error) {
    console.error('Leave squad error:', error);
    res.status(500).json({ error: 'Failed to leave squad' });
  }
});

// =============================================================================
// DIRECT MESSAGES
// =============================================================================

/**
 * GET /api/messages/direct/:userId
 * Get DM conversation with a user
 */
router.get('/direct/:userId', authenticateJWT, async (req, res) => {
  try {
    const { cursor, limit = '50' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);

    const canMessage = await canSendDirectMessage(req.user!.userId, req.params.userId);
    if (!canMessage) {
      return res.status(403).json({ error: 'Cannot message this user' });
    }

    const whereClause: any = {
      channel_type: 'DIRECT',
      is_deleted: false,
      OR: [
        { sender_id: req.user!.userId, recipient_id: req.params.userId },
        { sender_id: req.params.userId, recipient_id: req.user!.userId },
      ],
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
      },
    });

    const nextCursor = messages.length === limitNum
      ? messages[messages.length - 1].created_at.toISOString()
      : null;

    const userId = req.user!.userId;
    res.json({
      messages: messages.reverse().map((m) => withReactionSummary(m, userId)),
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (error) {
    console.error('Get DMs error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/messages/direct/:userId/read
 * Mark the conversation with a peer as read.
 */
router.post('/direct/:userId/read', authenticateJWT, async (req, res) => {
  try {
    await prisma.conversationRead.upsert({
      where: { user_id_peer_id: { user_id: req.user!.userId, peer_id: req.params.userId } },
      create: { user_id: req.user!.userId, peer_id: req.params.userId },
      update: { last_read_at: new Date() },
    });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark DM read error:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
});

/**
 * GET /api/messages/conversations
 * Get list of DM conversations
 */
router.get('/conversations', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const rows = await prisma.$queryRaw<any[]>`
      WITH ranked_messages AS (
        SELECT
          m.*,
          ROW_NUMBER() OVER (
            PARTITION BY LEAST(m.sender_id, m.recipient_id), GREATEST(m.sender_id, m.recipient_id)
            ORDER BY m.created_at DESC
          ) as rn
        FROM messages m
        WHERE m.channel_type = 'DIRECT'
          AND m.is_deleted = false
          AND (m.sender_id = ${userId} OR m.recipient_id = ${userId})
      )
      SELECT * FROM ranked_messages WHERE rn = 1
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const peerIds = rows.map((r) => (r.sender_id === userId ? r.recipient_id : r.sender_id)).filter(Boolean);

    const [peers, reads] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: peerIds } },
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          role: true,
          membership_tier: true,
          stats: { select: { level: true } },
        },
      }),
      prisma.conversationRead.findMany({
        where: { user_id: userId, peer_id: { in: peerIds } },
      }),
    ]);
    const peerById = new Map(peers.map((p) => [p.id, p]));
    const readByPeer = new Map(reads.map((r) => [r.peer_id, r.last_read_at]));

    const conversations = await Promise.all(
      rows.map(async (row) => {
        const peerId = row.sender_id === userId ? row.recipient_id : row.sender_id;
        const lastRead = readByPeer.get(peerId);
        const unreadCount = await prisma.message.count({
          where: {
            channel_type: 'DIRECT',
            is_deleted: false,
            sender_id: peerId,
            recipient_id: userId,
            ...(lastRead ? { created_at: { gt: lastRead } } : {}),
          },
        });
        return {
          peer: peerById.get(peerId) ?? { id: peerId, display_name: 'Unknown', avatar_url: null },
          lastMessage: {
            id: row.id,
            content: row.content,
            sender_id: row.sender_id,
            media_urls: row.media_urls,
            created_at: row.created_at,
          },
          unreadCount,
        };
      }),
    );

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// =============================================================================
// MEDIA UPLOAD
// =============================================================================

/**
 * POST /api/messages/upload
 * Upload media file (proxied through backend to avoid CORS with storage)
 */
router.post('/upload', authenticateJWT, loadFreshTier, rejectMuted, uploadLimiter, uploadMiddleware.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const limits = limitsFor(req.user!);
    if (req.file.size > limits.maxUploadBytes) {
      const mb = Math.round(limits.maxUploadBytes / (1024 * 1024));
      return res.status(413).json({
        error: `File exceeds your plan's ${mb}MB upload limit`,
        code: 'TIER_LIMIT',
      });
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const key = `messages/${req.user!.userId}/${timestamp}-${randomId}.${ext}`;

    await storageService.uploadFile(key, req.file.buffer, req.file.mimetype);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({ publicUrl: `${baseUrl}/api/media/${key}` });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// =============================================================================
// HELPERS
// =============================================================================

async function canSendDirectMessage(senderId: string, recipientId: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { user_a_id: senderId, user_b_id: recipientId, status: 'ACCEPTED' },
        { user_a_id: recipientId, user_b_id: senderId, status: 'ACCEPTED' },
      ],
    },
  });

  if (friendship) return true;

  const trainerRelation = await prisma.trainerClient.findFirst({
    where: {
      OR: [
        { trainer_id: senderId, client_id: recipientId, status: 'ACTIVE' },
        { trainer_id: recipientId, client_id: senderId, status: 'ACTIVE' },
      ],
    },
  });

  return !!trainerRelation;
}

export default router;
