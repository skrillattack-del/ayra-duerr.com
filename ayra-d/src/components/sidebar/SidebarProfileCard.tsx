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
    <div className="pendo-profile-wrap">
      {/* Main profile button — opens account mode menu */}
      <button
        type="button"
        onClick={onToggleMenu}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label="Open account mode menu"
        className={`pendo-profile-button group flex w-full cursor-pointer items-center gap-3 ${
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
            <div className="pendo-profile-initials">
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
            <p className="pendo-profile-name truncate">
              {user?.display_name || 'Profile'}
            </p>
            <div
              className={`pendo-profile-tier ${tierClass}`}
            >
              {tierLabel}
            </div>
          </div>
        )}

        {!isCollapsed && (
            <ChevronDown
              className={`h-4 w-4 text-clean-muted shrink-0 transition-transform ${
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
          className="pendo-edit-profile"
        >
          <Pencil className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium">Edit profile</span>
        </button>
      )}
    </div>
  )
}
