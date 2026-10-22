import { apiClient } from '@/lib/apiClient'

export interface FriendUser {
  id: string
  display_name: string
  avatar_url: string | null
  role: string
  membership_tier: string
  stats?: { level: number } | null
}

export interface FriendEntry {
  friendshipId: string
  since: string | null
  user: FriendUser
}

export interface FriendRequestEntry {
  friendshipId: string
  createdAt: string
  user: FriendUser
}

export const FriendRepository = {
  async getFriends(): Promise<FriendEntry[]> {
    const data = await apiClient.get<{ friends: FriendEntry[] }>('/api/friends')
    return data.friends
  },

  async getRequests(): Promise<{ incoming: FriendRequestEntry[]; outgoing: FriendRequestEntry[] }> {
    return apiClient.get('/api/friends/requests')
  },

  async sendRequest(userId: string): Promise<void> {
    await apiClient.post('/api/friends/requests', { userId })
  },

  async acceptRequest(friendshipId: string): Promise<void> {
    await apiClient.post(`/api/friends/requests/${friendshipId}/accept`)
  },

  async declineRequest(friendshipId: string): Promise<void> {
    await apiClient.post(`/api/friends/requests/${friendshipId}/decline`)
  },

  async unfriend(friendshipId: string): Promise<void> {
    await apiClient.delete(`/api/friends/${friendshipId}`)
  },

  async block(friendshipId: string): Promise<void> {
    await apiClient.post(`/api/friends/${friendshipId}/block`)
  },
}

