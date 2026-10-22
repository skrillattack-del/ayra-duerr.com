import prisma from '../db/client';

export interface CreateProgramDTO {
  user_id?: string;
  name: string;
  description?: string;
  duration_weeks: number;
  difficulty: string;
  is_public?: boolean;
  weeks: Array<{
    week_number: number;
    focus?: string;
    workouts: Array<{
      template_id: string;
      day_of_week: number;
      order_index?: number;
      notes?: string;
    }>;
  }>;
}

export interface UpdateProgramDTO {
  name?: string;
  description?: string;
  duration_weeks?: number;
  difficulty?: string;
  is_public?: boolean;
  is_active?: boolean;
}

export const programRepository = {
  async listPrograms(userId: string, includePublic = false) {
    return prisma.program.findMany({
      where: {
        is_active: true,
        OR: includePublic
          ? [{ user_id: userId }, { is_public: true }]
          : [{ user_id: userId }],
      },
      include: {
        weeks: {
          include: {
            workouts: {
              include: { template: true },
              orderBy: [{ day_of_week: 'asc' }, { order_index: 'asc' }],
            },
          },
          orderBy: { week_number: 'asc' },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  },

  async findProgramById(id: string) {
    return prisma.program.findUnique({
      where: { id },
      include: {
        weeks: {
          include: {
            workouts: {
              include: { template: true },
              orderBy: [{ day_of_week: 'asc' }, { order_index: 'asc' }],
            },
          },
          orderBy: { week_number: 'asc' },
        },
        _count: { select: { enrollments: true } },
      },
    });
  },

  async createProgram(data: CreateProgramDTO) {
    return prisma.program.create({
      data: {
        user_id: data.user_id || null,
        name: data.name,
        description: data.description,
        duration_weeks: data.duration_weeks,
        difficulty: data.difficulty as any,
        is_public: data.is_public || false,
        weeks: {
          create: data.weeks.map((week) => ({
            week_number: week.week_number,
            focus: week.focus,
            workouts: {
              create: week.workouts.map((workout) => ({
                template_id: workout.template_id,
                day_of_week: workout.day_of_week,
                order_index: workout.order_index || 0,
                notes: workout.notes,
              })),
            },
          })),
        },
      },
      include: {
        weeks: {
          include: {
            workouts: { include: { template: true } },
          },
        },
      },
    });
  },

  async updateProgram(id: string, data: UpdateProgramDTO) {
    return prisma.program.update({
      where: { id },
      data: data as any,
    });
  },

  async deleteProgram(id: string) {
    return prisma.program.update({
      where: { id },
      data: { is_active: false },
    });
  },

  async enrollUser(userId: string, programId: string) {
    return prisma.userProgram.upsert({
      where: { user_id_program_id: { user_id: userId, program_id: programId } },
      create: {
        user_id: userId,
        program_id: programId,
        status: 'ACTIVE',
      },
      update: { status: 'ACTIVE' },
    });
  },

  async getUserPrograms(userId: string) {
    return prisma.userProgram.findMany({
      where: { user_id: userId },
      include: {
        program: {
          include: {
            weeks: {
              include: {
                workouts: { include: { template: true } },
              },
            },
          },
        },
      },
      orderBy: { started_at: 'desc' },
    });
  },

  async getCalendar(userId: string, start: Date, end: Date) {
    const [scheduled, enrollments] = await Promise.all([
      prisma.scheduledWorkout.findMany({
        where: { user_id: userId, scheduled_for: { gte: start, lte: end } },
        include: { template: true },
        orderBy: { scheduled_for: 'asc' },
      }),
      prisma.userProgram.findMany({
        where: { user_id: userId, status: 'ACTIVE' },
        include: {
          program: {
            include: {
              weeks: {
                include: {
                  workouts: { include: { template: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    // Build calendar events from enrolled programs
    const events: any[] = scheduled.map((s) => ({
      id: s.id,
      type: 'scheduled',
      date: s.scheduled_for,
      title: s.custom_name || s.template?.name || 'Workout',
      template: s.template,
      status: s.status,
    }));

    for (const enrollment of enrollments) {
      const started = enrollment.started_at;
      for (const week of enrollment.program.weeks) {
        for (const workout of week.workouts) {
          const dayOffset = (week.week_number - 1) * 7 + workout.day_of_week;
          const date = new Date(started);
          date.setDate(date.getDate() + dayOffset);
          if (date >= start && date <= end) {
            events.push({
              id: `${enrollment.id}-${week.id}-${workout.id}`,
              type: 'program',
              date,
              title: workout.template?.name || 'Program workout',
              template: workout.template,
              programName: enrollment.program.name,
              week: week.week_number,
            });
          }
        }
      }
    }

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return events;
  },
};
