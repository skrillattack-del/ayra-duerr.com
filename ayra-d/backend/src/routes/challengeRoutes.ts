import { Router } from 'express';
import { z } from 'zod';
import { challengeRepository } from '../repositories/challengeRepository';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';
import { getIO } from '../socket/socketServer';
import { awardXp } from '../services/xpService';

const router: Router = Router();

const createChallengeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['STRENGTH', 'CARDIO', 'NUTRITION', 'CUSTOM']),
  type: z.enum(['DURATION', 'REPETITION', 'DISTANCE', 'CUSTOM']),
  goal_value: z.number().positive(),
  goal_unit: z.string().min(1),
  start_date: z.string().transform(str => new Date(str)),
  end_date: z.string().transform(str => new Date(str)),
});

const updateChallengeSchema = createChallengeSchema.partial();

/**
 * GET /api/challenges
 * List all active challenges
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const challenges = await challengeRepository.listActive();
    res.json({ data: challenges });
  } catch (error) {
    console.error('List challenges error:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

/**
 * GET /api/challenges/:id
 * Get challenge by ID
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const challenge = await challengeRepository.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    res.json({ data: challenge });
  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

/**
 * POST /api/challenges
 * Create new challenge (trainer/admin only)
 */
router.post('/', authenticateJWT, requireRole(['TRAINER', 'ADMIN']), async (req, res) => {
  try {
    const validated = createChallengeSchema.parse(req.body);
    const challenge = await challengeRepository.create({
      ...validated,
      created_by: req.user!.userId,
    });

    // Emit realtime event
    getIO().emit('challenge:created', { challenge });

    res.status(201).json({ data: challenge });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create challenge error:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

/**
 * PUT /api/challenges/:id
 * Update challenge (trainer/admin only)
 */
router.put('/:id', authenticateJWT, requireRole(['TRAINER', 'ADMIN']), async (req, res) => {
  try {
    const validated = updateChallengeSchema.parse(req.body);
    const challenge = await challengeRepository.update(req.params.id, validated);

    // Emit realtime event
    getIO().emit('challenge:updated', { challenge });

    res.json({ data: challenge });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Update challenge error:', error);
    res.status(500).json({ error: 'Failed to update challenge' });
  }
});

/**
 * DELETE /api/challenges/:id
 * Delete challenge (trainer/admin only)
 */
router.delete('/:id', authenticateJWT, requireRole(['TRAINER', 'ADMIN']), async (req, res) => {
  try {
    await challengeRepository.delete(req.params.id);

    // Emit realtime event
    getIO().emit('challenge:deleted', { challengeId: req.params.id });

    res.json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    console.error('Delete challenge error:', error);
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

/**
 * POST /api/challenges/:id/join
 * Join challenge
 */
router.post('/:id/join', authenticateJWT, async (req, res) => {
  try {
    const challenge = await challengeRepository.join(req.params.id, req.user!.userId);

    // Emit realtime event
    getIO().to(`challenge:${req.params.id}`).emit('challenge:joined', {
      challengeId: req.params.id,
      userId: req.user!.userId,
    });

    res.json({ data: challenge });

    void awardXp(req.user!.userId, 'CHALLENGE_JOINED', { refId: `challenge:${req.params.id}` });
  } catch (error: any) {
    console.error('Join challenge error:', error);
    res.status(500).json({ error: error.message || 'Failed to join challenge' });
  }
});

/**
 * POST /api/challenges/:id/leave
 * Leave challenge
 */
router.post('/:id/leave', authenticateJWT, async (req, res) => {
  try {
    const challenge = await challengeRepository.leave(req.params.id, req.user!.userId);

    // Emit realtime event
    getIO().to(`challenge:${req.params.id}`).emit('challenge:left', {
      challengeId: req.params.id,
      userId: req.user!.userId,
    });

    res.json({ data: challenge });
  } catch (error: any) {
    console.error('Leave challenge error:', error);
    res.status(500).json({ error: error.message || 'Failed to leave challenge' });
  }
});

export default router;

