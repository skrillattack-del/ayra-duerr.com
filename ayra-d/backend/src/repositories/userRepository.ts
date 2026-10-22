import prisma from '../db/client';
import { User, Role, FitnessLevel, MembershipTier, SubscriptionStatus } from '@prisma/client';

// User type without password_hash for safe returns
export type UserWithoutPassword = Omit<User, 'password_hash'>;

export interface CreateUserDTO {
  email: string;
  password_hash: string;
  display_name: string;
  role?: Role;
  fitness_level?: FitnessLevel;
  goals?: string[];
}

export interface UpdateUserDTO {
  display_name?: string;
  avatar_url?: string;
  fitness_level?: FitnessLevel;
  goals?: string[];
}

// Shared select clause — every method returns the same shape so the
// UserWithoutPassword type is satisfied even after schema additions.
const userSelect = {
  id: true,
  email: true,
  display_name: true,
  avatar_url: true,
  role: true,
  membership_tier: true,
  subscription_status: true,
  trial_ends_at: true,
  is_active: true,
  fitness_level: true,
  goals: true,
  created_at: true,
  updated_at: true,
  stripe_customer_id: true,
  stripe_subscription_id: true,
  stripe_price_id: true,
  current_period_end: true,
  cancel_at_period_end: true,
  community_muted_until: true,
  community_mute_reason: true,
  community_muted_by: true,
} as const;

export const userRepository = {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    return prisma.user.findUnique({
      where: { email },
    }) as Promise<(User & { password_hash: string }) | null>;
  },

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserWithoutPassword | null> {
    return prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
  },

  /**
   * Create new user
   */
  async create(data: CreateUserDTO): Promise<UserWithoutPassword> {
    return prisma.user.create({
      data: {
        email: data.email,
        password_hash: data.password_hash,
        display_name: data.display_name,
        role: data.role || 'CLIENT',
        fitness_level: data.fitness_level || 'BEGINNER',
        goals: data.goals || [],
      },
      select: userSelect,
    });
  },

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDTO): Promise<UserWithoutPassword> {
    return prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  },

  /**
   * Update membership tier (admin only)
   */
  async updateMembership(id: string, membership_tier: MembershipTier, subscription_status?: SubscriptionStatus): Promise<UserWithoutPassword> {
    return prisma.user.update({
      where: { id },
      data: { membership_tier, subscription_status },
      select: userSelect,
    });
  },

  async updateAccessMode(
    id: string,
    data: { role: Role; membership_tier: MembershipTier }
  ): Promise<UserWithoutPassword> {
    return prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  },

  /**
   * Update role (self-service redeem-code grant, or admin tooling)
   */
  async updateRole(id: string, role: Role): Promise<UserWithoutPassword> {
    return prisma.user.update({
      where: { id },
      data: { role },
      select: userSelect,
    });
  },

  /**
   * Enable or disable a user's account (admin tooling). Disabled users are
   * blocked at login and on their next refresh-token exchange.
   */
  async setActive(id: string, is_active: boolean): Promise<UserWithoutPassword> {
    return prisma.user.update({
      where: { id },
      data: { is_active },
      select: userSelect,
    });
  },

  /**
   * Delete user (hard delete). For disabling an account without erasing
   * data, use setActive instead.
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  },

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
    });
  },
};