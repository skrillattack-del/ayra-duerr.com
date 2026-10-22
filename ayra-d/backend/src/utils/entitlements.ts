// Single source of truth for tier-based community entitlements.
// Mirrored on the frontend at src/lib/entitlements.ts — keep the literal
// values in sync (both sides have a unit test asserting the same numbers).

export type EffectiveTier = 'FREE' | 'PAID' | 'ADMIN';

export interface TierLimits {
  maxUploadBytes: number;
  maxMediaPerMessage: number;
  uploadsPer5Min: number;
  maxSquadsJoined: number;
  maxSquadsOwned: number;
  canCreateSquads: boolean;
  canAccessPaidChannels: boolean;
  flair: 'NONE' | 'PRO' | 'ADMIN';
}

export const ENTITLEMENTS: Record<EffectiveTier, TierLimits> = {
  FREE: {
    maxUploadBytes: 2 * 1024 * 1024,
    maxMediaPerMessage: 2,
    uploadsPer5Min: 5,
    maxSquadsJoined: 2,
    maxSquadsOwned: 0,
    canCreateSquads: false,
    canAccessPaidChannels: false,
    flair: 'NONE',
  },
  PAID: {
    maxUploadBytes: 10 * 1024 * 1024,
    maxMediaPerMessage: 6,
    uploadsPer5Min: 10,
    maxSquadsJoined: 10,
    maxSquadsOwned: 3,
    canCreateSquads: true,
    canAccessPaidChannels: true,
    flair: 'PRO',
  },
  ADMIN: {
    maxUploadBytes: 25 * 1024 * 1024,
    maxMediaPerMessage: 10,
    uploadsPer5Min: 30,
    maxSquadsJoined: Number.MAX_SAFE_INTEGER,
    maxSquadsOwned: Number.MAX_SAFE_INTEGER,
    canCreateSquads: true,
    canAccessPaidChannels: true,
    flair: 'ADMIN',
  },
};

export function effectiveTier(user: { role: string; membership_tier: string }): EffectiveTier {
  if (user.role === 'ADMIN') return 'ADMIN';
  // Trainers get paid-level community access regardless of billing.
  if (user.role === 'TRAINER') return 'PAID';
  return user.membership_tier === 'PAID' ? 'PAID' : 'FREE';
}

export function limitsFor(user: { role: string; membership_tier: string }): TierLimits {
  return ENTITLEMENTS[effectiveTier(user)];
}

export function canReadChannel(
  user: { role: string; membership_tier: string },
  channel: { required_tier: string },
): boolean {
  if (channel.required_tier !== 'PAID') return true;
  return ENTITLEMENTS[effectiveTier(user)].canAccessPaidChannels;
}

export function canPostChannel(
  user: { role: string; membership_tier: string },
  channel: { required_tier: string; posting_policy: string },
): boolean {
  if (!canReadChannel(user, channel)) return false;
  if (channel.posting_policy === 'ADMIN_ONLY') return user.role === 'ADMIN';
  return true;
}
