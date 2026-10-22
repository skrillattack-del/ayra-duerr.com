import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { authenticateJWT } from '../middleware/authMiddleware';
import { calculateOneRepMax } from '../utils/metricEngine';

const router: Router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createLiftSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  workingWeight: z.number().positive(),
  workingUnit: z.enum(['LBS', 'KG']).default('LBS'),
  goalWeight: z.number().positive().optional(),
  goalDate: z.string().datetime().optional(),
});

const updateLiftSchema = z.object({
  workingWeight: z.number().positive().optional(),
  workingUnit: z.enum(['LBS', 'KG']).optional(),
  goalWeight: z.number().positive().optional().nullable(),
  goalDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

const logSetSchema = z.object({
  weight: z.number().positive(),
  reps: z.number().int().positive(),
  unit: z.enum(['LBS', 'KG']).default('LBS'),
  rpe: z.number().min(1).max(10).optional(),
  tempo: z.string().optional(),
  restTime: z.number().int().optional(),
  setNumber: z.number().int().optional(),
  isWarmup: z.boolean().default(false),
  notes: z.string().optional(),
  loggedAt: z.string().datetime().optional(),
});

const logSessionSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.array(logSetSchema).min(1),
  notes: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

// =============================================================================
// USER LIFTS CRUD
// =============================================================================

router.get('/', authenticateJWT, async (req, res) => {
  try {
    const lifts = await prisma.userLift.findMany({
      where: {
        user_id: req.user!.userId,
        is_active: true,
      },
      orderBy: [
        { display_order: 'asc' },
        { created_at: 'desc' },
      ],
      include: {
        set_logs: {
          orderBy: { logged_at: 'desc' },
          take: 10,
        },
        lift_goals: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    const liftsWithStats = await Promise.all(
      lifts.map(async (lift) => {
        const bestSet = await prisma.setLog.findFirst({
          where: { lift_id: lift.id, is_warmup: false },
          orderBy: { estimated_1rm: 'desc' },
        });

        const lastSet = await prisma.setLog.findFirst({
          where: { lift_id: lift.id, is_warmup: false },
          orderBy: { logged_at: 'desc' },
        });

        const recentSets = await prisma.setLog.findMany({
          where: { lift_id: lift.id, is_warmup: false },
          orderBy: { logged_at: 'desc' },
          take: 10,
        });

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recentSets.length >= 6) {
          const recent5Avg = recentSets.slice(0, 5).reduce((sum, s) => sum + (s.estimated_1rm || 0), 0) / 5;
          const prev5Avg = recentSets.slice(5, 10).reduce((sum, s) => sum + (s.estimated_1rm || 0), 0) / Math.min(5, recentSets.length - 5);
          if (recent5Avg > prev5Avg * 1.02) trend = 'up';
          else if (recent5Avg < prev5Avg * 0.98) trend = 'down';
        }

        return {
          ...lift,
          bestSet: bestSet ? { weight: bestSet.weight, reps: bestSet.reps, estimated1RM: bestSet.estimated_1rm, date: bestSet.logged_at } : null,
          lastSet: lastSet ? { weight: lastSet.weight, reps: lastSet.reps, date: lastSet.logged_at, formatted: `${lastSet.weight}x${lastSet.reps}` } : null,
          trend,
          totalSets: recentSets.length,
        };
      })
    );

    res.json({ lifts: liftsWithStats });
  } catch (error) {
    console.error('Get lifts error:', error);
    res.status(500).json({ error: 'Failed to fetch lifts' });
  }
});

router.post('/', authenticateJWT, async (req, res) => {
  try {
    const validated = createLiftSchema.parse(req.body);

    const existing = await prisma.userLift.findUnique({
      where: {
        user_id_exercise_id: {
          user_id: req.user!.userId,
          exercise_id: validated.exerciseId,
        },
      },
    });

    if (existing) {
      if (!existing.is_active) {
        const updated = await prisma.userLift.update({
          where: { id: existing.id },
          data: {
            is_active: true,
            working_weight: validated.workingWeight,
            working_unit: validated.workingUnit,
            goal_weight: validated.goalWeight,
            goal_date: validated.goalDate ? new Date(validated.goalDate) : null,
          },
        });
        return res.json({ lift: updated, reactivated: true });
      }
      return res.status(400).json({ error: 'You are already tracking this exercise' });
    }

    const maxOrder = await prisma.userLift.aggregate({
      where: { user_id: req.user!.userId },
      _max: { display_order: true },
    });

    const lift = await prisma.userLift.create({
      data: {
        user_id: req.user!.userId,
        exercise_id: validated.exerciseId,
        exercise_name: validated.exerciseName,
        working_weight: validated.workingWeight,
        working_unit: validated.workingUnit,
        goal_weight: validated.goalWeight,
        goal_date: validated.goalDate ? new Date(validated.goalDate) : null,
        display_order: (maxOrder._max.display_order || 0) + 1,
      },
    });

    res.status(201).json({ lift });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Create lift error:', error);
    res.status(500).json({ error: 'Failed to create lift' });
  }
});

router.get('/:liftId', authenticateJWT, async (req, res) => {
  try {
    const lift = await prisma.userLift.findFirst({
      where: { id: req.params.liftId, user_id: req.user!.userId },
      include: {
        set_logs: { orderBy: { logged_at: 'desc' }, take: 100 },
        lift_goals: true,
      },
    });

    if (!lift) return res.status(404).json({ error: 'Lift not found' });

    const allTimePR = await prisma.setLog.findFirst({
      where: { lift_id: lift.id, is_warmup: false, is_pr: true },
      orderBy: { estimated_1rm: 'desc' },
    });

    res.json({
      lift,
      allTimePR: allTimePR ? { weight: allTimePR.weight, reps: allTimePR.reps, estimated1RM: allTimePR.estimated_1rm, date: allTimePR.logged_at } : null,
    });
  } catch (error) {
    console.error('Get lift detail error:', error);
    res.status(500).json({ error: 'Failed to fetch lift details' });
  }
});

router.patch('/:liftId', authenticateJWT, async (req, res) => {
  try {
    const validated = updateLiftSchema.parse(req.body);
    const lift = await prisma.userLift.findFirst({ where: { id: req.params.liftId, user_id: req.user!.userId } });
    if (!lift) return res.status(404).json({ error: 'Lift not found' });

    const updated = await prisma.userLift.update({
      where: { id: lift.id },
      data: {
        working_weight: validated.workingWeight,
        working_unit: validated.workingUnit,
        goal_weight: validated.goalWeight,
        goal_date: validated.goalDate ? new Date(validated.goalDate) : undefined,
        is_active: validated.isActive,
        display_order: validated.displayOrder,
      },
    });

    res.json({ lift: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: error.errors });
    console.error('Update lift error:', error);
    res.status(500).json({ error: 'Failed to update lift' });
  }
});

router.delete('/:liftId', authenticateJWT, async (req, res) => {
  try {
    const lift = await prisma.userLift.findFirst({ where: { id: req.params.liftId, user_id: req.user!.userId } });
    if (!lift) return res.status(404).json({ error: 'Lift not found' });
    await prisma.userLift.update({ where: { id: lift.id }, data: { is_active: false } });
    res.json({ message: 'Lift removed from tracking' });
  } catch (error) {
    console.error('Delete lift error:', error);
    res.status(500).json({ error: 'Failed to delete lift' });
  }
});

// =============================================================================
// SET LOGGING
// =============================================================================

router.post('/:liftId/sets', authenticateJWT, async (req, res) => {
  try {
    const validated = logSetSchema.parse(req.body);
    const lift = await prisma.userLift.findFirst({ where: { id: req.params.liftId, user_id: req.user!.userId } });
    if (!lift) return res.status(404).json({ error: 'Lift not found' });

    const e1RM = calculateOneRepMax(validated.weight, validated.reps);
    const volume = validated.weight * validated.reps;

    const currentPR = await prisma.setLog.findFirst({
      where: { lift_id: lift.id, is_warmup: false },
      orderBy: { estimated_1rm: 'desc' },
    });

    const isPR = !validated.isWarmup && (!currentPR || e1RM > (currentPR.estimated_1rm || 0));

    const setLog = await prisma.setLog.create({
      data: {
        lift_id: lift.id,
        user_id: req.user!.userId,
        weight: validated.weight,
        reps: validated.reps,
        unit: validated.unit,
        rpe: validated.rpe,
        tempo: validated.tempo,
        rest_time: validated.restTime,
        set_number: validated.setNumber,
        is_warmup: validated.isWarmup,
        is_pr: isPR,
        notes: validated.notes,
        estimated_1rm: e1RM,
        volume,
        logged_at: validated.loggedAt ? new Date(validated.loggedAt) : new Date(),
      },
    });

    if (!validated.isWarmup) {
      await prisma.userLift.update({
        where: { id: lift.id },
        data: {
          working_weight: validated.weight,
          working_unit: validated.unit,
          one_rep_max: Math.max(lift.one_rep_max || 0, e1RM),
        },
      });
    }

    res.status(201).json({ setLog, isPR, estimated1RM: e1RM, volume });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: error.errors });
    console.error('Log set error:', error);
    res.status(500).json({ error: 'Failed to log set' });
  }
});

router.get('/:liftId/history', authenticateJWT, async (req, res) => {
  try {
    const { page = '1', limit = '50', includeWarmups = 'false' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const lift = await prisma.userLift.findFirst({ where: { id: req.params.liftId, user_id: req.user!.userId } });
    if (!lift) return res.status(404).json({ error: 'Lift not found' });

    const whereClause: any = { lift_id: lift.id };
    if (includeWarmups !== 'true') whereClause.is_warmup = false;

    const [sets, total] = await Promise.all([
      prisma.setLog.findMany({ where: whereClause, orderBy: { logged_at: 'desc' }, skip, take: limitNum }),
      prisma.setLog.count({ where: whereClause }),
    ]);

    res.json({
      sets,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasMore: skip + sets.length < total },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.delete('/:liftId/sets/:setId', authenticateJWT, async (req, res) => {
  try {
    const setLog = await prisma.setLog.findFirst({
      where: { id: req.params.setId, lift_id: req.params.liftId, user_id: req.user!.userId },
    });
    if (!setLog) return res.status(404).json({ error: 'Set not found' });
    await prisma.setLog.delete({ where: { id: setLog.id } });
    res.json({ message: 'Set deleted' });
  } catch (error) {
    console.error('Delete set error:', error);
    res.status(500).json({ error: 'Failed to delete set' });
  }
});

// =============================================================================
// ANALYTICS
// =============================================================================

router.get('/:liftId/analytics', authenticateJWT, async (req, res) => {
  try {
    const lift = await prisma.userLift.findFirst({ where: { id: req.params.liftId, user_id: req.user!.userId } });
    if (!lift) return res.status(404).json({ error: 'Lift not found' });

    const allSets = await prisma.setLog.findMany({
      where: { lift_id: lift.id, is_warmup: false },
      orderBy: { logged_at: 'asc' },
    });

    let currentMaxE1RM = 0;
    const prProgression = allSets
      .filter(s => (s.estimated_1rm || 0) > currentMaxE1RM)
      .map(s => {
        currentMaxE1RM = s.estimated_1rm || 0;
        return { date: s.logged_at, weight: s.weight, reps: s.reps, estimated1RM: s.estimated_1rm };
      });

    const weeklyVolume: Record<string, number> = {};
    allSets.forEach(set => {
      const week = getWeekStart(set.logged_at);
      weeklyVolume[week] = (weeklyVolume[week] || 0) + (set.volume || 0);
    });

    const setsWithRPE = allSets.filter(s => s.rpe !== null);
    const avgRPE = setsWithRPE.length > 0 ? setsWithRPE.reduce((sum, s) => sum + (s.rpe || 0), 0) / setsWithRPE.length : null;

    const repDistribution = { '1-3': 0, '4-6': 0, '7-10': 0, '11-15': 0, '16+': 0 };
    allSets.forEach(set => {
      if (set.reps <= 3) repDistribution['1-3']++;
      else if (set.reps <= 6) repDistribution['4-6']++;
      else if (set.reps <= 10) repDistribution['7-10']++;
      else if (set.reps <= 15) repDistribution['11-15']++;
      else repDistribution['16+']++;
    });

    res.json({
      lift,
      analytics: {
        totalSets: allSets.length,
        totalVolume: allSets.reduce((sum, s) => sum + (s.volume || 0), 0),
        currentE1RM: lift.one_rep_max,
        prCount: prProgression.length,
        prProgression,
        weeklyVolume: Object.entries(weeklyVolume).map(([week, volume]) => ({ week, volume })),
        averageRPE: avgRPE ? Math.round(avgRPE * 10) / 10 : null,
        repDistribution,
        firstLogDate: allSets[0]?.logged_at,
        lastLogDate: allSets[allSets.length - 1]?.logged_at,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

export default router;
