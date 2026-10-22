import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { limitsFor } from '../utils/entitlements';

const byUser = (req: Request) => (req as any).user?.userId || req.ip || 'unknown';

// Shared limiter instances — one budget per user across every router that
// imports them (separate instances would mean separate counters).

export const messageSendLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: byUser,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many messages. Slow down.', retryAfterSeconds: 60 });
  },
});

// Upload budget scales with tier (requires loadFreshTier or authenticateJWT before it).
export const uploadLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: (req) => {
    const user = (req as any).user;
    return user ? limitsFor(user).uploadsPer5Min : 5;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: byUser,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Upload limit reached. Try again later.', retryAfterSeconds: 300 });
  },
});

export const reactionLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: byUser,
});

export const reportLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: byUser,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many reports filed. Try again later.', retryAfterSeconds: 3600 });
  },
});

export const friendRequestLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: byUser,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many friend requests. Try again later.', retryAfterSeconds: 3600 });
  },
});

export const searchLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: byUser,
});
