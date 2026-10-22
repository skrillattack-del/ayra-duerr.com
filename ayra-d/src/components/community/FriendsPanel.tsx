'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, MessageCircle, UserMinus, Loader2, UserPlus, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/media'
import { FriendRepository, type FriendEntry, type FriendRequestEntry } from '@/repositories/FriendRepository'
import { CommunityRepository, type UserSearchResult } from '@/repositories/CommunityRepository'
import { useToast } from '@/hooks/useToast'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { Modal } from './Modal'
import { Avatar, FlairBadge, LevelChip } from './Badges'

interface FriendsPanelProps {
  open: boolean
  onClose: () => void
  onMessage: (peerId: string) => void
}

export function FriendsPanel({ open, onClose, onMessage }: FriendsPanelProps) {
  const { toast } = useToast()
  const [tab, setTab] = useState<'friends' | 'requests' | 'find'>('friends')
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [incoming, setIncoming] = useState<FriendRequestEntry[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequestEntry[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([FriendRepository.getFriends(), FriendRepository.getRequests()])
      .then(([f, r]) => {
        setFriends(f)
        setIncoming(r.incoming)
        setOutgoing(r.outgoing)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  // Debounced user search
  useEffect(() => {
    if (tab !== 'find' || query.trim().length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      CommunityRepository.searchUsers(query.trim())
        .then(setResults)
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [query, tab])

  const run = async (id: string, fn: () => Promise<void>, action: string) => {
    setBusyId(id)
    try {
      await fn()
      load()
    } catch (error) {
      toast(mapApiErrorToToast(error, { action }))
    } finally {
      setBusyId(null)
    }
  }

  const friendIds = new Set(friends.map((f) => f.user.id))
  const pendingIds = new Set([...incoming, ...outgoing].map((r) => r.user.id))

  return (
    <Modal open={open} onClose={onClose} title="Friends" wide>
      <div className="flex gap-1 mb-4 bg-white border border-clean-border rounded-lg p-0.5 w-fit">
        {(
          [
            ['friends', `Friends${friends.length ? ` (${friends.length})` : ''}`],
            ['requests', `Requests${incoming.length ? ` (${incoming.length})` : ''}`],
            ['find', 'Find people'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
              tab === key ? 'bg-clean-accent text-white' : 'text-clean-muted hover:text-clean-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 text-clean-accent animate-spin" />
        </div>
      )}

      {!loading && tab === 'friends' && (
        friends.length === 0 ? (
          <div className="py-8 text-center text-sm text-clean-muted">
            No friends yet — find people and send a request!
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.friendshipId} className="flex items-center gap-3 p-3 bg-white border border-clean-border rounded-xl">
                <Avatar src={mediaUrl(f.user.avatar_url)} name={f.user.display_name} size={9} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-clean-text truncate">{f.user.display_name}</span>
                    <FlairBadge role={f.user.role} membershipTier={f.user.membership_tier} />
                    <LevelChip level={f.user.stats?.level} />
                  </div>
                </div>
                <button
                  onClick={() => {
                    onMessage(f.user.id)
                    onClose()
                  }}
                  className="p-2 bg-clean-accent/10 hover:bg-clean-accent/20 text-clean-accent rounded-lg transition-colors"
                  title="Message"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  disabled={busyId === f.friendshipId}
                  onClick={() => run(f.friendshipId, () => FriendRepository.unfriend(f.friendshipId), 'unfriend')}
                  className="p-2 hover:bg-clean-hover text-clean-muted hover:text-red-600 rounded-lg transition-colors"
                  title="Unfriend"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {!loading && tab === 'requests' && (
        <div className="space-y-4">
          {incoming.length === 0 && outgoing.length === 0 && (
            <div className="py-8 text-center text-sm text-clean-muted">No pending requests</div>
          )}
          {incoming.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-clean-muted uppercase tracking-widest mb-2">Incoming</div>
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div key={r.friendshipId} className="flex items-center gap-3 p-3 bg-white border border-clean-border rounded-xl">
                    <Avatar src={mediaUrl(r.user.avatar_url)} name={r.user.display_name} size={9} />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-clean-text">{r.user.display_name}</span>
                    </div>
                    <button
                      disabled={busyId === r.friendshipId}
                      onClick={() => run(r.friendshipId, () => FriendRepository.acceptRequest(r.friendshipId), 'accept this request')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      disabled={busyId === r.friendshipId}
                      onClick={() => run(r.friendshipId, () => FriendRepository.declineRequest(r.friendshipId), 'decline this request')}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-clean-text text-xs font-semibold rounded-lg transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-clean-muted uppercase tracking-widest mb-2">Sent</div>
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <div key={r.friendshipId} className="flex items-center gap-3 p-3 bg-white border border-clean-border rounded-xl opacity-70">
                    <Avatar src={mediaUrl(r.user.avatar_url)} name={r.user.display_name} size={9} />
                    <span className="text-sm text-clean-text flex-1 truncate">{r.user.display_name}</span>
                    <span className="flex items-center gap-1 text-xs text-clean-muted">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'find' && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clean-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by display name…"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-clean-border rounded-xl text-sm text-clean-text placeholder-clean-muted focus:border-clean-accent focus:ring-1 focus:ring-clean-accent focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            {query.trim().length >= 2 && results.length === 0 && (
              <div className="py-6 text-center text-sm text-clean-muted">No users found</div>
            )}
            {results.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 bg-white border border-clean-border rounded-xl">
                <Avatar src={mediaUrl(u.avatar_url)} name={u.display_name} size={9} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-clean-text truncate">{u.display_name}</span>
                    <FlairBadge role={u.role} membershipTier={u.membership_tier} />
                    <LevelChip level={u.stats?.level} />
                  </div>
                </div>
                {friendIds.has(u.id) ? (
                  <button
                    onClick={() => {
                      onMessage(u.id)
                      onClose()
                    }}
                    className="px-3 py-1.5 bg-clean-accent/10 text-clean-accent text-xs font-semibold rounded-lg"
                  >
                    Message
                  </button>
                ) : pendingIds.has(u.id) ? (
                  <span className="flex items-center gap-1 text-xs text-clean-muted">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                ) : (
                  <button
                    disabled={busyId === u.id}
                    onClick={() =>
                      run(u.id, async () => {
                        await FriendRepository.sendRequest(u.id)
                        toast({ title: 'Friend request sent', variant: 'success' })
                      }, 'send this friend request')
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-clean-accent hover:bg-clean-accent/90 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}

