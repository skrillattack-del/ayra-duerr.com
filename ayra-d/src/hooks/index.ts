import { useState, useEffect, useCallback, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { initSocket, getSocket } from '@/lib/socketClient'
import { CommunityRepository, type SendMessageInput } from '@/repositories/CommunityRepository'
import { API_URL, AUTH_TOKEN_UPDATED_EVENT } from '@/lib/apiClient'

// =============================================================================
// MESSAGE TYPE + TRANSFORM
// =============================================================================

export interface Message {
  id: string
  content: string
  senderId: string
  sender: {
    id: string
    displayName: string
    avatarUrl: string | null
    role: string
    membershipTier: string
    level: number | null
  }
  channelType: 'GLOBAL' | 'SQUAD' | 'DIRECT' | 'TRAINER' | 'TEXT'
  channelId: string | null
  squadId: string | null
  recipientId: string | null
  parentId: string | null
  mediaUrls: string[]
  mentions: string[]
  isEdited: boolean
  editedAt: string | null
  isDeleted: boolean
  isSystem: boolean
  isPinned: boolean
  createdAt: string
  reactionSummary: Record<string, { count: number; hasReacted: boolean }>
  replyCount: number
}

// Transform backend snake_case to frontend camelCase
export function transformMessage(raw: any): Message {
  return {
    id: raw.id,
    content: raw.content,
    senderId: raw.sender_id,
    sender: {
      id: raw.sender?.id || '',
      displayName: raw.sender?.display_name || 'Unknown',
      avatarUrl: raw.sender?.avatar_url || null,
      role: raw.sender?.role || 'CLIENT',
      membershipTier: raw.sender?.membership_tier || 'FREE',
      level: raw.sender?.stats?.level ?? null,
    },
    channelType: raw.channel_type,
    channelId: raw.channel_id ?? null,
    squadId: raw.squad_id ?? null,
    recipientId: raw.recipient_id ?? null,
    parentId: raw.parent_id ?? null,
    mediaUrls: raw.media_urls || [],
    mentions: raw.mentions || [],
    isEdited: raw.is_edited || false,
    editedAt: raw.edited_at ?? null,
    isDeleted: raw.is_deleted || false,
    isSystem: raw.is_system || false,
    isPinned: raw.is_pinned || false,
    createdAt: raw.created_at,
    reactionSummary: raw.reactionSummary || raw.reaction_summary || {},
    replyCount: raw._count?.replies ?? 0,
  }
}

// =============================================================================
// SHARED FEED STATE HELPERS
// =============================================================================

function applyReaction(
  messages: Message[],
  payload: { messageId: string; emoji: string; userId: string; action: 'added' | 'removed' },
  currentUserId: string,
): Message[] {
  return messages.map((m) => {
    if (m.id !== payload.messageId) return m
    const summary = { ...m.reactionSummary }
    const entry = summary[payload.emoji] || { count: 0, hasReacted: false }
    if (payload.action === 'added') {
      summary[payload.emoji] = {
        count: entry.count + 1,
        hasReacted: entry.hasReacted || payload.userId === currentUserId,
      }
    } else {
      const nextCount = Math.max(0, entry.count - 1)
      if (nextCount === 0) {
        delete summary[payload.emoji]
      } else {
        summary[payload.emoji] = {
          count: nextCount,
          hasReacted: payload.userId === currentUserId ? false : entry.hasReacted,
        }
      }
    }
    return { ...m, reactionSummary: summary }
  })
}

export interface TypingUser {
  userId: string
  displayName: string
}

export interface Feed {
  messages: Message[]
  loading: boolean
  error: string | null
  hasMore: boolean
  sendMessage: (content: string, opts?: Omit<SendMessageInput, 'content'>) => Promise<Message>
  addReaction: (messageId: string, emoji: string) => Promise<void>
  loadMore: () => void
  refresh: () => void
  typingUsers: TypingUser[]
  emitTyping: () => void
  connected: boolean
}

function useSocketInstance(enabled = true): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null)
  useEffect(() => {
    if (!enabled) {
      setSocket(null)
      return
    }

    const attachSocket = () => {
      let token: string | null = null
      try {
        token = localStorage.getItem('accessToken')
      } catch {
        // Cookie-only sessions cannot authenticate the Socket.io handshake.
      }
      if (!token) return
      try {
        setSocket(initSocket())
      } catch {
        setSocket(null)
      }
    }

    attachSocket()
    window.addEventListener(AUTH_TOKEN_UPDATED_EVENT, attachSocket)
    return () => window.removeEventListener(AUTH_TOKEN_UPDATED_EVENT, attachSocket)
  }, [enabled])
  return socket
}

function useConnected(socket: Socket | null): boolean {
  const [connected, setConnected] = useState(socket?.connected ?? false)
  useEffect(() => {
    if (!socket) {
      setConnected(false)
      return
    }
    setConnected(socket.connected)
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [socket])
  return connected
}

function useTypingState(
  socket: Socket | null,
  scope: 'channel' | 'squad' | 'dm',
  scopeId: string | null,
  currentUserId: string,
): TypingUser[] {
  const [typing, setTyping] = useState<Record<string, { displayName: string; expires: number }>>({})

  useEffect(() => {
    setTyping({})
    if (!socket || !scopeId) return

    const matches = (payload: any) => {
      if (scope === 'channel') return payload.channelId === scopeId
      if (scope === 'squad') return payload.squadId === scopeId
      return payload.dmUserId === scopeId
    }
    const onTyping = (payload: any) => {
      if (!matches(payload) || payload.userId === currentUserId) return
      setTyping((prev) => ({
        ...prev,
        [payload.userId]: { displayName: payload.displayName || 'Someone', expires: Date.now() + 3000 },
      }))
    }
    socket.on('typing', onTyping)
    const interval = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now()
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.expires > now))
        return Object.keys(next).length === Object.keys(prev).length ? prev : next
      })
    }, 1000)
    return () => {
      socket.off('typing', onTyping)
      clearInterval(interval)
    }
  }, [socket, scope, scopeId, currentUserId])

  return Object.entries(typing).map(([userId, v]) => ({ userId, displayName: v.displayName }))
}

// =============================================================================
// CHANNEL FEED
// =============================================================================

export function useChannelFeed(channelId: string | null, currentUserId: string): Feed & {
  pinned: Message[]
  refreshPinned: () => void
} {
  const [messages, setMessages] = useState<Message[]>([])
  const [pinned, setPinned] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<string | null>(null)
  const loadRequestRef = useRef(0)
  const pinnedRequestRef = useRef(0)
  const channelScopeRef = useRef(channelId)
  channelScopeRef.current = channelId
  const socket = useSocketInstance(!!channelId)
  const connected = useConnected(socket)
  const lastTypingEmit = useRef(0)

  const loadMessages = useCallback(async (refresh = false) => {
    if (!channelId) return
    const requestId = ++loadRequestRef.current
    try {
      setLoading(true)
      setError(null)
      const data = await CommunityRepository.getChannelMessages(channelId, refresh ? undefined : cursorRef.current || undefined)
      if (requestId !== loadRequestRef.current || channelScopeRef.current !== channelId) return
      const transformed = (data.messages || []).map(transformMessage)
      if (refresh) {
        setMessages(transformed)
      } else {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id))
          return [...prev, ...transformed.filter((m) => !existing.has(m.id))]
        })
      }
      cursorRef.current = data.nextCursor
      setHasMore(data.hasMore)
    } catch (err) {
      if (requestId !== loadRequestRef.current || channelScopeRef.current !== channelId) return
      console.error('Failed to load channel feed:', err)
      setError('Messages could not be loaded. Please try again.')
    } finally {
      if (requestId === loadRequestRef.current && channelScopeRef.current === channelId) setLoading(false)
    }
  }, [channelId])

  const refreshPinned = useCallback(() => {
    if (!channelId) return
    const requestId = ++pinnedRequestRef.current
    CommunityRepository.getPinnedMessages(channelId)
      .then((data) => {
        if (requestId === pinnedRequestRef.current && channelScopeRef.current === channelId) {
          setPinned((data.messages || []).map(transformMessage))
        }
      })
      .catch(() => {
        if (requestId === pinnedRequestRef.current && channelScopeRef.current === channelId) setPinned([])
      })
  }, [channelId])

  // Initial + channel-change load
  useEffect(() => {
    loadRequestRef.current += 1
    pinnedRequestRef.current += 1
    setMessages([])
    setPinned([])
    setError(null)
    cursorRef.current = null
    setHasMore(true)
    if (channelId) {
      loadMessages(true)
      refreshPinned()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  // Socket room + listeners
  useEffect(() => {
    if (!socket || !channelId) return

    socket.emit('join:channel', channelId)

    const onMessage = ({ channelId: cid, message: raw }: any) => {
      if (cid !== channelId) return
      const msg = transformMessage(raw)
      if (msg.parentId) {
        // Reply: bump the parent's thread count instead of inserting top-level.
        setMessages((prev) => prev.map((m) => (m.id === msg.parentId ? { ...m, replyCount: m.replyCount + 1 } : m)))
        return
      }
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev]))
    }

    const onUpdated = (raw: any) => {
      const updated = transformMessage(raw)
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated, replyCount: m.replyCount } : m)))
    }

    const onDeleted = ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
      setPinned((prev) => prev.filter((m) => m.id !== id))
    }

    const onReaction = (payload: any) => {
      setMessages((prev) => applyReaction(prev, payload, currentUserId))
    }

    const onPinned = ({ channelId: cid, message: raw }: any) => {
      if (cid !== channelId || !raw) return
      const msg = transformMessage(raw)
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isPinned: true } : m)))
      setPinned((prev) => (prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev]))
    }

    const onUnpinned = ({ messageId, channelId: cid }: any) => {
      if (cid !== channelId) return
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isPinned: false } : m)))
      setPinned((prev) => prev.filter((m) => m.id !== messageId))
    }

    socket.on('message:channel', onMessage)
    socket.on('message:updated', onUpdated)
    socket.on('message:deleted', onDeleted)
    socket.on('message:reaction', onReaction)
    socket.on('message:pinned', onPinned)
    socket.on('message:unpinned', onUnpinned)

    return () => {
      socket.emit('leave:channel', channelId)
      socket.off('message:channel', onMessage)
      socket.off('message:updated', onUpdated)
      socket.off('message:deleted', onDeleted)
      socket.off('message:reaction', onReaction)
      socket.off('message:pinned', onPinned)
      socket.off('message:unpinned', onUnpinned)
    }
  }, [socket, channelId, currentUserId])

  const typingUsers = useTypingState(socket, 'channel', channelId, currentUserId)

  const emitTyping = useCallback(() => {
    if (!socket?.connected || !channelId) return
    const now = Date.now()
    if (now - lastTypingEmit.current < 2000) return
    lastTypingEmit.current = now
    socket.emit('typing', { channelId })
  }, [socket, channelId])

  const sendMessage = useCallback(async (content: string, opts: Omit<SendMessageInput, 'content'> = {}) => {
    if (!channelId) throw new Error('No channel selected')
    const raw = await CommunityRepository.sendChannelMessage(channelId, { content, ...opts })
    return transformMessage(raw)
  }, [channelId])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    await CommunityRepository.toggleReaction(messageId, emoji)
  }, [])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) loadMessages()
  }, [loading, hasMore, loadMessages])

  return {
    messages,
    pinned,
    refreshPinned,
    loading,
    error,
    hasMore,
    sendMessage,
    addReaction,
    loadMore,
    refresh: () => loadMessages(true),
    typingUsers,
    emitTyping,
    connected,
  }
}

// =============================================================================
// SQUAD FEED
// =============================================================================

export function useSquadFeed(squadId: string | null, currentUserId: string): Feed & {
  squad: any | null
  membership: any | null
} {
  const [messages, setMessages] = useState<Message[]>([])
  const [squad, setSquad] = useState<any | null>(null)
  const [membership, setMembership] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadRequestRef = useRef(0)
  const squadScopeRef = useRef(squadId)
  squadScopeRef.current = squadId
  const socket = useSocketInstance(!!squadId)
  const connected = useConnected(socket)
  const lastTypingEmit = useRef(0)

  const load = useCallback(async () => {
    if (!squadId) return
    const requestId = ++loadRequestRef.current
    try {
      setLoading(true)
      setError(null)
      const data = await CommunityRepository.getSquad(squadId)
      if (requestId !== loadRequestRef.current || squadScopeRef.current !== squadId) return
      setSquad(data.squad)
      setMembership(data.membership)
      setMessages((data.messages || []).map(transformMessage))
      void CommunityRepository.markSquadSeen(squadId).catch(() => undefined)
    } catch (err) {
      if (requestId !== loadRequestRef.current || squadScopeRef.current !== squadId) return
      console.error('Failed to load squad:', err)
      setError('This squad could not be loaded. Please try again.')
    } finally {
      if (requestId === loadRequestRef.current && squadScopeRef.current === squadId) setLoading(false)
    }
  }, [squadId])

  useEffect(() => {
    loadRequestRef.current += 1
    setMessages([])
    setSquad(null)
    setMembership(null)
    setError(null)
    if (squadId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId])

  useEffect(() => {
    if (!socket || !squadId) return

    socket.emit('join:squad', squadId)

    const onMessage = (raw: any) => {
      if (raw.squad_id !== squadId) return
      const msg = transformMessage(raw)
      if (msg.parentId) {
        setMessages((prev) => prev.map((m) => (m.id === msg.parentId ? { ...m, replyCount: m.replyCount + 1 } : m)))
        return
      }
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      void CommunityRepository.markSquadSeen(squadId).catch(() => undefined)
    }

    const onUpdated = (raw: any) => {
      const updated = transformMessage(raw)
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated, replyCount: m.replyCount } : m)))
    }

    const onDeleted = ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
    }

    const onReaction = (payload: any) => {
      setMessages((prev) => applyReaction(prev, payload, currentUserId))
    }

    const onMemberChange = () => load()

    socket.on('message:squad', onMessage)
    socket.on('message:updated', onUpdated)
    socket.on('message:deleted', onDeleted)
    socket.on('message:reaction', onReaction)
    socket.on('squad:member-joined', onMemberChange)
    socket.on('squad:member-left', onMemberChange)

    return () => {
      socket.emit('leave:squad', squadId)
      socket.off('message:squad', onMessage)
      socket.off('message:updated', onUpdated)
      socket.off('message:deleted', onDeleted)
      socket.off('message:reaction', onReaction)
      socket.off('squad:member-joined', onMemberChange)
      socket.off('squad:member-left', onMemberChange)
    }
  }, [socket, squadId, currentUserId, load])

  const typingUsers = useTypingState(socket, 'squad', squadId, currentUserId)

  const emitTyping = useCallback(() => {
    if (!socket?.connected || !squadId) return
    const now = Date.now()
    if (now - lastTypingEmit.current < 2000) return
    lastTypingEmit.current = now
    socket.emit('typing', { squadId })
  }, [socket, squadId])

  const sendMessage = useCallback(async (content: string, opts: Omit<SendMessageInput, 'content'> = {}) => {
    if (!squadId) throw new Error('No squad selected')
    const raw = await CommunityRepository.sendSquadMessage(squadId, { content, ...opts })
    return transformMessage(raw)
  }, [squadId])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    await CommunityRepository.toggleReaction(messageId, emoji)
  }, [])

  return {
    messages,
    squad,
    membership,
    loading,
    error,
    hasMore: false,
    sendMessage,
    addReaction,
    loadMore: () => undefined,
    refresh: load,
    typingUsers,
    emitTyping,
    connected,
  }
}

// =============================================================================
// DIRECT MESSAGE FEED
// =============================================================================

export function useDirectFeed(peerId: string | null, currentUserId: string): Feed {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<string | null>(null)
  const loadRequestRef = useRef(0)
  const peerScopeRef = useRef(peerId)
  peerScopeRef.current = peerId
  const socket = useSocketInstance(!!peerId)
  const connected = useConnected(socket)
  const lastTypingEmit = useRef(0)

  const load = useCallback(async (refresh = false) => {
    if (!peerId) return
    const requestId = ++loadRequestRef.current
    try {
      setLoading(true)
      setError(null)
      const data = await CommunityRepository.getDirectMessages(peerId, refresh ? undefined : cursorRef.current || undefined)
      if (requestId !== loadRequestRef.current || peerScopeRef.current !== peerId) return
      const transformed = (data.messages || []).map(transformMessage)
      if (refresh) {
        setMessages(transformed)
      } else {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id))
          return [...transformed.filter((m) => !existing.has(m.id)), ...prev]
        })
      }
      cursorRef.current = data.nextCursor
      setHasMore(data.hasMore)
      void CommunityRepository.markConversationRead(peerId).catch(() => undefined)
    } catch (err) {
      if (requestId !== loadRequestRef.current || peerScopeRef.current !== peerId) return
      console.error('Failed to load conversation:', err)
      setError('This conversation could not be loaded. Please try again.')
    } finally {
      if (requestId === loadRequestRef.current && peerScopeRef.current === peerId) setLoading(false)
    }
  }, [peerId])

  useEffect(() => {
    loadRequestRef.current += 1
    setMessages([])
    setError(null)
    cursorRef.current = null
    setHasMore(true)
    if (peerId) load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId])

  useEffect(() => {
    if (!socket || !peerId) return

    const onDirect = (raw: any) => {
      const msg = transformMessage(raw)
      const isThisConversation =
        (msg.senderId === peerId && msg.recipientId === currentUserId) ||
        (msg.senderId === currentUserId && msg.recipientId === peerId)
      if (!isThisConversation) return
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      if (msg.senderId === peerId) {
        void CommunityRepository.markConversationRead(peerId).catch(() => undefined)
      }
    }

    const onUpdated = (raw: any) => {
      const updated = transformMessage(raw)
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)))
    }

    const onDeleted = ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
    }

    const onReaction = (payload: any) => {
      setMessages((prev) => applyReaction(prev, payload, currentUserId))
    }

    socket.on('message:direct', onDirect)
    socket.on('message:updated', onUpdated)
    socket.on('message:deleted', onDeleted)
    socket.on('message:reaction', onReaction)

    return () => {
      socket.off('message:direct', onDirect)
      socket.off('message:updated', onUpdated)
      socket.off('message:deleted', onDeleted)
      socket.off('message:reaction', onReaction)
    }
  }, [socket, peerId, currentUserId])

  const typingUsers = useTypingState(socket, 'dm', peerId, currentUserId)

  const emitTyping = useCallback(() => {
    if (!socket?.connected || !peerId) return
    const now = Date.now()
    if (now - lastTypingEmit.current < 2000) return
    lastTypingEmit.current = now
    socket.emit('typing', { dmUserId: peerId })
  }, [socket, peerId])

  const sendMessage = useCallback(async (content: string, opts: Omit<SendMessageInput, 'content'> = {}) => {
    if (!peerId) throw new Error('No conversation selected')
    const raw = await CommunityRepository.sendDirectMessage(peerId, { content, ...opts })
    return transformMessage(raw)
  }, [peerId])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    await CommunityRepository.toggleReaction(messageId, emoji)
  }, [])

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    addReaction,
    loadMore: () => {
      if (!loading && hasMore) load()
    },
    refresh: () => load(true),
    typingUsers,
    emitTyping,
    connected,
  }
}

// =============================================================================
// PRESENCE
// =============================================================================

export function usePresence(): { online: number; userIds: string[] } {
  const socket = useSocketInstance()
  const [presence, setPresence] = useState<{ online: number; userIds: string[] }>({ online: 0, userIds: [] })

  useEffect(() => {
    if (!socket) return
    const onPresence = (payload: { online: number; userIds: string[] }) => setPresence(payload)
    socket.on('presence:update', onPresence)
    return () => {
      socket.off('presence:update', onPresence)
    }
  }, [socket])

  return presence
}

// =============================================================================
// MEDIA UPLOAD HOOK
// =============================================================================

// Reuse the validated backend URL from apiClient (includes protocol + no trailing slash)
const API_BASE = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`

export function useMediaUpload(maxBytes?: number) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const upload = useCallback(async (file: File): Promise<string> => {
    if (maxBytes && file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024))
      throw { error: `File exceeds your plan's ${mb}MB upload limit`, status: 413, meta: { code: 'TIER_LIMIT' } }
    }

    setUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      const xhr = new XMLHttpRequest()

      const publicUrl = await new Promise<string>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText)
            resolve(data.publicUrl)
          } else {
            let parsed: any = null
            try {
              parsed = JSON.parse(xhr.responseText)
            } catch { /* not json */ }
            reject(parsed ? { ...parsed, status: xhr.status } : new Error('Upload failed'))
          }
        }

        xhr.onerror = () => reject(new Error('Upload failed'))

        xhr.open('POST', `${API_BASE}/messages/upload`)
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        // Do NOT set Content-Type — browser sets multipart boundary automatically
        xhr.send(formData)
      })

      return publicUrl
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [maxBytes])

  return { upload, uploading, progress }
}

export { getSocket }
