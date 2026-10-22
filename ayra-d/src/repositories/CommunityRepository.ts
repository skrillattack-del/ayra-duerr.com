import { apiClient } from '@/lib/apiClient'

// =============================================================================
// TYPES
// =============================================================================

export interface Channel {
  id: string
  slug: string | null
  name: string
  description: string | null
  emoji: string | null
  required_tier: 'FREE' | 'PAID'
  posting_policy: 'EVERYONE' | 'ADMIN_ONLY'
  is_default: boolean
  sort_order: number
  locked: boolean
  canPost: boolean
}

export interface RawMessagePage {
  messages: any[]
  nextCursor: string | null
  hasMore: boolean
}

export interface Squad {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  owner_id: string
  visibility: 'PUBLIC' | 'INVITE_ONLY' | 'PRIVATE'
  max_members: number
  memberCount: number
  unreadCount?: number
  role?: string
  isMember?: boolean
  isFull?: boolean
}

export interface SquadInvite {
  id: string
  squad: { id: string; name: string; description: string | null; avatar_url: string | null }
  inviter: { id: string; display_name: string; avatar_url: string | null }
  created_at: string
}

export interface UserStatsData {
  xp: number
  level: number
  current_streak: number
  longest_streak: number
  messages_sent: number
  reactions_given: number
  reactions_received: number
  workouts_completed: number
  squads_joined: number
  friends_count: number
}

export interface AchievementEntry {
  id: string
  name: string
  description: string
  icon: string
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'LEGENDARY'
  category: string
  criteria: { metric?: string; gte?: number } | null
  earned: boolean
  earnedAt: string | null
}

export interface CommunityProfile {
  stats: UserStatsData
  levelProgress: { level: number; xpIntoLevel: number; xpForNextLevel: number }
  achievements: AchievementEntry[]
}

export interface LeaderboardEntry {
  rank: number
  xp: number
  user: {
    id: string
    display_name: string
    avatar_url: string | null
    role: string
    membership_tier: string
    stats?: { level: number; current_streak?: number } | null
  }
}

export interface Leaderboard {
  period: 'week' | 'all'
  entries: LeaderboardEntry[]
  me: { xp: number; rank: number }
}

export interface Conversation {
  peer: {
    id: string
    display_name: string
    avatar_url: string | null
    role?: string
    membership_tier?: string
    stats?: { level: number } | null
  }
  lastMessage: {
    id: string
    content: string
    sender_id: string
    media_urls: string[]
    created_at: string
  }
  unreadCount: number
}

export interface UserSearchResult {
  id: string
  display_name: string
  avatar_url: string | null
  role: string
  membership_tier: string
  stats?: { level: number } | null
}

export interface SendMessageInput {
  content: string
  mediaUrls?: string[]
  parentId?: string
  mentions?: string[]
}

// =============================================================================
// REPOSITORY
// =============================================================================

export const CommunityRepository = {
  // ---- Channels -------------------------------------------------------------
  async getChannels(): Promise<Channel[]> {
    const data = await apiClient.get<{ channels: Channel[] }>('/api/community/channels')
    return data.channels
  },

  async getChannelMessages(channelId: string, cursor?: string): Promise<RawMessagePage> {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    return apiClient.get<RawMessagePage>(`/api/community/channels/${channelId}/messages?${params}`)
  },

  async getPinnedMessages(channelId: string): Promise<{ messages: any[] }> {
    return apiClient.get<{ messages: any[] }>(`/api/community/channels/${channelId}/messages?pinned=1`)
  },

  async sendChannelMessage(channelId: string, input: SendMessageInput): Promise<any> {
    const data = await apiClient.post<{ message: any }>(`/api/community/channels/${channelId}/messages`, input)
    return data.message
  },

  // ---- Messages (shared actions) --------------------------------------------
  async getThread(messageId: string): Promise<{ parent: any; replies: any[] }> {
    return apiClient.get<{ parent: any; replies: any[] }>(`/api/messages/${messageId}/thread`)
  },

  async editMessage(messageId: string, content: string): Promise<any> {
    const data = await apiClient.patch<{ message: any }>(`/api/messages/${messageId}`, { content })
    return data.message
  },

  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/api/messages/${messageId}`)
  },

  async toggleReaction(messageId: string, emoji: string): Promise<{ action: 'added' | 'removed' }> {
    return apiClient.post<{ action: 'added' | 'removed'; emoji: string }>(`/api/messages/${messageId}/reactions`, { emoji })
  },

  async reportMessage(messageId: string, reason: string, details?: string): Promise<void> {
    await apiClient.post(`/api/messages/${messageId}/report`, { reason, details })
  },

  async pinMessage(messageId: string): Promise<void> {
    await apiClient.post(`/api/messages/${messageId}/pin`)
  },

  async unpinMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/api/messages/${messageId}/pin`)
  },

  // ---- Squads ----------------------------------------------------------------
  async getMySquads(): Promise<Squad[]> {
    const data = await apiClient.get<{ squads: Squad[] }>('/api/messages/squads')
    return data.squads
  },

  async discoverSquads(q?: string): Promise<Squad[]> {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    const data = await apiClient.get<{ squads: Squad[] }>(`/api/messages/squads/discover?${params}`)
    return data.squads
  },

  async createSquad(input: { name: string; description?: string; visibility?: string; maxMembers?: number }): Promise<Squad> {
    const data = await apiClient.post<{ squad: Squad }>('/api/messages/squads', input)
    return data.squad
  },

  async getSquad(squadId: string): Promise<{ squad: any; messages: any[]; membership: any }> {
    return apiClient.get(`/api/messages/squads/${squadId}`)
  },

  async joinSquad(squadId: string): Promise<void> {
    await apiClient.post(`/api/messages/squads/${squadId}/join`)
  },

  async leaveSquad(squadId: string): Promise<void> {
    await apiClient.delete(`/api/messages/squads/${squadId}/leave`)
  },

  async inviteToSquad(squadId: string, userId: string): Promise<void> {
    await apiClient.post(`/api/messages/squads/${squadId}/invite`, { userId })
  },

  async getSquadInvites(): Promise<SquadInvite[]> {
    const data = await apiClient.get<{ invites: SquadInvite[] }>('/api/messages/squads/invites')
    return data.invites
  },

  async declineSquadInvite(inviteId: string): Promise<void> {
    await apiClient.post(`/api/messages/squads/invites/${inviteId}/decline`)
  },

  async markSquadSeen(squadId: string): Promise<void> {
    await apiClient.post(`/api/messages/squads/${squadId}/seen`)
  },

  async sendSquadMessage(squadId: string, input: SendMessageInput): Promise<any> {
    const data = await apiClient.post<{ message: any }>('/api/messages', {
      content: input.content,
      channelType: 'SQUAD',
      squadId,
      mediaUrls: input.mediaUrls,
      parentId: input.parentId,
    })
    return data.message
  },

  // ---- Direct messages --------------------------------------------------------
  async getConversations(): Promise<Conversation[]> {
    const data = await apiClient.get<{ conversations: Conversation[] }>('/api/messages/conversations')
    return data.conversations
  },

  async getDirectMessages(peerId: string, cursor?: string): Promise<RawMessagePage> {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    return apiClient.get<RawMessagePage>(`/api/messages/direct/${peerId}?${params}`)
  },

  async sendDirectMessage(peerId: string, input: SendMessageInput): Promise<any> {
    const data = await apiClient.post<{ message: any }>('/api/messages', {
      content: input.content,
      channelType: 'DIRECT',
      recipientId: peerId,
      mediaUrls: input.mediaUrls,
      parentId: input.parentId,
    })
    return data.message
  },

  async markConversationRead(peerId: string): Promise<void> {
    await apiClient.post(`/api/messages/direct/${peerId}/read`)
  },

  // ---- Gamification -----------------------------------------------------------
  async getProfile(): Promise<CommunityProfile> {
    return apiClient.get<CommunityProfile>('/api/community/me')
  },

  async getLeaderboard(period: 'week' | 'all' = 'week'): Promise<Leaderboard> {
    return apiClient.get<Leaderboard>(`/api/community/leaderboard?period=${period}`)
  },

  async getUserStats(userId: string): Promise<any> {
    return apiClient.get(`/api/community/users/${userId}/stats`)
  },

  // ---- Users -------------------------------------------------------------------
  async searchUsers(q: string): Promise<UserSearchResult[]> {
    const data = await apiClient.get<{ users: UserSearchResult[] }>(`/api/users/search?q=${encodeURIComponent(q)}`)
    return data.users
  },
}

