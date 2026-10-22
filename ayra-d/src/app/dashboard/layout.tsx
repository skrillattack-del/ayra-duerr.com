'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { AchievementToast } from '@/components/community/AchievementToast'
import { ColorModeToggle } from '@/components/theme/ColorModeToggle'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Home, PawPrint, Settings, UsersRound } from 'lucide-react'

const bottomNavItems = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Community', href: '/dashboard/community', icon: UsersRound },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('pendo-sidebar-collapsed')
    if (saved) setIsCollapsed(saved === 'true')
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('pendo-sidebar-collapsed', next.toString())
      return next
    })
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const currentSectionName = pathname === '/dashboard'
    ? 'Pendo Dashboard'
    : pathname.includes('/community')
      ? 'Community'
      : pathname.includes('/progress')
        ? 'Progress'
        : pathname.includes('/settings')
          ? 'Settings'
          : 'Pendo Dashboard'
  const firstName = user?.display_name?.trim().split(/\s+/)[0] || 'John'

  return (
    <div className="pendo-app-shell min-h-screen bg-clean-bg text-clean-text">
      <Sidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />

      <div className={`pendo-main-shell min-h-screen pb-16 transition-all duration-300 md:pb-0 ${isCollapsed ? 'md:ml-[84px]' : 'md:ml-[232px]'}`}>
        <header className="pendo-mobile-header md:hidden">
          <div>
            <p className="pendo-mobile-kicker">PENDO</p>
            <h1>{currentSectionName}</h1>
          </div>
          <NotificationBell />
        </header>

        <header className="pendo-app-header hidden md:flex">
          <div>
            <h1>{currentSectionName} <PawPrint className="pendo-header-paw" aria-hidden="true" /></h1>
            <p>
              {loading ? 'Loading Pendo’s day...' : `Welcome back, ${firstName}. Here’s Pendo’s day.`}
            </p>
          </div>

          <div className="pendo-header-actions">
            <ColorModeToggle />
            <label className="pendo-search">
              <span className="sr-only">Search Pendo</span>
              <input type="search" placeholder="Search walks, photos, or tips..." />
              <span aria-hidden="true">⌕</span>
            </label>
            <NotificationBell />
          </div>
        </header>

        <main className="pendo-main-content animate-slide-up">{children}</main>
      </div>

      <AchievementToast />

      <div className="pendo-mobile-nav md:hidden">
        <nav>
          {bottomNavItems.map((item) => {
            const isActive = isActiveRoute(item.href)
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`pendo-mobile-nav-item ${isActive ? 'is-active' : ''}`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
