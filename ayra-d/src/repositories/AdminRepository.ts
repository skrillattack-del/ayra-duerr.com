import apiClient from '@/lib/apiClient'

export type AdminRole = 'ADMIN' | 'TRAINER' | 'CLIENT'

export interface AdminUser {
  id: string
  email: string
  display_name: string
  role: AdminRole
  is_active: boolean
  created_at: string
  updated_at: string
  last_active_at?: string | null
}

export interface AdminStats {
  totalUsers: number
  activeToday: number
  totalChallenges: number
  totalProgressLogs: number
  progressLogsToday: number
}

export type AdminActivityType = 'progress' | 'signup' | 'create' | 'admin' | string

export interface AdminActivity {
  id: string
  type: AdminActivityType
  message: string
  timestamp: string
}

function extractPayload<T>(response: any): T {
  return (response?.data || response) as T
}

export const AdminRepository = {
  async getStats(): Promise<AdminStats> {
    const response = await apiClient.get<{ data: AdminStats }>('/api/admin/stats')
    return extractPayload<AdminStats>(response)
  },

  async getUsers(params: {
    search?: string
    role?: AdminRole | string
    take?: number
    skip?: number
  }): Promise<{ users: AdminUser[]; total: number; take: number; skip: number }> {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.role) query.set('role', params.role)
    if (typeof params.take === 'number') query.set('take', String(params.take))
    if (typeof params.skip === 'number') query.set('skip', String(params.skip))

    const suffix = query.toString() ? `?${query.toString()}` : ''
    const response = await apiClient.get<{ data: { users: AdminUser[]; total: number; take: number; skip: number } }>(
      `/api/admin/users${suffix}`
    )

    return extractPayload(response)
  },

  async getActivity(limit = 12): Promise<AdminActivity[]> {
    const query = new URLSearchParams({ limit: String(limit) })
    const response = await apiClient.get<{ data: AdminActivity[] }>(`/api/admin/activity?${query.toString()}`)
    return extractPayload(response)
  },

  async updateUserRole(userId: string, role: AdminRole): Promise<AdminUser> {
    const response = await apiClient.put<{ data: AdminUser }>(`/api/admin/users/${userId}/role`, { role })
    return extractPayload(response)
  },

  async updateUserStatus(userId: string, is_active: boolean): Promise<AdminUser> {
    const response = await apiClient.put<{ data: AdminUser }>(`/api/admin/users/${userId}/status`, { is_active })
    return extractPayload(response)
  },

  // ---- Community moderation ---------------------------------------------------

  async getReports(status = 'OPEN', take = 25, skip = 0): Promise<{ reports: CommunityReport[]; total: number }> {
    return apiClient.get(`/api/admin/community/reports?status=${status}&take=${take}&skip=${skip}`)
  },

  async resolveReport(
    reportId: string,
    input: { status: 'RESOLVED' | 'DISMISSED'; resolution_note?: string; deleteMessage?: boolean; muteMinutes?: number },
  ): Promise<void> {
    await apiClient.patch(`/api/admin/community/reports/${reportId}`, input)
  },

  async getCommunityMessages(params: { search?: string; take?: number; skip?: number } = {}): Promise<{ messages: any[]; total: number }> {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (typeof params.take === 'number') query.set('take', String(params.take))
    if (typeof params.skip === 'number') query.set('skip', String(params.skip))
    return apiClient.get(`/api/admin/community/messages?${query}`)
  },

  async deleteCommunityMessage(messageId: string, reason?: string): Promise<void> {
    await apiClient.delete(`/api/admin/community/messages/${messageId}`)
    void reason
  },

  async getCommunityMedia(take = 30, skip = 0): Promise<{ items: CommunityMediaItem[] }> {
    return apiClient.get(`/api/admin/community/media?take=${take}&skip=${skip}`)
  },

  async deleteCommunityMedia(messageId: string, url: string): Promise<void> {
    // apiClient.delete has no body support; the backend accepts DELETE with JSON via fetch,
    // so use a POST-style request through apiClient's underlying request options.
    await apiClient.post('/api/admin/community/media/delete', { messageId, url })
  },

  async muteCommunityUser(userId: string, minutes: number, reason?: string): Promise<void> {
    await apiClient.post(`/api/admin/community/users/${userId}/mute`, { minutes, reason })
  },

  async unmuteCommunityUser(userId: string): Promise<void> {
    await apiClient.delete(`/api/admin/community/users/${userId}/mute`)
  },

  async getMutedUsers(): Promise<{ users: MutedUser[] }> {
    return apiClient.get('/api/admin/community/muted')
  },

  async updateBusinessProfile(data: {
    name: string
    address?: string
    phone?: string
    email?: string
    hours?: string
    mapsEmbedUrl?: string
  }): Promise<void> {
    await apiClient.put('/api/admin/site/business-profile', data)
  },
}

export interface CommunityReport {
  id: string
  reason: string
  details: string | null
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED'
  created_at: string
  resolution_note: string | null
  reporter: { id: string; display_name: string; avatar_url: string | null }
  message: {
    id: string
    content: string
    media_urls: string[]
    is_deleted: boolean
    created_at: string
    sender: { id: string; display_name: string; avatar_url: string | null; community_muted_until: string | null }
  }
}

export interface CommunityMediaItem {
  messageId: string
  url: string
  isDeleted: boolean
  created_at: string
  sender: { id: string; display_name: string; avatar_url: string | null }
}

export interface MutedUser {
  id: string
  display_name: string
  avatar_url: string | null
  community_muted_until: string
  community_mute_reason: string | null
  community_muted_by: string | null
}
