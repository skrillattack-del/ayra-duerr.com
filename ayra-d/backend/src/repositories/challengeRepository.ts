import prisma from '../db/client';
import { Challenge, Category, ChallengeType } from '@prisma/client';

export interface CreateChallengeDTO {
  name: string;
  description?: string;
  category: Category;
  type: ChallengeType;
  goal_value: number;
  goal_unit: string;
  start_date: Date;
  end_date: Date;
  created_by: string;
}

export interface UpdateChallengeDTO {
  name?: string;
  description?: string;
  category?: Category;
  type?: ChallengeType;
  goal_value?: number;
  goal_unit?: string;
  start_date?: Date;
  end_date?: Date;
  is_active?: boolean;
}

export const challengeRepository = {
  /**
   * List all active challenges
   */
  async listActive(): Promise<Challenge[]> {
    return prisma.challenge.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
      include: {
        creator: {
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
   * Get challenge by ID
   */
  async findById(id: string): Promise<Challenge | null> {
    return prisma.challenge.findUnique({
      where: { id },
      include: {
        creator: {
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
   * Create new challenge
   */
  async create(data: CreateChallengeDTO): Promise<Challenge> {
    return prisma.challenge.create({
      data,
      include: {
        creator: {
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
   * Update challenge
   */
  async update(id: string, data: UpdateChallengeDTO): Promise<Challenge> {
    return prisma.challenge.update({
      where: { id },
      data,
      include: {
        creator: {
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
   * Delete challenge (soft delete)
   */
  async delete(id: string): Promise<void> {
    await prisma.challenge.update({
      where: { id },
      data: { is_active: false },
    });
  },

  /**
   * Add user to challenge participants
   */
  async join(challengeId: string, userId: string): Promise<Challenge> {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const participants = challenge.participants.includes(userId)
      ? challenge.participants
      : [...challenge.participants, userId];

    return prisma.challenge.update({
      where: { id: challengeId },
      data: { participants },
      include: {
        creator: {
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
   * Remove user from challenge participants
   */
  async leave(challengeId: string, userId: string): Promise<Challenge> {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const participants = challenge.participants.filter(id => id !== userId);

    return prisma.challenge.update({
      where: { id: challengeId },
      data: { participants },
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    });
  },
};


