import { describe, it, expect } from 'vitest'
import { totalXpForLevel, levelFromXp, levelProgress } from '@/lib/leveling'

// Must match backend/src/utils/leveling.ts exactly (backend test asserts same values).
describe('level curve', () => {
  it('known thresholds', () => {
    expect(totalXpForLevel(1)).toBe(0)
    expect(totalXpForLevel(2)).toBe(100)
    expect(totalXpForLevel(3)).toBe(300)
    expect(totalXpForLevel(5)).toBe(1000)
    expect(totalXpForLevel(10)).toBe(4500)
    expect(totalXpForLevel(20)).toBe(19000)
    expect(totalXpForLevel(50)).toBe(122500)
  })

  it('inverse is consistent with the curve', () => {
    for (let level = 1; level <= 60; level++) {
      const floor = totalXpForLevel(level)
      expect(levelFromXp(floor)).toBe(level)
      expect(levelFromXp(floor + 1)).toBe(level)
      if (level > 1) {
        expect(levelFromXp(floor - 1)).toBe(level - 1)
      }
    }
  })

  it('level 1 edge cases', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(-5)).toBe(1)
    expect(levelFromXp(99)).toBe(1)
    expect(levelFromXp(100)).toBe(2)
  })

  it('levelProgress splits xp correctly', () => {
    const p = levelProgress(150) // level 2 spans 100..300
    expect(p.level).toBe(2)
    expect(p.xpIntoLevel).toBe(50)
    expect(p.xpForNextLevel).toBe(200)
  })
})
