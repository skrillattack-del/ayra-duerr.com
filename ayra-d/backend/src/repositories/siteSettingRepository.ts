import prisma from '../db/client';

export const siteSettingRepository = {
  async get(key: string): Promise<string | null> {
    const setting = await prisma.siteSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  },

  async set(key: string, value: string, updatedBy?: string): Promise<void> {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value, updated_by: updatedBy },
      create: { key, value, updated_by: updatedBy },
    });
  },
};