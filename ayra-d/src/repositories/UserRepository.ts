import apiClient, { setAuthToken, setRefreshToken } from '@/lib/apiClient'
import type { User } from '@/types/fitness'

export interface UpdateProfileDTO {
  display_name?: string
  fitness_level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  goals?: string[]
}

export interface UpdatePlanResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export type AccessMode = 'FREE' | 'PAID' | 'ADMIN'

export const UserRepository = {
  async getMe(): Promise<User> {
    const res = await apiClient.get<{ user: User }>('/api/users/me')
    return res.user
  },

  async updatePlan(membership_tier: 'FREE' | 'PAID'): Promise<UpdatePlanResponse> {
    const res = await apiClient.patch<UpdatePlanResponse>('/api/users/me/plan', { membership_tier })
    setAuthToken(res.accessToken)
    if (res.refreshToken) setRefreshToken(res.refreshToken)
    return res
  },

  async updateAccessMode(mode: AccessMode, code?: string): Promise<UpdatePlanResponse> {
    const res = await apiClient.patch<UpdatePlanResponse>('/api/users/me/access-mode', { mode, code })
    setAuthToken(res.accessToken)
    if (res.refreshToken) setRefreshToken(res.refreshToken)
    return res
  },

  async redeemCode(code: string): Promise<UpdatePlanResponse> {
    const res = await apiClient.post<UpdatePlanResponse>('/api/users/me/redeem-code', { code })
    setAuthToken(res.accessToken)
    if (res.refreshToken) setRefreshToken(res.refreshToken)
    return res
  },

  async updateProfile(data: UpdateProfileDTO): Promise<User> {
    const res = await apiClient.patch<{ user: User }>('/api/users/me', data)
    return res.user
  },

  async uploadAvatar(file: File): Promise<{ user: User; key: string }> {
    const formData = new FormData()
    formData.append('avatar', file)

    return apiClient.postFormData<{ user: User; key: string }>('/api/users/me/avatar', formData)
  },
}
