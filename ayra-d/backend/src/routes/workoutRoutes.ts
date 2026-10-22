import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, requirePaid } from '../middleware/authMiddleware';
import { workoutRepository } from '../repositories/workoutRepository';
import { getIO } from '../socket/socketServer';
import { awardXp } from '../services/xpService';

const router: Router = Router();

// Free users can create up to 3 personal templates
const FREE_TEMPLATE_LIMIT = 3;

const setSchema = z.object({
  reps: z.number().int().optional(),
  weight: z.number().optional(),
  unit: z.enum(['LBS', 'KG']).optional(),
  rpe: z.number().min(0).max(10).optional(),
  rest_seconds: z.number().int().optional(),
  duration_seconds: z.number().int().optional(),
  distance: z.number().optional(),
  distance_unit: z.string().optional(),
});

const templateExerciseSchema = z.object({
  exercise_id: z.string(),
  exercise_name: z.string(),
  order_index: z.number().int(),
  sets: z.array(setSchema).default([]),
  notes: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  exercises: z.array(templateExerciseSchema).min(1),
  is_public: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.string().min(1).optional(),
  exercises: z.array(templateExerciseSchema).optional(),
  is_public: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const createScheduledSchema = z.object({
  template_id: z.string().optional(),
  scheduled_for: z.string().datetime(),
  day_of_week: z.number().int().min(0).max(6).optional(),
  is_recurring: z.boolean().optional(),
  custom_name: z.string().optional(),
});

const updateScheduledSchema = z.object({
  scheduled_for: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'RESCHEDULED']).optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  custom_name: z.string().optional(),
});

const instanceSetSchema = z.object({
  set_number: z.number().int(),
  reps: z.number().int().optional(),
  weight: z.number().optional(),
  unit: z.enum(['LBS', 'KG']).optional(),
  rpe: z.number().min(0).max(10).optional(),
  duration_seconds: z.number().int().optional(),
  distance: z.number().optional(),
  distance_unit: z.string().optional(),
  is_completed: z.boolean().optional(),
  notes: z.string().optional(),
});

const instanceExerciseSchema = z.object({
  exercise_id: z.string(),
  exercise_name: z.string(),
  order_index: z.number().int(),
  notes: z.string().optional(),
  sets: z.array(instanceSetSchema).min(1),
});

const createInstanceSchema = z.object({
  template_id: z.string().optional(),
  scheduled_workout_id: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  duration_seconds: z.number().int().optional(),
  notes: z.string().optional(),
  exercises: z.array(instanceExerciseSchema).min(1),
});

/**
 * GET /api/workouts/templates
 * List templates for the current user (plus public templates for paid/admin)
 */
router.get('/templates', authenticateJWT, async (req, res) => {
  try {
    const includePublic = req.user!.membership_tier === 'PAID' || req.user!.role !== 'CLIENT';
    const templates = await workoutRepository.listTemplates(req.user!.userId, includePublic);
    res.json({ templates });
  } catch (error: any) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

/**
 * POST /api/workouts/templates
 * Create a new workout template
 */
router.post('/templates', authenticateJWT, async (req, res) => {
  try {
    const validated = createTemplateSchema.parse(req.body);

    // Only trainers/admins can create public templates
    const isPublic = validated.is_public && req.user!.role !== 'CLIENT' ? true : false;

    // Free users are limited to personal templates
    if (req.user!.membership_tier === 'FREE' && req.user!.role === 'CLIENT') {
      const existing = await workoutRepository.listTemplates(req.user!.userId, false);
      if (existing.length >= FREE_TEMPLATE_LIMIT) {
        return res.status(403).json({ error: `Free users are limited to ${FREE_TEMPLATE_LIMIT} templates` });
      }
    }

    const template = await workoutRepository.createTemplate({
      user_id: req.user!.userId,
      name: validated.name,
      description: validated.description,
      type: validated.type,
      exercises: validated.exercises,
      is_public: isPublic,
    });

    res.status(201).json({ template });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * GET /api/workouts/templates/:id
 */
router.get('/templates/:id', authenticateJWT, async (req, res) => {
  try {
    const template = await workoutRepository.findTemplateById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const isOwner = template.user_id === req.user!.userId;
    const canViewPublic = template.is_public && (req.user!.membership_tier === 'PAID' || req.user!.role !== 'CLIENT');
    if (!isOwner && !canViewPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ template });
  } catch (error: any) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

/**
 * PUT /api/workouts/templates/:id
 */
router.put('/templates/:id', authenticateJWT, async (req, res) => {
  try {
    const validated = updateTemplateSchema.parse(req.body);
    const template = await workoutRepository.findTemplateById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.user_id !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isPublic = validated.is_public && req.user!.role !== 'CLIENT' ? validated.is_public : undefined;

    await workoutRepository.updateTemplate(req.params.id, template.user_id, {
      ...validated,
      is_public: isPublic,
    });
    const updated = await workoutRepository.findTemplateById(req.params.id);
    res.json({ template: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * DELETE /api/workouts/templates/:id
 */
router.delete('/templates/:id', authenticateJWT, async (req, res) => {
  try {
    const template = await workoutRepository.findTemplateById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.user_id !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await workoutRepository.deleteTemplate(req.params.id, template.user_id);
    res.json({ message: 'Template deleted' });
  } catch (error: any) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * GET /api/workouts/schedule
 */
router.get('/schedule', authenticateJWT, async (req, res) => {
  try {
    const start = req.query.start ? new Date(req.query.start as string) : new Date();
    const end = req.query.end ? new Date(req.query.end as string) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const schedule = await workoutRepository.listScheduledWorkouts(req.user!.userId, start, end);
    res.json({ schedule });
  } catch (error: any) {
    console.error('List schedule error:', error);
    res.status(500).json({ error: 'Failed to list schedule' });
  }
});

/**
 * POST /api/workouts/schedule
 */
router.post('/schedule', authenticateJWT, async (req, res) => {
  try {
    const validated = createScheduledSchema.parse(req.body);
    const scheduled = await workoutRepository.createScheduledWorkout({
      user_id: req.user!.userId,
      template_id: validated.template_id,
      scheduled_for: new Date(validated.scheduled_for),
      day_of_week: validated.day_of_week,
      is_recurring: validated.is_recurring,
      custom_name: validated.custom_name,
    });
    res.status(201).json({ scheduled });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to schedule workout' });
  }
});

/**
 * PATCH /api/workouts/schedule/:id
 */
router.patch('/schedule/:id', authenticateJWT, async (req, res) => {
  try {
    const validated = updateScheduledSchema.parse(req.body);
    await workoutRepository.updateScheduledWorkout(req.params.id, req.user!.userId, {
      scheduled_for: validated.scheduled_for ? new Date(validated.scheduled_for) : undefined,
      status: validated.status,
      started_at: validated.started_at ? new Date(validated.started_at) : undefined,
      completed_at: validated.completed_at ? new Date(validated.completed_at) : undefined,
      custom_name: validated.custom_name,
    });
    res.json({ message: 'Scheduled workout updated' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update scheduled workout' });
  }
});

/**
 * DELETE /api/workouts/schedule/:id
 */
router.delete('/schedule/:id', authenticateJWT, async (req, res) => {
  try {
    await workoutRepository.deleteScheduledWorkout(req.params.id, req.user!.userId);
    res.json({ message: 'Scheduled workout deleted' });
  } catch (error: any) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete scheduled workout' });
  }
});

/**
 * GET /api/workouts
 * Logged workout instances
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Free users see fewer history entries
    const maxLimit = req.user!.membership_tier === 'FREE' && req.user!.role === 'CLIENT' ? 10 : limit;

    const [instances, total] = await Promise.all([
      workoutRepository.listInstances(req.user!.userId, maxLimit, offset),
      workoutRepository.countInstances(req.user!.userId),
    ]);
    res.json({ instances, total });
  } catch (error: any) {
    console.error('List instances error:', error);
    res.status(500).json({ error: 'Failed to list workouts' });
  }
});

/**
 * POST /api/workouts
 * Log a completed workout
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const validated = createInstanceSchema.parse(req.body);

    const instance = await workoutRepository.createInstance({
      user_id: req.user!.userId,
      template_id: validated.template_id,
      scheduled_workout_id: validated.scheduled_workout_id,
      name: validated.name,
      type: validated.type,
      duration_seconds: validated.duration_seconds,
      notes: validated.notes,
      exercises: validated.exercises,
    });

    try {
      getIO().emit('workout:completed', { userId: req.user!.userId, instance });
    } catch {
      // Socket not initialized, ignore
    }

    res.status(201).json({ instance });

    void awardXp(req.user!.userId, 'WORKOUT_COMPLETED', { refId: `workout:${instance.id}` });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create instance error:', error);
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

export default router;
