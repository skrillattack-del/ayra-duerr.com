import { Router } from 'express';
import { z } from 'zod';
import { progressRepository } from '../repositories/progressRepository';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';
import { getIO } from '../socket/socketServer';
import { awardXp } from '../services/xpService';

const router: Router = Router();

const createProgressSchema = z.object({
  challenge_id: z.string().uuid(),
  value: z.number().positive(),
  unit: z.string().min(1),
  notes: z.string().optional(),
  photo_url: z.string().url().optional(),
});

const updateProgressSchema = createProgressSchema.partial().omit({ challenge_id: true });

/**
 * GET /api/progress
 * Get progress logs (filter by challengeId or userId)
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { challengeId, userId } = req.query;

    // If requesting other user's progress, check permissions
    if (userId && userId !== req.user!.userId) {
      // Only trainers/admins can view other users' progress
      if (!['TRAINER', 'ADMIN'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    let logs;
    if (challengeId) {
      logs = await progressRepository.listByChallenge(challengeId as string);
    } else if (userId) {
      logs = await progressRepository.listByUser(userId as string);
    } else {
      // Default: current user's progress
      logs = await progressRepository.listByUser(req.user!.userId);
    }

    res.json({ data: logs });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress logs' });
  }
});

/**
 * GET /api/progress/:id
 * Get progress log by ID
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const log = await progressRepository.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Progress log not found' });
    }

    // Check permissions: users can only view their own logs unless trainer/admin
    if (log.user_id !== req.user!.userId && !['TRAINER', 'ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ data: log });
  } catch (error) {
    console.error('Get progress log error:', error);
    res.status(500).json({ error: 'Failed to fetch progress log' });
  }
});

/**
 * POST /api/progress
 * Create new progress entry
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const validated = createProgressSchema.parse(req.body);
    const log = await progressRepository.create({
      ...validated,
      user_id: req.user!.userId,
    });

    // Emit realtime event to challenge room
    getIO().to(`challenge:${validated.challenge_id}`).emit('progress:new', {
      progress: log,
    });

    res.status(201).json({ data: log });

    void awardXp(req.user!.userId, 'PROGRESS_LOG', { refId: `progress:${log.id}` });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create progress error:', error);
    res.status(500).json({ error: 'Failed to create progress log' });
  }
});

/**
 * PUT /api/progress/:id
 * Update progress entry
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    // Check if log exists and user has permission
    const existingLog = await progressRepository.findById(req.params.id);
    if (!existingLog) {
      return res.status(404).json({ error: 'Progress log not found' });
    }

    // Users can only update their own logs unless trainer/admin
    if (existingLog.user_id !== req.user!.userId && !['TRAINER', 'ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const validated = updateProgressSchema.parse(req.body);
    const log = await progressRepository.update(req.params.id, validated);

    // Emit realtime event
    getIO().to(`challenge:${existingLog.challenge_id}`).emit('progress:updated', {
      progress: log,
    });

    res.json({ data: log });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress log' });
  }
});

/**
 * DELETE /api/progress/:id
 * Delete progress entry
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    // Check if log exists and user has permission
    const existingLog = await progressRepository.findById(req.params.id);
    if (!existingLog) {
      return res.status(404).json({ error: 'Progress log not found' });
    }

    // Users can only delete their own logs unless trainer/admin
    if (existingLog.user_id !== req.user!.userId && !['TRAINER', 'ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await progressRepository.delete(req.params.id);

    // Emit realtime event
    getIO().to(`challenge:${existingLog.challenge_id}`).emit('progress:deleted', {
      progressId: req.params.id,
    });

    res.json({ message: 'Progress log deleted successfully' });
  } catch (error) {
    console.error('Delete progress error:', error);
    res.status(500).json({ error: 'Failed to delete progress log' });
  }
});

export default router;

