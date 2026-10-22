import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  THEMES,
  THEME_IDS,
  getThemeInlineScript,
  getThemePreset,
  isThemeId,
} from '@/lib/themes'

describe('site theme manifest', () => {
  it('exposes the exact persisted ids and product names in display order', () => {
    expect(THEME_IDS).toEqual(['cyberpunk', 'retro', 'lava', 'mana', 'mythic'])
    expect(THEMES.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'cyberpunk', name: 'Cyberpunk Neon' },
      { id: 'retro', name: 'Retro 8-Bit' },
      { id: 'lava', name: 'Lava Dungeon' },
      { id: 'mana', name: 'Mana Pool' },
      { id: 'mythic', name: 'Mythic Gold' },
    ])
    expect(DEFAULT_THEME).toBe('cyberpunk')
  })

  it('maps every preset to its stable generated asset path', () => {
    expect(THEMES.map((preset) => preset.assetPath)).toEqual([
      '/images/challenges/admin/themes/cyberpunk-neon.png',
      '/images/challenges/admin/themes/retro-8-bit.png',
      '/images/challenges/admin/themes/lava-dungeon.png',
      '/images/challenges/admin/themes/mana-pool.png',
      '/images/challenges/admin/themes/mythic-gold.png',
    ])
  })

  it('rejects legacy or unknown ids', () => {
    for (const id of THEME_IDS) expect(isThemeId(id)).toBe(true)
    expect(isThemeId('arena')).toBe(false)
    expect(isThemeId('neon')).toBe(false)
    expect(isThemeId(null)).toBe(false)
  })

  it('uses the default preset only as a defensive fallback', () => {
    expect(getThemePreset('mana').name).toBe('Mana Pool')
    expect(getThemePreset('not-real' as never).id).toBe(DEFAULT_THEME)
  })

  it('hydrates only supported cached ids before React loads', () => {
    const script = getThemeInlineScript()
    for (const id of THEME_IDS) expect(script).toContain(`\"${id}\"`)
    expect(script).not.toContain('arena')
  })
})
