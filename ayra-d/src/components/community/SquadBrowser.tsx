'use client'

import { useState, useEffect } from 'react'
import { Search, Users, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/media'
import { CommunityRepository, type Squad, type SquadInvite } from '@/repositories/CommunityRepository'
import { useToast } from '@/hooks/useToast'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { Modal } from './Modal'
import { Avatar } from './Badges'

interface SquadBrowserProps {
  open: boolean
  onClose: () => void
  onJoined: (squadId: string) => void
}

export function SquadBrowser({ open, onClose, onJoined }: SquadBrowserProps) {
  const { toast } = useToast()
  const [tab, setTab] = useState<'discover' | 'invites'>('discover')
  const [query, setQuery] = useState('')
  const [squads, setSquads] = useState<Squad[]>([])
  const [invites, setInvites] = useState<SquadInvite[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      CommunityRepository.discoverSquads(query || undefined),
      CommunityRepository.getSquadInvites(),
    ])
      .then(([s, i]) => {
        setSquads(s)
        setInvites(i)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [open, query])

  const join = async (squadId: string) => {
    setBusyId(squadId)
    try {
      await CommunityRepository.joinSquad(squadId)
      toast({ title: 'Joined squad! 🎉', variant: 'success' })
      onJoined(squadId)
      onClose()
    } catch (error) {
      toast(mapApiErrorToToast(error, { action: 'join this squad' }))
    } finally {
      setBusyId(null)
    }
  }

  const declineInvite = async (inviteId: string) => {
    setBusyId(inviteId)
    try {
      await CommunityRepository.declineSquadInvite(inviteId)
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    } catch (error) {
      toast(mapApiErrorToToast(error, { action: 'decline this invite' }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Find squads" wide>
      <div className="flex gap-1 mb-4 bg-white border border-clean-border rounded-lg p-0.5 w-fit">
        {(
          [
            ['discover', 'Discover'],
            ['invites', `Invites${invites.length ? ` (${invites.length})` : ''}`],
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

      {tab === 'discover' && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clean-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search public squads…"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-clean-border rounded-xl text-sm text-clean-text placeholder-clean-muted focus:border-clean-accent focus:ring-1 focus:ring-clean-accent focus:outline-none"
            />
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 text-clean-accent animate-spin" />
            </div>
          ) : squads.length === 0 ? (
            <div className="py-8 text-center text-sm text-clean-muted">No public squads found. Create one!</div>
          ) : (
            <div className="space-y-2">
              {squads.map((squad) => (
                <div key={squad.id} className="flex items-center gap-3 p-3 bg-white border border-clean-border rounded-xl">
                  <Avatar src={mediaUrl(squad.avatar_url)} name={squad.name} size={10} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-clean-text truncate">{squad.name}</div>
                    {squad.description && <div className="text-xs text-clean-muted truncate">{squad.description}</div>}
                    <div className="text-[10px] text-clean-muted mt-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {squad.memberCount}/{squad.max_members} members
                    </div>
                  </div>
                  {squad.isMember ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-500 shrink-0">
                      <Check className="w-3.5 h-3.5" /> Joined
                    </span>
                  ) : (
                    <button
                      disabled={squad.isFull || busyId === squad.id}
                      onClick={() => join(squad.id)}
                      className="px-3 py-1.5 bg-clean-accent hover:bg-clean-accent/90 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                    >
                      {busyId === squad.id ? '…' : squad.isFull ? 'Full' : 'Join'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'invites' &&
        (invites.length === 0 ? (
          <div className="py-8 text-center text-sm text-clean-muted">No pending invites</div>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 p-3 bg-white border border-clean-border rounded-xl">
                <Avatar src={mediaUrl(invite.squad.avatar_url)} name={invite.squad.name} size={10} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-clean-text truncate">{invite.squad.name}</div>
                  <div className="text-xs text-clean-muted">
                    Invited by <span className="text-clean-text font-medium">{invite.inviter.display_name}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={busyId === invite.squad.id}
                    onClick={() => join(invite.squad.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    disabled={busyId === invite.id}
                    onClick={() => declineInvite(invite.id)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-clean-text text-xs font-semibold rounded-lg transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
    </Modal>
  )
}

