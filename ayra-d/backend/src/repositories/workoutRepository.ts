import prisma from '../db/client';
import { Prisma } from '@prisma/client';

export interface TemplateExercise {
  exercise_id: string;
  exercise_name: string;
  order_index: number;
  sets: Array<{
    reps?: number;
    weight?: number;
    unit?: 'LBS' | 'KG';
    rpe?: number;
    rest_seconds?: number;
    duration_seconds?: number;
    distance?: number;
    distance_unit?: string;
  }>;
  notes?: string;
}

export interface CreateWorkoutTemplateDTO {
  user_id: string;
  name: string;
  description?: string;
  type: string;
  exercises: TemplateExercise[];
  is_public?: boolean;
}

export interface UpdateWorkoutTemplateDTO {
  name?: string;
  description?: string;
  type?: string;
  exercises?: TemplateExercise[];
  is_public?: boolean;
  is_active?: boolean;
}

export interface CreateScheduledWorkoutDTO {
  user_id: string;
  template_id?: string;
  scheduled_for: Date;
  day_of_week?: number;
  is_recurring?: boolean;
  custom_name?: string;
}

export interface UpdateScheduledWorkoutDTO {
  scheduled_for?: Date;
  status?: string;
  started_at?: Date;
  completed_at?: Date;
  custom_name?: string;
}

export interface CreateWorkoutInstanceDTO {
  user_id: string;
  template_id?: string;
  scheduled_workout_id?: string;
  name: string;
  type: string;
  duration_seconds?: number;
  notes?: string;
  exercises: Array<{
    exercise_id: string;
    exercise_name: string;
    order_index: number;
    notes?: string;
    sets: Array<{
      set_number: number;
      reps?: number;
      weight?: number;
      unit?: 'LBS' | 'KG';
      rpe?: number;
      duration_seconds?: number;
      distance?: number;
      distance_unit?: string;
      is_completed?: boolean;
      notes?: string;
    }>;
  }>;
}

const templateSelect = {
  id: true,
  user_id: true,
  name: true,
  description: true,
  type: true,
  exercises: true,
  is_public: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

const validWorkoutTypes = new Set([
  'PUSH',
  'PULL',
  'LEGS',
  'UPPER',
  'LOWER',
  'FULL_BODY',
  'CARDIO',
  'REST',
  'CUSTOM',
]);

function normalizeWorkoutType(type: string): string {
  const normalized = type.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (validWorkoutTypes.has(normalized)) return normalized;
  if (['STRENGTH', 'WORKOUT', 'HIIT', 'YOGA', 'CYCLING'].includes(normalized)) return 'CUSTOM';
  return 'CUSTOM';
}

export const workoutRepository = {
  // Templates
  async listTemplates(userId: string, includePublic = false) {
    return prisma.workoutTemplate.findMany({
      where: {
        is_active: true,
        OR: includePublic
          ? [{ user_id: userId }, { is_public: true }]
          : [{ user_id: userId }],
      },
      orderBy: [{ is_public: 'asc' }, { updated_at: 'desc' }],
      select: templateSelect,
    });
  },

  async findTemplateById(id: string) {
    return prisma.workoutTemplate.findUnique({
      where: { id },
      select: templateSelect,
    });
  },

  async createTemplate(data: CreateWorkoutTemplateDTO) {
    return prisma.workoutTemplate.create({
      data: {
        user_id: data.user_id,
        name: data.name,
        description: data.description,
        type: normalizeWorkoutType(data.type) as any,
        exercises: data.exercises as unknown as Prisma.JsonArray,
        is_public: data.is_public || false,
      },
      select: templateSelect,
    });
  },

  async updateTemplate(id: string, userId: string, data: UpdateWorkoutTemplateDTO) {
    return prisma.workoutTemplate.updateMany({
      where: { id, user_id: userId },
      data: {
        name: data.name,
        description: data.description,
        type: data.type ? (normalizeWorkoutType(data.type) as any) : undefined,
        exercises: data.exercises ? (data.exercises as unknown as Prisma.JsonArray) : undefined,
        is_public: data.is_public,
        is_active: data.is_active,
      },
    });
  },

  async deleteTemplate(id: string, userId: string) {
    return prisma.workoutTemplate.updateMany({
      where: { id, user_id: userId },
      data: { is_active: false },
    });
  },

  // Scheduled workouts
  async listScheduledWorkouts(userId: string, start: Date, end: Date) {
    return prisma.scheduledWorkout.findMany({
      where: {
        user_id: userId,
        scheduled_for: { gte: start, lte: end },
      },
      include: { template: { select: templateSelect } },
      orderBy: { scheduled_for: 'asc' },
    });
  },

  async createScheduledWorkout(data: CreateScheduledWorkoutDTO) {
    return prisma.scheduledWorkout.create({
      data: {
        user_id: data.user_id,
        template_id: data.template_id,
        scheduled_for: data.scheduled_for,
        day_of_week: data.day_of_week,
        is_recurring: data.is_recurring || false,
        custom_name: data.custom_name,
      },
      include: { template: { select: templateSelect } },
    });
  },

  async updateScheduledWorkout(id: string, userId: string, data: UpdateScheduledWorkoutDTO) {
    return prisma.scheduledWorkout.updateMany({
      where: { id, user_id: userId },
      data: {
        scheduled_for: data.scheduled_for,
        status: data.status as any,
        started_at: data.started_at,
        completed_at: data.completed_at,
        custom_name: data.custom_name,
      },
    });
  },

  async deleteScheduledWorkout(id: string, userId: string) {
    return prisma.scheduledWorkout.deleteMany({
      where: { id, user_id: userId },
    });
  },

  // Workout instances (logged workouts)
  async listInstances(userId: string, limit = 50, offset = 0) {
    return prisma.workoutInstance.findMany({
      where: { user_id: userId },
      include: {
        template: { select: templateSelect },
        exercises: { include: { sets: true } },
      },
      orderBy: { started_at: 'desc' },
      take: limit,
      skip: offset,
    });
  },

  async countInstances(userId: string) {
    return prisma.workoutInstance.count({ where: { user_id: userId } });
  },

  async createInstance(data: CreateWorkoutInstanceDTO) {
    return prisma.workoutInstance.create({
      data: {
        user_id: data.user_id,
        template_id: data.template_id,
        scheduled_workout_id: data.scheduled_workout_id,
        name: data.name,
        type: normalizeWorkoutType(data.type) as any,
        duration_seconds: data.duration_seconds,
        notes: data.notes,
        exercises: {
          create: data.exercises.map((ex) => ({
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            order_index: ex.order_index,
            notes: ex.notes,
            sets: {
              create: ex.sets.map((set) => ({
                set_number: set.set_number,
                reps: set.reps,
                weight: set.weight,
                unit: set.unit || 'LBS',
                rpe: set.rpe,
                duration_seconds: set.duration_seconds,
                distance: set.distance,
                distance_unit: set.distance_unit,
                is_completed: set.is_completed ?? true,
                notes: set.notes,
              })),
            },
          })),
        },
      },
      include: {
        template: { select: templateSelect },
        exercises: { include: { sets: true } },
      },
    });
  },
};
