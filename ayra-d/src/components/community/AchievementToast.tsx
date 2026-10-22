'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { initSocket } from '@/lib/socketClient'

interface Celebration {
  id: string
  kind: 'achievement' | 'level'
  icon: string
  title: string
  subtitle: string
}

/**
 * Global listener for `achievement:earned` and `level:up` socket events.
 * Mounted once in the dashboard layout — celebrates with a slide-in card.
 */
export function AchievementToast() {
  const [queue, setQueue] = useState<Celebration[]>([])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) return

    let socket
    try {
      socket = initSocket()
    } catch {
      return
    }

    const onAchievement = (payload: any) => {
      const a = payload?.achievement
      if (!a) return
      setQueue((prev) => [
        ...prev,
        {
          id: `ach-${a.id}-${Date.now()}`,
          kind: 'achievement',
          icon: a.icon || '🏆',
          title: `Achievement unlocked!`,
          subtitle: `${a.name} · +${payload.xpBonus ?? 0} XP`,
        },
      ])
    }

    const onLevelUp = (payload: any) => {
      setQueue((prev) => [
        ...prev,
        {
          id: `lvl-${payload?.level}-${Date.now()}`,
          kind: 'level',
          icon: '⬆️',
          title: `Level up!`,
          subtitle: `You reached level ${payload?.level}`,
        },
      ])
    }

    socket.on('achievement:earned', onAchievement)
    socket.on('level:up', onLevelUp)
    return () => {
      socket?.off('achievement:earned', onAchievement)
      socket?.off('level:up', onLevelUp)
    }
  }, [])

  // Auto-dismiss the head of the queue
  useEffect(() => {
    if (queue.length === 0) return
    const t = setTimeout(() => setQueue((prev) => prev.slice(1)), 4500)
    return () => clearTimeout(t)
  }, [queue])

  const current = queue[0]

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="flex items-center gap-3 px-5 py-3.5 bg-white/95 backdrop-blur border border-amber-400 rounded-2xl shadow-lg shadow-amber-500/20"
          >
            <motion.span
              className="text-3xl"
              initial={{ rotate: -20, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            >
              {current.icon}
            </motion.span>
            <div>
              <div className="text-sm font-bold text-amber-600">{current.title}</div>
              <div className="text-xs text-clean-muted">{current.subtitle}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

