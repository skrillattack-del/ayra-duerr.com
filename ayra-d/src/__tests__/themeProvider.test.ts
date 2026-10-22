import { afterEach, describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from '@/lib/themes'
import {
  applyThemeToDocument,
  readCachedTheme,
} from '@/providers/ThemeProvider'

describe('ThemeProvider document helpers', () => {
  afterEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('reads a valid cached theme and ignores a stale legacy value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'retro')
    expect(readCachedTheme()).toBe('retro')

    window.localStorage.setItem(THEME_STORAGE_KEY, 'arena')
    expect(readCachedTheme()).toBe('cyberpunk')
  })

  it('applies and caches an immediate preview on the html element', () => {
    applyThemeToDocument('mythic')
    expect(document.documentElement.dataset.theme).toBe('mythic')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('mythic')
  })
})
