'use client'

import { useState } from 'react'
import {
  ChevronRight,
  Gamepad2,
  Loader2,
  Plus,
  RefreshCw,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import type { AdminChallenge } from './challengeAdminData'

interface ChallengeOperationsProps {
  challenges: readonly AdminChallenge[]
  overrideId: string
  syncing: boolean
  onOverrideChange: (challengeId: string) => void
  onApplyOverride: () => void
  onCreate: () => void
  onSync: () => void
  onReset: () => void
}

interface OperationButtonProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'pink' | 'lime' | 'danger'
  busy?: boolean
  onClick: () => void
}

const ACCENT_CLASSES = {
  pink: 'text-[#ff3d8a] border-[#ff3d8a]/70',
  lime: 'text-[#beff18] border-[#beff18]/70',
  danger: 'text-red-400 border-red-500/70',
}

function OperationButton({
  title,
  description,
  icon: Icon,
  accent,
  busy = false,
  onClick,
}: OperationButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="challenge-admin-focus group grid min-h-[72px] w-full grid-cols-[2.75rem_minmax(0,1fr)_1.25rem] items-center gap-3 border border-gonga-border bg-[#091321]/80 p-3 text-left transition hover:border-current hover:bg-gonga-surface-raised disabled:cursor-wait md:min-h-[106px] md:grid-cols-[3rem_minmax(0,1fr)_1.25rem]"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center border bg-black/15 [clip-path:polygon(20%_0,80%_0,100%_20%,100%_80%,80%_100%,20%_100%,0_80%,0_20%)] md:h-11 md:w-11 ${ACCENT_CLASSES[accent]}`}
      >
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
      </span>
      <span className="min-w-0">
        <span className={`challenge-admin-display block text-sm md:text-[13px] ${accent === 'danger' ? 'text-red-400' : 'text-gonga-text'}`}>
          {title}
        </span>
        <span className={`mt-0.5 block text-xs leading-5 ${accent === 'danger' ? 'text-red-400' : 'text-gonga-muted'}`}>
          {description}
        </span>
      </span>
      <ChevronRight className={`h-5 w-5 transition group-hover:translate-x-0.5 ${ACCENT_CLASSES[accent].split(' ')[0]}`} />
    </button>
  )
}

export function ChallengeOperations({
  challenges,
  overrideId,
  syncing,
  onOverrideChange,
  onApplyOverride,
  onCreate,
  onSync,
  onReset,
}: ChallengeOperationsProps) {
  const [mobileOverrideOpen, setMobileOverrideOpen] = useState(false)

  return (
    <section
      aria-labelledby="challenge-operations-title"
      className="challenge-admin-panel challenge-admin-panel-pink p-3 sm:p-4"
    >
      <h2
        id="challenge-operations-title"
        className="challenge-admin-display mb-3 flex items-center gap-2 text-sm uppercase text-gonga-text sm:text-lg"
      >
        <Wrench className="h-5 w-5" aria-hidden="true" />
        Challenge Operations
      </h2>

      <div className="grid gap-2 lg:grid-cols-[1fr_1fr_1fr_1.3fr]">
        <OperationButton
          title="Create New Challenge"
          description="Build and launch a new challenge"
          icon={Plus}
          accent="pink"
          onClick={onCreate}
        />
        <OperationButton
          title="Sync Leaderboards"
          description={syncing ? 'Refreshing rankings and user data…' : 'Refresh rankings and user data'}
          icon={RefreshCw}
          accent="lime"
          busy={syncing}
          onClick={onSync}
        />
        <OperationButton
          title="Reset User XP"
          description="Permanently reset all users’ XP"
          icon={TriangleAlert}
          accent="danger"
          onClick={onReset}
        />

        <div className="border border-gonga-border bg-[#091321]/80 p-3">
          <button
            type="button"
            onClick={() => setMobileOverrideOpen((open) => !open)}
            aria-expanded={mobileOverrideOpen}
            className="challenge-admin-focus grid min-h-[46px] w-full grid-cols-[2.75rem_minmax(0,1fr)_1.25rem] items-center gap-3 text-left lg:pointer-events-none lg:min-h-0 lg:grid-cols-[auto_1fr]"
          >
            <span className="flex h-10 w-10 items-center justify-center border border-[#ff3d8a]/70 text-[#ff3d8a] [clip-path:polygon(20%_0,80%_0,100%_20%,100%_80%,80%_100%,20%_100%,0_80%,0_20%)] lg:h-7 lg:w-7 lg:border-0">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <span>
              <span className="challenge-admin-display block text-sm text-gonga-text lg:text-xs">Active Challenge Override</span>
              <span className="block text-xs text-gonga-muted lg:hidden">Manually set the active challenge</span>
            </span>
            <ChevronRight className={`h-5 w-5 text-[#ff3d8a] transition lg:hidden ${mobileOverrideOpen ? 'rotate-90' : ''}`} />
          </button>

          <div className={`${mobileOverrideOpen ? 'grid' : 'hidden'} mt-3 grid-cols-[minmax(0,1fr)_auto] gap-2 lg:grid lg:mt-2`}>
            <label className="sr-only" htmlFor="active-challenge-override">Active challenge override</label>
            <select
              id="active-challenge-override"
              value={overrideId}
              onChange={(event) => onOverrideChange(event.target.value)}
              className="challenge-admin-focus min-w-0 border border-gonga-border bg-[#050c17] px-3 py-2 text-xs text-gonga-text"
            >
              {challenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>{challenge.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                onApplyOverride()
                setMobileOverrideOpen(false)
              }}
              className="challenge-admin-focus border border-[#ff3d8a] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#ff3d8a] hover:bg-[#ff3d8a]/10"
            >
              Apply
            </button>
          </div>
          <p className="mt-2 hidden text-[10px] text-gonga-muted lg:block">Temporarily override the active challenge for all users.</p>
        </div>
      </div>
    </section>
  )
}
