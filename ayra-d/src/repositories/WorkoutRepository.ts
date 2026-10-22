import apiClient from '@/lib/apiClient'

export interface TemplateExerciseSet {
  reps?: number
  weight?: number
  unit?: 'LBS' | 'KG'
  rpe?: number
  rest_seconds?: number
  duration_seconds?: number
  distance?: number
  distance_unit?: string
}

export interface TemplateExercise {
  exercise_id: string
  exercise_name: string
  order_index: number
  sets: TemplateExerciseSet[]
  notes?: string
}

export interface WorkoutTemplate {
  id: string
  user_id: string
  name: string
  description?: string
  type: string
  exercises: TemplateExercise[]
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ScheduledWorkout {
  id: string
  user_id: string
  template_id?: string
  template?: WorkoutTemplate
  scheduled_for: string
  day_of_week?: number
  is_recurring: boolean
  status: string
  started_at?: string
  completed_at?: string
  custom_name?: string
}

export interface InstanceExerciseSet {
  set_number: number
  reps?: number
  weight?: number
  unit?: 'LBS' | 'KG'
  rpe?: number
  duration_seconds?: number
  distance?: number
  distance_unit?: string
  is_completed?: boolean
  notes?: string
}

export interface InstanceExercise {
  exercise_id: string
  exercise_name: string
  order_index: number
  notes?: string
  sets: InstanceExerciseSet[]
}

export interface WorkoutInstance {
  id: string
  user_id: string
  template_id?: string
  template?: WorkoutTemplate
  scheduled_workout_id?: string
  name: string
  type: string
  started_at: string
  completed_at?: string
  duration_seconds?: number
  notes?: string
  exercises: Array<{
    id: string
    exercise_id: string
    exercise_name: string
    order_index: number
    notes?: string
    sets: Array<InstanceExerciseSet & { id: string }>
  }>
}

export const WorkoutRepository = {
  async listTemplates(): Promise<WorkoutTemplate[]> {
    const res = await apiClient.get<{ templates: WorkoutTemplate[] }>('/api/workouts/templates')
    return res.templates
  },

  async createTemplate(data: {
    name: string
    description?: string
    type: string
    exercises: TemplateExercise[]
    is_public?: boolean
  }): Promise<WorkoutTemplate> {
    const res = await apiClient.post<{ template: WorkoutTemplate }>('/api/workouts/templates', data)
    return res.template
  },

  async updateTemplate(id: string, data: Partial<Omit<WorkoutTemplate, 'id'>>): Promise<WorkoutTemplate> {
    const res = await apiClient.put<{ template: WorkoutTemplate }>(`/api/workouts/templates/${id}`, data)
    return res.template
  },

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/api/workouts/templates/${id}`)
  },

  async listSchedule(start: string, end: string): Promise<ScheduledWorkout[]> {
    const res = await apiClient.get<{ schedule: ScheduledWorkout[] }>(
      `/api/workouts/schedule?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    )
    return res.schedule
  },

  async createSchedule(data: {
    template_id?: string
    scheduled_for: string
    day_of_week?: number
    is_recurring?: boolean
    custom_name?: string
  }): Promise<ScheduledWorkout> {
    const res = await apiClient.post<{ scheduled: ScheduledWorkout }>('/api/workouts/schedule', data)
    return res.scheduled
  },

  async deleteSchedule(id: string): Promise<void> {
    await apiClient.delete(`/api/workouts/schedule/${id}`)
  },

  async updateSchedule(id: string, updates: {
    scheduled_for?: string
    status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'RESCHEDULED'
    started_at?: string
    completed_at?: string
    custom_name?: string
  }): Promise<ScheduledWorkout> {
    const res = await apiClient.patch<{ scheduled: ScheduledWorkout }>(`/api/workouts/schedule/${id}`, updates)
    return res.scheduled
  },

  async listInstances(limit = 20, offset = 0): Promise<{ instances: WorkoutInstance[]; total: number }> {
    const res = await apiClient.get<{ instances: WorkoutInstance[]; total: number }>(
      `/api/workouts?limit=${limit}&offset=${offset}`
    )
    return res
  },

  async createInstance(data: {
    template_id?: string
    scheduled_workout_id?: string
    name: string
    type: string
    duration_seconds?: number
    notes?: string
    exercises: InstanceExercise[]
  }): Promise<WorkoutInstance> {
    const res = await apiClient.post<{ instance: WorkoutInstance }>('/api/workouts', data)
    return res.instance
  },
}
