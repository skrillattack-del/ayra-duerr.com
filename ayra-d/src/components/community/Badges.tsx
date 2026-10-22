'use client'

import { cn } from '@/lib/utils'

/** Role/tier flair chip shown next to display names. */
export function FlairBadge({ role, membershipTier, className }: { role?: string; membershipTier?: string; className?: string }) {
  if (role === 'ADMIN') {
    return (
      <span className={cn('px-1.5 py-0.5 bg-clean-accent/20 text-clean-accent-soft text-[10px] font-semibold rounded', className)}>
        ADMIN
      </span>
    )
  }
  if (role === 'TRAINER') {
    return (
      <span className={cn('px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-semibold rounded', className)}>
        TRAINER
      </span>
    )
  }
  if (membershipTier === 'PAID') {
    return (
      <span className={cn('px-1.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 text-[10px] font-semibold rounded', className)}>
        PRO
      </span>
    )
  }
  return null
}

/** Level chip, e.g. "Lv 12". */
export function LevelChip({ level, className }: { level?: number | null; className?: string }) {
  if (!level || level < 1) return null
  return (
    <span className={cn('px-1.5 py-0.5 bg-zinc-800 text-slate-400 text-[10px] font-mono rounded border border-white/5', className)}>
      Lv {level}
    </span>
  )
}

/** Avatar with initial fallback. */
export function Avatar({ src, name, size = 10, className }: { src?: string | null; name: string; size?: number; className?: string }) {
  const px = size * 4
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        style={{ width: px, height: px }}
        className={cn('rounded-full object-cover shrink-0', className)}
      />
    )
  }
  return (
    <div
      style={{ width: px, height: px }}
      className={cn(
        'rounded-full bg-gradient-to-br from-clean-accent to-clean-accent-soft flex items-center justify-center text-white font-bold shrink-0',
        px <= 32 ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
