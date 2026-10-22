'use client'

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ChevronDown, Pin, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Feed, Message } from '@/hooks'
import { useToast } from '@/hooks/useToast'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { CommunityRepository } from '@/repositories/CommunityRepository'
import { MessageBubble } from './MessageBubble'
import { MessageComposer, type ComposerSendOptions } from './MessageComposer'

export interface ChatPanelProps {
  header: ReactNode
  feed: Feed
  pinned?: Message[]
  currentUserId: string
  isAdmin: boolean
  canModerate?: boolean
  canPost: boolean
  cannotPostReason?: string
  composerPlaceholder: string
  maxUploadBytes: number
  maxMediaPerMessage: number
  onOpenThread?: (message: Message) => void
  onMuteAuthor?: (userId: string, minutes: number) => Promise<void>
  enableMentions?: boolean
  /** Squad/DM feeds append at bottom (chronological); channel feeds prepend (newest first). */
  order?: 'newest-first' | 'oldest-first'
}

export function ChatPanel({
  header,
  feed,
  pinned = [],
  currentUserId,
  isAdmin,
  canModerate = false,
  canPost,
  cannotPostReason,
  composerPlaceholder,
  maxUploadBytes,
  maxMediaPerMessage,
  onOpenThread,
  onMuteAuthor,
  enableMentions = true,
  order = 'newest-first',
}: ChatPanelProps) {
  const { toast } = useToast()
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showPinned, setShowPinned] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const chronological = order === 'newest-first' ? [...feed.messages].reverse() : feed.messages

  useEffect(() => {
    if (messagesEndRef.current && !showScrollButton) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.messages.length])

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!atBottom)

    if (scrollTop < 200 && feed.hasMore && !feed.loading) {
      feed.loadMore()
    }
  }, [feed])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const act = useCallback(
    async (action: () => Promise<unknown>, description: string) => {
      try {
        await action()
      } catch (error) {
        console.error(`Failed to ${description}:`, error)
        toast(mapApiErrorToToast(error, { action: description }))
      }
    },
    [toast],
  )

  const handleSend = useCallback(
    async (content: string, opts: ComposerSendOptions) => {
      await feed.sendMessage(content, opts)
      scrollToBottom()
    },
    [feed, scrollToBottom],
  )

  // Group by date
  const grouped = chronological.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  const renderBubble = (message: Message, compact: boolean, inPinnedList = false) => (
    <MessageBubble
      key={`${inPinnedList ? 'pin-' : ''}${message.id}`}
      message={message}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      canModerate={canModerate}
      compact={compact}
      showThreadButton={!!onOpenThread}
      onReact={(emoji) => act(() => feed.addReaction(message.id, emoji), 'add this reaction')}
      onReply={
        onOpenThread
          ? () => setReplyingTo(message)
          : undefined
      }
      onOpenThread={onOpenThread ? () => onOpenThread(message) : undefined}
      onEdit={
        message.senderId === currentUserId
          ? (content) => act(() => CommunityRepository.editMessage(message.id, content), 'edit this message') as Promise<void>
          : undefined
      }
      onDelete={() => act(() => CommunityRepository.deleteMessage(message.id), 'delete this message') as Promise<void>}
      onPin={() => act(() => CommunityRepository.pinMessage(message.id), 'pin this message') as Promise<void>}
      onUnpin={() => act(() => CommunityRepository.unpinMessage(message.id), 'unpin this message') as Promise<void>}
      onReport={(reason, details) =>
        act(async () => {
          await CommunityRepository.reportMessage(message.id, reason, details)
          toast({ title: 'Report submitted — a moderator will review it', variant: 'success' })
        }, 'report this message') as Promise<void>
      }
      onMute={
        onMuteAuthor
          ? (minutes) =>
              act(async () => {
                await onMuteAuthor(message.senderId, minutes)
                toast({ title: 'User muted', variant: 'success' })
              }, 'mute this user') as Promise<void>
          : undefined
      }
    />
  )

  return (
    <div className="h-full flex flex-col bg-white relative min-w-0">
      {header}

      {/* Pinned bar */}
      {pinned.length > 0 && (
        <div className="border-b border-clean-border bg-amber-50">
          <button
            onClick={() => setShowPinned((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <Pin className="w-3.5 h-3.5" />
            {pinned.length} pinned {pinned.length === 1 ? 'message' : 'messages'}
            <ChevronDown className={cn('w-3.5 h-3.5 ml-auto transition-transform', showPinned && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {showPinned && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 max-h-64 overflow-y-auto space-y-2">
                  {pinned.map((m) => renderBubble(m, false, true))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4">
        {feed.loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-clean-accent animate-spin" />
          </div>
        )}

        {!feed.loading && feed.error && (
          <div className="mx-auto my-6 max-w-sm rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center">
            <p className="text-sm text-red-700">{feed.error}</p>
            <button
              type="button"
              onClick={feed.refresh}
              className="mt-2 text-xs font-semibold text-clean-accent hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!feed.loading && !feed.error && chronological.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-clean-muted gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-sm">No messages yet — start the conversation!</p>
          </div>
        )}

        {Object.entries(grouped).map(([date, dayMessages]) => (
          <div key={date}>
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-clean-border" />
              <span className="text-[10px] font-mono text-clean-muted uppercase tracking-wider">
                {formatDateDivider(date)}
              </span>
              <div className="flex-1 h-px bg-clean-border" />
            </div>

            {dayMessages.map((message, idx) => {
              const prevMessage = dayMessages[idx - 1]
              const sameAuthor = prevMessage?.sender.id === message.sender.id && !prevMessage?.isSystem && !message.isSystem
              const timeDiff = prevMessage
                ? new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()
                : Infinity
              const compact = sameAuthor && timeDiff < 5 * 60 * 1000

              return renderBubble(message, compact)
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {feed.typingUsers.length > 0 && (
        <div className="px-4 py-1 text-xs text-clean-muted flex items-center gap-2">
          <span className="flex gap-0.5">
            <span className="w-1 h-1 bg-clean-muted rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 bg-clean-muted rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 bg-clean-muted rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
          {feed.typingUsers
            .slice(0, 3)
            .map((t) => t.displayName)
            .join(', ')}{' '}
          {feed.typingUsers.length === 1 ? 'is' : 'are'} typing…
        </div>
      )}

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 p-2 bg-clean-accent rounded-full shadow-lg hover:bg-clean-accent/90 transition-colors z-30"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Composer */}
      <MessageComposer
        placeholder={composerPlaceholder}
        disabled={!canPost}
        disabledReason={cannotPostReason}
        maxUploadBytes={maxUploadBytes}
        maxMediaPerMessage={maxMediaPerMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSend={handleSend}
        onTyping={feed.emitTyping}
        enableMentions={enableMentions}
      />
    </div>
  )
}

export function ChatHeader({
  icon,
  title,
  subtitle,
  connected,
  online,
  right,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  connected: boolean
  online?: number
  right?: ReactNode
}) {
  return (
    <div className="h-14 px-4 border-b border-clean-border flex items-center justify-between bg-clean-bg shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-clean-accent text-white flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-clean-text truncate">{title}</div>
          {subtitle && <div className="text-xs text-clean-muted truncate">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {typeof online === 'number' && online > 0 && (
          <span className="text-xs text-clean-muted">{online} online</span>
        )}
        <span className={cn('flex items-center gap-1.5 text-xs', connected ? 'text-emerald-500' : 'text-clean-muted')}>
          <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-emerald-500 animate-pulse' : 'bg-clean-muted')} />
          {connected ? 'Live' : 'Offline'}
        </span>
        {right}
      </div>
    </div>
  )
}

function formatDateDivider(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}
