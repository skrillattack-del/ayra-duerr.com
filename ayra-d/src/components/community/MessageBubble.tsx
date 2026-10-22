'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreHorizontal,
  Reply,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Flag,
  MessageSquare,
  Trophy,
  Loader2,
  SmilePlus,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/media'
import type { Message } from '@/hooks'
import { FlairBadge, LevelChip, Avatar } from './Badges'
import { EmojiPicker } from './EmojiPicker'
import { Modal } from './Modal'

const QUICK_REACTIONS = ['👍', '🔥', '💪', '❤️']

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'OFF_TOPIC', label: 'Off topic' },
  { value: 'OTHER', label: 'Other' },
] as const

export interface MessageBubbleProps {
  message: Message
  currentUserId: string
  isAdmin: boolean
  canModerate?: boolean // squad mods etc.
  compact: boolean
  showThreadButton?: boolean
  onReact: (emoji: string) => void
  onReply?: () => void
  onOpenThread?: () => void
  onEdit?: (content: string) => Promise<void>
  onDelete?: () => Promise<void>
  onPin?: () => Promise<void>
  onUnpin?: () => Promise<void>
  onReport?: (reason: string, details?: string) => Promise<void>
  onMute?: (minutes: number) => Promise<void>
}

export function MessageBubble({
  message,
  currentUserId,
  isAdmin,
  canModerate = false,
  compact,
  showThreadButton = true,
  onReact,
  onReply,
  onOpenThread,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onReport,
  onMute,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.content)
  const [busy, setBusy] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<string>('SPAM')
  const [reportDetails, setReportDetails] = useState('')

  const isOwn = message.senderId === currentUserId
  const moderator = isAdmin || canModerate

  // System messages (achievement wins etc.) render as celebration cards.
  if (message.isSystem) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
          <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="text-sm text-amber-800">{message.content}</div>
          <span className="ml-auto text-[10px] text-clean-muted shrink-0">{formatTime(message.createdAt)}</span>
        </div>
      </motion.div>
    )
  }

  const runBusy = async (fn?: () => Promise<void>) => {
    if (!fn || busy) return
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
      setMenuOpen(false)
    }
  }

  const submitEdit = async () => {
    if (!onEdit || !editValue.trim() || editValue === message.content) {
      setEditing(false)
      return
    }
    setBusy(true)
    try {
      await onEdit(editValue.trim())
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false)
        setMenuOpen(false)
        setPickerOpen(false)
      }}
      className={cn('group relative px-1 rounded-lg', compact ? 'mt-0.5' : 'mt-4', message.isPinned && 'bg-amber-50')}
    >
      <div className="flex items-start gap-3">
        {!compact ? (
          <Avatar src={mediaUrl(message.sender.avatarUrl)} name={message.sender.displayName} size={10} />
        ) : null}

        <div className={cn('flex-1 min-w-0', compact && 'ml-[52px]')}>
          {!compact && (
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-clean-text">{message.sender.displayName}</span>
              <FlairBadge role={message.sender.role} membershipTier={message.sender.membershipTier} />
              <LevelChip level={message.sender.level} />
              <span className="text-xs text-clean-muted">{formatTime(message.createdAt)}</span>
              {message.isEdited && <span className="text-xs text-clean-muted">(edited)</span>}
              {message.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
            </div>
          )}

          {editing ? (
            <div className="mt-1">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submitEdit()
                  }
                  if (e.key === 'Escape') setEditing(false)
                }}
                rows={2}
                autoFocus
                className="w-full px-3 py-2 bg-white border border-clean-border rounded-lg text-sm text-clean-text resize-none focus:border-clean-accent focus:ring-1 focus:ring-clean-accent focus:outline-none"
              />
              <div className="mt-1 flex items-center gap-2 text-[11px] text-clean-muted">
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Enter to save · Esc to cancel</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-clean-text whitespace-pre-wrap break-words">
              {renderContentWithMentions(message.content)}
            </div>
          )}

          {message.mediaUrls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.mediaUrls.map((url, idx) =>
                /\.(mp4|webm|mov)($|\?)/i.test(url) ? (
                  <video key={idx} src={url} controls className="max-w-xs rounded-lg" />
                ) : (
                  <img
                    key={idx}
                    src={url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ),
              )}
            </div>
          )}

          {Object.keys(message.reactionSummary).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(message.reactionSummary).map(([emoji, { count, hasReacted }]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border',
                    hasReacted
                      ? 'bg-clean-accent/10 text-clean-accent border-clean-accent/30'
                      : 'bg-white border-clean-border text-clean-muted hover:bg-clean-hover',
                  )}
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              ))}
            </div>
          )}

          {showThreadButton && message.replyCount > 0 && (
            <button
              onClick={onOpenThread}
              className="mt-2 text-xs text-clean-accent hover:opacity-80 flex items-center gap-1 transition-opacity"
            >
              <MessageSquare className="w-3 h-3" />
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {showActions && !editing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -top-3 right-0 flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-clean-border shadow-lg"
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => onReact(emoji)} className="p-1 hover:bg-clean-hover rounded transition-colors">
                {emoji}
              </button>
            ))}

            <div className="relative">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="p-1 hover:bg-clean-hover rounded transition-colors text-clean-muted hover:text-clean-text"
                title="More reactions"
              >
                <SmilePlus className="w-4 h-4" />
              </button>
              <EmojiPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onPick={(emoji) => {
                  onReact(emoji)
                  setPickerOpen(false)
                }}
                align="right"
                direction="down"
              />
            </div>

            <div className="w-px h-4 bg-clean-border mx-1" />

            {onReply && (
              <button
                onClick={onReply}
                className="p-1 hover:bg-clean-hover rounded transition-colors text-clean-muted hover:text-clean-text"
                title="Reply in thread"
              >
                <Reply className="w-4 h-4" />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1 hover:bg-clean-hover rounded transition-colors text-clean-muted hover:text-clean-text"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-44 bg-white border border-clean-border rounded-xl shadow-xl py-1 z-40"
                  >
                    {isOwn && onEdit && (
                      <MenuItem icon={Pencil} label="Edit" onClick={() => { setEditing(true); setEditValue(message.content); setMenuOpen(false) }} />
                    )}
                    {(isOwn || moderator) && onDelete && (
                      <MenuItem icon={Trash2} label="Delete" danger onClick={() => runBusy(onDelete)} />
                    )}
                    {moderator && !message.isPinned && onPin && (
                      <MenuItem icon={Pin} label="Pin message" onClick={() => runBusy(onPin)} />
                    )}
                    {moderator && message.isPinned && onUnpin && (
                      <MenuItem icon={PinOff} label="Unpin message" onClick={() => runBusy(onUnpin)} />
                    )}
                    {isAdmin && !isOwn && onMute && (
                      <MenuItem icon={VolumeX} label="Mute author (1h)" danger onClick={() => runBusy(() => onMute(60))} />
                    )}
                    {!isOwn && onReport && (
                      <MenuItem icon={Flag} label="Report" onClick={() => { setReportOpen(true); setMenuOpen(false) }} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report message">
        <div className="space-y-3">
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-3 cursor-pointer text-sm text-clean-text">
              <input
                type="radio"
                name="report-reason"
                checked={reportReason === r.value}
                onChange={() => setReportReason(r.value)}
                className="accent-clean-accent"
              />
              {r.label}
            </label>
          ))}
          <textarea
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="Add details (optional)"
            rows={3}
            className="w-full px-3 py-2 bg-white border border-clean-border rounded-lg text-sm text-clean-text placeholder-clean-muted resize-none focus:border-clean-accent focus:ring-1 focus:ring-clean-accent focus:outline-none"
          />
          <button
            disabled={busy}
            onClick={async () => {
              if (!onReport) return
              setBusy(true)
              try {
                await onReport(reportReason, reportDetails.trim() || undefined)
                setReportOpen(false)
                setReportDetails('')
              } finally {
                setBusy(false)
              }
            }}
            className="w-full py-2.5 bg-clean-accent hover:bg-clean-accent/90 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </Modal>
    </motion.div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pin
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors',
        danger ? 'text-red-500 hover:bg-red-50' : 'text-clean-text hover:bg-clean-hover',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

function renderContentWithMentions(content: string) {
  const parts = content.split(/(@[\w][\w .-]{0,30})/g)
  if (parts.length === 1) return content
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-clean-accent bg-clean-accent/10 rounded px-1 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

