'use client'

import Image from 'next/image'
import { LogOut } from 'lucide-react'

interface SidebarFooterProps {
  isCollapsed: boolean
  onLogout: () => void
}

export function SidebarFooter({ isCollapsed, onLogout }: SidebarFooterProps) {
  return (
    <div className={`pendo-sidebar-footer ${isCollapsed ? 'is-collapsed' : ''}`}>
      {!isCollapsed && (
        <div className="pendo-sidebar-dog">
          <span className="pendo-sidebar-spark pendo-sidebar-spark-one">✦</span>
          <span className="pendo-sidebar-spark pendo-sidebar-spark-two">♡</span>
          <Image
            src="/images/pendo/pendo-happy.png"
            alt="Pendo smiling"
            width={168}
            height={168}
            className="pendo-sidebar-dog-image"
          />
          <p>Good dogs make brighter days.</p>
        </div>
      )}
      <button
        onClick={onLogout}
        className="pendo-sign-out"
        aria-label={isCollapsed ? 'Sign out' : undefined}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!isCollapsed && <span>Sign out</span>}
      </button>
    </div>
  )
}
