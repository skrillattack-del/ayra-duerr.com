'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { NutritionRepository, type Meal, type MealType } from '@/repositories/NutritionRepository'
import { useToast } from '@/providers/ToastProvider'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { Apple, Loader2, Plus, Camera, Trash2 } from 'lucide-react'
import { mediaUrl } from '@/lib/media'


export default function NutritionPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'ADMIN'

  const [meal, setMeal] = useState<Meal | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [summary, setSummary] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadData = async () => {
    try {
      const [m, ml, s] = await Promise.all([
        NutritionRepository.getMealOfTheDay(),
        NutritionRepository.listMeals(),
        NutritionRepository.getSummary(),
      ])
      setMeal(m)
      setMeals(ml)
      setSummary(s)
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'load your nutrition data' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDeleteMeal = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return

    try {
      await NutritionRepository.deleteMeal(id)
      setMeals(prev => prev.filter(m => m.id !== id))
      if (meal?.id === id) setMeal(null)
      toast({ title: 'Meal deleted', variant: 'success' })
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'delete this meal' }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nutrition</h1>
          <p className="text-sm text-gray-500">Meal of the day and nutrition logging.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 bg-clean-accent text-white rounded-xl text-sm font-bold hover:bg-clean-accent flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Post meal
          </button>
        )}
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-clean-accent" />
        </div>
      ) : (
        <>
          {/* Meal of the day */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Meal of the day</h2>
            {meal ? (
              <div className="flex flex-col md:flex-row gap-6">
                {meal.image_url && (
                  <img
                    src={mediaUrl(meal.image_url) ?? undefined}
                    alt={meal.name}
                    className="w-full md:w-64 h-48 object-cover rounded-2xl"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase text-clean-accent">{meal.meal_type}</span>
                    <span className="text-xs text-gray-400">{new Date(meal.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{meal.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{meal.description}</p>
                  <div className="flex flex-wrap gap-3">
                    <MacroBadge label="Calories" value={meal.calories} unit="kcal" />
                    <MacroBadge label="Protein" value={meal.protein_g} unit="g" />
                    <MacroBadge label="Carbs" value={meal.carbs_g} unit="g" />
                    <MacroBadge label="Fat" value={meal.fat_g} unit="g" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <Apple className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No meal of the day posted yet.</p>
              </div>
            )}
          </div>

          {/* Today's summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="Calories" value={summary.calories} unit="kcal" />
            <SummaryCard label="Protein" value={summary.protein} unit="g" />
            <SummaryCard label="Carbs" value={summary.carbs} unit="g" />
            <SummaryCard label="Fat" value={summary.fat} unit="g" />
          </div>

          {/* Recent meals */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Recent meals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meals.slice(0, 6).map((m) => (
                <div key={m.id} className="relative border border-gray-100 rounded-2xl p-4">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMeal(m.id, m.name)}
                      aria-label={`Delete ${m.name}`}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-gray-400 shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {m.image_url && (
                    <img src={mediaUrl(m.image_url) ?? undefined} alt={m.name} className="w-full h-32 object-cover rounded-xl mb-3" />
                  )}
                  <span className="text-xs font-bold uppercase text-clean-accent">{m.meal_type}</span>
                  <h3 className="font-bold mt-1">{m.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showForm && <MealForm onClose={() => setShowForm(false)} onSaved={loadData} />}
    </div>
  )
}

function MacroBadge({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2 text-center min-w-[80px]">
      <p className="text-lg font-bold">{value ?? '—'}</p>
      <p className="text-[10px] uppercase text-gray-400 font-bold">
        {label} {unit}
      </p>
    </div>
  )
}

function SummaryCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 uppercase font-bold">
        {label} {unit}
      </p>
    </div>
  )
}

function MealForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      await NutritionRepository.createMeal({
        name: formData.get('name') as string,
        description: (formData.get('description') as string) || undefined,
        meal_type: (formData.get('meal_type') as MealType) || 'LUNCH',
        calories: parseInt(formData.get('calories') as string) || undefined,
        protein_g: parseFloat(formData.get('protein') as string) || undefined,
        carbs_g: parseFloat(formData.get('carbs') as string) || undefined,
        fat_g: parseFloat(formData.get('fat') as string) || undefined,
        featured_date: new Date().toISOString(),
        image: (formData.get('image') as File)?.size ? (formData.get('image') as File) : undefined,
      })
      toast({ title: 'Meal posted', variant: "success" })
      onSaved()
      onClose()
    } catch (err) {
      toast(mapApiErrorToToast(err, { action: 'post this meal' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Post meal of the day</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <input name="name" required placeholder="Meal name" className="w-full px-4 py-2.5 rounded-xl border border-gray-200" />
        <textarea
          name="description"
          placeholder="Description"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 min-h-[80px]"
        />
        <select name="meal_type" className="w-full px-4 py-2.5 rounded-xl border border-gray-200">
          <option value="BREAKFAST">Breakfast</option>
          <option value="LUNCH">Lunch</option>
          <option value="DINNER">Dinner</option>
          <option value="SNACK">Snack</option>
        </select>

        <div className="grid grid-cols-2 gap-3">
          <input name="calories" type="number" placeholder="Calories" className="px-4 py-2.5 rounded-xl border border-gray-200" />
          <input name="protein" type="number" placeholder="Protein (g)" className="px-4 py-2.5 rounded-xl border border-gray-200" />
          <input name="carbs" type="number" placeholder="Carbs (g)" className="px-4 py-2.5 rounded-xl border border-gray-200" />
          <input name="fat" type="number" placeholder="Fat (g)" className="px-4 py-2.5 rounded-xl border border-gray-200" />
        </div>

        <div>
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
            <Camera className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">{preview ? 'Change image' : 'Add image'}</span>
            <input
              name="image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setPreview(URL.createObjectURL(file))
              }}
            />
          </label>
          {preview && <img src={preview} alt="" className="mt-3 w-full h-40 object-cover rounded-xl" />}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-clean-accent text-white rounded-xl font-bold hover:bg-clean-accent disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Post meal
        </button>
      </form>
    </div>
  )
}
