import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';
import { siteSettingRepository } from '../repositories/siteSettingRepository';
import adminCommunityRoutes from './adminCommunityRoutes';

const router: Router = Router();

router.use(authenticateJWT);
router.use(requireRole(['ADMIN']));

// Community moderation surface: /api/admin/community/*
router.use('/community', adminCommunityRoutes);

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isoOrNull(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'TRAINER', 'CLIENT']).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'TRAINER', 'CLIENT']),
});

const updateStatusSchema = z.object({
  is_active: z.boolean(),
});

const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/admin/stats
 * Basic dashboard counts.
 */
router.get('/stats', async (_req, res) => {
  try {
    const today = startOfDay(new Date());

    const [totalUsers, totalChallenges, totalProgressLogs, progressLogsToday, activeTodayRows] = await Promise.all([
      prisma.user.count(),
      prisma.challenge.count({ where: { is_active: true } }),
      prisma.progressLog.count(),
      prisma.progressLog.count({ where: { logged_at: { gte: today } } }),
      prisma.progressLog.findMany({
        where: { logged_at: { gte: today } },
        distinct: ['user_id'],
        select: { user_id: true },
      }),
    ]);

    res.json({
      data: {
        totalUsers,
        activeToday: activeTodayRows.length,
        totalChallenges,
        totalProgressLogs,
        progressLogsToday,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

/**
 * GET /api/admin/users
 * List users (search + role filter + basic pagination).
 */
router.get('/users', async (req, res) => {
  try {
    const parsed = listUsersQuerySchema.parse(req.query);
    const search = typeof parsed.search === 'string' ? parsed.search.trim() : '';
    const take = parsed.take ?? 50;
    const skip = parsed.skip ?? 0;

    const where: any = {};
    if (parsed.role) where.role = parsed.role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { display_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip,
        select: {
          id: true,
          email: true,
          display_name: true,
          role: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      }),
    ]);

    const userIds = users.map((user) => user.id);
    const lastActivityRows = userIds.length
      ? await prisma.progressLog.groupBy({
          by: ['user_id'],
          where: { user_id: { in: userIds } },
          _max: { logged_at: true },
        })
      : [];

    const lastActiveByUser = new Map(
      lastActivityRows.map((row) => [row.user_id, row._max.logged_at])
    );

    res.json({
      data: {
        total,
        take,
        skip,
        users: users.map((user) => ({
          ...user,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
          last_active_at: isoOrNull(lastActiveByUser.get(user.id)),
        })),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/activity
 * Derived activity feed from existing tables (no mock data).
 */
router.get('/activity', async (req, res) => {
  try {
    const parsed = activityQuerySchema.parse(req.query);
    const limit = parsed.limit ?? 12;

    const [recentProgress, recentUsers, recentChallenges] = await Promise.all([
      prisma.progressLog.findMany({
        orderBy: { logged_at: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, email: true, display_name: true } },
          challenge: { select: { id: true, name: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        select: { id: true, email: true, created_at: true },
      }),
      prisma.challenge.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        include: { creator: { select: { id: true, display_name: true, email: true } } },
      }),
    ]);

    const events: Array<{ id: string; type: string; message: string; at: Date }> = [];

    for (const log of recentProgress) {
      const userName = log.user?.display_name || log.user?.email || log.user_id;
      const challengeName = log.challenge?.name || log.challenge_id;
      events.push({
        id: `progress:${log.id}`,
        type: 'progress',
        message: `${userName} logged ${log.value} ${log.unit} on "${challengeName}"`,
        at: log.logged_at,
      });
    }

    for (const user of recentUsers) {
      events.push({
        id: `signup:${user.id}`,
        type: 'signup',
        message: `New signup: ${user.email}`,
        at: user.created_at,
      });
    }

    for (const challenge of recentChallenges) {
      const creatorName = challenge.creator?.display_name || challenge.creator?.email || 'Trainer';
      events.push({
        id: `create:${challenge.id}`,
        type: 'create',
        message: `${creatorName} created "${challenge.name}"`,
        at: challenge.created_at,
      });
    }

    events.sort((a, b) => b.at.getTime() - a.at.getTime());

    res.json({
      data: events.slice(0, limit).map((event) => ({
        id: event.id,
        type: event.type,
        message: event.message,
        timestamp: event.at.toISOString(),
      })),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Admin activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update a user's role.
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = userIdParamsSchema.parse(req.params);
    const { role } = updateRoleSchema.parse(req.body);

    if (id === req.user!.userId && role !== 'ADMIN') {
      return res.status(400).json({ error: 'Cannot remove your own admin role' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.json({
      data: {
        ...updated,
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Admin update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Enable or disable a user's account.
 */
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = userIdParamsSchema.parse(req.params);
    const { is_active } = updateStatusSchema.parse(req.body);

    if (id === req.user!.userId && !is_active) {
      return res.status(400).json({ error: 'Cannot disable your own account' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { is_active },
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.json({
      data: {
        ...updated,
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Admin update status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// ---------------------------------------------------------------------------
// Site theme (admin-controlled)
// ---------------------------------------------------------------------------

const VALID_THEMES = ['cyberpunk', 'retro', 'lava', 'mana', 'mythic'] as const;
const THEME_KEY = 'site_theme';

const updateSiteThemeSchema = z.object({
  theme: z.enum(VALID_THEMES),
});

router.put('/site/theme', async (req, res) => {
  try {
    const parsed = updateSiteThemeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.errors });
    }

    await siteSettingRepository.set(THEME_KEY, parsed.data.theme, req.user!.userId);

    res.json({ data: { theme: parsed.data.theme } });
  } catch (error) {
    console.error('Admin update site theme error:', error);
    res.status(500).json({ error: 'Failed to update site theme' });
  }
});

const businessProfileSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  hours: z.string().optional(),
  mapsEmbedUrl: z.string().url().optional().or(z.literal('')),
});

router.put('/site/business-profile', async (req, res) => {
  try {
    const parsed = businessProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.errors });
    }

    await siteSettingRepository.set('business_profile', JSON.stringify(parsed.data), req.user!.userId);

    res.json({ data: parsed.data });
  } catch (error) {
    console.error('Admin update business profile error:', error);
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

export default router;
