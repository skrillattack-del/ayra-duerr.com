import apiClient, {
  beginAuthTransition,
  clearAuthTokens,
  refreshAuthSession,
  setAuthToken,
  setRefreshToken,
} from '@/lib/apiClient'
import type { User as FitnessUser } from '@/types/fitness'

export interface RegisterDTO {
  email: string
  password: string
  display_name: string
}

export interface LoginDTO {
  email: string
  password: string
}

export interface AuthResponse {
  user: FitnessUser
  accessToken: string
  refreshToken: string
}

export type User = FitnessUser

type RawAuthResponse = {
  user: RawUser
  accessToken: string
  refreshToken: string
}

interface RawUser {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  role?: 'CLIENT' | 'TRAINER' | 'ADMIN' | string
  membership_tier?: 'FREE' | 'PAID' | string
  subscription_status?: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED' | string
  trial_ends_at?: string
  fitness_level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string
  goals?: string[]
  created_at: string
  updated_at?: string
}

const roleMap: Record<string, FitnessUser['role']> = {
  CLIENT: 'CLIENT',
  TRAINER: 'TRAINER',
  ADMIN: 'ADMIN',
}

const levelMap: Record<string, FitnessUser['fitness_level']> = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
}

const tierMap: Record<string, FitnessUser['membership_tier']> = {
  FREE: 'FREE',
  PAID: 'PAID',
}

function normalizeUser(raw: RawUser): FitnessUser {
  const normalizedRole = roleMap[raw.role?.toUpperCase() || ''] || 'CLIENT'
  const normalizedLevel = levelMap[raw.fitness_level?.toUpperCase() || ''] || 'BEGINNER'
  const normalizedTier = tierMap[raw.membership_tier?.toUpperCase() || ''] || 'FREE'
  return {
    id: raw.id,
    email: raw.email,
    display_name: raw.display_name,
    avatar_url: raw.avatar_url,
    role: normalizedRole,
    membership_tier: normalizedTier,
    subscription_status: raw.subscription_status as any,
    trial_ends_at: raw.trial_ends_at,
    fitness_level: normalizedLevel,
    goals: raw.goals || [],
    created_at: raw.created_at,
    updated_at: raw.updated_at || raw.created_at,
  }
}

function extractAuthResponse(response: any): AuthResponse {
  const payload: RawAuthResponse = response?.data || response
  return {
    ...payload,
    user: normalizeUser(payload.user),
  }
}

export const AuthRepository = {
  /**
   * Register new user
   */
  async register(data: RegisterDTO): Promise<AuthResponse> {
    const finishAuthTransition = await beginAuthTransition()
    try {
      const response = await apiClient.post<{ data: RawAuthResponse }>('/api/auth/register', data)
      const authData = extractAuthResponse(response)

      setAuthToken(authData.accessToken)
      setRefreshToken(authData.refreshToken)
      return authData
    } finally {
      finishAuthTransition()
    }
  },

  /**
   * Login user
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    const finishAuthTransition = await beginAuthTransition()
    try {
      const response = await apiClient.post<{ data: RawAuthResponse }>('/api/auth/login', data)
      const authData = extractAuthResponse(response)

      setAuthToken(authData.accessToken)
      setRefreshToken(authData.refreshToken)
      return authData
    } finally {
      finishAuthTransition()
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<{ accessToken: string; refreshToken?: string }> {
    return refreshAuthSession()
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const finishAuthTransition = await beginAuthTransition()
    try {
      await apiClient.post('/api/auth/logout')
    } finally {
      clearAuthTokens()
      finishAuthTransition()
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ data: { user: RawUser } }>('/api/auth/me')
    const payload = response.data || response
    return normalizeUser(payload.user)
  },

}
