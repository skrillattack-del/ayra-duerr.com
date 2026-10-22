'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserRepository, type AccessMode } from '@/repositories/UserRepository'
import { useToast } from '@/providers/ToastProvider'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { SidebarLogo } from './SidebarLogo'
import { SidebarNav } from './SidebarNav'
import { SidebarProfileCard } from './SidebarProfileCard'
import { AccountModeMenu, getAccountMode, getTierLabel, getTierClass } from './AccountModeMenu'
import { ProfileEditDrawer } from './ProfileEditDrawer'
import { SidebarFooter } from './SidebarFooter'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const { user, loading, logout, refreshUser } = useAuth()
  const { toast } = useToast()
  const pathname = usePathname()
  const router = useRouter()

  const [isMounted, setIsMounted] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [pendingAdminCode, setPendingAdminCode] = useState('')
  const [showAdminCode, setShowAdminCode] = useState(false)
  const [switchingMode, setSwitchingMode] = useState<AccessMode | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/?reason=session-expired')
    }
  }, [loading, user, router])

  // Close menu on outside click / Escape
  useEffect(() => {
    if (!isProfileMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
        setShowAdminCode(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
        setShowAdminCode(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isProfileMenuOpen])

  // Focus first item when menu opens
  useEffect(() => {
    if (!isProfileMenuOpen) return
    const firstItem = profileMenuRef.current?.querySelector<HTMLButtonElement>(
      'button[role="menuitemradio"]:not(:disabled)'
    )
    firstItem?.focus()
  }, [isProfileMenuOpen])

  // Keyboard navigation within menu
  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        'button[role="menuitemradio"]:not(:disabled)'
      )
    )
    if (!items.length) return

    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex = currentIndex

    if (event.key === 'ArrowDown')
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
    else if (event.key === 'ArrowUp')
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = items.length - 1

    items[nextIndex]?.focus()
  }

  // Account mode switching
  const switchAccountMode = useCallback(
    async (mode: AccessMode, code?: string) => {
      setSwitchingMode(mode)
      try {
        await UserRepository.updateAccessMode(mode, code)
        await refreshUser()
        window.dispatchEvent(new Event('auth:changed'))
        setIsProfileMenuOpen(false)
        setShowAdminCode(false)
        setPendingAdminCode('')
        toast({
          title: `Switched to ${getTierLabel(mode)}`,
          variant: 'success',
        })
      } catch (err) {
        toast(mapApiErrorToToast(err, { action: 'switch account mode' }))
      } finally {
        setSwitchingMode(null)
      }
    },
    [refreshUser, toast]
  )

  const handleModeSelect = (mode: AccessMode) => {
    const currentMode = getAccountMode(user)
    if (mode === currentMode || switchingMode) return
    if (mode === 'ADMIN') {
      setShowAdminCode(true)
      return
    }
    switchAccountMode(mode)
  }

  const handleAdminSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = pendingAdminCode.trim()
    if (!code || switchingMode) return
    switchAccountMode('ADMIN', code)
  }

  // Logout
  const handleLogout = async () => {
    await logout()
    router.replace('/?reason=signed-out')
  }

  // Profile editing
  const handleSaveProfile = useCallback(
    async (data: {
      display_name: string
      fitness_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
      goals: string
    }) => {
      setProfileSaving(true)
      try {
        await UserRepository.updateProfile({
          display_name: data.display_name,
          fitness_level: data.fitness_level,
          goals: data.goals
            .split(',')
            .map((g) => g.trim())
            .filter(Boolean),
        })
        await refreshUser()
        toast({ title: 'Profile updated', variant: 'success' })
      } catch (err) {
        toast(mapApiErrorToToast(err, { action: 'update your profile' }))
        throw err
      } finally {
        setProfileSaving(false)
      }
    },
    [refreshUser, toast]
  )

  const handleAvatarChange = useCallback(
    async (file: File) => {
      setAvatarUploading(true)
      try {
        await UserRepository.uploadAvatar(file)
        await refreshUser()
        toast({ title: 'Avatar uploaded', variant: 'success' })
      } catch (err) {
        toast(mapApiErrorToToast(err, { action: 'upload your avatar' }))
        throw err
      } finally {
        setAvatarUploading(false)
      }
    },
    [refreshUser, toast]
  )

  const isActiveRoute = useCallback(
    (href: string) => {
      if (href === '/dashboard') return pathname === '/dashboard'
      return pathname === href || pathname.startsWith(`${href}/`)
    },
    [pathname]
  )

  const currentMode = getAccountMode(user)

  if (!isMounted) return null

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64'

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-full ${sidebarWidth} bg-clean-sidebar border-r border-clean-border flex-col z-30 transition-all duration-300 hidden md:flex`}
      >
        <SidebarLogo isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />

        {/* Profile Section */}
        <div ref={profileMenuRef} className="relative">
          <SidebarProfileCard
            isCollapsed={isCollapsed}
            isMenuOpen={isProfileMenuOpen}
            onToggleMenu={() => setIsProfileMenuOpen((o) => !o)}
            onEditProfile={() => setIsEditDrawerOpen(true)}
            user={user}
            tierLabel={getTierLabel(currentMode)}
            tierClass={getTierClass(currentMode)}
          />

          <AccountModeMenu
            isOpen={isProfileMenuOpen}
            isCollapsed={isCollapsed}
            currentMode={currentMode}
            switchingMode={switchingMode}
            showAdminCode={showAdminCode}
            pendingAdminCode={pendingAdminCode}
            userEmail={user?.email || ''}
            onSelectMode={handleModeSelect}
            onAdminCodeChange={setPendingAdminCode}
            onAdminSubmit={handleAdminSubmit}
            onMenuKeyDown={handleMenuKeyDown}
          />
        </div>

        <SidebarNav
          isCollapsed={isCollapsed}
          currentPathname={pathname}
          isActiveRoute={isActiveRoute}
        />

        <SidebarFooter isCollapsed={isCollapsed} onLogout={handleLogout} />
      </aside>

      {/* Profile Edit Drawer */}
      <ProfileEditDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        user={user}
        saving={profileSaving}
        uploading={avatarUploading}
        onSave={handleSaveProfile}
        onAvatarChange={handleAvatarChange}
      />
    </>
  )
}