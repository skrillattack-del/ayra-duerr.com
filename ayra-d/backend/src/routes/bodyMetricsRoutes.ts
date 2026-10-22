import { Router } from 'express';
import { z } from 'zod';
import { bodyMetricsRepository } from '../repositories/bodyMetricsRepository';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router: Router = Router();

const createBodyMeasurementSchema = z.object({
  weight: z.number().positive().optional(),
  body_fat: z.number().positive().optional(),
  weight_unit: z.string().optional(),
  notes: z.string().optional(),
});

const updateBodyMeasurementSchema = createBodyMeasurementSchema.partial();

/**
 * GET /api/body-metrics
 * Get body measurements (filter by userId)
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.query;

    if (userId && userId !== req.user!.userId) {
      if (!['TRAINER', 'ADMIN'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const targetUserId = userId ? (userId as string) : req.user!.userId;
    const logs = await bodyMetricsRepository.listByUser(targetUserId);

    res.json({ data: logs });
  } catch (error) {
    console.error('Get body measurements error:', error);
    res.status(500).json({ error: 'Failed to fetch body measurements' });
  }
});

/**
 * GET /api/body-metrics/:id
 * Get body measurement by ID
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const log = await bodyMetricsRepository.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Body measurement not found' });
    }

    if (log.user_id !== req.user!.userId && !['TRAINER', 'ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ data: log });
  } catch (error) {
    console.error('Get body measurement error:', error);
    res.status(500).json({ error: 'Failed to fetch body measurement' });
  }
});

/**
 * POST /api/body-metrics
 * Create new body measurement entry
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const validated = createBodyMeasurementSchema.parse(req.body);
    const log = await bodyMetricsRepository.create({
      ...validated,
      user_id: req.user!.userId,
    });

    res.status(201).json({ data: log });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create body measurement error:', error);
    res.status(500).json({ error: 'Failed to create body measurement' });
  }
});

/**
 * PUT /api/body-metrics/:id
 * Update body measurement entry
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const existingLog = await bodyMetricsRepository.findById(req.params.id);
    if (!existingLog) {
      return res.status(404).json({ error: 'Body measurement not found' });
    }

    if (existingLog.user_id !== req.user!.userId && !['TRAINER', 'ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const validated = updateBodyMeasurementSchema.parse(req.body);
    const log = await bodyMetricsRepository.update(req.params.id, validated);

    res.json({ data: log });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update body measurement error:', error);
    res.status(500).json({ error: 'Failed to update body measurement' });
  }
});

/**
 * DELETE /api/body-metrics/:id
 * Delete body measurement entry
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const existingLog = await bodyMetricsRepository.findById(req.params.id);
    if (!existingLog) {
      return res.status(404).json({ error: 'Body measurement not found' });
    }

    if (existingLog.user_id !== req.user!.userId && !['TRAINER', 'ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await bodyMetricsRepository.delete(req.params.id);

    res.json({ message: 'Body measurement deleted successfully' });
  } catch (error) {
    console.error('Delete body measurement error:', error);
    res.status(500).json({ error: 'Failed to delete body measurement' });
  }
});

export default router;
