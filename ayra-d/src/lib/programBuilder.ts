import type { WorkoutTemplate } from '@/repositories/WorkoutRepository'

export type ProgramDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export interface ProgramBuilderWorkoutSlot {
  id: string
  templateId: string
  dayOfWeek: number
  orderIndex: number
  notes?: string
}

export interface ProgramBuilderWeek {
  id: string
  weekNumber: number
  focus: string
  workouts: ProgramBuilderWorkoutSlot[]
}

export interface ProgramBuilderDraft {
  version: 1
  name: string
  description: string
  difficulty: ProgramDifficulty
  isPublic: boolean
  weeks: ProgramBuilderWeek[]
  updatedAt: string
}

export interface ProgramBuilderValidation {
  errors: string[]
  warnings: string[]
  workoutCount: number
  restDaysPerWeek: number
  readinessScore: number
  invalidTemplateIds: string[]
}

export interface AutoFillResult {
  draft: ProgramBuilderDraft
  missingTypes: string[]
}

export interface CreateProgramPayload {
  name: string
  description?: string
  duration_weeks: number
  difficulty: ProgramDifficulty
  is_public: boolean
  weeks: Array<{
    week_number: number
    focus?: string
    workouts: Array<{
      template_id: string
      day_of_week: number
      order_index: number
      notes?: string
    }>
  }>
}

const DRAFT_VERSION = 1
const DAYS_PER_WEEK = 7
const DEFAULT_PROGRAM_NAME = 'Foundations of Power'

const AUTO_FILL_PATTERN: Array<{
  dayOfWeek: number
  preferredTypes: string[]
  label: string
}> = [
  { dayOfWeek: 1, preferredTypes: ['PUSH', 'UPPER', 'FULL_BODY', 'CUSTOM'], label: 'Push' },
  { dayOfWeek: 2, preferredTypes: ['PULL', 'UPPER', 'FULL_BODY', 'CUSTOM'], label: 'Pull' },
  { dayOfWeek: 3, preferredTypes: ['LEGS', 'LOWER', 'FULL_BODY', 'CUSTOM'], label: 'Legs' },
  { dayOfWeek: 5, preferredTypes: ['FULL_BODY', 'UPPER', 'CUSTOM'], label: 'Full Body' },
  { dayOfWeek: 6, preferredTypes: ['CARDIO', 'CUSTOM'], label: 'Cardio' },
]

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function clampDay(dayOfWeek: number) {
  return Math.min(Math.max(dayOfWeek, 0), DAYS_PER_WEEK - 1)
}

function sortWorkouts(workouts: ProgramBuilderWorkoutSlot[]) {
  return workouts
    .map((workout) => ({ ...workout, dayOfWeek: clampDay(workout.dayOfWeek) }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.orderIndex - b.orderIndex)
    .map((workout, index) => ({ ...workout, orderIndex: index }))
}

function touchDraft(draft: ProgramBuilderDraft): ProgramBuilderDraft {
  return { ...draft, updatedAt: nowIso() }
}

export function createEmptyProgramDraft(overrides: Partial<ProgramBuilderDraft> = {}): ProgramBuilderDraft {
  const weeks = overrides.weeks?.length
    ? overrides.weeks
    : [
        {
          id: makeId('week'),
          weekNumber: 1,
          focus: 'Base Camp',
          workouts: [],
        },
      ]

  return normalizeProgramDraft({
    version: DRAFT_VERSION,
    name: DEFAULT_PROGRAM_NAME,
    description: 'A structured training arc built from your workout templates.',
    difficulty: 'INTERMEDIATE',
    isPublic: true,
    updatedAt: nowIso(),
    ...overrides,
    weeks,
  })
}

export function getProgramDraftStorageKey(userId?: string | null) {
  return `gongafit:program-builder-draft:${userId || 'anonymous'}`
}

export function normalizeProgramDraft(draft: ProgramBuilderDraft): ProgramBuilderDraft {
  return {
    ...draft,
    version: DRAFT_VERSION,
    weeks: draft.weeks.map((week, index) => ({
      ...week,
      id: week.id || makeId('week'),
      weekNumber: index + 1,
      focus: week.focus || `Week ${index + 1}`,
      workouts: sortWorkouts(week.workouts || []),
    })),
  }
}

export function addProgramWeek(draft: ProgramBuilderDraft): ProgramBuilderDraft {
  const nextWeekNumber = draft.weeks.length + 1
  return touchDraft(
    normalizeProgramDraft({
      ...draft,
      weeks: [
        ...draft.weeks,
        {
          id: makeId('week'),
          weekNumber: nextWeekNumber,
          focus: `Week ${nextWeekNumber}`,
          workouts: [],
        },
      ],
    })
  )
}

export function canRemoveProgramWeek(draft: ProgramBuilderDraft, weekId: string) {
  const week = draft.weeks.find((item) => item.id === weekId)
  return Boolean(week && draft.weeks.length > 1 && week.workouts.length === 0)
}

export function removeProgramWeek(draft: ProgramBuilderDraft, weekId: string): ProgramBuilderDraft {
  if (!canRemoveProgramWeek(draft, weekId)) return draft

  return touchDraft(
    normalizeProgramDraft({
      ...draft,
      weeks: draft.weeks.filter((week) => week.id !== weekId),
    })
  )
}

export function addTemplateToProgramDraft(
  draft: ProgramBuilderDraft,
  templateId: string,
  weekId: string,
  dayOfWeek: number
): ProgramBuilderDraft {
  return touchDraft(
    normalizeProgramDraft({
      ...draft,
      weeks: draft.weeks.map((week) => {
        if (week.id !== weekId) return week

        const dayWorkouts = week.workouts.filter((workout) => workout.dayOfWeek === dayOfWeek)

        return {
          ...week,
          workouts: [
            ...week.workouts,
            {
              id: makeId('slot'),
              templateId,
              dayOfWeek: clampDay(dayOfWeek),
              orderIndex: dayWorkouts.length,
            },
          ],
        }
      }),
    })
  )
}

export function moveProgramWorkout(
  draft: ProgramBuilderDraft,
  workoutId: string,
  targetWeekId: string,
  targetDayOfWeek: number,
  targetIndex?: number
): ProgramBuilderDraft {
  let movedWorkout: ProgramBuilderWorkoutSlot | undefined

  const weeksWithoutMoved = draft.weeks.map((week) => {
    const remaining = week.workouts.filter((workout) => {
      if (workout.id !== workoutId) return true
      movedWorkout = workout
      return false
    })

    return { ...week, workouts: remaining }
  })

  if (!movedWorkout) return draft

  const normalizedDay = clampDay(targetDayOfWeek)

  return touchDraft(
    normalizeProgramDraft({
      ...draft,
      weeks: weeksWithoutMoved.map((week) => {
        if (week.id !== targetWeekId) return week
        const otherDayWorkouts = week.workouts.filter((workout) => workout.dayOfWeek !== normalizedDay)
        const dayWorkouts = week.workouts
          .filter((workout) => workout.dayOfWeek === normalizedDay)
          .sort((a, b) => a.orderIndex - b.orderIndex)
        const insertIndex = Math.min(Math.max(targetIndex ?? dayWorkouts.length, 0), dayWorkouts.length)
        const targetDayWorkouts = [
          ...dayWorkouts.slice(0, insertIndex),
          {
            ...movedWorkout!,
            dayOfWeek: normalizedDay,
            orderIndex: insertIndex,
          },
          ...dayWorkouts.slice(insertIndex),
        ].map((workout, index) => ({ ...workout, dayOfWeek: normalizedDay, orderIndex: index }))

        return {
          ...week,
          workouts: [...otherDayWorkouts, ...targetDayWorkouts],
        }
      }),
    })
  )
}

export function removeProgramWorkout(draft: ProgramBuilderDraft, workoutId: string): ProgramBuilderDraft {
  return touchDraft(
    normalizeProgramDraft({
      ...draft,
      weeks: draft.weeks.map((week) => ({
        ...week,
        workouts: week.workouts.filter((workout) => workout.id !== workoutId),
      })),
    })
  )
}

function findTemplateForTypes(templates: WorkoutTemplate[], preferredTypes: string[]) {
  for (const type of preferredTypes) {
    const template = templates.find((item) => item.type?.toUpperCase() === type)
    if (template) return template
  }

  return undefined
}

export function autoFillProgramSplit(draft: ProgramBuilderDraft, templates: WorkoutTemplate[]): AutoFillResult {
  const missingTypes = new Set<string>()

  const weeks = draft.weeks.map((week) => {
    const workouts = AUTO_FILL_PATTERN.flatMap((slot) => {
      const template = findTemplateForTypes(templates, slot.preferredTypes)
      if (!template) {
        missingTypes.add(slot.label)
        return []
      }

      return [
        {
          id: makeId('slot'),
          templateId: template.id,
          dayOfWeek: slot.dayOfWeek,
          orderIndex: slot.dayOfWeek,
        },
      ]
    })

    return {
      ...week,
      workouts,
    }
  })

  return {
    draft: touchDraft(normalizeProgramDraft({ ...draft, weeks })),
    missingTypes: Array.from(missingTypes),
  }
}

export function validateProgramDraft(
  draft: ProgramBuilderDraft,
  templates: Pick<WorkoutTemplate, 'id'>[]
): ProgramBuilderValidation {
  const templateIds = new Set(templates.map((template) => template.id))
  const invalidTemplateIds = Array.from(
    new Set(
      draft.weeks
        .flatMap((week) => week.workouts)
        .map((workout) => workout.templateId)
        .filter((templateId) => !templateIds.has(templateId))
    )
  )

  const workoutCount = draft.weeks.reduce((total, week) => total + week.workouts.length, 0)
  const scheduledDayKeys = new Set(
    draft.weeks.flatMap((week) => week.workouts.map((workout) => `${week.weekNumber}:${workout.dayOfWeek}`))
  )
  const restDaysPerWeek = draft.weeks.length
    ? Math.round(((draft.weeks.length * DAYS_PER_WEEK - scheduledDayKeys.size) / draft.weeks.length) * 10) / 10
    : 0

  const errors: string[] = []
  const warnings: string[] = []

  if (!draft.name.trim()) errors.push('Program name is required.')
  if (draft.weeks.length < 1) errors.push('Add at least one week.')
  if (workoutCount < 1) errors.push('Add at least one workout.')
  if (invalidTemplateIds.length > 0) errors.push('Remove workouts that reference missing templates.')

  const emptyWeeks = draft.weeks.filter((week) => week.workouts.length === 0)
  if (emptyWeeks.length > 0) warnings.push(`${emptyWeeks.length} week${emptyWeeks.length === 1 ? '' : 's'} have no workouts.`)
  if (restDaysPerWeek < 1) warnings.push('Add at least one rest day per week.')

  const scoreParts = [
    draft.name.trim() ? 20 : 0,
    draft.description.trim() ? 10 : 0,
    draft.weeks.length > 0 ? 15 : 0,
    workoutCount > 0 ? 30 : 0,
    invalidTemplateIds.length === 0 ? 15 : 0,
    restDaysPerWeek >= 1 ? 10 : 0,
  ]

  return {
    errors,
    warnings,
    workoutCount,
    restDaysPerWeek,
    readinessScore: Math.min(100, scoreParts.reduce((total, part) => total + part, 0)),
    invalidTemplateIds,
  }
}

export function programDraftToCreatePayload(draft: ProgramBuilderDraft): CreateProgramPayload {
  const normalized = normalizeProgramDraft(draft)

  return {
    name: normalized.name.trim(),
    description: normalized.description.trim() || undefined,
    duration_weeks: normalized.weeks.length,
    difficulty: normalized.difficulty,
    is_public: normalized.isPublic,
    weeks: normalized.weeks.map((week) => ({
      week_number: week.weekNumber,
      focus: week.focus.trim() || undefined,
      workouts: week.workouts.map((workout) => ({
        template_id: workout.templateId,
        day_of_week: clampDay(workout.dayOfWeek),
        order_index: workout.orderIndex,
        notes: workout.notes?.trim() || undefined,
      })),
    })),
  }
}

export function serializeProgramDraft(draft: ProgramBuilderDraft) {
  return JSON.stringify(normalizeProgramDraft(draft))
}

export function parseStoredProgramDraft(value: string | null): ProgramBuilderDraft | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<ProgramBuilderDraft>
    if (parsed.version !== DRAFT_VERSION || !Array.isArray(parsed.weeks)) return null

    return normalizeProgramDraft({
      version: DRAFT_VERSION,
      name: parsed.name || '',
      description: parsed.description || '',
      difficulty: parsed.difficulty || 'BEGINNER',
      isPublic: parsed.isPublic ?? true,
      weeks: parsed.weeks as ProgramBuilderWeek[],
      updatedAt: parsed.updatedAt || nowIso(),
    })
  } catch {
    return null
  }
}
