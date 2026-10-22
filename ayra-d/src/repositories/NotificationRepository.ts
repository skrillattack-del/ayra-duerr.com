import { apiClient } from '@/lib/apiClient'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  ref_id: string | null
  read_at: string | null
  created_at: string
  actor: { id: string; display_name: string; avatar_url: string | null } | null
}

export const NotificationRepository = {
  async list(cursor?: string, unreadOnly = false): Promise<{ notifications: AppNotification[]; nextCursor: string | null; hasMore: boolean }> {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (unreadOnly) params.set('unreadOnly', '1')
    return apiClient.get(`/api/notifications?${params}`)
  },

  async unreadCount(): Promise<number> {
    const data = await apiClient.get<{ count: number }>('/api/notifications/unread-count')
    return data.count
  },

  async markRead(ids?: string[]): Promise<void> {
    await apiClient.post('/api/notifications/read', ids && ids.length > 0 ? { ids } : {})
  },
}

