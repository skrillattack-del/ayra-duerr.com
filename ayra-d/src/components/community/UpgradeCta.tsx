'use client'

import { useRouter } from 'next/navigation'
import { Crown, Check } from 'lucide-react'
import { Modal } from './Modal'

interface UpgradeCtaProps {
  open: boolean
  onClose: () => void
  featureName?: string
}

const PRO_PERKS = [
  'Access to the 👑 pro-lounge channel',
  'Create up to 3 of your own squads',
  'Join up to 10 squads',
  '10MB uploads, 6 attachments per message',
  'PRO flair next to your name',
]

export function UpgradeCta({ open, onClose, featureName }: UpgradeCtaProps) {
  const router = useRouter()

  return (
    <Modal open={open} onClose={onClose} title="Upgrade to PRO">
      <div className="text-center mb-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3">
          <Crown className="w-7 h-7 text-black" />
        </div>
        <p className="text-sm font-semibold text-clean-text">
          {featureName ? `${featureName} is a PRO feature` : 'Unlock the full community'}
        </p>
      </div>
      <ul className="space-y-2 mb-5">
        {PRO_PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-2.5 text-sm text-clean-text">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            {perk}
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          onClose()
          router.push('/dashboard/settings#membership-plan')
        }}
        className="w-full py-3 bg-clean-accent hover:bg-clean-accent/90 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        See plans
      </button>
    </Modal>
  )
}

