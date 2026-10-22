'use client'

import { motion } from 'framer-motion'
import { CalendarDays, Check, Crown, Dumbbell, Loader2, Target, X } from 'lucide-react'
import { type Program } from '@/repositories/ProgramRepository'
import { getWorkoutTypeConfig } from '@/lib/workoutTypes'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function programWorkoutCount(program: Program) {
  return program.weeks.reduce((total, week) => total + week.workouts.length, 0)
}

function weeklyCadence(program: Program) {
  if (!program.weeks.length) return 'No weekly cadence'
  const average = programWorkoutCount(program) / program.weeks.length
  return `${average.toFixed(average % 1 === 0 ? 0 : 1)} workouts / week`
}

export function ProgramPreviewDrawer({
  program,
  enrolled,
  isPaid,
  enrolling,
  onClose,
  onEnroll,
}: {
  program: Program
  enrolled: boolean
  isPaid: boolean
  enrolling?: boolean
  onClose: () => void
  onEnroll: () => void
}) {
  const workoutCount = programWorkoutCount(program)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 240 }}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-clean-border p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-clean-muted">Program preview</p>
              <h2 className="mt-2 text-2xl font-black text-clean-text">{program.name}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-clean-muted">
                {program.description || 'A structured training arc ready to map onto your calendar.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-clean-muted hover:bg-clean-hover hover:text-clean-text"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-clean-border bg-clean-bg p-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-clean-muted">
                <CalendarDays className="h-3.5 w-3.5" /> Length
              </div>
              <p className="mt-2 text-lg font-black text-clean-text">{program.duration_weeks} weeks</p>
            </div>
            <div className="rounded-2xl border border-clean-border bg-clean-bg p-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-clean-muted">
                <Dumbbell className="h-3.5 w-3.5" /> Load
              </div>
              <p className="mt-2 text-lg font-black text-clean-text">{workoutCount}</p>
            </div>
            <div className="rounded-2xl border border-clean-border bg-clean-bg p-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-clean-muted">
                <Target className="h-3.5 w-3.5" /> Level
              </div>
              <p className="mt-2 text-lg font-black capitalize text-clean-text">{program.difficulty.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-clean-text">Training map</h3>
              <p className="mt-1 text-sm text-clean-muted">{weeklyCadence(program)}</p>
            </div>
            <span className="rounded-full bg-[#d7fb48]/70 px-3 py-1 text-xs font-black text-clean-text">
              Calendar ready
            </span>
          </div>

          <div className="space-y-4">
            {program.weeks.map((week) => (
              <section key={week.id} className="rounded-2xl border border-clean-border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-clean-text">Week {week.week_number}</h4>
                    <p className="text-sm text-clean-muted">{week.focus || `Week ${week.week_number}`}</p>
                  </div>
                  <span className="rounded-full bg-clean-bg px-3 py-1 text-xs font-bold text-clean-muted">
                    {week.workouts.length} workouts
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DAYS.map((day, dayIndex) => {
                    const workouts = week.workouts.filter((workout) => workout.day_of_week === dayIndex)
                    return (
                      <div key={day} className="min-h-16 rounded-xl border border-clean-border bg-clean-bg p-2">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-clean-muted">{day}</p>
                        {workouts.length ? (
                          <div className="space-y-1.5">
                            {workouts.map((workout) => {
                              const typeConfig = getWorkoutTypeConfig(workout.template?.type)
                              const Icon = typeConfig.icon
                              return (
                                <div
                                  key={workout.id}
                                  className={cn('rounded-lg border bg-white px-2 py-1.5 text-xs font-bold', typeConfig.textColor)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate text-clean-text">{workout.template?.name || 'Workout'}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-clean-muted">Rest</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-clean-border p-5">
          {enrolled ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-clean-text px-4 py-3 text-sm font-black text-[#d7fb48]">
              <Check className="h-4 w-4" /> Enrolled
            </div>
          ) : isPaid ? (
            <button
              type="button"
              onClick={onEnroll}
              disabled={enrolling}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-clean-accent px-4 py-3 text-sm font-black text-white hover:bg-clean-accent disabled:opacity-50"
            >
              {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              Enroll in program
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-clean-bg px-4 py-3 text-sm font-black text-clean-muted">
              <Crown className="h-4 w-4" /> Paid feature
            </div>
          )}
        </div>
      </motion.aside>
    </motion.div>
  )
}
