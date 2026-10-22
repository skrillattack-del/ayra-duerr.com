import { Crown, Eye, Medal, Settings, Target, Timer, Trophy, Zap } from 'lucide-react'
import Image from 'next/image'
import type { ThemePreset } from '@/lib/themes'
import type { AdminChallenge, LeaderboardEntry } from './challengeAdminData'

interface ChallengeLivePreviewProps {
  preset: ThemePreset
  challenge: AdminChallenge
  xp: number
  leaderboard: readonly LeaderboardEntry[]
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US')

function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value)
}

export function ChallengeLivePreview({
  preset,
  challenge,
  xp,
  leaderboard,
}: ChallengeLivePreviewProps) {
  const progress = Math.min(100, Math.round((challenge.progress / Math.max(challenge.goal, 1)) * 100))
  const levelProgress = xp === 0 ? 0 : Math.min(100, Math.max(8, Math.round((xp % 1000) / 10)))
  const previewStyle = {
    '--preview-primary': preset.swatches.primary,
    '--preview-secondary': preset.swatches.secondary,
    '--preview-bg': preset.swatches.bg,
    '--preview-surface': preset.swatches.surface,
    '--preview-raised': preset.swatches.surfaceRaised,
    '--preview-text': preset.swatches.text,
    '--preview-muted': preset.swatches.muted,
    '--preview-border': preset.swatches.border,
  } as React.CSSProperties

  return (
    <section
      aria-labelledby="live-preview-title"
      className="challenge-admin-panel min-w-0 p-3 sm:p-4"
    >
      <h2
        id="live-preview-title"
        className="challenge-admin-display mb-3 flex items-center gap-2 text-sm uppercase text-gonga-text sm:mb-4 sm:text-lg"
      >
        <Eye className="h-5 w-5" aria-hidden="true" />
        Live Preview
      </h2>

      <div
        style={previewStyle}
        className="challenge-admin-scanlines relative isolate overflow-hidden border border-[var(--preview-primary)] bg-[var(--preview-bg)] p-3 text-[var(--preview-text)] shadow-[inset_0_0_40px_rgba(0,0,0,0.5),0_0_24px_color-mix(in_srgb,var(--preview-primary)_16%,transparent)] sm:p-4"
      >
        <Image
          src={preset.assetPath}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="-z-20 object-cover opacity-[0.16] saturate-150"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--preview-bg)_68%,transparent),var(--preview-bg)_92%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_25%,color-mix(in_srgb,var(--preview-primary)_16%,transparent),transparent_48%)]" />

        <div className="flex items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--preview-primary)_38%,transparent)] pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-[var(--preview-primary)]" aria-hidden="true" />
            <span className="challenge-admin-display -skew-x-6 text-xl uppercase italic sm:text-2xl">
              Challenges
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase sm:text-xs">
            <Zap className="h-4 w-4 fill-current text-[var(--preview-secondary)]" aria-hidden="true" />
            <span className="text-[var(--preview-muted)]">XP</span>
            <span>{formatNumber(xp)}</span>
            <Settings className="hidden h-4 w-4 text-[var(--preview-muted)] sm:block" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_8.5rem]">
          <div className="min-w-0 space-y-3">
            <section className="border border-[var(--preview-border)] bg-[color-mix(in_srgb,var(--preview-surface)_88%,transparent)] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="challenge-admin-display text-xs uppercase text-[var(--preview-primary)]">
                  Active Quest
                </h3>
                <span className="flex items-center gap-1 text-[9px] uppercase text-[var(--preview-muted)]">
                  <Timer className="h-3 w-3" aria-hidden="true" /> Season ends 6d
                </span>
              </div>

              <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[3rem_minmax(0,1fr)_4rem]">
                <span className="flex h-11 w-11 items-center justify-center border border-[var(--preview-primary)] bg-[color-mix(in_srgb,var(--preview-primary)_10%,transparent)] text-[var(--preview-primary)] [clip-path:polygon(22%_0,78%_0,100%_22%,100%_78%,78%_100%,22%_100%,0_78%,0_22%)] sm:h-12 sm:w-12">
                  <Target className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold sm:text-base">{challenge.name}</p>
                  <p className="truncate text-[10px] text-[var(--preview-muted)] sm:text-xs">{challenge.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden border border-[var(--preview-border)] bg-black/35">
                      <div
                        className="h-full bg-[var(--preview-secondary)] shadow-[0_0_10px_var(--preview-secondary)] transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-[var(--preview-secondary)]">
                      {challenge.progress}/{challenge.goal}
                    </span>
                  </div>
                </div>
                <div className="hidden border-l border-[var(--preview-border)] pl-2 text-center sm:block">
                  <p className="text-[9px] uppercase text-[var(--preview-muted)]">Reward</p>
                  <p className="text-lg font-black text-[var(--preview-secondary)]">{challenge.xpReward}</p>
                  <p className="text-[9px] font-bold">XP</p>
                </div>
              </div>
            </section>

            <section className="border border-[var(--preview-border)] bg-[color-mix(in_srgb,var(--preview-surface)_90%,transparent)]">
              <div className="flex items-center justify-between border-b border-[var(--preview-border)] px-3 py-2">
                <h3 className="challenge-admin-display text-xs uppercase text-[var(--preview-primary)]">
                  Leaderboard Top 3
                </h3>
                <span className="text-[10px] font-bold uppercase text-[var(--preview-primary)]">Your Rank</span>
              </div>
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 border-b border-[color-mix(in_srgb,var(--preview-border)_70%,transparent)] px-3 py-2 last:border-b-0"
                >
                  <span className="flex h-6 w-6 items-center justify-center text-xs font-black" style={{ color: entry.accent }}>
                    {entry.rank === 1 ? <Crown className="h-4 w-4 fill-current" aria-label="First" /> : entry.rank}
                  </span>
                  <span className="truncate text-xs font-semibold sm:text-sm">{entry.player}</span>
                  <span className="text-xs font-bold sm:text-sm">{formatNumber(entry.xp)} XP</span>
                </div>
              ))}
              <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 bg-[color-mix(in_srgb,var(--preview-raised)_88%,transparent)] px-3 py-2 text-[var(--preview-secondary)]">
                <span className="text-center text-sm font-black">{xp === 0 ? '—' : '14'}</span>
                <span className="font-black">You</span>
                <span className="text-sm font-black">{formatNumber(xp)} XP</span>
              </div>
            </section>
          </div>

          <aside className="hidden space-y-3 xl:block">
            <div className="border border-[var(--preview-border)] bg-[color-mix(in_srgb,var(--preview-surface)_90%,transparent)] p-3 text-center">
              <p className="challenge-admin-display text-xs uppercase text-[var(--preview-primary)]">Rank Ladder</p>
              <span className="mx-auto my-3 flex h-16 w-16 items-center justify-center border-2 border-[var(--preview-primary)] text-[var(--preview-primary)] [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]">
                <Trophy className="h-8 w-8" aria-hidden="true" />
              </span>
              <p className="challenge-admin-display text-sm uppercase">Diamond I</p>
              <p className="text-[9px] font-bold uppercase text-[var(--preview-primary)]">Top 3%</p>
            </div>
            <div className="border border-[var(--preview-border)] bg-[color-mix(in_srgb,var(--preview-surface)_90%,transparent)] p-3">
              <p className="challenge-admin-display text-xs uppercase text-[var(--preview-primary)]">Your Status</p>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <p className="text-[9px] uppercase text-[var(--preview-muted)]">Rank</p>
                  <p className="text-2xl font-black text-[var(--preview-secondary)]">{xp === 0 ? '—' : '14'}</p>
                </div>
                <Medal className="h-7 w-7 text-[var(--preview-primary)]" aria-hidden="true" />
              </div>
              <div className="mt-2 h-1.5 overflow-hidden border border-[var(--preview-border)] bg-black/35">
                <div className="h-full bg-[var(--preview-secondary)]" style={{ width: `${levelProgress}%` }} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
