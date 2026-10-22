import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db/client';
import { authenticateJWT, requireAdmin } from '../middleware/authMiddleware';
import { searchLimiter } from '../middleware/rateLimiters';
import { userRepository } from '../repositories/userRepository';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { isStripeConfigured } from '../services/stripeService';

const router: Router = Router();

// When Stripe billing is live, self-service tier toggles are disabled in
// production so the webhook stays the single source of billing truth.
function demoTierSwitchAllowed(): boolean {
  if (process.env.ALLOW_DEMO_TIER_SWITCH === 'true') return true;
  return !isStripeConfigured();
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const updateProfileSchema = z.object({
  display_name: z.string().min(1).optional(),
  fitness_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  goals: z.array(z.string()).optional(),
});

const updateMembershipSchema = z.object({
  membership_tier: z.enum(['FREE', 'PAID']),
  subscription_status: z.enum(['ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED']).optional(),
});

const updatePlanSchema = z.object({
  membership_tier: z.enum(['FREE', 'PAID']),
});

const updateAccessModeSchema = z.object({
  mode: z.enum(['FREE', 'PAID', 'ADMIN']),
  code: z.string().min(1).max(200).optional(),
});

const redeemCodeSchema = z.object({
  code: z.string().min(1).max(200),
});

const redeemCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: 'Too many code attempts',
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    });
  },
});

/**
 * Reissue accessToken/refreshToken cookies. Needed whenever role/membership_tier
 * change, since authMiddleware reads those from the JWT claims, not a DB lookup.
 */
function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * GET /api/users/me
 * Get current user full profile
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await userRepository.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * PATCH /api/users/me
 * Update current user profile
 */
router.patch('/me', authenticateJWT, async (req, res) => {
  try {
    const validated = updateProfileSchema.parse(req.body);
    const user = await userRepository.update(req.user!.userId, validated);
    res.json({ user });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * PATCH /api/users/me/plan
 * Self-service membership tier toggle (no payment gateway -- demo stub).
 * Reissues tokens since membership_tier is embedded in the JWT claims.
 */
router.patch('/me/plan', authenticateJWT, async (req, res) => {
  try {
    if (!demoTierSwitchAllowed()) {
      return res.status(403).json({
        error: 'Plan changes are managed through billing',
        code: 'USE_BILLING',
      });
    }
    const validated = updatePlanSchema.parse(req.body);
    const user = await userRepository.updateMembership(req.user!.userId, validated.membership_tier);

    const tokens = authService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      membership_tier: user.membership_tier,
    });

    setAuthCookies(res, tokens);

    res.json({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

/**
 * PATCH /api/users/me/access-mode
 * Demo-only self-service switcher used by the dashboard account dropdown.
 * Free/Paid demote to a normal client account; Admin still requires the code.
 */
router.patch('/me/access-mode', authenticateJWT, async (req, res) => {
  try {
    const validated = updateAccessModeSchema.parse(req.body);
    const secret = process.env.ADMIN_SECRET_CODE || 'nhoj-reezy';

    if (validated.mode === 'ADMIN' && validated.code !== secret) {
      console.warn(`Failed admin mode switch attempt by user ${req.user!.userId}`);
      return res.status(400).json({ error: 'Invalid code' });
    }

    // With Stripe live, PAID must come from checkout and FREE-downgrade must
    // not desync an active subscription; only the code-gated ADMIN path stays.
    if (validated.mode !== 'ADMIN' && !demoTierSwitchAllowed()) {
      return res.status(403).json({
        error: 'Plan changes are managed through billing',
        code: 'USE_BILLING',
      });
    }

    const user = await userRepository.updateAccessMode(req.user!.userId, {
      role: validated.mode === 'ADMIN' ? 'ADMIN' : 'CLIENT',
      membership_tier: validated.mode === 'FREE' ? 'FREE' : 'PAID',
    });

    const tokens = authService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      membership_tier: user.membership_tier,
    });

    setAuthCookies(res, tokens);

    res.json({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update access mode error:', error);
    res.status(500).json({ error: 'Failed to update access mode' });
  }
});

/**
 * POST /api/users/me/avatar
 * Upload avatar image
 */
router.post('/me/avatar', authenticateJWT, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const key = storageService.generateAvatarKey(req.user!.userId, req.file.originalname);
    await storageService.uploadFile(key, req.file.buffer, req.file.mimetype);

    const user = await userRepository.update(req.user!.userId, { avatar_url: key });
    res.json({ user, key });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar', message: error.message });
  }
});

/**
 * GET /api/users/search?q=
 * Lightweight user lookup for @mentions and friend finding.
 */
router.get('/search', authenticateJWT, searchLimiter, async (req, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        display_name: { contains: q, mode: 'insensitive' },
        is_active: true,
        id: { not: req.user!.userId },
      },
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        role: true,
        membership_tier: true,
        stats: { select: { level: true } },
      },
      take: 8,
    });

    res.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * PUT /api/users/:id/membership (admin only)
 * Update a user's membership tier
 */
router.put('/:id/membership', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const validated = updateMembershipSchema.parse(req.body);
    const user = await userRepository.updateMembership(
      req.params.id,
      validated.membership_tier,
      validated.subscription_status
    );
    res.json({ user });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update membership error:', error);
    res.status(500).json({ error: 'Failed to update membership' });
  }
});

/**
 * POST /api/users/me/redeem-code
 * Redeem a secret code to self-grant ADMIN role (demo-only stub, no real security boundary).
 * Reissues tokens since role is embedded in the JWT claims.
 */
router.post('/me/redeem-code', authenticateJWT, redeemCodeLimiter, async (req, res) => {
  try {
    const validated = redeemCodeSchema.parse(req.body);
    const secret = process.env.ADMIN_SECRET_CODE || 'nhoj-reezy';

    if (validated.code !== secret) {
      console.warn(`Failed admin code redemption attempt by user ${req.user!.userId}`);
      return res.status(400).json({ error: 'Invalid code' });
    }

    const user = await userRepository.updateRole(req.user!.userId, 'ADMIN');

    const tokens = authService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      membership_tier: user.membership_tier,
    });

    setAuthCookies(res, tokens);

    res.json({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Redeem code error:', error);
    res.status(500).json({ error: 'Failed to redeem code' });
  }
});

export default router;
