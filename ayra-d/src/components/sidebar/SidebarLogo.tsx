'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarLogoProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function SidebarLogo({ isCollapsed, onToggleCollapse }: SidebarLogoProps) {
  return (
    <div className="p-6 flex items-center justify-between overflow-hidden shrink-0">
      <Link href="/dashboard" className="flex items-center gap-3 group shrink-0">
        <div className="w-10 h-10 rounded-full bg-clean-accent flex items-center justify-center text-white font-bold text-lg shadow-sm transition-transform duration-300 group-hover:scale-105 shrink-0">
          G
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-xl font-bold tracking-tight whitespace-nowrap"
            >
              GongaFit
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
      <button
        onClick={onToggleCollapse}
        className="p-1.5 rounded-md text-clean-muted hover:bg-clean-hover hover:text-clean-text transition-colors shrink-0"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </div>
  )
}