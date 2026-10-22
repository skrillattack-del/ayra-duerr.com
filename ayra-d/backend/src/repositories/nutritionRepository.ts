import prisma from '../db/client';

export interface CreateMealDTO {
  name: string;
  description?: string;
  meal_type: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  image_url?: string;
  is_public?: boolean;
  featured_date?: Date;
  created_by?: string;
}

export interface UpdateMealDTO {
  name?: string;
  description?: string;
  meal_type?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  image_url?: string;
  is_public?: boolean;
  featured_date?: Date | null;
}

export interface CreateNutritionLogDTO {
  user_id: string;
  meal_id: string;
  notes?: string;
}

const mealSelect = {
  id: true,
  name: true,
  description: true,
  meal_type: true,
  calories: true,
  protein_g: true,
  carbs_g: true,
  fat_g: true,
  image_url: true,
  is_public: true,
  featured_date: true,
  created_by: true,
  created_at: true,
  updated_at: true,
} as const;

export const nutritionRepository = {
  async listMeals(includePrivate = false) {
    return prisma.meal.findMany({
      where: includePrivate ? undefined : { is_public: true },
      orderBy: [{ featured_date: 'desc' }, { created_at: 'desc' }],
      select: mealSelect,
    });
  },

  async getMealOfTheDay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.meal.findFirst({
      where: {
        is_public: true,
        featured_date: { gte: today, lt: tomorrow },
      },
      orderBy: { created_at: 'desc' },
      select: mealSelect,
    });
  },

  async findMealById(id: string) {
    return prisma.meal.findUnique({
      where: { id },
      select: mealSelect,
    });
  },

  async createMeal(data: CreateMealDTO) {
    return prisma.meal.create({
      data: {
        name: data.name,
        description: data.description,
        meal_type: data.meal_type as any,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        image_url: data.image_url,
        is_public: data.is_public ?? true,
        featured_date: data.featured_date,
        created_by: data.created_by,
      },
      select: mealSelect,
    });
  },

  async updateMeal(id: string, data: UpdateMealDTO) {
    return prisma.meal.update({
      where: { id },
      data: data as any,
      select: mealSelect,
    });
  },

  async deleteMeal(id: string) {
    return prisma.meal.delete({ where: { id } });
  },

  async logMeal(data: CreateNutritionLogDTO) {
    return prisma.nutritionLog.create({
      data: {
        user_id: data.user_id,
        meal_id: data.meal_id,
        notes: data.notes,
      },
      include: { meal: { select: mealSelect } },
    });
  },

  async getNutritionLogs(userId: string, start: Date, end: Date) {
    return prisma.nutritionLog.findMany({
      where: {
        user_id: userId,
        logged_at: { gte: start, lte: end },
      },
      include: { meal: { select: mealSelect } },
      orderBy: { logged_at: 'desc' },
    });
  },

  async getDailySummary(userId: string, date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const logs = await prisma.nutritionLog.findMany({
      where: { user_id: userId, logged_at: { gte: start, lt: end } },
      include: { meal: true },
    });

    return logs.reduce(
      (acc, log) => {
        acc.calories += log.meal.calories || 0;
        acc.protein += log.meal.protein_g || 0;
        acc.carbs += log.meal.carbs_g || 0;
        acc.fat += log.meal.fat_g || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  },
};
