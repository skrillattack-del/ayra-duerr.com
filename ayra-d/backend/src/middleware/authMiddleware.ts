import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        membership_tier: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT token
 * Extracts token from Authorization header or cookie
 */
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to cookie
      token = req.cookies?.accessToken;
    }

    if (!token) {
      console.warn(`[auth] 401 on ${req.method} ${req.path}: no token provided`);
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Verify token
    const decoded = authService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    console.warn(`[auth] 401 on ${req.method} ${req.path}: ${error.message}`);
    return res.status(401).json({
      error: 'Unauthorized - Invalid or expired token',
      message: error.message
    });
  }
};

/**
 * Middleware to require specific roles
 * Must be used after authenticateJWT
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden - Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to require a paid subscription or admin role.
 * The JWT claim can lag a Stripe-webhook upgrade by up to the token lifetime,
 * so a FREE claim falls back to one DB read before rejecting (PAID users
 * never pay the extra query).
 */
export const requirePaid = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.membership_tier !== 'PAID' && req.user.role !== 'ADMIN') {
    try {
      const { prisma } = await import('../db/client');
      const fresh = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { membership_tier: true, role: true },
      });
      if (fresh && (fresh.membership_tier === 'PAID' || fresh.role === 'ADMIN')) {
        req.user.membership_tier = fresh.membership_tier;
        req.user.role = fresh.role;
        return next();
      }
    } catch (error) {
      console.error('requirePaid fresh lookup failed:', error);
    }
    return res.status(403).json({
      error: 'Forbidden - Paid subscription or admin access required',
    });
  }

  next();
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Forbidden - Admin access required',
    });
  }

  next();
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies?.accessToken;
    }

    if (token) {
      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  
  next();
};


