/**
 * The public, site-wide GongaFit theme manifest.
 *
 * Theme ids are persisted by the backend, so this list is an API contract.
 * Keep it aligned with the backend site-theme whitelist.
 */

export type ThemeId = 'cyberpunk' | 'retro' | 'lava' | 'mana' | 'mythic'

export const THEME_IDS = ['cyberpunk', 'retro', 'lava', 'mana', 'mythic'] as const satisfies readonly ThemeId[]

export const DEFAULT_THEME: ThemeId = 'cyberpunk'
export const THEME_STORAGE_KEY = 'gonga-theme'

export interface ThemeSwatches {
  bg: string
  surface: string
  surfaceRaised: string
  text: string
  muted: string
  border: string
  hover: string
  primary: string
  secondary: string
}

export interface ThemePreset {
  id: ThemeId
  name: string
  mobileName: readonly [string, string]
  tagline: string
  description: string
  assetPath: string
  swatches: ThemeSwatches
}

export const THEMES: readonly ThemePreset[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    mobileName: ['Cyberpunk', 'Neon'],
    tagline: 'High-tech, neon-soaked future.',
    description: 'Electric, bold, relentless.',
    assetPath: '/images/challenges/admin/themes/cyberpunk-neon.png',
    swatches: {
      bg: '#050914',
      surface: '#0a1321',
      surfaceRaised: '#101c2d',
      text: '#f7f8fc',
      muted: '#91a0b7',
      border: '#304157',
      hover: '#142238',
      primary: '#ff3d9a',
      secondary: '#baff18',
    },
  },
  {
    id: 'retro',
    name: 'Retro 8-Bit',
    mobileName: ['Retro', '8-Bit'],
    tagline: 'Classic arcade vibes.',
    description: 'Pixelated and playful.',
    assetPath: '/images/challenges/admin/themes/retro-8-bit.png',
    swatches: {
      bg: '#050508',
      surface: '#11101a',
      surfaceRaised: '#1a1728',
      text: '#fff9dc',
      muted: '#aaa2bd',
      border: '#3a3150',
      hover: '#221d33',
      primary: '#f8d84a',
      secondary: '#9b5cff',
    },
  },
  {
    id: 'lava',
    name: 'Lava Dungeon',
    mobileName: ['Lava', 'Dungeon'],
    tagline: 'Molten depths and forged battles.',
    description: 'Intense and fiery.',
    assetPath: '/images/challenges/admin/themes/lava-dungeon.png',
    swatches: {
      bg: '#120b09',
      surface: '#1c1917',
      surfaceRaised: '#29201b',
      text: '#fff4eb',
      muted: '#b99c8b',
      border: '#533122',
      hover: '#35231b',
      primary: '#ff3b30',
      secondary: '#ff7a1a',
    },
  },
  {
    id: 'mana',
    name: 'Mana Pool',
    mobileName: ['Mana', 'Pool'],
    tagline: 'Arcane energy and tranquil power.',
    description: 'Cool, mystical, balanced.',
    assetPath: '/images/challenges/admin/themes/mana-pool.png',
    swatches: {
      bg: '#0d0b2b',
      surface: '#1e1b4b',
      surfaceRaised: '#292463',
      text: '#eefcff',
      muted: '#a4a6ca',
      border: '#413c7a',
      hover: '#302b69',
      primary: '#22d3ee',
      secondary: '#a855f7',
    },
  },
  {
    id: 'mythic',
    name: 'Mythic Gold',
    mobileName: ['Mythic', 'Gold'],
    tagline: 'Legendary glory and timeless might.',
    description: 'Regal, powerful, triumphant.',
    assetPath: '/images/challenges/admin/themes/mythic-gold.png',
    swatches: {
      bg: '#080706',
      surface: '#12100c',
      surfaceRaised: '#201a10',
      text: '#fff9e8',
      muted: '#b6a47a',
      border: '#4d3b18',
      hover: '#2a2112',
      primary: '#f4c542',
      secondary: '#ff9f1c',
    },
  },
]

const THEME_BY_ID = new Map<ThemeId, ThemePreset>(THEMES.map((preset) => [preset.id, preset]))

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

export function getThemePreset(id: ThemeId): ThemePreset {
  return THEME_BY_ID.get(id) ?? THEME_BY_ID.get(DEFAULT_THEME)!
}

/** Script used in the root layout to apply the cached theme before hydration. */
export function getThemeInlineScript(): string {
  return `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(${JSON.stringify(THEME_IDS)}.indexOf(t)!==-1){document.documentElement.dataset.theme=t;}}catch(e){}`
}
