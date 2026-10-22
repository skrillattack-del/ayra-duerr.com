'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { WorkoutRepository, type WorkoutTemplate, type TemplateExercise, type WorkoutInstance } from '@/repositories/WorkoutRepository'
import { ALL_EXERCISES, EXERCISE_MAP, type Exercise } from '@/lib/exercises'
import { useToast } from '@/providers/ToastProvider'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import {
  Dumbbell,
  Library,
  ListTodo,
  Clock,
  Search,
  Plus,
  Trash2,
  Save,
  Play,
  Check,
  X,
  Flame,
  Loader2,
} from 'lucide-react'

export default function WorkoutsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'library' | 'builder' | 'log' | 'history'>('library')
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [instances, setInstances] = useState<WorkoutInstance[]>([])
  const [loading, setLoading] = useState(true)

  const isPaid = user?.membership_tier === 'PAID' || user?.role === 'ADMIN'

  const loadData = async () => {
    try {
      const [t, i] = await Promise.all([
        WorkoutRepository.listTemplates(),
        WorkoutRepository.listInstances(20, 0),
      ])
      setTemplates(t)
      setInstances(i.instances)
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'load your workouts' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const refresh = () => loadData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-sm text-gray-500">Build, schedule, and log any style of training.</p>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 w-fit">
        {[
          { id: 'library', label: 'Library', icon: Library },
          { id: 'builder', label: 'Builder', icon: Dumbbell },
          { id: 'log', label: 'Log', icon: ListTodo },
          { id: 'history', label: 'History', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === tab.id ? 'bg-clean-accent text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-clean-accent" />
        </div>
      ) : (
        <>
          {activeTab === 'library' && <LibraryView templates={templates} isPaid={isPaid} onChange={refresh} />}
          {activeTab === 'builder' && <BuilderView templates={templates} isPaid={isPaid} onSaved={refresh} />}
          {activeTab === 'log' && <LogView templates={templates} onLogged={refresh} />}
          {activeTab === 'history' && <HistoryView instances={instances} />}
        </>
      )}
    </div>
  )
}

// Library view
function LibraryView({ templates, isPaid, onChange }: { templates: WorkoutTemplate[]; isPaid: boolean; onChange: () => void }) {
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    try {
      await WorkoutRepository.deleteTemplate(id)
      toast({ title: 'Template deleted', variant: "success" })
      onChange()
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'delete this template' }))
    }
  }

  const personal = templates.filter((t) => !t.is_public)
  const publicTemplates = templates.filter((t) => t.is_public)

  return (
    <div className="space-y-6">
      {!isPaid && personal.length >= 3 && (
        <div className="bg-[#d7fb48] rounded-2xl p-4 text-sm font-semibold">
          Free users are limited to 3 personal templates. Upgrade to Paid for unlimited templates.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personal.map((t) => (
          <TemplateCard key={t.id} template={t} onDelete={handleDelete} />
        ))}
      </div>

      {isPaid && publicTemplates.length > 0 && (
        <>
          <h3 className="font-bold text-lg mt-8">Public templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicTemplates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TemplateCard({ template, onDelete }: { template: WorkoutTemplate; onDelete?: (id: string) => void }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold">{template.name}</h3>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{template.type}</p>
        </div>
        {template.is_public && <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-full">Public</span>}
      </div>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description || 'No description'}</p>
      <div className="space-y-1 mb-4">
        {template.exercises.slice(0, 3).map((ex) => (
          <div key={ex.exercise_id} className="text-sm text-gray-700 flex justify-between">
            <span>{ex.exercise_name}</span>
            <span className="text-gray-400">{ex.sets.length} sets</span>
          </div>
        ))}
        {template.exercises.length > 3 && (
          <p className="text-xs text-gray-400">+{template.exercises.length - 3} more</p>
        )}
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(template.id)}
          className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      )}
    </div>
  )
}

// Builder view
function BuilderView({ templates, isPaid, onSaved }: { templates: WorkoutTemplate[]; isPaid: boolean; onSaved: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState('Strength')
  const [description, setDescription] = useState('')
  const [exercises, setExercises] = useState<TemplateExercise[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isPublic, setIsPublic] = useState(false)

  const addExercise = (exercise: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        order_index: prev.length,
        sets: [{ reps: exercise.trackingType.includes('reps') ? 10 : undefined, weight: 0, unit: 'LBS' }],
        notes: '',
      },
    ])
    setShowPicker(false)
  }

  const updateSet = (exIndex: number, setIndex: number, field: keyof TemplateExercise['sets'][0], value: any) => {
    setExercises((prev) => {
      const next = [...prev]
      next[exIndex].sets[setIndex] = { ...next[exIndex].sets[setIndex], [field]: value }
      return next
    })
  }

  const addSet = (exIndex: number) => {
    setExercises((prev) => {
      const next = [...prev]
      next[exIndex].sets.push({ reps: 10, weight: 0, unit: 'LBS' })
      return next
    })
  }

  const removeSet = (exIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const next = [...prev]
      next[exIndex].sets = next[exIndex].sets.filter((_, i) => i !== setIndex)
      return next
    })
  }

  const removeExercise = (exIndex: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIndex))
  }

  const handleSave = async () => {
    if (!name.trim()) return toast({ title: 'Enter a workout name', variant: "destructive" })
    if (exercises.length === 0) return toast({ title: 'Add at least one exercise', variant: "destructive" })

    setSaving(true)
    try {
      await WorkoutRepository.createTemplate({
        name,
        type,
        description,
        exercises: exercises.map((ex, i) => ({ ...ex, order_index: i })),
        is_public: isPaid ? isPublic : false,
      })
      toast({ title: 'Template saved', variant: "success" })
      setName('')
      setType('Strength')
      setDescription('')
      setExercises([])
      setIsPublic(false)
      onSaved()
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'save this template' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workout name"
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-clean-accent/30"
        />
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Type (e.g. Push, Pull, Legs, HIIT)"
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-clean-accent/30"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="md:col-span-2 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-clean-accent/30 min-h-[80px]"
        />
      </div>

      {isPaid && (
        <label className="flex items-center gap-2 mb-6 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Make this template public
        </label>
      )}

      <div className="space-y-4 mb-6">
        {exercises.map((ex, exIndex) => (
          <div key={exIndex} className="border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold">{ex.exercise_name}</h4>
              <button onClick={() => removeExercise(exIndex)} className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {ex.sets.map((set, setIndex) => (
                <div key={setIndex} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-12">Set {setIndex + 1}</span>
                  <input
                    type="number"
                    placeholder="reps"
                    value={set.reps || ''}
                    onChange={(e) => updateSet(exIndex, setIndex, 'reps', parseInt(e.target.value) || undefined)}
                    className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  />
                  <span className="text-gray-400">×</span>
                  <input
                    type="number"
                    placeholder="weight"
                    value={set.weight || ''}
                    onChange={(e) => updateSet(exIndex, setIndex, 'weight', parseFloat(e.target.value) || undefined)}
                    className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  />
                  <select
                    value={set.unit || 'LBS'}
                    onChange={(e) => updateSet(exIndex, setIndex, 'unit', e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  >
                    <option value="LBS">lbs</option>
                    <option value="KG">kg</option>
                  </select>
                  <input
                    type="number"
                    placeholder="RPE"
                    value={set.rpe || ''}
                    onChange={(e) => updateSet(exIndex, setIndex, 'rpe', parseFloat(e.target.value) || undefined)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  />
                  <button onClick={() => removeSet(exIndex, setIndex)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addSet(exIndex)}
              className="mt-3 text-xs font-bold text-clean-accent flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add set
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowPicker(true)}
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add exercise
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-clean-accent text-white rounded-xl text-sm font-bold hover:bg-clean-accent disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save template
        </button>
      </div>

      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />}
    </div>
  )
}

function ExercisePicker({ onSelect, onClose }: { onSelect: (ex: Exercise) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return ALL_EXERCISES.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
        ex.equipment.some((e) => e.toLowerCase().includes(q))
    ).slice(0, 50)
  }, [search])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises by name, muscle, or equipment"
            className="flex-1 focus:outline-none"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-2">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="w-full text-left p-4 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{ex.name}</span>
                <span className="text-xs text-gray-400 uppercase">{ex.trackingType.replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{ex.primaryMuscles.join(', ')}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Log view
function LogView({ templates, onLogged }: { templates: WorkoutTemplate[]; onLogged: () => void }) {
  const { toast } = useToast()
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('Workout')
  const [exercises, setExercises] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [timer, setTimer] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (running) interval = setInterval(() => setTimer((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [running])

  const loadTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    setName(t.name)
    setType(t.type)
    setExercises(
      t.exercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        order_index: ex.order_index,
        sets: ex.sets.map((s, i) => ({
          set_number: i + 1,
          reps: s.reps,
          weight: s.weight,
          unit: s.unit || 'LBS',
          rpe: s.rpe,
          is_completed: false,
        })),
      }))
    )
  }

  const toggleSet = (exIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const next = [...prev]
      next[exIndex].sets[setIndex].is_completed = !next[exIndex].sets[setIndex].is_completed
      return next
    })
  }

  const updateSetValue = (exIndex: number, setIndex: number, field: string, value: any) => {
    setExercises((prev) => {
      const next = [...prev]
      next[exIndex].sets[setIndex][field] = value
      return next
    })
  }

  const handleLog = async () => {
    if (!name.trim()) return toast({ title: 'Enter a workout name', variant: "destructive" })
    if (exercises.length === 0) return toast({ title: 'Add at least one exercise', variant: "destructive" })

    setSaving(true)
    try {
      await WorkoutRepository.createInstance({
        template_id: selectedTemplateId || undefined,
        name,
        type,
        duration_seconds: timer,
        exercises,
      })
      toast({ title: 'Workout logged', variant: "success" })
      setName('')
      setType('Workout')
      setExercises([])
      setSelectedTemplateId('')
      setTimer(0)
      setRunning(false)
      onLogged()
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'log this workout' }))
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={selectedTemplateId}
          onChange={(e) => {
            setSelectedTemplateId(e.target.value)
            if (e.target.value) loadTemplate(e.target.value)
          }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-clean-accent/30"
        >
          <option value="">Freestyle workout</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workout name"
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-clean-accent/30"
        />
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Type"
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-clean-accent/30"
        />
        <div className="flex items-center gap-2 ml-auto">
          <div className="px-4 py-2 rounded-xl bg-gray-100 font-mono font-bold">{formatTime(timer)}</div>
          <button
            onClick={() => setRunning((r) => !r)}
            className={`p-2.5 rounded-xl ${running ? 'bg-red-100 text-red-600' : 'bg-[#d7fb48] text-black'}`}
          >
            {running ? <Clock className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {exercises.map((ex, exIndex) => (
          <div key={exIndex} className="border border-gray-100 rounded-2xl p-4">
            <h4 className="font-bold mb-3">{ex.exercise_name}</h4>
            <div className="space-y-2">
              {ex.sets.map((set: any, setIndex: number) => (
                <div key={setIndex} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSet(exIndex, setIndex)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      set.is_completed ? 'bg-[#d7fb48] text-black' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {set.is_completed && <Check className="w-4 h-4" />}
                  </button>
                  <span className="text-xs font-bold text-gray-400 w-12">Set {set.set_number}</span>
                  <input
                    type="number"
                    value={set.reps || ''}
                    onChange={(e) => updateSetValue(exIndex, setIndex, 'reps', parseInt(e.target.value) || undefined)}
                    placeholder="reps"
                    className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  />
                  <span className="text-gray-400">×</span>
                  <input
                    type="number"
                    value={set.weight || ''}
                    onChange={(e) => updateSetValue(exIndex, setIndex, 'weight', parseFloat(e.target.value) || undefined)}
                    placeholder="weight"
                    className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  />
                  <select
                    value={set.unit || 'LBS'}
                    onChange={(e) => updateSetValue(exIndex, setIndex, 'unit', e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  >
                    <option value="LBS">lbs</option>
                    <option value="KG">kg</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleLog}
        disabled={saving}
        className="px-6 py-2.5 bg-clean-accent text-white rounded-xl text-sm font-bold hover:bg-clean-accent disabled:opacity-50 flex items-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
        Log workout
      </button>
    </div>
  )
}

// History view
function HistoryView({ instances }: { instances: WorkoutInstance[] }) {
  return (
    <div className="space-y-4">
      {instances.length === 0 && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No workouts logged yet.</p>
        </div>
      )}
      {instances.map((inst) => (
        <div key={inst.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">{inst.name}</h3>
            <span className="text-xs text-gray-500">{new Date(inst.started_at).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            {inst.exercises.length} exercises • {inst.duration_seconds ? `${Math.round(inst.duration_seconds / 60)} min` : 'no timer'}
          </p>
          <div className="flex flex-wrap gap-2">
            {inst.exercises.map((ex) => (
              <span key={ex.id} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                {ex.exercise_name} ({ex.sets.filter((s) => s.is_completed).length}/{ex.sets.length})
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
