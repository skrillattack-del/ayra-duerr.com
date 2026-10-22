'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Activity, Dumbbell, CalendarDays, Apple, LineChart, Users, Trophy, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Activity },
  { label: 'Workouts', href: '/dashboard/workouts', icon: Dumbbell },
  { label: 'Programs', href: '/dashboard/programs', icon: CalendarDays },
  { label: 'Nutrition', href: '/dashboard/nutrition', icon: Apple },
  { label: 'Progress', href: '/dashboard/progress', icon: LineChart },
  { label: 'Community', href: '/dashboard/community', icon: Users },
  { label: 'Challenges', href: '/dashboard/challenges', icon: Trophy },
]

interface SidebarNavProps {
  isCollapsed: boolean
  currentPathname: string
  isActiveRoute: (href: string) => boolean
}

export function SidebarNav({ isCollapsed, currentPathname, isActiveRoute }: SidebarNavProps) {
  return (
    <nav className="flex-1 overflow-y-auto discord-scrollbar px-3 space-y-1 pb-4 overflow-x-hidden">
      {navItems.map((item) => {
        const isActive = isActiveRoute(item.href)
        return (
          <div key={item.label} className="relative group">
            <Link
              href={item.href}
              className={`relative flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-clean-muted nav-item-hover'
              } ${isCollapsed ? 'justify-center' : 'px-4'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-sidebar-pill"
                  className="absolute inset-0 bg-clean-accent rounded-xl z-0"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : ''}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </div>
            </Link>
            {isCollapsed && (
              <div className="sidebar-tooltip">
                {item.label}
              </div>
            )}
          </div>
        )
      })}

      <div className="my-4 border-t border-clean-border mx-2" />

      {/* Settings Item */}
      <div className="relative group">
        <Link
          href="/dashboard/settings"
          className={`relative flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
            isActiveRoute('/dashboard/settings')
              ? 'text-white shadow-sm'
              : 'text-clean-muted nav-item-hover'
          } ${isCollapsed ? 'justify-center' : 'px-4'}`}
        >
          {isActiveRoute('/dashboard/settings') && (
            <motion.div
              layoutId="active-sidebar-pill"
              className="absolute inset-0 bg-clean-accent rounded-xl z-0"
              initial={false}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <div className="relative z-10 flex items-center gap-3">
            <Settings className={`w-5 h-5 shrink-0 ${isActiveRoute('/dashboard/settings') ? 'text-white' : ''}`} />
            {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
          </div>
        </Link>
        {isCollapsed && (
          <div className="sidebar-tooltip">
            Settings
          </div>
        )}
      </div>
    </nav>
  )
}