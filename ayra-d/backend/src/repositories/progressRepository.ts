import prisma from '../db/client';
import { ProgressLog } from '@prisma/client';

export interface CreateProgressLogDTO {
  user_id: string;
  challenge_id: string;
  value: number;
  unit: string;
  notes?: string;
  photo_url?: string;
}

export interface UpdateProgressLogDTO {
  value?: number;
  unit?: string;
  notes?: string;
  photo_url?: string;
}

export const progressRepository = {
  /**
   * List progress logs by challenge
   */
  async listByChallenge(challengeId: string): Promise<(ProgressLog & { user: any })[]> {
    return prisma.progressLog.findMany({
      where: { challenge_id: challengeId },
      orderBy: { logged_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    });
  },

  /**
   * List progress logs by user
   */
  async listByUser(userId: string): Promise<(ProgressLog & { challenge: any })[]> {
    return prisma.progressLog.findMany({
      where: { user_id: userId },
      orderBy: { logged_at: 'desc' },
      include: {
        challenge: {
          select: {
            id: true,
            name: true,
            category: true,
            goal_unit: true,
          },
        },
      },
    });
  },

  /**
   * Get progress log by ID
   */
  async findById(id: string): Promise<(ProgressLog & { user: any; challenge: any }) | null> {
    return prisma.progressLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
        challenge: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });
  },

  /**
   * Create new progress log
   */
  async create(data: CreateProgressLogDTO): Promise<ProgressLog & { user: any }> {
    return prisma.progressLog.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    });
  },

  /**
   * Update progress log
   */
  async update(id: string, data: UpdateProgressLogDTO): Promise<ProgressLog & { user: any }> {
    return prisma.progressLog.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    });
  },

  /**
   * Delete progress log
   */
  async delete(id: string): Promise<void> {
    await prisma.progressLog.delete({
      where: { id },
    });
  },

  /**
   * Get total progress for user in challenge
   */
  async getTotalProgress(challengeId: string, userId: string): Promise<number> {
    const logs = await prisma.progressLog.findMany({
      where: {
        challenge_id: challengeId,
        user_id: userId,
      },
      select: { value: true },
    });

    return logs.reduce((sum, log) => sum + log.value, 0);
  },

  /**
   * Get progress statistics for challenge
   */
  async getProgressStats(challengeId: string): Promise<{
    totalEntries: number;
    totalValue: number;
    averageValue: number;
    uniqueUsers: number;
  }> {
    const logs = await prisma.progressLog.findMany({
      where: { challenge_id: challengeId },
      select: {
        value: true,
        user_id: true,
      },
    });

    const totalEntries = logs.length;
    const totalValue = logs.reduce((sum, log) => sum + log.value, 0);
    const averageValue = totalEntries > 0 ? totalValue / totalEntries : 0;
    const uniqueUsers = new Set(logs.map(log => log.user_id)).size;

    return {
      totalEntries,
      totalValue,
      averageValue,
      uniqueUsers,
    };
  },
};


