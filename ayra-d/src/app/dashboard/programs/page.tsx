'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ProgramRepository, type Program, type CalendarEvent } from '@/repositories/ProgramRepository'
import { WorkoutRepository, type WorkoutTemplate } from '@/repositories/WorkoutRepository'
import { useToast } from '@/providers/ToastProvider'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2, Crown, Check, X, Dumbbell, Trash2, Eye, Target } from 'lucide-react'
import { getWorkoutTypeConfig } from '@/lib/workoutTypes'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ProgramForgeBuilder } from '@/components/programs/ProgramForgeBuilder'
import { ProgramPreviewDrawer } from '@/components/programs/ProgramPreviewDrawer'
function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function ProgramsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const isPaid = user?.membership_tier === 'PAID' || user?.role === 'ADMIN'
  const isTrainer = user?.role === 'TRAINER' || user?.role === 'ADMIN'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [myPrograms, setMyPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [showDayPanel, setShowDayPanel] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [previewProgram, setPreviewProgram] = useState<Program | null>(null)
  const [enrollingProgramId, setEnrollingProgramId] = useState<string | null>(null)

  const loadCalendar = async () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const evts = await ProgramRepository.getCalendar(start.toISOString(), end.toISOString())
    setEvents(evts)
  }

  const loadPrograms = async () => {
    try {
      const [p, mp] = await Promise.all([ProgramRepository.listPrograms(), ProgramRepository.getMyPrograms()])
      setPrograms(p)
      setMyPrograms(mp)
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'load your programs' }))
    }
  }

  // Load templates when the calendar drawer or Program Forge needs them.
  useEffect(() => {
    if ((showDayPanel || showCreate) && templates.length === 0 && !templatesLoading) {
      setTemplatesLoading(true)
      WorkoutRepository.listTemplates()
        .then(setTemplates)
        .catch((err) => {
          console.error(err)
          toast(mapApiErrorToToast(err, { action: 'load workout templates' }))
        })
        .finally(() => setTemplatesLoading(false))
    }
  }, [showDayPanel, showCreate, templates.length, templatesLoading, toast])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadCalendar(), loadPrograms()]).finally(() => setLoading(false))
  }, [currentDate])

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate)
    const startDay = start.getDay()
    const days: Date[] = []
    for (let i = -startDay; i < 42 - startDay; i++) {
      days.push(addDays(start, i))
    }
    return days
  }, [currentDate])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach((evt) => {
      const key = formatDateKey(new Date(evt.date))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(evt)
    })
    return map
  }, [events])

  const enrolledIds = new Set(myPrograms.map((mp) => mp.program_id))

  // Handle scheduled workout actions
  const handleCompleteWorkout = async (eventId: string) => {
    setActionLoading(true)
    try {
      await WorkoutRepository.updateSchedule(eventId, { status: 'COMPLETED' })
      toast({ title: 'Workout marked complete!', variant: 'success' })
      loadCalendar()
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'update this workout' }))
    } finally {
      setActionLoading(false)
    }
  }

  const handleSkipWorkout = async (eventId: string) => {
    setActionLoading(true)
    try {
      await WorkoutRepository.updateSchedule(eventId, { status: 'SKIPPED' })
      toast({ title: 'Workout skipped', variant: 'success' })
      loadCalendar()
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'skip this workout' }))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteWorkout = async (eventId: string) => {
    setActionLoading(true)
    try {
      await WorkoutRepository.deleteSchedule(eventId)
      toast({ title: 'Workout removed', variant: 'success' })
      loadCalendar()
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'delete this workout' }))
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddWorkout = async (templateId: string) => {
    if (!selectedDate) return
    setActionLoading(true)
    try {
      await WorkoutRepository.createSchedule({
        template_id: templateId,
        scheduled_for: new Date(selectedDate).toISOString()
      })
      toast({ title: 'Workout scheduled!', variant: 'success' })
      loadCalendar()
      setShowDayPanel(false)
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'schedule this workout' }))
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnrollProgram = async (program: Program) => {
    setEnrollingProgramId(program.id)
    try {
      await ProgramRepository.enroll(program.id)
      toast({ title: 'Enrolled', variant: 'success' })
      await Promise.all([loadPrograms(), loadCalendar()])
      setPreviewProgram(null)
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'enroll in this program' }))
    } finally {
      setEnrollingProgramId(null)
    }
  }

  if (showCreate && isTrainer) {
    return (
      <ProgramForgeBuilder
        userId={user?.id}
        templates={templates}
        loadingTemplates={templatesLoading}
        onCancel={() => setShowCreate(false)}
        onPublished={() => {
          loadPrograms()
          loadCalendar()
          setShowCreate(false)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Programs</h1>
          <p className="text-sm text-gray-500">Enroll in structured training plans and view your calendar.</p>
        </div>
        {isTrainer && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-clean-accent text-white rounded-xl text-sm font-bold hover:bg-clean-accent flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Program Forge
          </button>
        )}
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-clean-accent" />
        </div>
      ) : (
        <>
          {/* Calendar */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="p-2 rounded-xl hover:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-sm font-bold hover:bg-gray-200"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="p-2 rounded-xl hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const key = formatDateKey(day)
                const dayEvents = eventsByDay.get(key) || []
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                const isToday = formatDateKey(new Date()) === key

                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedDate(key); setShowDayPanel(true); }}
                    className={`min-h-[100px] rounded-xl border p-2 text-left hover:ring-2 hover:ring-clean-accent/30 transition-all ${
                      isCurrentMonth ? 'bg-white border-gray-100' : 'bg-gray-50 border-transparent'
                    } ${isToday ? 'ring-2 ring-clean-accent/30' : ''}`}
                  >
                    <p className={`text-sm font-bold mb-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}`}>
                      {day.getDate()}
                    </p>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((evt, idx) => {
                        // Get workout type config for colorful badges
                        const typeConfig = evt.type === 'scheduled' && evt.template?.type 
                          ? getWorkoutTypeConfig(evt.template.type)
                          : null
                        
                        return (
                          <div
                            key={idx}
                            className={`text-[10px] truncate px-1.5 py-0.5 rounded ${
                              evt.type === 'program' 
                                ? 'bg-[#d7fb48]/40 text-gray-800' 
                                : typeConfig 
                                  ? `${typeConfig.bgColor} ${typeConfig.textColor}`
                                  : 'bg-clean-accent/10 text-clean-accent'
                            }`}
                          >
                            {evt.title}
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-gray-400">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Program browser */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Available programs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  enrolled={enrolledIds.has(program.id)}
                  isPaid={isPaid}
                  onPreview={() => setPreviewProgram(program)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Day Detail Panel - Full Workout Widget */}
      <AnimatePresence>
        {previewProgram && (
          <ProgramPreviewDrawer
            program={previewProgram}
            enrolled={enrolledIds.has(previewProgram.id)}
            isPaid={isPaid}
            enrolling={enrollingProgramId === previewProgram.id}
            onClose={() => setPreviewProgram(null)}
            onEnroll={() => handleEnrollProgram(previewProgram)}
          />
        )}
        {showDayPanel && selectedDate && (
          <DayDetailPanel
            date={selectedDate}
            events={eventsByDay.get(selectedDate) || []}
            onClose={() => { setShowDayPanel(false); setSelectedDate(null); }}
            onComplete={handleCompleteWorkout}
            onSkip={handleSkipWorkout}
            onDelete={handleDeleteWorkout}
            onAddWorkout={handleAddWorkout}
            loading={actionLoading}
            templates={templates}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ProgramCard({
  program,
  enrolled,
  isPaid,
  onPreview,
}: {
  program: Program
  enrolled: boolean
  isPaid: boolean
  onPreview: () => void
}) {
  const workoutCount = program.weeks.reduce((acc, week) => acc + week.workouts.length, 0)
  const weeklyCadence = program.weeks.length ? workoutCount / program.weeks.length : 0
  const previewWeeks = program.weeks.slice(0, 4)

  return (
    <div className="rounded-2xl border border-clean-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-clean-text">{program.name}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-clean-muted">
            {program.duration_weeks} weeks / {weeklyCadence.toFixed(weeklyCadence % 1 === 0 ? 0 : 1)} workouts per week
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-clean-bg px-2.5 py-1 text-[11px] font-black uppercase text-clean-muted">
          {program.difficulty}
        </span>
      </div>

      <p className="mb-4 line-clamp-2 text-sm leading-6 text-clean-muted">
        {program.description || 'A structured training arc ready to preview and enroll.'}
      </p>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-clean-bg p-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-clean-muted">
            <Target className="h-3.5 w-3.5" /> Load
          </div>
          <p className="mt-1 text-base font-black text-clean-text">{workoutCount}</p>
        </div>
        <div className="rounded-xl bg-clean-bg p-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-clean-muted">
            <CalendarDays className="h-3.5 w-3.5" /> Weeks
          </div>
          <p className="mt-1 text-base font-black text-clean-text">{program.duration_weeks}</p>
        </div>
        <div className="rounded-xl bg-[#d7fb48]/50 p-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-clean-text">
            <Eye className="h-3.5 w-3.5" /> Map
          </div>
          <p className="mt-1 text-base font-black text-clean-text">{program.weeks.length}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1.5 overflow-hidden">
        {previewWeeks.map((week) => (
          <div key={week.id} className="min-w-0 flex-1 rounded-lg bg-clean-bg p-2">
            <p className="text-[10px] font-black uppercase text-clean-muted">W{week.week_number}</p>
            <div className="mt-1 flex gap-1">
              {Array.from({ length: Math.min(week.workouts.length, 4) }).map((_, index) => (
                <span key={index} className="h-1.5 flex-1 rounded-full bg-clean-accent" />
              ))}
              {week.workouts.length === 0 && <span className="h-1.5 flex-1 rounded-full bg-clean-border" />}
            </div>
          </div>
        ))}
      </div>

      {enrolled ? (
        <div className="flex w-fit items-center gap-2 rounded-xl bg-black px-3 py-2 text-sm font-bold text-[#d7fb48]">
          <Check className="w-4 h-4" /> Enrolled
        </div>
      ) : isPaid ? (
        <button
          onClick={onPreview}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-clean-accent px-4 py-2.5 text-sm font-black text-white hover:bg-clean-accent"
        >
          <Eye className="h-4 w-4" /> Preview plan
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs font-bold text-clean-muted">
          <Crown className="w-3.5 h-3.5" /> Paid feature
        </div>
      )}
    </div>
  )
}

// Day Detail Panel Component - slide-over for day actions
interface DayDetailPanelProps {
  date: string
  events: CalendarEvent[]
  onClose: () => void
  onComplete: (eventId: string) => void
  onSkip: (eventId: string) => void
  onDelete: (eventId: string) => void
  onAddWorkout: (templateId: string) => void
  loading: boolean
  templates: WorkoutTemplate[]
}

function DayDetailPanel({ date, events, onClose, onComplete, onSkip, onDelete, onAddWorkout, loading, templates }: DayDetailPanelProps) {
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [showQuickBuilder, setShowQuickBuilder] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickType, setQuickType] = useState('PUSH')
  const [quickDuration, setQuickDuration] = useState(45)
  
  const dateObj = new Date(date + 'T00:00:00')
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const scheduledEvents = events.filter(e => e.type === 'scheduled')
  const programEvents = events.filter(e => e.type === 'program')
  
  const workoutTypes = [
    { value: 'PUSH', label: 'Push', color: 'bg-red-50 text-red-600' },
    { value: 'PULL', label: 'Pull', color: 'bg-blue-50 text-blue-600' },
    { value: 'LEGS', label: 'Legs', color: 'bg-purple-50 text-purple-600' },
    { value: 'UPPER', label: 'Upper', color: 'bg-orange-50 text-orange-600' },
    { value: 'LOWER', label: 'Lower', color: 'bg-pink-50 text-pink-600' },
    { value: 'FULL_BODY', label: 'Full Body', color: 'bg-emerald-50 text-emerald-600' },
    { value: 'CARDIO', label: 'Cardio', color: 'bg-cyan-50 text-cyan-600' },
    { value: 'REST', label: 'Rest', color: 'bg-slate-50 text-slate-600' },
    { value: 'CUSTOM', label: 'Custom', color: 'bg-yellow-50 text-yellow-600' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-lg">{dayName}</h3>
            <p className="text-sm text-gray-500">{dateStr}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Scheduled Workouts */}
          {scheduledEvents.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Workouts</h4>
              <div className="space-y-2">
                {scheduledEvents.map(evt => {
                  const typeConfig = evt.template?.type ? getWorkoutTypeConfig(evt.template.type) : null
                  const Icon = typeConfig?.icon || Dumbbell
                  
                  return (
                    <div key={evt.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        {typeConfig && (
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeConfig.bgColor)}>
                            <Icon className={cn('w-5 h-5', typeConfig.textColor)} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{evt.title}</div>
                          <div className="text-xs text-gray-500">
                            {evt.template?.type && typeConfig?.label}
                            {evt.status && <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100">{evt.status}</span>}
                          </div>
                        </div>
                      </div>
                      {evt.status === 'SCHEDULED' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => onComplete(evt.id)}
                            disabled={loading}
                            className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => onSkip(evt.id)}
                            disabled={loading}
                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => onDelete(evt.id)}
                            disabled={loading}
                            className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Program Events */}
          {programEvents.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Program Workouts</h4>
              <div className="space-y-2">
                {programEvents.map(evt => (
                  <div key={evt.id} className="bg-[#d7fb48]/20 border border-[#d7fb48]/30 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">{evt.title}</div>
                    </div>
                    {evt.programName && (
                      <div className="text-xs text-gray-500 mt-1">{evt.programName}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No events message */}
          {events.length === 0 && (
            <div className="text-center py-8">
              <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No workouts scheduled</p>
            </div>
          )}

          {/* Add Workout Section */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            {!showAddTemplate && !showQuickBuilder ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowAddTemplate(true)}
                  className="py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-clean-accent hover:text-clean-accent transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  From Template
                </button>
                <button
                  onClick={() => setShowQuickBuilder(true)}
                  className="py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-clean-accent hover:text-clean-accent transition-colors flex items-center justify-center gap-2"
                >
                  <Dumbbell className="w-4 h-4" />
                  Quick Create
                </button>
              </div>
            ) : showAddTemplate ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Select Template</h4>
                  <button onClick={() => setShowAddTemplate(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No templates available</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {templates.map(template => {
                      const typeConfig = getWorkoutTypeConfig(template.type)
                      const Icon = typeConfig.icon
                      
                      return (
                        <button
                          key={template.id}
                          onClick={() => onAddWorkout(template.id)}
                          disabled={loading}
                          className="w-full p-3 border border-gray-100 rounded-xl text-left hover:border-clean-accent/30 hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
                        >
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeConfig.bgColor)}>
                            <Icon className={cn('w-5 h-5', typeConfig.textColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{ template.name }</div>
                            <div className="text-xs text-gray-500">{typeConfig.label}</div>
                          </div>
                          <Plus className="w-4 h-4 text-gray-400" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : showQuickBuilder ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Quick Create Workout</h4>
                  <button onClick={() => setShowQuickBuilder(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Workout Name</label>
                    <input
                      type="text"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      placeholder="e.g., Morning Push"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                    <select
                      value={quickType}
                      onChange={(e) => setQuickType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                    >
                      {workoutTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={quickDuration}
                      onChange={(e) => setQuickDuration(parseInt(e.target.value) || 45)}
                      min={5}
                      max={180}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      if (quickName.trim()) {
                        // Quick create - would call onAddWorkout with new template
                        // For now just close and show success
                        setShowQuickBuilder(false)
                        setQuickName('')
                      }
                    }}
                    disabled={!quickName.trim() || loading}
                    className="w-full py-2.5 bg-clean-accent text-white rounded-xl font-medium text-sm hover:bg-clean-accent disabled:opacity-50"
                  >
                    Create Workout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
