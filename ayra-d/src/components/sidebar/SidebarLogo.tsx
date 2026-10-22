'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarLogoProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function SidebarLogo({ isCollapsed, onToggleCollapse }: SidebarLogoProps) {
  return (
    <div className="pendo-sidebar-logo">
      <Link href="/dashboard" className="flex items-center gap-3 group shrink-0">
        <Image
          src="/images/pendo/pendo-portrait.png"
          alt="Pendo"
          width={54}
          height={54}
          className="pendo-sidebar-logo-image"
        />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="pendo-sidebar-wordmark whitespace-nowrap"
            >
              Pendo
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
      <button
        onClick={onToggleCollapse}
        className="pendo-sidebar-collapse-button"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </div>
  )
}
