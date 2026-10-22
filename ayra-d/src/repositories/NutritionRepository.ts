import apiClient from '@/lib/apiClient'

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'

export interface Meal {
  id: string
  name: string
  description?: string
  meal_type: MealType
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  image_url?: string
  is_public: boolean
  featured_date?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface NutritionLog {
  id: string
  user_id: string
  meal_id: string
  meal: Meal
  logged_at: string
  notes?: string
}

export const NutritionRepository = {
  async listMeals(): Promise<Meal[]> {
    const res = await apiClient.get<{ meals: Meal[] }>('/api/nutrition/meals')
    return res.meals
  },

  async getMealOfTheDay(): Promise<Meal | null> {
    const res = await apiClient.get<{ meal: Meal | null }>('/api/nutrition/meals/today')
    return res.meal
  },

  async createMeal(data: {
    name: string
    description?: string
    meal_type: MealType
    calories?: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    is_public?: boolean
    featured_date?: string
    image?: File
  }): Promise<Meal> {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'image') {
        formData.append(key, String(value))
      }
    })
    if (data.image) formData.append('image', data.image)

    const res = await apiClient.postFormData<{ meal: Meal }>('/api/nutrition/meals', formData)
    return res.meal
  },

  async logMeal(mealId: string, notes?: string): Promise<NutritionLog> {
    const res = await apiClient.post<{ log: NutritionLog }>('/api/nutrition/log', { meal_id: mealId, notes })
    return res.log
  },

  async getSummary(date?: string): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
    const query = date ? `?date=${encodeURIComponent(date)}` : ''
    const res = await apiClient.get<{ summary: { calories: number; protein: number; carbs: number; fat: number } }>(
      `/api/nutrition/summary${query}`
    )
    return res.summary
  },

  async deleteMeal(id: string): Promise<void> {
    await apiClient.delete(`/api/nutrition/meals/${id}`)
  },
}
