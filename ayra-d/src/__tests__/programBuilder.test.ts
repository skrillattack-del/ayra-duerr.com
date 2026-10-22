import { describe, expect, it } from 'vitest'
import {
  addProgramWeek,
  addTemplateToProgramDraft,
  autoFillProgramSplit,
  canRemoveProgramWeek,
  createEmptyProgramDraft,
  moveProgramWorkout,
  parseStoredProgramDraft,
  programDraftToCreatePayload,
  removeProgramWeek,
  serializeProgramDraft,
  validateProgramDraft,
} from '@/lib/programBuilder'
import type { WorkoutTemplate } from '@/repositories/WorkoutRepository'

function template(id: string, type: string): WorkoutTemplate {
  return {
    id,
    user_id: 'user-1',
    name: `${type} Template`,
    type,
    exercises: [
      {
        exercise_id: `${id}-exercise`,
        exercise_name: `${type} Exercise`,
        order_index: 0,
        sets: [{ reps: 10, weight: 0, unit: 'LBS' }],
      },
    ],
    is_public: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

const templates = [
  template('push-1', 'PUSH'),
  template('pull-1', 'PULL'),
  template('legs-1', 'LEGS'),
  template('full-1', 'FULL_BODY'),
  template('cardio-1', 'CARDIO'),
]

describe('programBuilder helpers', () => {
  it('creates a normalized default draft', () => {
    const draft = createEmptyProgramDraft()

    expect(draft.version).toBe(1)
    expect(draft.name).toBe('Foundations of Power')
    expect(draft.difficulty).toBe('INTERMEDIATE')
    expect(draft.weeks).toHaveLength(1)
    expect(draft.weeks[0].weekNumber).toBe(1)
  })

  it('adds and removes only empty weeks', () => {
    const draft = addProgramWeek(createEmptyProgramDraft())
    const secondWeekId = draft.weeks[1].id

    expect(draft.weeks).toHaveLength(2)
    expect(canRemoveProgramWeek(draft, secondWeekId)).toBe(true)
    expect(removeProgramWeek(draft, secondWeekId).weeks).toHaveLength(1)

    const withWorkout = addTemplateToProgramDraft(draft, 'push-1', secondWeekId, 1)
    expect(canRemoveProgramWeek(withWorkout, secondWeekId)).toBe(false)
    expect(removeProgramWeek(withWorkout, secondWeekId).weeks).toHaveLength(2)
  })

  it('moves workouts across weeks and days', () => {
    const draft = addProgramWeek(createEmptyProgramDraft())
    const firstWeekId = draft.weeks[0].id
    const secondWeekId = draft.weeks[1].id
    const withWorkout = addTemplateToProgramDraft(draft, 'push-1', firstWeekId, 1)
    const workoutId = withWorkout.weeks[0].workouts[0].id
    const moved = moveProgramWorkout(withWorkout, workoutId, secondWeekId, 4)

    expect(moved.weeks[0].workouts).toHaveLength(0)
    expect(moved.weeks[1].workouts).toMatchObject([{ id: workoutId, templateId: 'push-1', dayOfWeek: 4 }])
  })

  it('inserts moved workouts at a target day index', () => {
    const draft = createEmptyProgramDraft()
    const weekId = draft.weeks[0].id
    const withFirst = addTemplateToProgramDraft(draft, 'push-1', weekId, 1)
    const withSecond = addTemplateToProgramDraft(withFirst, 'pull-1', weekId, 1)
    const secondId = withSecond.weeks[0].workouts[1].id
    const moved = moveProgramWorkout(withSecond, secondId, weekId, 1, 0)

    expect(moved.weeks[0].workouts.map((workout) => workout.templateId)).toEqual(['pull-1', 'push-1'])
    expect(moved.weeks[0].workouts.map((workout) => workout.orderIndex)).toEqual([0, 1])
  })

  it('auto-fills a deterministic split and reports missing types', () => {
    const draft = createEmptyProgramDraft({ weeks: createEmptyProgramDraft().weeks.concat({
      id: 'week-2',
      weekNumber: 2,
      focus: 'Week 2',
      workouts: [],
    }) })
    const result = autoFillProgramSplit(draft, templates.filter((item) => item.type !== 'CARDIO'))

    expect(result.draft.weeks).toHaveLength(2)
    expect(result.draft.weeks[0].workouts.map((workout) => workout.dayOfWeek)).toEqual([1, 2, 3, 5])
    expect(result.missingTypes).toContain('Cardio')
  })

  it('validates required fields and missing template references', () => {
    const emptyDraft = createEmptyProgramDraft({ name: '' })
    const draft = addTemplateToProgramDraft(emptyDraft, 'missing-template', emptyDraft.weeks[0].id, 1)
    const validation = validateProgramDraft(draft, templates)

    expect(validation.errors).toContain('Program name is required.')
    expect(validation.errors).toContain('Remove workouts that reference missing templates.')
    expect(validation.invalidTemplateIds).toEqual(['missing-template'])
  })

  it('converts a draft into the create program API payload', () => {
    const draft = createEmptyProgramDraft({
      name: '  Power Arc  ',
      description: '  Four weeks  ',
      isPublic: true,
    })
    const withWorkout = addTemplateToProgramDraft(draft, 'push-1', draft.weeks[0].id, 1)
    const payload = programDraftToCreatePayload(withWorkout)

    expect(payload).toMatchObject({
      name: 'Power Arc',
      description: 'Four weeks',
      duration_weeks: 1,
      difficulty: 'INTERMEDIATE',
      is_public: true,
    })
    expect(payload.weeks[0].workouts[0]).toMatchObject({
      template_id: 'push-1',
      day_of_week: 1,
      order_index: 0,
    })
  })

  it('round-trips local draft serialization safely', () => {
    const draft = createEmptyProgramDraft()

    expect(parseStoredProgramDraft(serializeProgramDraft(draft))?.name).toBe(draft.name)
    expect(parseStoredProgramDraft('{bad json')).toBeNull()
    expect(parseStoredProgramDraft(JSON.stringify({ version: 999, weeks: [] }))).toBeNull()
  })
})
