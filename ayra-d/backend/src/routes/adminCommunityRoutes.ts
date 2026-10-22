import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { storageService } from '../services/storageService';
import { notify } from '../services/notificationService';
import { senderSelect } from '../utils/messageTransforms';
import { getIO } from '../socket/socketServer';

// Mounted inside adminRoutes at /api/admin/community — inherits its
// authenticateJWT + requireRole(['ADMIN']) guards.
const router: Router = Router();

const resolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  resolution_note: z.string().max(500).optional(),
  deleteMessage: z.boolean().optional(),
  muteMinutes: z.number().int().min(1).max(60 * 24 * 30).optional(),
});

const muteUserSchema = z.object({
  minutes: z.number().int().min(1).max(60 * 24 * 30),
  reason: z.string().max(300).optional(),
});

const deleteMediaSchema = z.object({
  messageId: z.string().uuid(),
  url: z.string(),
});

function emitScoped(event: string, payload: any, msg: { channel_id?: string | null; squad_id?: string | null }) {
  try {
    const io = getIO();
    if (msg.channel_id) {
      io.to(`channel:${msg.channel_id}`).emit(event, payload);
    } else if (msg.squad_id) {
      io.to(`squad:${msg.squad_id}`).emit(event, payload);
    } else {
      io.emit(event, payload);
    }
  } catch {
    // socket server not initialized
  }
}

async function moderatorDeleteMessage(messageId: string, adminId: string, reason?: string): Promise<boolean> {
  const message = await prisma.message.findFirst({ where: { id: messageId, is_deleted: false } });
  if (!message) return false;

  await prisma.message.update({
    where: { id: message.id },
    data: {
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: adminId,
      deleted_reason: reason,
      is_pinned: false,
      content: '[Message removed by moderator]',
    },
  });

  emitScoped('message:deleted', { id: message.id, channelId: message.channel_id, squadId: message.squad_id }, message);

  if (message.sender_id !== adminId) {
    void notify(message.sender_id, {
      type: 'MODERATION',
      title: 'One of your messages was removed by a moderator',
      body: reason ? `Reason: ${reason}` : undefined,
      refId: message.id,
    });
  }
  return true;
}

async function muteUser(userId: string, adminId: string, minutes: number, reason?: string): Promise<Date> {
  const until = new Date(Date.now() + minutes * 60_000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      community_muted_until: until,
      community_mute_reason: reason,
      community_muted_by: adminId,
    },
  });

  try {
    getIO().to(`user:${userId}`).emit('moderation:muted', { until: until.toISOString(), reason });
  } catch { /* ignore */ }

  void notify(userId, {
    type: 'MODERATION',
    title: `You have been muted for ${minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${minutes}m`}`,
    body: reason ? `Reason: ${reason}` : undefined,
  });

  return until;
}

/**
 * GET /api/admin/community/reports?status=OPEN&take&skip
 */
router.get('/reports', async (req, res) => {
  try {
    const status = (req.query.status as string) || 'OPEN';
    const take = Math.min(parseInt(req.query.take as string) || 25, 100);
    const skip = parseInt(req.query.skip as string) || 0;

    const where = ['OPEN', 'RESOLVED', 'DISMISSED'].includes(status) ? { status: status as any } : {};

    const [reports, total] = await Promise.all([
      prisma.messageReport.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip,
        include: {
          message: {
            include: { sender: { select: { id: true, display_name: true, avatar_url: true, community_muted_until: true } } },
          },
          reporter: { select: { id: true, display_name: true, avatar_url: true } },
        },
      }),
      prisma.messageReport.count({ where }),
    ]);

    res.json({ reports, total });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * PATCH /api/admin/community/reports/:reportId
 * Resolve/dismiss a report; optionally delete the message and/or mute the author.
 */
router.patch('/reports/:reportId', async (req, res) => {
  try {
    const validated = resolveReportSchema.parse(req.body);

    const report = await prisma.messageReport.findUnique({
      where: { id: req.params.reportId },
      include: { message: { select: { id: true, sender_id: true } } },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (validated.deleteMessage) {
      await moderatorDeleteMessage(report.message.id, req.user!.userId, validated.resolution_note);
    }
    if (validated.muteMinutes) {
      await muteUser(report.message.sender_id, req.user!.userId, validated.muteMinutes, validated.resolution_note);
    }

    const updated = await prisma.messageReport.update({
      where: { id: report.id },
      data: {
        status: validated.status,
        resolution_note: validated.resolution_note,
        resolved_by: req.user!.userId,
        resolved_at: new Date(),
      },
    });

    res.json({ report: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

/**
 * GET /api/admin/community/messages?channelId&squadId&search&take&skip
 * Recent messages stream, including soft-deleted (admin oversight).
 */
router.get('/messages', async (req, res) => {
  try {
    const take = Math.min(parseInt(req.query.take as string) || 50, 100);
    const skip = parseInt(req.query.skip as string) || 0;
    const { channelId, squadId, search } = req.query;

    const where: any = {};
    if (channelId) where.channel_id = channelId as string;
    if (squadId) where.squad_id = squadId as string;
    if (search) where.content = { contains: search as string, mode: 'insensitive' };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip,
        include: {
          sender: { select: senderSelect },
          channel: { select: { id: true, name: true, slug: true } },
          squad: { select: { id: true, name: true } },
          _count: { select: { reports: true } },
        },
      }),
      prisma.message.count({ where }),
    ]);

    res.json({ messages, total });
  } catch (error) {
    console.error('Admin messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * GET /api/admin/community/media?take&skip
 * Recent media uploads across all messages, flattened for a review gallery.
 */
router.get('/media', async (req, res) => {
  try {
    const take = Math.min(parseInt(req.query.take as string) || 30, 100);
    const skip = parseInt(req.query.skip as string) || 0;

    const messages = await prisma.message.findMany({
      where: { media_urls: { isEmpty: false } },
      orderBy: { created_at: 'desc' },
      take,
      skip,
      include: {
        sender: { select: { id: true, display_name: true, avatar_url: true } },
      },
    });

    const items = messages.flatMap((m) =>
      m.media_urls.map((url) => ({
        messageId: m.id,
        url,
        isDeleted: m.is_deleted,
        sender: m.sender,
        created_at: m.created_at,
      })),
    );

    res.json({ items });
  } catch (error) {
    console.error('Admin media error:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

/**
 * POST /api/admin/community/media/delete  (also DELETE /media)
 * Remove one media url from a message and delete the underlying object.
 * POST alias exists because the frontend api client cannot send a DELETE body.
 */
const deleteMediaHandler = async (req: import('express').Request, res: import('express').Response) => {
  try {
    const validated = deleteMediaSchema.parse(req.body);

    const message = await prisma.message.findUnique({ where: { id: validated.messageId } });
    if (!message || !message.media_urls.includes(validated.url)) {
      return res.status(404).json({ error: 'Media not found on message' });
    }

    // Extract the storage key from ".../api/media/<key>" and remove the object.
    const marker = '/api/media/';
    const idx = validated.url.indexOf(marker);
    if (idx !== -1) {
      const key = validated.url.slice(idx + marker.length);
      try {
        await storageService.deleteFile(key);
      } catch (err) {
        console.error('Storage delete failed (continuing):', err);
      }
    }

    const remaining = message.media_urls.filter((u) => u !== validated.url);
    const emptied = remaining.length === 0 && message.content.trim().length === 0;

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: {
        media_urls: remaining,
        ...(emptied
          ? {
              is_deleted: true,
              deleted_at: new Date(),
              deleted_by: req.user!.userId,
              deleted_reason: 'Media removed by moderator',
              content: '[Message removed by moderator]',
            }
          : {}),
      },
      include: { sender: { select: senderSelect } },
    });

    if (emptied) {
      emitScoped('message:deleted', { id: message.id, channelId: message.channel_id, squadId: message.squad_id }, message);
    } else {
      emitScoped('message:updated', updated, message);
    }

    res.json({ message: 'Media removed' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
};

router.delete('/media', deleteMediaHandler);
router.post('/media/delete', deleteMediaHandler);

/**
 * DELETE /api/admin/community/messages/:messageId
 * Admin hard moderation path for the message stream view.
 */
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 300) : undefined;
    const ok = await moderatorDeleteMessage(req.params.messageId, req.user!.userId, reason);
    if (!ok) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Admin delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * POST /api/admin/community/users/:userId/mute
 * DELETE /api/admin/community/users/:userId/mute
 */
router.post('/users/:userId/mute', async (req, res) => {
  try {
    const validated = muteUserSchema.parse(req.body);

    const target = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, role: true },
    });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'ADMIN') return res.status(400).json({ error: 'Admins cannot be muted' });

    const until = await muteUser(target.id, req.user!.userId, validated.minutes, validated.reason);
    res.json({ muted_until: until.toISOString() });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Mute user error:', error);
    res.status(500).json({ error: 'Failed to mute user' });
  }
});

router.delete('/users/:userId/mute', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.userId },
      data: { community_muted_until: null, community_mute_reason: null, community_muted_by: null },
    });

    try {
      getIO().to(`user:${req.params.userId}`).emit('moderation:unmuted', {});
    } catch { /* ignore */ }

    res.json({ message: 'User unmuted' });
  } catch (error) {
    console.error('Unmute user error:', error);
    res.status(500).json({ error: 'Failed to unmute user' });
  }
});

/**
 * GET /api/admin/community/muted
 */
router.get('/muted', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { community_muted_until: { gt: new Date() } },
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        community_muted_until: true,
        community_mute_reason: true,
        community_muted_by: true,
      },
      orderBy: { community_muted_until: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    console.error('Muted users error:', error);
    res.status(500).json({ error: 'Failed to fetch muted users' });
  }
});

export default router;
