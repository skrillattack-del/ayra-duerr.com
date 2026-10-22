import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';

declare global {
  namespace Express {
    interface Request {
      freshUser?: {
        userId: string;
        role: string;
        membership_tier: string;
        community_muted_until: Date | null;
        community_mute_reason: string | null;
      };
    }
  }
}

/**
 * Overwrites the JWT-derived role/membership_tier on req.user with current DB
 * values, so tier changes (Stripe webhooks, demo switcher, admin action) take
 * effect immediately on gated routes instead of waiting for a token refresh.
 * Also loads community mute state. Must run after authenticateJWT.
 */
export const loadFreshTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        role: true,
        membership_tier: true,
        is_active: true,
        community_muted_until: true,
        community_mute_reason: true,
      },
    });

    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    req.user.role = user.role;
    req.user.membership_tier = user.membership_tier;
    req.freshUser = {
      userId: req.user.userId,
      role: user.role,
      membership_tier: user.membership_tier,
      community_muted_until: user.community_muted_until,
      community_mute_reason: user.community_mute_reason,
    };

    next();
  } catch (error) {
    console.error('loadFreshTier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Rejects write actions (send/react/upload) while the user is community-muted.
 * Admins are never muted. Must run after loadFreshTier.
 */
export const rejectMuted = (req: Request, res: Response, next: NextFunction) => {
  const fresh = req.freshUser;
  if (!fresh) {
    return res.status(500).json({ error: 'rejectMuted requires loadFreshTier' });
  }
  if (fresh.role !== 'ADMIN' && fresh.community_muted_until && fresh.community_muted_until > new Date()) {
    return res.status(403).json({
      error: `You are muted until ${fresh.community_muted_until.toISOString()}`,
      code: 'MUTED',
      until: fresh.community_muted_until.toISOString(),
      reason: fresh.community_mute_reason || undefined,
    });
  }
  next();
};
