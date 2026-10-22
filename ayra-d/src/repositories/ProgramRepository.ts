import apiClient from '@/lib/apiClient'
import { WorkoutTemplate } from './WorkoutRepository'

export interface ProgramWeekWorkout {
  id: string
  week_id: string
  template_id: string
  template: WorkoutTemplate
  day_of_week: number
  order_index: number
  notes?: string
}

export interface ProgramWeek {
  id: string
  program_id: string
  week_number: number
  focus?: string
  workouts: ProgramWeekWorkout[]
}

export interface Program {
  id: string
  user_id?: string
  name: string
  description?: string
  duration_weeks: number
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  is_public: boolean
  is_active: boolean
  weeks: ProgramWeek[]
  created_at: string
  updated_at: string
  _count?: { enrollments: number }
}

export interface CalendarEvent {
  id: string
  type: 'scheduled' | 'program'
  date: string
  title: string
  template?: WorkoutTemplate
  status?: string
  programName?: string
  week?: number
}

export const ProgramRepository = {
  async listPrograms(): Promise<Program[]> {
    const res = await apiClient.get<{ programs: Program[] }>('/api/programs')
    return res.programs
  },

  async createProgram(data: {
    name: string
    description?: string
    duration_weeks: number
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    is_public?: boolean
    weeks: Array<{
      week_number: number
      focus?: string
      workouts: Array<{ template_id: string; day_of_week: number; order_index?: number; notes?: string }>
    }>
  }): Promise<Program> {
    const res = await apiClient.post<{ program: Program }>('/api/programs', data)
    return res.program
  },

  async enroll(programId: string): Promise<any> {
    return apiClient.post(`/api/programs/${programId}/enroll`, {})
  },

  async getMyPrograms(): Promise<any[]> {
    const res = await apiClient.get<{ enrollments: any[] }>('/api/programs/my')
    return res.enrollments
  },

  async getCalendar(start: string, end: string): Promise<CalendarEvent[]> {
    const res = await apiClient.get<{ events: CalendarEvent[] }>(
      `/api/programs/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    )
    return res.events
  },
}
