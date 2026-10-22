'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, TriangleAlert, X } from 'lucide-react'

export interface NewChallengeInput {
  name: string
  description: string
  goal: number
  unit: string
  xpReward: number
}

interface CreateChallengeDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (input: NewChallengeInput) => void
}

interface ResetXpDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

function DialogBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const focusFirstControl = () => {
      const backdrop = backdropRef.current
      if (!backdrop || backdrop.contains(document.activeElement)) return
      backdrop.querySelector<HTMLElement>(focusableSelector)?.focus()
    }
    const animationFrame = window.requestAnimationFrame(focusFirstControl)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const backdrop = backdropRef.current
      if (!backdrop) return
      const focusable = Array.from(backdrop.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.getClientRects().length > 0)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !backdrop.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [onClose])

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020711]/85 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      {children}
    </div>
  )
}

export function CreateChallengeDialog({ open, onClose, onCreate }: CreateChallengeDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('15')
  const [unit, setUnit] = useState('workouts')
  const [xpReward, setXpReward] = useState('400')

  if (!open) return null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanDescription = description.trim()
    const parsedGoal = Number(goal)
    const parsedReward = Number(xpReward)
    if (!cleanName || !cleanDescription || parsedGoal <= 0 || parsedReward <= 0 || !unit.trim()) return

    onCreate({
      name: cleanName,
      description: cleanDescription,
      goal: parsedGoal,
      unit: unit.trim(),
      xpReward: parsedReward,
    })
    setName('')
    setDescription('')
    setGoal('15')
    setUnit('workouts')
    setXpReward('400')
  }

  const inputClass =
    'challenge-admin-focus w-full border border-gonga-border bg-[#050c17] px-3 py-2.5 text-sm text-gonga-text placeholder:text-gonga-muted/65'

  return (
    <DialogBackdrop onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-challenge-title"
        className="challenge-admin-panel challenge-admin-panel-pink w-full max-w-xl p-5 shadow-[0_0_48px_rgba(255,61,138,0.2)] sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="create-challenge-title" className="challenge-admin-display text-xl uppercase text-gonga-text">
              Create New Challenge
            </h2>
            <p className="mt-1 text-sm text-gonga-muted">Build a playable quest and make it the active preview.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="challenge-admin-focus p-1.5 text-gonga-muted transition hover:text-gonga-primary"
            aria-label="Close create challenge dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-black uppercase tracking-wider text-gonga-muted">
            Quest name
            <input
              autoFocus
              required
              maxLength={48}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Iron Circuit"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block text-xs font-black uppercase tracking-wider text-gonga-muted">
            Objective
            <input
              required
              maxLength={80}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Complete 15 circuit workouts"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-xs font-black uppercase tracking-wider text-gonga-muted">
              Goal
              <input
                required
                min="1"
                max="9999"
                type="number"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="block text-xs font-black uppercase tracking-wider text-gonga-muted">
              Unit
              <input
                required
                maxLength={16}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="block text-xs font-black uppercase tracking-wider text-gonga-muted">
              XP
              <input
                required
                min="1"
                max="99999"
                type="number"
                value={xpReward}
                onChange={(event) => setXpReward(event.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="challenge-admin-focus border border-gonga-border px-4 py-2.5 text-xs font-black uppercase tracking-wider text-gonga-muted hover:bg-gonga-surface-raised hover:text-gonga-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="challenge-admin-focus flex items-center gap-2 border border-gonga-primary bg-gonga-primary/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-gonga-primary hover:bg-gonga-primary/20"
            >
              <Plus className="h-4 w-4" /> Launch Quest
            </button>
          </div>
        </form>
      </div>
    </DialogBackdrop>
  )
}

export function ResetXpDialog({ open, onClose, onConfirm }: ResetXpDialogProps) {
  if (!open) return null

  return (
    <DialogBackdrop onClose={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-xp-title"
        aria-describedby="reset-xp-description"
        className="challenge-admin-panel w-full max-w-md border-red-500/75 p-5 shadow-[0_0_48px_rgba(255,48,75,0.18)] sm:p-6"
      >
        <span className="mb-4 flex h-12 w-12 items-center justify-center border border-red-500 bg-red-500/10 text-red-400 [clip-path:polygon(20%_0,80%_0,100%_20%,100%_80%,80%_100%,20%_100%,0_80%,0_20%)]">
          <TriangleAlert className="h-7 w-7" />
        </span>
        <h2 id="reset-xp-title" className="challenge-admin-display text-xl uppercase text-red-400">
          Reset all user XP?
        </h2>
        <p id="reset-xp-description" className="mt-2 text-sm leading-6 text-gonga-muted">
          This prototype will zero the live preview and leaderboard status. This destructive action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="challenge-admin-focus border border-gonga-border px-4 py-2.5 text-xs font-black uppercase tracking-wider text-gonga-muted hover:bg-gonga-surface-raised hover:text-gonga-text"
          >
            Keep XP
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="challenge-admin-focus border border-red-500 bg-red-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-red-400 hover:bg-red-500/20"
          >
            Confirm Reset
          </button>
        </div>
      </div>
    </DialogBackdrop>
  )
}
