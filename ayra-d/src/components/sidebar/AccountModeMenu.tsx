'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Crown, KeyRound, Loader2, ShieldCheck, Users } from 'lucide-react'
import type { AccessMode } from '@/repositories/UserRepository'

const accountModeOptions = [
  {
    mode: 'FREE',
    label: 'Free',
    description: 'Basic training tools',
    icon: Users,
    badgeClass: 'bg-gray-100 text-gray-600',
    iconClass: 'bg-gray-100 text-gray-600',
  },
  {
    mode: 'PAID',
    label: 'Paid',
    description: 'Premium tools',
    icon: Crown,
    badgeClass: 'bg-emerald-100 text-emerald-700',
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    mode: 'ADMIN',
    label: 'Admin',
    description: 'Full platform access',
    icon: ShieldCheck,
    badgeClass: 'bg-clean-accent/10 text-clean-accent',
    iconClass: 'bg-clean-accent/10 text-clean-accent',
  },
] as const

interface AccountModeMenuProps {
  isOpen: boolean
  isCollapsed: boolean
  currentMode: AccessMode
  switchingMode: AccessMode | null
  showAdminCode: boolean
  pendingAdminCode: string
  userEmail: string
  onSelectMode: (mode: AccessMode) => void
  onAdminCodeChange: (code: string) => void
  onAdminSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onMenuKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
}

export function AccountModeMenu({
  isOpen,
  isCollapsed,
  currentMode,
  switchingMode,
  showAdminCode,
  pendingAdminCode,
  userEmail,
  onSelectMode,
  onAdminCodeChange,
  onAdminSubmit,
  onMenuKeyDown,
}: AccountModeMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: -6, scale: 0.98 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className={`absolute z-50 mt-2 ${isCollapsed ? 'left-0 w-64' : 'left-0 right-0'}`}
        >
          <div className="rounded-xl border border-clean-border bg-clean-sidebar shadow-xl shadow-black/20 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-clean-border">
              <p className="text-xs font-bold uppercase tracking-wider text-clean-muted">
                Account mode
              </p>
              <p className="text-xs text-clean-muted truncate mt-0.5">{userEmail}</p>
            </div>

            <div
              className="p-2 space-y-1"
              role="menu"
              aria-label="Account mode options"
              onKeyDown={onMenuKeyDown}
            >
              {accountModeOptions.map((option) => {
                const OptionIcon = option.icon
                const isCurrent = option.mode === currentMode
                const isSwitching = switchingMode === option.mode

                return (
                  <button
                    key={option.mode}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isCurrent}
                    disabled={switchingMode !== null || isCurrent}
                    onClick={() => onSelectMode(option.mode)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isCurrent
                        ? 'bg-clean-hover text-clean-text'
                        : 'text-clean-muted hover:bg-clean-hover hover:text-clean-text'
                    } disabled:cursor-default`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${option.iconClass}`}
                    >
                      {isSwitching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <OptionIcon className="w-4 h-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{option.label}</span>
                      <span className="block text-xs text-clean-muted truncate">
                        {option.description}
                      </span>
                    </span>
                    {isCurrent && <Check className="w-4 h-4 text-clean-accent shrink-0" />}
                  </button>
                )
              })}
            </div>

            {showAdminCode && currentMode !== 'ADMIN' && (
              <form onSubmit={onAdminSubmit} className="border-t border-clean-border p-3 space-y-2">
                <label
                  htmlFor="sidebar-admin-code"
                  className="text-xs font-bold uppercase tracking-wider text-clean-muted"
                >
                  Admin code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clean-muted" />
                  <input
                    id="sidebar-admin-code"
                    type="password"
                    value={pendingAdminCode}
                    onChange={(event) => onAdminCodeChange(event.target.value)}
                    placeholder="Enter code"
                    className="w-full rounded-lg border border-clean-border bg-clean-sidebar py-2 pl-9 pr-3 text-sm text-clean-text placeholder:text-clean-muted focus:outline-none focus:ring-2 focus:ring-clean-accent/25 focus:border-clean-accent/50"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!pendingAdminCode.trim() || switchingMode !== null}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-clean-accent px-3 py-2 text-xs font-bold text-white hover:bg-clean-accent disabled:opacity-50 disabled:hover:bg-clean-accent"
                >
                  {switchingMode === 'ADMIN' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Unlock Admin
                </button>
              </form>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function getAccountMode(user: {
  role?: string
  membership_tier?: string
} | null): AccessMode {
  if (user?.role === 'ADMIN') return 'ADMIN'
  return user?.membership_tier === 'PAID' ? 'PAID' : 'FREE'
}

export function getTierLabel(mode: AccessMode): string {
  return accountModeOptions.find((o) => o.mode === mode)?.label || 'Free'
}

export function getTierClass(mode: AccessMode): string {
  return accountModeOptions.find((o) => o.mode === mode)?.badgeClass || ''
}