import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT, requirePaid } from '../middleware/authMiddleware';
import { programRepository } from '../repositories/programRepository';

const router: Router = Router();

const programWorkoutSchema = z.object({
  template_id: z.string(),
  day_of_week: z.number().int().min(0).max(6),
  order_index: z.number().int().optional(),
  notes: z.string().optional(),
});

const programWeekSchema = z.object({
  week_number: z.number().int().min(1),
  focus: z.string().optional(),
  workouts: z.array(programWorkoutSchema),
});

const createProgramSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration_weeks: z.number().int().min(1),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  is_public: z.boolean().optional(),
  weeks: z.array(programWeekSchema).min(1),
});

const updateProgramSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  duration_weeks: z.number().int().min(1).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  is_public: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/programs
 * List public programs and user's own programs
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const includePublic = req.user!.membership_tier === 'PAID' || req.user!.role !== 'CLIENT';
    const programs = await programRepository.listPrograms(req.user!.userId, includePublic);
    res.json({ programs });
  } catch (error: any) {
    console.error('List programs error:', error);
    res.status(500).json({ error: 'Failed to list programs' });
  }
});

/**
 * POST /api/programs
 * Create a program (trainers/admins only)
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    if (req.user!.role === 'CLIENT') {
      return res.status(403).json({ error: 'Trainers and admins can create programs' });
    }

    const validated = createProgramSchema.parse(req.body);
    const program = await programRepository.createProgram({
      user_id: req.user!.role === 'ADMIN' ? undefined : req.user!.userId,
      name: validated.name,
      description: validated.description,
      duration_weeks: validated.duration_weeks,
      difficulty: validated.difficulty,
      is_public: validated.is_public,
      weeks: validated.weeks,
    });
    res.status(201).json({ program });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Failed to create program' });
  }
});

/**
 * GET /api/programs/my
 */
router.get('/my', authenticateJWT, async (req, res) => {
  try {
    const enrollments = await programRepository.getUserPrograms(req.user!.userId);
    res.json({ enrollments });
  } catch (error: any) {
    console.error('Get my programs error:', error);
    res.status(500).json({ error: 'Failed to get enrolled programs' });
  }
});

/**
 * GET /api/programs/calendar
 */
router.get('/calendar', authenticateJWT, async (req, res) => {
  try {
    const start = req.query.start ? new Date(req.query.start as string) : new Date();
    const end = req.query.end ? new Date(req.query.end as string) : new Date(start.getTime() + 28 * 24 * 60 * 60 * 1000);
    const events = await programRepository.getCalendar(req.user!.userId, start, end);
    res.json({ events });
  } catch (error: any) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: 'Failed to load calendar' });
  }
});

/**
 * GET /api/programs/:id
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const program = await programRepository.findProgramById(req.params.id);
    if (!program) return res.status(404).json({ error: 'Program not found' });

    const isOwner = program.user_id === req.user!.userId;
    const canViewPublic = program.is_public && (req.user!.membership_tier === 'PAID' || req.user!.role !== 'CLIENT');
    if (!isOwner && !canViewPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ program });
  } catch (error: any) {
    console.error('Get program error:', error);
    res.status(500).json({ error: 'Failed to get program' });
  }
});

/**
 * PUT /api/programs/:id
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const validated = updateProgramSchema.parse(req.body);
    const program = await programRepository.findProgramById(req.params.id);
    if (!program) return res.status(404).json({ error: 'Program not found' });
    if (program.user_id !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await programRepository.updateProgram(req.params.id, validated);
    const updated = await programRepository.findProgramById(req.params.id);
    res.json({ program: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Failed to update program' });
  }
});

/**
 * DELETE /api/programs/:id
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const program = await programRepository.findProgramById(req.params.id);
    if (!program) return res.status(404).json({ error: 'Program not found' });
    if (program.user_id !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await programRepository.deleteProgram(req.params.id);
    res.json({ message: 'Program deleted' });
  } catch (error: any) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: 'Failed to delete program' });
  }
});

/**
 * POST /api/programs/:id/enroll
 */
router.post('/:id/enroll', authenticateJWT, requirePaid, async (req, res) => {
  try {
    const program = await programRepository.findProgramById(req.params.id);
    if (!program) return res.status(404).json({ error: 'Program not found' });
    if (!program.is_public && program.user_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const enrollment = await programRepository.enrollUser(req.user!.userId, req.params.id);
    res.status(201).json({ enrollment });
  } catch (error: any) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll in program' });
  }
});

export default router;
