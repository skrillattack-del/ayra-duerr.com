'use client'

import { useCallback, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Save, ShieldCheck } from 'lucide-react'
import { ThemeRepository } from '@/repositories/ThemeRepository'
import { useTheme } from '@/providers/ThemeProvider'
import { useToast } from '@/providers/ToastProvider'
import { getThemePreset, type ThemeId } from '@/lib/themes'
import { ThemePresetSelector, type ThemeSaveState } from './ThemePresetSelector'
import { ChallengeLivePreview } from './ChallengeLivePreview'
import { ChallengeOperations } from './ChallengeOperations'
import {
  CreateChallengeDialog,
  ResetXpDialog,
  type NewChallengeInput,
} from './ChallengeAdminDialogs'
import {
  INITIAL_CHALLENGES,
  LEADERBOARD,
  type AdminChallenge,
} from './challengeAdminData'

function slugifyChallenge(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${slug || 'challenge'}-${Date.now().toString(36)}`
}

export function AdminControlCenter() {
  const {
    theme,
    persistedTheme,
    loadState,
    setTheme,
    commitTheme,
    rollbackTheme,
  } = useTheme()
  const { toast } = useToast()
  const [themeSaveState, setThemeSaveState] = useState<ThemeSaveState>('saved')
  const [challenges, setChallenges] = useState<AdminChallenge[]>(() => [...INITIAL_CHALLENGES])
  const [activeChallengeId, setActiveChallengeId] = useState(INITIAL_CHALLENGES[0].id)
  const [overrideId, setOverrideId] = useState(INITIAL_CHALLENGES[0].id)
  const [xp, setXp] = useState(24_750)
  const [syncing, setSyncing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const selectedPreset = getThemePreset(theme)
  const activeChallenge = useMemo(
    () => challenges.find((challenge) => challenge.id === activeChallengeId) ?? challenges[0],
    [challenges, activeChallengeId],
  )

  const saveTheme = useCallback(async () => {
    if (themeSaveState === 'saving') return
    if (theme === persistedTheme) {
      setThemeSaveState('saved')
      return
    }

    const nextTheme = theme
    setThemeSaveState('saving')

    try {
      const savedTheme = await ThemeRepository.updateSiteTheme(nextTheme)
      commitTheme(savedTheme)
      setThemeSaveState('saved')
      toast({
        status: 'OK',
        title: 'THEME SAVED',
        message: `${getThemePreset(savedTheme).name} is now active site-wide.`,
        sector: 'ADMIN',
      })
    } catch {
      rollbackTheme()
      setThemeSaveState('error')
      toast({
        status: 'ERROR',
        title: 'THEME SAVE FAILED',
        message: `${getThemePreset(persistedTheme).name} was restored. No live theme change was made.`,
        sector: 'ADMIN',
      })
    }
  }, [commitTheme, persistedTheme, rollbackTheme, theme, themeSaveState, toast])

  const handleThemeSelect = useCallback((themeId: ThemeId) => {
    if (themeId === theme) return
    setTheme(themeId)
    setThemeSaveState(themeId === persistedTheme ? 'saved' : 'idle')
  }, [persistedTheme, setTheme, theme])

  const handleCreateChallenge = useCallback((input: NewChallengeInput) => {
    const challenge: AdminChallenge = {
      id: slugifyChallenge(input.name),
      name: input.name,
      description: input.description,
      goal: input.goal,
      progress: 0,
      unit: input.unit,
      xpReward: input.xpReward,
    }
    setChallenges((current) => [challenge, ...current])
    setOverrideId(challenge.id)
    setActiveChallengeId(challenge.id)
    setCreateOpen(false)
    toast({
      status: 'OK',
      title: 'CHALLENGE CREATED',
      message: `${challenge.name} is now loaded in the live preview.`,
      sector: 'ADMIN',
    })
  }, [toast])

  const handleSync = useCallback(() => {
    if (syncing) return
    setSyncing(true)
    window.setTimeout(() => {
      setSyncing(false)
      toast({
        status: 'OK',
        title: 'LEADERBOARDS SYNCED',
        message: 'Rankings and user data are up to date.',
        sector: 'ADMIN',
      })
    }, 900)
  }, [syncing, toast])

  const handleResetXp = useCallback(() => {
    setXp(0)
    setResetOpen(false)
    toast({
      status: 'WARN',
      title: 'USER XP RESET',
      message: 'The prototype XP state has been reset to zero.',
      sector: 'ADMIN',
    })
  }, [toast])

  const handleApplyOverride = useCallback(() => {
    const selected = challenges.find((challenge) => challenge.id === overrideId)
    if (!selected) return
    setActiveChallengeId(selected.id)
    toast({
      status: 'OK',
      title: 'OVERRIDE APPLIED',
      message: `${selected.name} is now the active challenge preview.`,
      sector: 'ADMIN',
    })
  }, [challenges, overrideId, toast])

  return (
    <div className="challenge-admin-shell -mx-4 -my-6 min-h-[calc(100vh-4rem)] px-4 py-5 md:-mx-8 md:-my-6 md:px-6 md:py-6 xl:px-8">
      <div className="mx-auto max-w-[1420px]">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <nav aria-label="Breadcrumb" className="mb-2 hidden text-xs text-gonga-muted sm:block">
              <span>Challenges</span>
              <span className="mx-2 text-gonga-border">/</span>
              <span>Admin Control Center</span>
            </nav>
            <h1 className="challenge-admin-display text-2xl uppercase leading-none text-gonga-text sm:text-3xl lg:text-4xl">
              Admin Control Center
            </h1>
            <div className="mt-3 inline-flex items-center gap-2 border border-[#ff3d8a] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#ff3d8a]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Admin
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 text-[10px] font-black uppercase tracking-wider text-gonga-secondary sm:text-xs">
            {loadState === 'loading' ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{loadState === 'offline' ? 'Cached Session' : 'Secure Session'}</span>
          </div>
        </header>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(22rem,2fr)]">
          <ThemePresetSelector
            selectedTheme={theme}
            saveState={themeSaveState}
            disabled={loadState === 'loading' || themeSaveState === 'saving'}
            onSelect={handleThemeSelect}
            onSave={() => void saveTheme()}
          />
          <ChallengeLivePreview
            preset={selectedPreset}
            challenge={activeChallenge}
            xp={xp}
            leaderboard={LEADERBOARD}
          />
          <div className="lg:col-span-2">
            <ChallengeOperations
              challenges={challenges}
              overrideId={overrideId}
              syncing={syncing}
              onOverrideChange={setOverrideId}
              onApplyOverride={handleApplyOverride}
              onCreate={() => setCreateOpen(true)}
              onSync={handleSync}
              onReset={() => setResetOpen(true)}
            />
          </div>
        </div>

        <div
          className={`challenge-admin-panel mt-3 flex items-center gap-3 border-gonga-secondary bg-gonga-secondary/5 px-4 py-3 text-gonga-secondary transition md:hidden ${
            themeSaveState === 'saving' ? 'opacity-70' : ''
          }`}
          aria-live="polite"
        >
          {themeSaveState === 'saving' ? (
            <Loader2 className="h-7 w-7 shrink-0 animate-spin" aria-hidden="true" />
          ) : themeSaveState === 'idle' ? (
            <Save className="h-7 w-7 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-7 w-7 shrink-0" aria-hidden="true" />
          )}
          <div>
            <p className="challenge-admin-display text-sm uppercase">
              {themeSaveState === 'saving'
                ? 'Saving Theme'
                : themeSaveState === 'error'
                  ? 'Theme Restored'
                  : themeSaveState === 'idle'
                    ? 'Theme Preview'
                    : 'Theme Saved'}
            </p>
            <p className="text-xs text-gonga-muted">
              {getThemePreset(theme).name} {themeSaveState === 'idle' ? 'is not published yet' : 'is active'}
            </p>
          </div>
        </div>
      </div>

      <CreateChallengeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateChallenge}
      />
      <ResetXpDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleResetXp}
      />
    </div>
  )
}
