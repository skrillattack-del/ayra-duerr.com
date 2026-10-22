import prisma from '../db/client';
import { BodyMeasurement } from '@prisma/client';

export interface CreateBodyMeasurementDTO {
  user_id: string;
  weight?: number;
  body_fat?: number;
  weight_unit?: string;
  notes?: string;
}

export interface UpdateBodyMeasurementDTO {
  weight?: number;
  body_fat?: number;
  weight_unit?: string;
  notes?: string;
}

export const bodyMetricsRepository = {
  async listByUser(userId: string): Promise<BodyMeasurement[]> {
    return prisma.bodyMeasurement.findMany({
      where: { user_id: userId },
      orderBy: { logged_at: 'desc' },
    });
  },

  async findById(id: string): Promise<BodyMeasurement | null> {
    return prisma.bodyMeasurement.findUnique({
      where: { id },
    });
  },

  async create(data: CreateBodyMeasurementDTO): Promise<BodyMeasurement> {
    return prisma.bodyMeasurement.create({
      data,
    });
  },

  async update(id: string, data: UpdateBodyMeasurementDTO): Promise<BodyMeasurement> {
    return prisma.bodyMeasurement.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.bodyMeasurement.delete({
      where: { id },
    });
  },
};
