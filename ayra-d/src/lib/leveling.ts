// Frontend mirror of backend/src/utils/leveling.ts — keep formulas identical.
// totalXp(n) = 50 * n * (n - 1): L2 = 100, L5 = 1,000, L10 = 4,500

export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0
  return 50 * level * (level - 1)
}

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2))
}

export interface LevelProgress {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp)
  const floor = totalXpForLevel(level)
  const ceil = totalXpForLevel(level + 1)
  return {
    level,
    xpIntoLevel: xp - floor,
    xpForNextLevel: ceil - floor,
  }
}
