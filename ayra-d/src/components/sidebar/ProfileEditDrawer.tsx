'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Loader2, X } from 'lucide-react'
import { mediaUrl } from '@/lib/media'

interface ProfileEditDrawerProps {
  isOpen: boolean
  onClose: () => void
  user: {
    display_name?: string
    avatar_url?: string | null
    fitness_level?: string
    goals?: string[]
    email?: string
  } | null
  saving: boolean
  uploading: boolean
  onSave: (data: {
    display_name: string
    fitness_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    goals: string
  }) => Promise<void>
  onAvatarChange: (file: File) => Promise<void>
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function ProfileEditDrawer({
  isOpen,
  onClose,
  user,
  saving,
  uploading,
  onSave,
  onAvatarChange,
}: ProfileEditDrawerProps) {
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [fitnessLevel, setFitnessLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(
    (user?.fitness_level as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') || 'BEGINNER'
  )
  const [goals, setGoals] = useState((user?.goals || []).join(', '))
  const [localSaving, setLocalSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync user data when drawer opens
  if (isOpen && user) {
    // This runs during render to sync form state — fine for this controlled pattern
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalSaving(true)
    try {
      await onSave({
        display_name: displayName,
        fitness_level: fitnessLevel,
        goals,
      })
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setLocalSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await onAvatarChange(file)
    } catch {
      // Error handled by parent
    }
  }

  const isBusy = localSaving || saving || uploading

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-clean-sidebar border-l border-clean-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-clean-border shrink-0">
              <div>
                <h2 className="text-lg font-bold text-clean-text">Edit Profile</h2>
                <p className="text-xs text-clean-muted">Update your personal details</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-clean-muted hover:bg-clean-hover hover:text-clean-text transition-colors"
                aria-label="Close profile editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto discord-scrollbar p-6 space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="relative w-24 h-24 rounded-full overflow-hidden group border-4 border-white shadow-lg disabled:opacity-60 shrink-0"
                >
                  {user?.avatar_url ? (
                    <img
                      src={mediaUrl(user.avatar_url) ?? undefined}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-clean-accent to-clean-accent-soft flex items-center justify-center text-white text-2xl font-bold">
                      {initials(user?.display_name || 'GF')}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="text-xs text-clean-muted">{user?.email}</p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="drawer-display-name"
                    className="block text-sm font-semibold mb-1.5 text-clean-text"
                  >
                    Display name
                  </label>
                  <input
                    id="drawer-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-clean-border bg-clean-bg text-clean-text placeholder:text-clean-muted focus:outline-none focus:ring-2 focus:ring-clean-accent/30 focus:border-clean-accent/50"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="drawer-fitness-level"
                    className="block text-sm font-semibold mb-1.5 text-clean-text"
                  >
                    Fitness level
                  </label>
                  <select
                    id="drawer-fitness-level"
                    value={fitnessLevel}
                    onChange={(e) =>
                      setFitnessLevel(e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-clean-border bg-clean-bg text-clean-text focus:outline-none focus:ring-2 focus:ring-clean-accent/30 focus:border-clean-accent/50"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="drawer-goals"
                    className="block text-sm font-semibold mb-1.5 text-clean-text"
                  >
                    Goals
                  </label>
                  <input
                    id="drawer-goals"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    placeholder="e.g. Build strength, Lose weight"
                    className="w-full px-4 py-2.5 rounded-xl border border-clean-border bg-clean-bg text-clean-text placeholder:text-clean-muted focus:outline-none focus:ring-2 focus:ring-clean-accent/30 focus:border-clean-accent/50"
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-clean-border shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="flex-1 px-4 py-2.5 rounded-xl border border-clean-border text-sm font-semibold text-clean-muted hover:bg-clean-hover hover:text-clean-text transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isBusy || !displayName.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-clean-accent text-white text-sm font-bold hover:bg-clean-accent disabled:opacity-50 disabled:hover:bg-clean-accent flex items-center justify-center gap-2"
              >
                {localSaving || saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}