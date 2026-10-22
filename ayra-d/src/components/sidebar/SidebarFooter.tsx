'use client'

import { LogOut } from 'lucide-react'

interface SidebarFooterProps {
  isCollapsed: boolean
  onLogout: () => void
}

export function SidebarFooter({ isCollapsed, onLogout }: SidebarFooterProps) {
  return (
    <div className="p-4 shrink-0">
      <div className="relative group">
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 p-2 w-full rounded-xl text-sm font-medium text-clean-muted hover:bg-clean-hover hover:text-clean-text transition-colors ${
            isCollapsed ? 'justify-center' : 'px-4'
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0 opacity-80" />
          {!isCollapsed && <span className="whitespace-nowrap">Sign out</span>}
        </button>
        {isCollapsed && (
          <div className="sidebar-tooltip">
            Sign out
          </div>
        )}
      </div>
    </div>
  )
}