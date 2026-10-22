'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { AchievementToast } from '@/components/community/AchievementToast'
import { motion } from 'framer-motion'
import { Sidebar } from '@/components/sidebar/Sidebar'
import {
  Activity,
  Apple,
  CalendarDays,
  Dumbbell,
  LineChart,
  Search,
  Settings,
  Trophy,
  Users,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Activity },
  { label: 'Workouts', href: '/dashboard/workouts', icon: Dumbbell },
  { label: 'Programs', href: '/dashboard/programs', icon: CalendarDays },
  { label: 'Nutrition', href: '/dashboard/nutrition', icon: Apple },
  { label: 'Progress', href: '/dashboard/progress', icon: LineChart },
  { label: 'Community', href: '/dashboard/community', icon: Users },
  { label: 'Challenges', href: '/dashboard/challenges', icon: Trophy },
]

const bottomNavItems = [
  { label: 'Home', href: '/dashboard', icon: Activity },
  { label: 'Workouts', href: '/dashboard/workouts', icon: Dumbbell },
  { label: 'Programs', href: '/dashboard/programs', icon: CalendarDays },
  { label: 'Community', href: '/dashboard/community', icon: Users },
  { label: 'Challenges', href: '/dashboard/challenges', icon: Trophy },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('gongafit-sidebar-collapsed')
    if (saved) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('gongafit-sidebar-collapsed', next.toString())
      return next
    })
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const currentSectionName =
    [...navItems, { label: 'Settings', href: '/dashboard/settings' }].find(
      (item) => isActiveRoute(item.href)
    )?.label || 'Dashboard'

  return (
    <div className="min-h-screen bg-clean-bg text-clean-text flex flex-col md:flex-row">
      {/* Desktop Sidebar — now a dedicated component */}
      <Sidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />

      {/* Main content wrapper */}
      <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} flex flex-col min-h-screen pb-16 md:pb-0 bg-clean-bg`}>
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-20 bg-clean-sidebar/90 backdrop-blur-md border-b border-clean-border px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-clean-accent flex items-center justify-center text-white font-bold text-sm">
              G
            </div>
            <h1 className="text-lg font-bold text-clean-text">{currentSectionName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex sticky top-0 z-10 bg-clean-bg/80 backdrop-blur-md px-8 py-4 items-center justify-between border-b border-clean-border/50">
          <div>
            <h1 className="text-2xl font-bold animate-fade-in text-clean-text">
              {currentSectionName}
            </h1>
            <p className="text-sm text-clean-muted">
              {loading
                ? 'Loading your training space...'
                : `Welcome back, ${user?.display_name || 'athlete'}.`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clean-muted group-focus-within:text-clean-accent transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 rounded-full bg-clean-sidebar border border-clean-border text-clean-text placeholder:text-clean-muted text-sm focus:outline-none focus:ring-2 focus:ring-clean-accent/30 focus:border-clean-accent/50 w-48 transition-all"
              />
            </div>

            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-6 md:px-8 animate-slide-up">{children}</main>
      </div>

      {/* Global gamification celebrations (achievement/level-up socket events) */}
      <AchievementToast />

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-clean-sidebar border-t border-clean-border bottom-bar-safe z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.22)]">
        <nav className="flex items-center justify-around px-2 pt-2 pb-1">
          {bottomNavItems.map((item) => {
            const isActive = isActiveRoute(item.href)
            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative flex flex-col items-center justify-center w-16 h-12"
              >
                <div
                  className={`relative z-10 p-1.5 rounded-full transition-colors ${
                    isActive ? 'text-clean-accent' : 'text-clean-muted'
                  }`}
                >
                  <item.icon className="w-6 h-6" />
                </div>
                {isActive && (
                  <motion.div
                    layoutId="mobile-active-indicator"
                    className="absolute bottom-0 w-1.5 h-1.5 bg-clean-accent rounded-full"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}