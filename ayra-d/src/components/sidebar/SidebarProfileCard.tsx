'use client'

import { ChevronDown, Pencil } from 'lucide-react'
import { mediaUrl } from '@/lib/media'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface SidebarProfileCardProps {
  isCollapsed: boolean
  isMenuOpen: boolean
  onToggleMenu: () => void
  onEditProfile: () => void
  user: {
    display_name?: string
    avatar_url?: string | null
    email?: string
  } | null
  tierLabel: string
  tierClass: string
}

export function SidebarProfileCard({
  isCollapsed,
  isMenuOpen,
  onToggleMenu,
  onEditProfile,
  user,
  tierLabel,
  tierClass,
}: SidebarProfileCardProps) {
  return (
    <div className="relative z-40 px-4 pb-2 shrink-0">
      {/* Main profile button — opens account mode menu */}
      <button
        type="button"
        onClick={onToggleMenu}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label="Open account mode menu"
        className={`group flex w-full cursor-pointer items-center gap-3 p-3 rounded-xl border border-clean-border bg-clean-sidebar shadow-sm hover:border-clean-muted/40 hover:bg-clean-hover hover:shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-clean-accent/25 transition-all ${
          isCollapsed ? 'justify-center' : ''
        } ${isMenuOpen ? 'border-clean-accent/50 ring-2 ring-clean-accent/25' : ''}`}
      >
        <div className="relative shrink-0">
          {user?.avatar_url ? (
            <img
              src={mediaUrl(user.avatar_url) ?? undefined}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-700">
              {initials(user?.display_name || 'GF')}
            </div>
          )}
          {isCollapsed && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-clean-sidebar text-clean-muted shadow-sm">
              <ChevronDown
                className={`h-2.5 w-2.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
              />
            </span>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold truncate text-clean-text">
              {user?.display_name || 'Profile'}
            </p>
            <div
              className={`inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tierClass}`}
            >
              {tierLabel}
            </div>
          </div>
        )}

        {!isCollapsed && (
          <ChevronDown
            className={`w-4 h-4 text-clean-muted shrink-0 transition-transform ${
              isMenuOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Edit profile quick-action — only shown when expanded */}
      {!isCollapsed && (
        <button
          type="button"
          onClick={onEditProfile}
          className="mt-2 flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm text-clean-muted hover:bg-clean-hover hover:text-clean-text transition-colors"
        >
          <Pencil className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium">Edit profile</span>
        </button>
      )}
    </div>
  )
}