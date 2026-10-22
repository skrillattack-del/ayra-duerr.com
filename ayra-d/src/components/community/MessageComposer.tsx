'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Image as ImageIcon, Smile, Loader2, X, AtSign, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/media'
import { useMediaUpload, type Message } from '@/hooks'
import { useToast } from '@/hooks/useToast'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import { CommunityRepository, type UserSearchResult } from '@/repositories/CommunityRepository'
import { EmojiPicker } from './EmojiPicker'
import { Avatar } from './Badges'

export interface ComposerSendOptions {
  mediaUrls?: string[]
  parentId?: string
  mentions?: string[]
}

interface MessageComposerProps {
  placeholder: string
  disabled?: boolean
  disabledReason?: string
  maxUploadBytes: number
  maxMediaPerMessage: number
  replyingTo?: Message | null
  onCancelReply?: () => void
  onSend: (content: string, opts: ComposerSendOptions) => Promise<unknown>
  onTyping?: () => void
  enableMentions?: boolean
}

export function MessageComposer({
  placeholder,
  disabled,
  disabledReason,
  maxUploadBytes,
  maxMediaPerMessage,
  replyingTo,
  onCancelReply,
  onSend,
  onTyping,
  enableMentions = true,
}: MessageComposerProps) {
  const { upload, uploading, progress } = useMediaUpload(maxUploadBytes)
  const { toast } = useToast()

  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingMedia, setPendingMedia] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const remoteUrls = useRef<Record<string, string>>({})

  // Mentions
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<UserSearchResult[]>([])
  const mentionIds = useRef<Map<string, string>>(new Map()) // displayName -> userId

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Debounced mention search
  useEffect(() => {
    if (!enableMentions || mentionQuery === null || mentionQuery.length < 2) {
      setMentionResults([])
      return
    }
    const t = setTimeout(() => {
      CommunityRepository.searchUsers(mentionQuery)
        .then(setMentionResults)
        .catch(() => setMentionResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [mentionQuery, enableMentions])

  const detectMention = (text: string, caret: number) => {
    const upToCaret = text.slice(0, caret)
    const match = upToCaret.match(/@([\w .-]{0,30})$/)
    setMentionQuery(match ? match[1] : null)
  }

  const insertMention = (user: UserSearchResult) => {
    const el = inputRef.current
    const caret = el?.selectionStart ?? value.length
    const upToCaret = value.slice(0, caret).replace(/@([\w .-]{0,30})$/, `@${user.display_name} `)
    const next = upToCaret + value.slice(caret)
    mentionIds.current.set(user.display_name, user.id)
    setValue(next)
    setMentionQuery(null)
    el?.focus()
  }

  const collectMentions = (text: string): string[] => {
    const ids: string[] = []
    mentionIds.current.forEach((id, name) => {
      if (text.includes(`@${name}`)) ids.push(id)
    })
    return Array.from(new Set(ids)).slice(0, 10)
  }

  const handleSend = async () => {
    if ((!value.trim() && pendingMedia.length === 0) || sending || uploading || disabled) return

    const mediaToSend = pendingMedia.map((b) => remoteUrls.current[b]).filter(Boolean)

    setSending(true)
    try {
      await onSend(value, {
        mediaUrls: mediaToSend.length > 0 ? mediaToSend : undefined,
        parentId: replyingTo?.id,
        mentions: enableMentions ? collectMentions(value) : undefined,
      })
      pendingMedia.forEach((b) => URL.revokeObjectURL(b))
      remoteUrls.current = {}
      mentionIds.current.clear()
      setValue('')
      setPendingMedia([])
      onCancelReply?.()
    } catch (error) {
      console.error('Failed to send:', error)
      toast(mapApiErrorToToast(error, { action: 'send this message' }))
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
      if (pendingMedia.length >= maxMediaPerMessage) {
        toast({ title: `Your plan allows up to ${maxMediaPerMessage} attachments per message`, variant: 'destructive' })
        break
      }

      const blobUrl = URL.createObjectURL(file)
      setPendingMedia((prev) => [...prev, blobUrl])

      try {
        const url = await upload(file)
        remoteUrls.current[blobUrl] = url
      } catch (error) {
        console.error('Upload failed:', error)
        toast(mapApiErrorToToast(error, { action: 'upload this file' }))
        setPendingMedia((prev) => prev.filter((u) => u !== blobUrl))
        URL.revokeObjectURL(blobUrl)
      }
    }

    e.target.value = ''
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionResults.length > 0 && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault()
      insertMention(mentionResults[0])
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)
      onTyping?.()
      detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length)
    },
    [onTyping],
  )

  if (disabled) {
    return (
      <div className="p-4 border-t border-clean-border bg-clean-bg">
        <div className="flex items-center gap-3 px-4 py-3 bg-white border border-clean-border rounded-xl text-sm text-clean-muted">
          <Lock className="w-4 h-4 shrink-0" />
          {disabledReason || 'You cannot post here'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border-t border-clean-border bg-clean-bg relative">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-3 flex items-center justify-between px-3 py-2 bg-white rounded-lg border-l-2 border-clean-accent shadow-sm">
          <div className="min-w-0">
            <div className="text-xs text-clean-muted">
              Replying to <span className="text-clean-accent font-medium">{replyingTo.sender.displayName}</span>
            </div>
            <div className="text-sm text-clean-text truncate">{replyingTo.content}</div>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-clean-hover rounded">
            <X className="w-4 h-4 text-clean-muted" />
          </button>
        </div>
      )}

      {/* Pending media preview */}
      {pendingMedia.length > 0 && (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto py-2">
          {pendingMedia.map((url, idx) => (
            <div key={idx} className="relative shrink-0">
              <img src={url} alt="" loading="lazy" decoding="async" className="w-16 h-16 object-cover rounded-lg" />
              <button
                onClick={() => {
                  URL.revokeObjectURL(url)
                  delete remoteUrls.current[url]
                  setPendingMedia((prev) => prev.filter((_, i) => i !== idx))
                }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs text-clean-muted">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading... {progress}%
          </div>
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-clean-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Mention popover */}
      {mentionQuery !== null && mentionResults.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 bg-white border border-clean-border rounded-xl shadow-xl overflow-hidden z-40">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-clean-muted uppercase tracking-wider flex items-center gap-1 bg-gray-50/50">
            <AtSign className="w-3 h-3" /> Mention
          </div>
          {mentionResults.slice(0, 5).map((u) => (
            <button
              key={u.id}
              onClick={() => insertMention(u)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-clean-hover text-left transition-colors"
            >
              <Avatar src={mediaUrl(u.avatar_url)} name={u.display_name} size={6} />
              <span className="text-sm text-clean-text font-medium">{u.display_name}</span>
              {u.stats?.level ? <span className="ml-auto text-[10px] text-clean-muted font-mono">Lv {u.stats.level}</span> : null}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2.5 hover:bg-clean-hover rounded-lg transition-colors text-clean-muted hover:text-clean-text disabled:opacity-50"
          title="Attach image or video"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            rows={1}
            className="w-full px-4 py-3 bg-white border border-clean-border rounded-xl text-sm text-clean-text placeholder-clean-muted resize-none focus:border-clean-accent focus:ring-1 focus:ring-clean-accent focus:outline-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="p-2.5 hover:bg-clean-hover rounded-lg transition-colors text-clean-muted hover:text-clean-text"
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          <EmojiPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={(emoji) => {
              setValue((v) => `${v}${emoji}`)
              inputRef.current?.focus()
            }}
            align="right"
            direction="up"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={(!value.trim() && pendingMedia.length === 0) || sending || uploading}
          className={cn(
            'p-2.5 rounded-xl transition-all',
            (value.trim() || pendingMedia.length > 0) && !sending && !uploading
              ? 'bg-clean-accent hover:bg-clean-accent/90 text-white shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}

