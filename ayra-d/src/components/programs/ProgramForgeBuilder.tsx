'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Eye,
  Flag,
  Gamepad2,
  GripVertical,
  Layers3,
  Loader2,
  Plus,
  Rocket,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react'
import { ProgramRepository, type Program } from '@/repositories/ProgramRepository'
import type { WorkoutTemplate } from '@/repositories/WorkoutRepository'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import {
  addProgramWeek,
  addTemplateToProgramDraft,
  autoFillProgramSplit,
  createEmptyProgramDraft,
  getProgramDraftStorageKey,
  moveProgramWorkout,
  parseStoredProgramDraft,
  programDraftToCreatePayload,
  removeProgramWeek,
  removeProgramWorkout,
  serializeProgramDraft,
  validateProgramDraft,
  type ProgramBuilderDraft,
  type ProgramBuilderWorkoutSlot,
  type ProgramBuilderWeek,
  type ProgramDifficulty,
} from '@/lib/programBuilder'
import { getWorkoutTypeConfig } from '@/lib/workoutTypes'
import { useToast } from '@/providers/ToastProvider'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STEPS = [
  { id: 'basics', label: 'Basics', icon: ShieldCheck },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'review', label: 'Review', icon: Eye },
  { id: 'publish', label: 'Publish', icon: Rocket },
] as const

const TYPE_STYLES: Record<
  string,
  {
    tile: string
    soft: string
    text: string
    border: string
    dot: string
  }
> = {
  PUSH: {
    tile: 'bg-red-50 text-red-700',
    soft: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  PULL: {
    tile: 'bg-blue-50 text-blue-700',
    soft: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  LEGS: {
    tile: 'bg-purple-50 text-purple-700',
    soft: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  UPPER: {
    tile: 'bg-orange-50 text-orange-700',
    soft: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  LOWER: {
    tile: 'bg-pink-50 text-pink-700',
    soft: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    dot: 'bg-pink-500',
  },
  FULL_BODY: {
    tile: 'bg-emerald-50 text-emerald-700',
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  CARDIO: {
    tile: 'bg-cyan-50 text-cyan-700',
    soft: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
  },
  REST: {
    tile: 'bg-slate-50 text-slate-700',
    soft: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
  },
  CUSTOM: {
    tile: 'bg-yellow-50 text-yellow-700',
    soft: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
}

type StepId = (typeof STEPS)[number]['id']

type DragData =
  | { kind: 'template'; templateId: string }
  | { kind: 'workout'; workoutId: string }

type DropData =
  | { kind: 'day'; weekId: string; dayOfWeek: number }
  | { kind: 'slot'; weekId: string; dayOfWeek: number; index: number }

function getTypeStyle(type?: string) {
  return TYPE_STYLES[type?.toUpperCase() || 'CUSTOM'] || TYPE_STYLES.CUSTOM
}

function templateSetCount(template: WorkoutTemplate) {
  return template.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

function findWorkoutSlot(draft: ProgramBuilderDraft, workoutId: string) {
  for (const week of draft.weeks) {
    const workout = week.workouts.find((item) => item.id === workoutId)
    if (workout) return { week, workout }
  }

  return undefined
}

function difficultyLabel(difficulty: ProgramDifficulty) {
  return difficulty.charAt(0) + difficulty.slice(1).toLowerCase()
}

function formatRestDays(value: number) {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)
}

export function ProgramForgeBuilder({
  userId,
  templates,
  loadingTemplates,
  onCancel,
  onPublished,
}: {
  userId?: string | null
  templates: WorkoutTemplate[]
  loadingTemplates: boolean
  onCancel: () => void
  onPublished: (program: Program) => void
}) {
  const { toast } = useToast()
  const [draft, setDraft] = useState<ProgramBuilderDraft>(() => createEmptyProgramDraft())
  const [activeStep, setActiveStep] = useState<StepId>('schedule')
  const [hydrated, setHydrated] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [showCalendarPreview, setShowCalendarPreview] = useState(false)
  const [publishedName, setPublishedName] = useState<string | null>(null)
  const [autoFillMissing, setAutoFillMissing] = useState<string[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const storageKey = getProgramDraftStorageKey(userId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = parseStoredProgramDraft(window.localStorage.getItem(storageKey))
    setDraft(stored || createEmptyProgramDraft())
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, serializeProgramDraft(draft))
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [draft, hydrated, storageKey])

  const templatesById = useMemo(() => new Map(templates.map((template) => [template.id, template])), [templates])

  const validation = useMemo(() => validateProgramDraft(draft, templates), [draft, templates])

  const typeFilters = useMemo(() => {
    const types = Array.from(new Set(templates.map((template) => template.type?.toUpperCase() || 'CUSTOM'))).sort()
    return ['ALL', ...types]
  }, [templates])

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return templates.filter((template) => {
      const matchesType = typeFilter === 'ALL' || template.type?.toUpperCase() === typeFilter
      const matchesSearch =
        !normalizedSearch ||
        template.name.toLowerCase().includes(normalizedSearch) ||
        template.type?.toLowerCase().includes(normalizedSearch)

      return matchesType && matchesSearch
    })
  }, [search, templates, typeFilter])

  const activeTemplate =
    activeDrag?.kind === 'template' ? templatesById.get(activeDrag.templateId) : undefined
  const activeWorkout =
    activeDrag?.kind === 'workout' ? findWorkoutSlot(draft, activeDrag.workoutId)?.workout : undefined
  const activeWorkoutTemplate = activeWorkout ? templatesById.get(activeWorkout.templateId) : undefined

  const updateDraft = (updater: (current: ProgramBuilderDraft) => ProgramBuilderDraft) => {
    setDraft((current) => updater(current))
  }

  const updateDraftField = <Key extends keyof ProgramBuilderDraft>(key: Key, value: ProgramBuilderDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }))
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active.data.current as DragData)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const dragData = event.active.data.current as DragData | undefined
    const dropData = event.over?.data.current as DropData | undefined
    setActiveDrag(null)

    if (!dragData || !dropData) return

    const targetWeekId = dropData.weekId
    const targetDayOfWeek = dropData.dayOfWeek
    const targetIndex = dropData.kind === 'slot' ? dropData.index : undefined

    if (dragData.kind === 'template') {
      updateDraft((current) => addTemplateToProgramDraft(current, dragData.templateId, targetWeekId, targetDayOfWeek))
      setActiveStep('schedule')
      return
    }

    updateDraft((current) =>
      moveProgramWorkout(current, dragData.workoutId, targetWeekId, targetDayOfWeek, targetIndex)
    )
    setActiveStep('schedule')
  }

  const saveDraftNow = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, serializeProgramDraft(draft))
    }
    setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    toast({ title: 'Draft saved', variant: 'success' })
  }

  const autoFillSplit = () => {
    const result = autoFillProgramSplit(draft, templates)
    setDraft(result.draft)
    setAutoFillMissing(result.missingTypes)
    if (result.missingTypes.length) {
      toast({
        title: `Auto-fill skipped ${result.missingTypes.join(', ')}`,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Split mapped across the program', variant: 'success' })
    }
  }

  const publishProgram = async () => {
    const latestValidation = validateProgramDraft(draft, templates)
    if (latestValidation.errors.length) {
      setActiveStep('review')
      toast({ title: latestValidation.errors[0], variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const program = await ProgramRepository.createProgram(programDraftToCreatePayload(draft))
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(storageKey)
      }
      setPublishedName(program.name)
      toast({ title: 'Program published', variant: 'success' })
      onPublished(program)
      window.setTimeout(() => setPublishedName(null), 2200)
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'publish this program' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-clean-text">Programs</h1>
          <p className="mt-1 text-sm text-clean-muted">Build quests, enroll athletes, and map the next training arc.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveDraftNow}
            className="inline-flex items-center gap-2 rounded-xl border border-clean-border bg-white px-4 py-2.5 text-sm font-black text-clean-text shadow-sm hover:bg-clean-hover"
          >
            <Save className="h-4 w-4" /> Save draft
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl border border-clean-border bg-white px-4 py-2.5 text-sm font-black text-clean-muted hover:bg-clean-hover"
          >
            <X className="h-4 w-4" /> Close builder
          </button>
          <button
            type="button"
            onClick={publishProgram}
            disabled={saving || validation.errors.length > 0}
            className="inline-flex items-center gap-2 rounded-xl bg-clean-accent px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-clean-accent disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Publish program
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-clean-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-clean-text">Program Forge</h2>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-clean-muted">Schedule step</p>
                </div>
                <ReadinessRing score={validation.readinessScore} />
              </div>

              <div className="mt-5 space-y-2">
                {STEPS.map((step) => {
                  const StepIcon = step.icon
                  const active = activeStep === step.id
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStep(step.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-black transition-colors',
                        active ? 'bg-clean-accent text-white shadow-sm' : 'text-clean-muted hover:bg-clean-hover hover:text-clean-text'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <StepIcon className="h-4 w-4" />
                        {step.label}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-clean-muted">Program name</span>
                  <input
                    value={draft.name}
                    onChange={(event) => updateDraftField('name', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-clean-border bg-white px-3 py-2.5 text-sm font-bold text-clean-text outline-none focus:border-clean-accent/60 focus:ring-2 focus:ring-clean-accent/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-clean-muted">Description</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraftField('description', event.target.value)}
                    rows={4}
                    className="mt-1 w-full resize-none rounded-xl border border-clean-border bg-white px-3 py-2.5 text-sm font-medium leading-5 text-clean-text outline-none focus:border-clean-accent/60 focus:ring-2 focus:ring-clean-accent/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-clean-muted">Difficulty</span>
                  <select
                    value={draft.difficulty}
                    onChange={(event) => updateDraftField('difficulty', event.target.value as ProgramDifficulty)}
                    className="mt-1 w-full rounded-xl border border-clean-border bg-white px-3 py-2.5 text-sm font-bold text-clean-text outline-none focus:border-clean-accent/60 focus:ring-2 focus:ring-clean-accent/20"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => updateDraftField('isPublic', !draft.isPublic)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-black transition-colors',
                    draft.isPublic
                      ? 'border-[#d7fb48] bg-[#d7fb48]/50 text-clean-text'
                      : 'border-clean-border bg-clean-bg text-clean-muted'
                  )}
                >
                  <span>{draft.isPublic ? 'Public enrollment' : 'Private program'}</span>
                  <span className={cn('h-5 w-9 rounded-full p-0.5 transition-colors', draft.isPublic ? 'bg-clean-text' : 'bg-gray-300')}>
                    <span
                      className={cn(
                        'block h-4 w-4 rounded-full bg-white transition-transform',
                        draft.isPublic ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </span>
                </button>
              </div>
            </div>

            <ValidationPanel validation={validation} autoFillMissing={autoFillMissing} lastSavedAt={lastSavedAt} />
          </aside>

          <main className="min-w-0 rounded-2xl border border-clean-border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-clean-border pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-clean-accent" />
                  <h2 className="text-lg font-black text-clean-text">Schedule board</h2>
                </div>
                <p className="mt-1 text-sm text-clean-muted">Drag templates into day slots, then publish a real enrollment plan.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateDraft(addProgramWeek)}
                  className="inline-flex items-center gap-2 rounded-xl border border-clean-border bg-white px-3 py-2 text-sm font-black text-clean-text hover:bg-clean-hover"
                >
                  <Plus className="h-4 w-4" /> Add week
                </button>
                <button
                  type="button"
                  onClick={autoFillSplit}
                  disabled={templates.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-clean-border bg-[#d7fb48]/60 px-3 py-2 text-sm font-black text-clean-text hover:bg-[#d7fb48] disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" /> Auto-fill split
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalendarPreview(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-clean-border bg-white px-3 py-2 text-sm font-black text-clean-text hover:bg-clean-hover"
                >
                  <Eye className="h-4 w-4" /> Preview calendar
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto pb-2">
              <div className="grid min-w-[760px] gap-4 lg:auto-cols-[minmax(260px,1fr)] lg:grid-flow-col">
                {draft.weeks.map((week) => (
                  <WeekLane
                    key={week.id}
                    week={week}
                    draft={draft}
                    templatesById={templatesById}
                    onRemoveWeek={() => updateDraft((current) => removeProgramWeek(current, week.id))}
                    onRemoveWorkout={(workoutId) => updateDraft((current) => removeProgramWorkout(current, workoutId))}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-clean-border pt-4 md:grid-cols-4">
              <ForgeStat label="Workouts" value={String(validation.workoutCount)} icon={Dumbbell} />
              <ForgeStat label="Rest days/week" value={formatRestDays(validation.restDaysPerWeek)} icon={Clock} />
              <ForgeStat label="Calendar" value={validation.errors.length ? 'Needs review' : 'Ready'} icon={CalendarDays} />
              <ForgeStat label="Enrollment" value={draft.isPublic ? 'Public' : 'Private'} icon={Flag} />
            </div>
          </main>

          <aside className="space-y-4">
            <TemplateLibrary
              templates={filteredTemplates}
              loading={loadingTemplates}
              search={search}
              typeFilter={typeFilter}
              typeFilters={typeFilters}
              onSearch={setSearch}
              onTypeFilter={setTypeFilter}
            />
            <QuestCard draft={draft} validation={validation} />
          </aside>
        </div>

        <DragOverlay>
          {activeTemplate ? (
            <TemplateTile template={activeTemplate} overlay />
          ) : activeWorkout && activeWorkoutTemplate ? (
            <WorkoutPlanCard
              workout={activeWorkout}
              template={activeWorkoutTemplate}
              weekId="overlay"
              index={0}
              overlay
              onRemove={() => undefined}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {showCalendarPreview && (
          <CalendarPreview draft={draft} templatesById={templatesById} onClose={() => setShowCalendarPreview(false)} />
        )}
        {publishedName && <PublishCelebration name={publishedName} />}
      </AnimatePresence>
    </section>
  )
}

function ReadinessRing({ score }: { score: number }) {
  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(#d7fb48 ${score * 3.6}deg, #e5e7eb 0deg)` }}
      aria-label={`Readiness score ${score}%`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-black text-clean-text">
        {score}
      </div>
    </div>
  )
}

function ValidationPanel({
  validation,
  autoFillMissing,
  lastSavedAt,
}: {
  validation: ReturnType<typeof validateProgramDraft>
  autoFillMissing: string[]
  lastSavedAt: string | null
}) {
  return (
    <div className="rounded-2xl border border-clean-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-clean-text">Review strip</h3>
        <span className="rounded-full bg-clean-bg px-2.5 py-1 text-[11px] font-black text-clean-muted">
          {lastSavedAt ? `Saved ${lastSavedAt}` : 'Autosave on'}
        </span>
      </div>
      <div className="space-y-2">
        {validation.errors.length === 0 ? (
          <StatusRow tone="success" text="Calendar ready" />
        ) : (
          validation.errors.map((error) => <StatusRow key={error} tone="error" text={error} />)
        )}
        {validation.warnings.map((warning) => (
          <StatusRow key={warning} tone="warning" text={warning} />
        ))}
        {autoFillMissing.map((missing) => (
          <StatusRow key={missing} tone="warning" text={`Missing ${missing} template for auto-fill.`} />
        ))}
        <StatusRow tone="success" text="Publish unlocks enrollment" />
      </div>
    </div>
  )
}

function StatusRow({ text, tone }: { text: string; tone: 'success' | 'warning' | 'error' }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-red-50 text-red-700'

  return (
    <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold', toneClass)}>
      {tone === 'success' ? <Check className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" />}
      <span>{text}</span>
    </div>
  )
}

function WeekLane({
  week,
  draft,
  templatesById,
  onRemoveWeek,
  onRemoveWorkout,
}: {
  week: ProgramBuilderWeek
  draft: ProgramBuilderDraft
  templatesById: Map<string, WorkoutTemplate>
  onRemoveWeek: () => void
  onRemoveWorkout: (workoutId: string) => void
}) {
  const canRemove = draft.weeks.length > 1 && week.workouts.length === 0

  return (
    <section className="rounded-2xl border border-clean-border bg-clean-bg p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-clean-text">Week {week.weekNumber}</h3>
          <p className="text-xs font-bold uppercase tracking-wide text-clean-muted">{week.focus}</p>
        </div>
        <button
          type="button"
          onClick={onRemoveWeek}
          disabled={!canRemove}
          className="rounded-lg p-2 text-clean-muted hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Remove week ${week.weekNumber}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        {DAYS.map((day, dayIndex) => (
          <DayDropZone
            key={day}
            day={day}
            dayIndex={dayIndex}
            week={week}
            templatesById={templatesById}
            onRemoveWorkout={onRemoveWorkout}
          />
        ))}
      </div>
    </section>
  )
}

function DayDropZone({
  day,
  dayIndex,
  week,
  templatesById,
  onRemoveWorkout,
}: {
  day: string
  dayIndex: number
  week: ProgramBuilderWeek
  templatesById: Map<string, WorkoutTemplate>
  onRemoveWorkout: (workoutId: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day:${week.id}:${dayIndex}`,
    data: { kind: 'day', weekId: week.id, dayOfWeek: dayIndex } satisfies DropData,
  })

  const workouts = week.workouts
    .filter((workout) => workout.dayOfWeek === dayIndex)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[96px] rounded-xl border border-dashed bg-white p-2 transition-colors',
        isOver ? 'border-clean-accent bg-red-50/60' : 'border-clean-border'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wide text-clean-muted">{day}</span>
        <span className="text-[11px] font-black text-clean-muted">{workouts.length || 'Rest'}</span>
      </div>
      <div className="space-y-2">
        {workouts.map((workout, index) => {
          const template = templatesById.get(workout.templateId)
          if (!template) {
            return (
              <div key={workout.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                Missing template
              </div>
            )
          }

          return (
            <WorkoutPlanCard
              key={workout.id}
              workout={workout}
              template={template}
              weekId={week.id}
              index={index}
              onRemove={() => onRemoveWorkout(workout.id)}
            />
          )
        })}
      </div>
    </div>
  )
}

function WorkoutPlanCard({
  workout,
  template,
  weekId,
  index,
  overlay,
  onRemove,
}: {
  workout: ProgramBuilderWorkoutSlot
  template: WorkoutTemplate
  weekId: string
  index: number
  overlay?: boolean
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `workout:${workout.id}`,
    data: { kind: 'workout', workoutId: workout.id } satisfies DragData,
    disabled: overlay,
  })
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: `slot:${workout.id}`,
    data: { kind: 'slot', weekId, dayOfWeek: workout.dayOfWeek, index } satisfies DropData,
    disabled: overlay,
  })
  const typeConfig = getWorkoutTypeConfig(template.type)
  const Icon = typeConfig.icon
  const style = getTypeStyle(template.type)
  const transformStyle = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableNodeRef(node)
    setDroppableNodeRef(node)
  }

  return (
    <div
      ref={setNodeRef}
      style={transformStyle}
      className={cn(
        'group rounded-xl border bg-white p-2 shadow-sm transition-all',
        style.border,
        isDragging ? 'opacity-40' : '',
        isOver ? 'ring-2 ring-clean-accent/40' : '',
        overlay ? 'w-64 shadow-xl' : ''
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={cn('mt-0.5 rounded-lg p-1.5', style.tile)}
          {...attributes}
          {...listeners}
          aria-label={`Move ${template.name}`}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Icon className={cn('h-3.5 w-3.5 shrink-0', style.text)} />
            <p className="truncate text-xs font-black text-clean-text">{template.name}</p>
          </div>
          <p className="mt-1 text-[11px] font-bold text-clean-muted">
            {template.exercises.length} exercises / {templateSetCount(template)} sets
          </p>
        </div>
        {!overlay && (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onRemove}
            className="rounded-lg p-1.5 text-clean-muted opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            aria-label={`Remove ${template.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function TemplateLibrary({
  templates,
  loading,
  search,
  typeFilter,
  typeFilters,
  onSearch,
  onTypeFilter,
}: {
  templates: WorkoutTemplate[]
  loading: boolean
  search: string
  typeFilter: string
  typeFilters: string[]
  onSearch: (value: string) => void
  onTypeFilter: (value: string) => void
}) {
  return (
    <section className="rounded-2xl border border-clean-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-clean-text">Template Library</h2>
          <p className="text-sm text-clean-muted">Drag a tile onto any day.</p>
        </div>
        <Layers3 className="h-5 w-5 text-clean-accent" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clean-muted" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search templates"
          className="w-full rounded-xl border border-clean-border bg-white py-2.5 pl-9 pr-3 text-sm font-medium outline-none focus:border-clean-accent/60 focus:ring-2 focus:ring-clean-accent/20"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {typeFilters.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeFilter(type)}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-black transition-colors',
              typeFilter === type ? 'bg-clean-text text-white' : 'bg-clean-bg text-clean-muted hover:bg-clean-hover'
            )}
          >
            {type === 'ALL' ? 'All' : type.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-clean-accent" />
          </div>
        ) : templates.length ? (
          templates.map((template) => <TemplateTile key={template.id} template={template} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-clean-border bg-clean-bg p-5 text-center">
            <Dumbbell className="mx-auto h-8 w-8 text-clean-muted" />
            <p className="mt-3 text-sm font-bold text-clean-text">No templates found</p>
            <p className="mt-1 text-xs leading-5 text-clean-muted">Create workout templates first, then drop them into this program.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function TemplateTile({ template, overlay }: { template: WorkoutTemplate; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `template:${template.id}`,
    data: { kind: 'template', templateId: template.id } satisfies DragData,
    disabled: overlay,
  })
  const typeConfig = getWorkoutTypeConfig(template.type)
  const Icon = typeConfig.icon
  const style = getTypeStyle(template.type)
  const transformStyle = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={transformStyle}
      className={cn(
        'flex w-full cursor-grab items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition-all active:cursor-grabbing',
        style.border,
        isDragging ? 'opacity-40' : 'hover:-translate-y-0.5 hover:shadow-md',
        overlay ? 'w-72 shadow-xl' : ''
      )}
      {...attributes}
      {...listeners}
    >
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', style.tile)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-clean-text">{template.name}</span>
        <span className="mt-1 block text-xs font-bold text-clean-muted">
          {template.exercises.length} exercises / {templateSetCount(template)} sets
        </span>
      </span>
      <GripVertical className="h-4 w-4 text-clean-muted" />
    </button>
  )
}

function QuestCard({
  draft,
  validation,
}: {
  draft: ProgramBuilderDraft
  validation: ReturnType<typeof validateProgramDraft>
}) {
  return (
    <section className="rounded-2xl border border-clean-border bg-clean-text p-4 text-white shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d7fb48]">Enrollment preview</p>
          <h3 className="mt-2 text-xl font-black">{draft.name || 'Untitled program'}</h3>
        </div>
        <Trophy className="h-8 w-8 text-[#d7fb48]" />
      </div>
      <p className="mt-3 text-sm leading-6 text-white/70">
        {draft.description || 'Athletes will see the week count, difficulty, and training map before enrolling.'}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <QuestMetric label="Weeks" value={String(draft.weeks.length)} />
        <QuestMetric label="Load" value={String(validation.workoutCount)} />
        <QuestMetric label="Level" value={difficultyLabel(draft.difficulty)} />
      </div>
      <div className="mt-4 rounded-xl bg-white/10 p-3 text-xs font-bold text-white/80">
        {validation.errors.length ? 'Finish review checks before publishing.' : 'Ready to publish and unlock enrollment.'}
      </div>
    </section>
  )
}

function QuestMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  )
}

function CalendarPreview({
  draft,
  templatesById,
  onClose,
}: {
  draft: ProgramBuilderDraft
  templatesById: Map<string, WorkoutTemplate>
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.98 }}
        className="mx-auto flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-clean-border p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-clean-muted">Preview calendar</p>
            <h2 className="mt-2 text-2xl font-black text-clean-text">{draft.name || 'Untitled program'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-clean-muted hover:bg-clean-hover hover:text-clean-text"
            aria-label="Close calendar preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="space-y-4">
            {draft.weeks.map((week) => (
              <div key={week.id} className="rounded-2xl border border-clean-border bg-clean-bg p-4">
                <h3 className="font-black text-clean-text">Week {week.weekNumber}</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-7">
                  {DAYS.map((day, dayIndex) => {
                    const workouts = week.workouts.filter((workout) => workout.dayOfWeek === dayIndex)
                    return (
                      <div key={day} className="min-h-24 rounded-xl border border-clean-border bg-white p-2">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-clean-muted">{day}</p>
                        {workouts.length ? (
                          <div className="space-y-1.5">
                            {workouts.map((workout) => {
                              const template = templatesById.get(workout.templateId)
                              const style = getTypeStyle(template?.type)
                              return (
                                <div key={workout.id} className={cn('rounded-lg px-2 py-1.5 text-xs font-black', style.tile)}>
                                  {template?.name || 'Missing template'}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-clean-muted">Rest</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PublishCelebration({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[#d7fb48] bg-clean-text p-4 text-white shadow-2xl"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d7fb48] text-clean-text">
          <Rocket className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-black">Program published</p>
          <p className="text-xs font-bold text-white/60">{name} is ready for enrollment.</p>
        </div>
      </div>
    </motion.div>
  )
}

function ForgeStat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof CalendarDays
}) {
  return (
    <div className="rounded-2xl border border-clean-border bg-clean-bg p-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-clean-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-lg font-black text-clean-text">{value}</p>
    </div>
  )
}
