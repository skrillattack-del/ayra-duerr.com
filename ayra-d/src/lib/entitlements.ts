// Frontend mirror of backend/src/utils/entitlements.ts — keep the literal
// values in sync (unit tests on both sides assert the same numbers).
// Used for instant UI feedback; the backend always re-enforces.

export type EffectiveTier = 'FREE' | 'PAID' | 'ADMIN'

export interface TierLimits {
  maxUploadBytes: number
  maxMediaPerMessage: number
  uploadsPer5Min: number
  maxSquadsJoined: number
  maxSquadsOwned: number
  canCreateSquads: boolean
  canAccessPaidChannels: boolean
  flair: 'NONE' | 'PRO' | 'ADMIN'
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
}

export function effectiveTier(user: { role?: string; membership_tier?: string } | null | undefined): EffectiveTier {
  if (!user) return 'FREE'
  if (user.role === 'ADMIN') return 'ADMIN'
  if (user.role === 'TRAINER') return 'PAID'
  return user.membership_tier === 'PAID' ? 'PAID' : 'FREE'
}

export function limitsFor(user: { role?: string; membership_tier?: string } | null | undefined): TierLimits {
  return ENTITLEMENTS[effectiveTier(user)]
}
