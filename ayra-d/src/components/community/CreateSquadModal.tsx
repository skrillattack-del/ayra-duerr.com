'use client'

import { useState } from 'react'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommunityRepository } from '@/repositories/CommunityRepository'
import { useToast } from '@/hooks/useToast'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { Modal } from './Modal'

interface CreateSquadModalProps {
  open: boolean
  onClose: () => void
  onCreated: (squadId: string) => void
  canCreate: boolean
  onUpgrade: () => void
}

const VISIBILITIES = [
  { value: 'PUBLIC', label: 'Public', hint: 'Anyone can find and join' },
  { value: 'INVITE_ONLY', label: 'Invite only', hint: 'Visible, but joining needs an invite' },
  { value: 'PRIVATE', label: 'Private', hint: 'Hidden — invite only' },
] as const

export function CreateSquadModal({ open, onClose, onCreated, canCreate, onUpgrade }: CreateSquadModalProps) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'INVITE_ONLY' | 'PRIVATE'>('PUBLIC')
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const squad = await CommunityRepository.createSquad({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      })
      toast({ title: `Squad "${squad.name}" created! 👑`, variant: 'success' })
      setName('')
      setDescription('')
      onCreated(squad.id)
      onClose()
    } catch (error) {
      toast(mapApiErrorToToast(error, { action: 'create this squad' }))
    } finally {
      setBusy(false)
    }
  }

  if (!canCreate) {
    return (
      <Modal open={open} onClose={onClose} title="Create a squad">
        <div className="text-center py-4">
          <Crown className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-clean-text mb-1 font-semibold">Squad creation is a PRO feature</p>
          <p className="text-xs text-clean-muted mb-4">
            Upgrade to create your own squads, invite friends, and run private group chats.
          </p>
          <button
            onClick={onUpgrade}
            className="px-4 py-2.5 bg-clean-accent hover:bg-clean-accent/90 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Upgrade to PRO
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a squad">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-clean-muted mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Morning Grinders"
            className="w-full px-3 py-2.5 bg-white border border-clean-border rounded-xl text-sm text-clean-text placeholder-clean-muted focus:border-clean-accent focus:ring-1 focus:ring-clean-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-clean-muted mb-1.5">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="What's this squad about?"
            className="w-full px-3 py-2.5 bg-white border border-clean-border rounded-xl text-sm text-clean-text placeholder-clean-muted resize-none focus:border-clean-accent focus:ring-1 focus:ring-clean-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-clean-muted mb-1.5">Visibility</label>
          <div className="space-y-1.5">
            {VISIBILITIES.map((v) => (
              <button
                key={v.value}
                onClick={() => setVisibility(v.value)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors',
                  visibility === v.value
                    ? 'border-clean-accent/50 bg-clean-accent/10'
                    : 'border-clean-border bg-white hover:bg-clean-hover',
                )}
              >
                <div>
                  <div className="text-sm font-semibold text-clean-text">{v.label}</div>
                  <div className="text-xs text-clean-muted">{v.hint}</div>
                </div>
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2',
                    visibility === v.value ? 'border-clean-accent bg-clean-accent' : 'border-gray-300',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <button
          disabled={!name.trim() || busy}
          onClick={create}
          className="w-full py-2.5 bg-clean-accent hover:bg-clean-accent/90 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {busy ? 'Creating…' : 'Create squad'}
        </button>
      </div>
    </Modal>
  )
}

