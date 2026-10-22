'use client'

import Link from 'next/link'
import { Activity, LineChart, Users, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Activity },
  { label: 'Progress', href: '/dashboard/progress', icon: LineChart },
  { label: 'Community', href: '/dashboard/community', icon: Users },
]

interface SidebarNavProps {
  isCollapsed: boolean
  currentPathname: string
  isActiveRoute: (href: string) => boolean
}

export function SidebarNav({ isCollapsed, currentPathname, isActiveRoute }: SidebarNavProps) {
  return (
    <nav className="pendo-sidebar-nav">
      {navItems.map((item) => {
        const isActive = isActiveRoute(item.href)
        return (
          <div key={item.label} className="relative group">
            <Link
              href={item.href}
              className={`pendo-sidebar-nav-link ${
                isActive
                  ? 'is-active'
                  : ''
              } ${isCollapsed ? 'justify-center' : 'px-4'}`}
            >
              <div className="relative z-10 flex items-center gap-3">
                <item.icon className="h-5 w-5 shrink-0" />
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

      <div className="pendo-sidebar-rule" />

      {/* Settings Item */}
      <div className="relative group">
        <Link
          href="/dashboard/settings"
          className={`pendo-sidebar-nav-link ${
            isActiveRoute('/dashboard/settings')
              ? 'is-active'
              : ''
          } ${isCollapsed ? 'justify-center' : 'px-4'}`}
        >
          <div className="relative z-10 flex items-center gap-3">
            <Settings className="h-5 w-5 shrink-0" />
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
