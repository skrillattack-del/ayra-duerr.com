'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Curated, dependency-free emoji set with a fitness-community bias.
const EMOJI_CATEGORIES: Array<{ name: string; emojis: string[] }> = [
  {
    name: 'Hype',
    emojis: ['🔥', '💪', '🏋️', '🏆', '⚡', '🚀', '💯', '🥇', '🎯', '📈', '🦾', '👑', '🏃', '🤸', '⛹️', '🧘'],
  },
  {
    name: 'Reactions',
    emojis: ['👍', '👏', '🙌', '🤝', '👊', '✊', '🫡', '💥', '🎉', '🎊', '✨', '⭐', '❗', '❓', '✅', '❌'],
  },
  {
    name: 'Faces',
    emojis: ['😀', '😂', '🤣', '😅', '😊', '😍', '😎', '🤩', '😤', '😮', '🥵', '🥶', '😴', '🤯', '🥹', '😭'],
  },
  {
    name: 'Food',
    emojis: ['🍗', '🥩', '🥚', '🥦', '🍌', '🍎', '🥑', '🍚', '🥛', '☕', '💧', '🧃', '🍕', '🍔', '🍺', '🧂'],
  },
]

interface EmojiPickerProps {
  open: boolean
  onClose: () => void
  onPick: (emoji: string) => void
  /** Anchor alignment relative to its relatively-positioned parent. */
  align?: 'left' | 'right'
  direction?: 'up' | 'down'
}

export function EmojiPicker({ open, onClose, onPick, align = 'right', direction = 'up' }: EmojiPickerProps) {
  const [category, setCategory] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95, y: direction === 'up' ? 6 : -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: direction === 'up' ? 6 : -6 }}
          className={cn(
            'absolute z-40 w-72 bg-white border border-clean-border rounded-xl shadow-2xl overflow-hidden',
            align === 'right' ? 'right-0' : 'left-0',
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <div className="flex border-b border-clean-border">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setCategory(i)}
                className={cn(
                  'flex-1 px-2 py-2 text-[11px] font-semibold transition-colors',
                  i === category ? 'text-clean-text bg-clean-hover' : 'text-clean-muted hover:text-clean-text',
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1 p-3">
            {EMOJI_CATEGORIES[category].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onPick(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-clean-hover rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
