import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticateJWT, requireAdmin } from '../middleware/authMiddleware';
import { nutritionRepository } from '../repositories/nutritionRepository';
import { storageService } from '../services/storageService';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const optionalNumber = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'string' ? Number(value) : value;
}, z.number().optional());

const optionalInteger = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'string' ? Number(value) : value;
}, z.number().int().optional());

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}, z.boolean().optional());

const optionalDateTime = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}, z.string().datetime().optional());

const mealSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  meal_type: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  calories: optionalInteger,
  protein_g: optionalNumber,
  carbs_g: optionalNumber,
  fat_g: optionalNumber,
  is_public: optionalBoolean,
  featured_date: optionalDateTime,
});

const logSchema = z.object({
  meal_id: z.string(),
  notes: z.string().optional(),
});

function mealKey(filename: string) {
  const randomId = Math.random().toString(36).substring(2, 9);
  const ext = filename.split('.').pop() || 'jpg';
  return `meals/${Date.now()}-${randomId}.${ext}`;
}

/**
 * GET /api/nutrition/meals
 */
router.get('/meals', authenticateJWT, async (req, res) => {
  try {
    const meals = await nutritionRepository.listMeals(req.user!.role === 'ADMIN');
    res.json({ meals });
  } catch (error: any) {
    console.error('List meals error:', error);
    res.status(500).json({ error: 'Failed to list meals' });
  }
});

/**
 * GET /api/nutrition/meals/today
 */
router.get('/meals/today', authenticateJWT, async (req, res) => {
  try {
    const meal = await nutritionRepository.getMealOfTheDay();
    res.json({ meal });
  } catch (error: any) {
    console.error('Meal of the day error:', error);
    res.status(500).json({ error: 'Failed to get meal of the day' });
  }
});

/**
 * GET /api/nutrition/meals/:id
 */
router.get('/meals/:id', authenticateJWT, async (req, res) => {
  try {
    const meal = await nutritionRepository.findMealById(req.params.id);
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json({ meal });
  } catch (error: any) {
    console.error('Get meal error:', error);
    res.status(500).json({ error: 'Failed to get meal' });
  }
});

/**
 * POST /api/nutrition/meals
 * Admin only for meal of the day
 */
router.post('/meals', authenticateJWT, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const validated = mealSchema.parse(req.body);

    let imageUrl: string | undefined;
    if (req.file) {
      const key = mealKey(req.file.originalname);
      await storageService.uploadFile(key, req.file.buffer, req.file.mimetype);
      imageUrl = key;
    }

    const meal = await nutritionRepository.createMeal({
      ...validated,
      featured_date: validated.featured_date ? new Date(validated.featured_date) : undefined,
      image_url: imageUrl,
      created_by: req.user!.userId,
    });

    res.status(201).json({ meal });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create meal error:', error);
    res.status(500).json({ error: 'Failed to create meal' });
  }
});

/**
 * PUT /api/nutrition/meals/:id
 */
router.put('/meals/:id', authenticateJWT, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const validated = mealSchema.parse(req.body);

    let imageUrl: string | undefined;
    if (req.file) {
      const key = mealKey(req.file.originalname);
      await storageService.uploadFile(key, req.file.buffer, req.file.mimetype);
      imageUrl = key;
    }

    const meal = await nutritionRepository.updateMeal(req.params.id, {
      ...validated,
      featured_date: validated.featured_date ? new Date(validated.featured_date) : undefined,
      image_url: imageUrl,
    });

    res.json({ meal });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update meal error:', error);
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

/**
 * DELETE /api/nutrition/meals/:id
 */
router.delete('/meals/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    await nutritionRepository.deleteMeal(req.params.id);
    res.json({ message: 'Meal deleted' });
  } catch (error: any) {
    console.error('Delete meal error:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

/**
 * POST /api/nutrition/log
 */
router.post('/log', authenticateJWT, async (req, res) => {
  try {
    const validated = logSchema.parse(req.body);
    const log = await nutritionRepository.logMeal({
      user_id: req.user!.userId,
      meal_id: validated.meal_id,
      notes: validated.notes,
    });
    res.status(201).json({ log });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Log meal error:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

/**
 * GET /api/nutrition/log
 */
router.get('/log', authenticateJWT, async (req, res) => {
  try {
    const start = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = req.query.end ? new Date(req.query.end as string) : new Date();
    const logs = await nutritionRepository.getNutritionLogs(req.user!.userId, start, end);
    res.json({ logs });
  } catch (error: any) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get nutrition logs' });
  }
});

/**
 * GET /api/nutrition/summary
 */
router.get('/summary', authenticateJWT, async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const summary = await nutritionRepository.getDailySummary(req.user!.userId, date);
    res.json({ summary });
  } catch (error: any) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

export default router;
