'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isThemeId,
  type ThemeId,
} from '@/lib/themes'
import { ThemeRepository } from '@/repositories/ThemeRepository'

type ThemeLoadState = 'loading' | 'ready' | 'offline'

interface ThemeContextValue {
  /** The theme currently visible in the browser, including an admin preview. */
  theme: ThemeId
  /** The last theme confirmed by the server (or cached fallback while offline). */
  persistedTheme: ThemeId
  loadState: ThemeLoadState
  /** Preview a theme immediately without calling the persistence API. */
  setTheme: (themeId: ThemeId) => void
  /** Mark a successful API response as the new rollback point. */
  commitTheme: (themeId: ThemeId) => void
  /** Restore the last server-confirmed theme after a failed save. */
  rollbackTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function readCachedTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const cached = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeId(cached) ? cached : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function applyThemeToDocument(themeId: ThemeId): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = themeId
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)
  const [persistedTheme, setPersistedTheme] = useState<ThemeId>(DEFAULT_THEME)
  const [loadState, setLoadState] = useState<ThemeLoadState>('loading')

  useEffect(() => {
    let cancelled = false
    const cachedTheme = readCachedTheme()
    setThemeState(cachedTheme)
    setPersistedTheme(cachedTheme)
    applyThemeToDocument(cachedTheme)

    void ThemeRepository.getSiteTheme()
      .then((serverTheme) => {
        if (cancelled) return
        setThemeState(serverTheme)
        setPersistedTheme(serverTheme)
        applyThemeToDocument(serverTheme)
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('offline')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const setTheme = useCallback((themeId: ThemeId) => {
    setThemeState(themeId)
    applyThemeToDocument(themeId)
  }, [])

  const commitTheme = useCallback((themeId: ThemeId) => {
    setPersistedTheme(themeId)
    setThemeState(themeId)
    applyThemeToDocument(themeId)
  }, [])

  const rollbackTheme = useCallback(() => {
    setThemeState(persistedTheme)
    applyThemeToDocument(persistedTheme)
  }, [persistedTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      persistedTheme,
      loadState,
      setTheme,
      commitTheme,
      rollbackTheme,
    }),
    [theme, persistedTheme, loadState, setTheme, commitTheme, rollbackTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
