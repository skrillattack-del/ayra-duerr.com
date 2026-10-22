'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Flag,
  MessageSquare,
  Image as ImageIcon,
  VolumeX,
  Trash2,
  Check,
  X,
  Search,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/media'
import { useToast } from '@/hooks/useToast'
import { mapApiErrorToToast } from '@/lib/apiFeedback'
import {
  AdminRepository,
  type CommunityReport,
  type CommunityMediaItem,
  type MutedUser,
} from '@/repositories/AdminRepository'

type Tab = 'reports' | 'messages' | 'media' | 'muted'

const MUTE_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '1h', minutes: 60 },
  { label: '24h', minutes: 60 * 24 },
  { label: '7d', minutes: 60 * 24 * 7 },
]

function CommunityModeration() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('reports')

  const [reports, setReports] = useState<CommunityReport[]>([])
  const [reportStatus, setReportStatus] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED'>('OPEN')
  const [messages, setMessages] = useState<any[]>([])
  const [messageSearch, setMessageSearch] = useState('')
  const [media, setMedia] = useState<CommunityMediaItem[]>([])
  const [muted, setMuted] = useState<MutedUser[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'reports') {
        const data = await AdminRepository.getReports(reportStatus)
        setReports(data.reports)
      } else if (tab === 'messages') {
        const data = await AdminRepository.getCommunityMessages({ search: messageSearch || undefined, take: 50 })
        setMessages(data.messages)
      } else if (tab === 'media') {
        const data = await AdminRepository.getCommunityMedia()
        setMedia(data.items)
      } else {
        const data = await AdminRepository.getMutedUsers()
        setMuted(data.users)
      }
    } catch (error) {
      toast(mapApiErrorToToast(error, { action: 'load community moderation data' }))
    } finally {
      setLoading(false)
    }
  }, [tab, reportStatus, messageSearch, toast])

  useEffect(() => {
    const t = setTimeout(load, tab === 'messages' ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, tab])

  const resolveReport = async (
    report: CommunityReport,
    status: 'RESOLVED' | 'DISMISSED',
    opts: { deleteMessage?: boolean; muteMinutes?: number } = {},
  ) => {
    setBusyId(report.id)
    try {
      await AdminRepository.resolveReport(report.id, { status, ...opts })
      toast({ title: status === 'RESOLVED' ? 'Report resolved' : 'Report dismissed', variant: 'success' })
      load()
    } catch (error) {
      toast(mapApiErrorToToast(error, { action: 'resolve this report' }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.4em] text-slate-500">{'// Community Moderation'}</h2>
        <button onClick={load} className="p-2 hover:bg-zinc-800 rounded transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded p-1 w-fit">
        {(
          [
            ['reports', Flag, 'Reports'],
            ['messages', MessageSquare, 'Messages'],
            ['media', ImageIcon, 'Media'],
            ['muted', VolumeX, 'Muted'],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-colors',
              tab === key ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
        {loading && (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        )}

        {/* REPORTS */}
        {!loading && tab === 'reports' && (
          <>
            <div className="flex gap-2 mb-4">
              {(['OPEN', 'RESOLVED', 'DISMISSED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setReportStatus(s)}
                  className={cn(
                    'px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors',
                    reportStatus === s
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'text-slate-500 border-zinc-800 hover:border-zinc-600',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {reports.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">No {reportStatus.toLowerCase()} reports 🎉</p>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="border border-zinc-800 rounded p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase rounded">
                            {report.reason}
                          </span>
                          <span className="text-xs text-slate-500">
                            reported by <span className="text-slate-300">{report.reporter.display_name}</span> ·{' '}
                            {new Date(report.created_at).toLocaleString()}
                          </span>
                        </div>
                        {report.details && <p className="text-xs text-slate-400 mb-2 italic">&ldquo;{report.details}&rdquo;</p>}
                        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                          <div className="text-xs text-slate-500 mb-1">
                            <span className="text-slate-300 font-semibold">{report.message.sender.display_name}</span>
                            {report.message.is_deleted && (
                              <span className="ml-2 text-red-400">[already deleted]</span>
                            )}
                            {report.message.sender.community_muted_until &&
                              new Date(report.message.sender.community_muted_until) > new Date() && (
                                <span className="ml-2 text-amber-400">[muted]</span>
                              )}
                          </div>
                          <p className="text-sm text-slate-300 break-words">{report.message.content}</p>
                          {report.message.media_urls.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {report.message.media_urls.map((url, i) => (
                                <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {reportStatus === 'OPEN' && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            disabled={busyId === report.id}
                            onClick={() => resolveReport(report, 'RESOLVED', { deleteMessage: true })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete message
                          </button>
                          <button
                            disabled={busyId === report.id}
                            onClick={() => resolveReport(report, 'RESOLVED', { deleteMessage: true, muteMinutes: 60 * 24 })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded transition-colors"
                          >
                            <VolumeX className="w-3.5 h-3.5" /> Delete + mute 24h
                          </button>
                          <button
                            disabled={busyId === report.id}
                            onClick={() => resolveReport(report, 'DISMISSED')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-semibold rounded transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                    {report.resolution_note && (
                      <p className="mt-2 text-xs text-slate-500">Note: {report.resolution_note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MESSAGES */}
        {!loading && tab === 'messages' && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                placeholder="Search message content…"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-10 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            {messages.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">No messages found</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex items-start gap-3 p-3 border border-zinc-800 rounded',
                      m.is_deleted && 'opacity-50',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span className="text-slate-300 font-semibold">{m.sender?.display_name}</span>
                        <span>
                          {m.channel ? `#${m.channel.name}` : m.squad ? `⚔ ${m.squad.name}` : m.channel_type}
                        </span>
                        <span>{new Date(m.created_at).toLocaleString()}</span>
                        {m.is_deleted && <span className="text-red-400">deleted{m.deleted_reason ? `: ${m.deleted_reason}` : ''}</span>}
                        {m._count?.reports > 0 && (
                          <span className="text-amber-400">{m._count.reports} report(s)</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 break-words mt-0.5">{m.content}</p>
                      {m.media_urls?.length > 0 && (
                        <div className="flex gap-2 mt-1.5">
                          {m.media_urls.map((url: string, i: number) => (
                            <img key={i} src={url} alt="" className="w-12 h-12 object-cover rounded" />
                          ))}
                        </div>
                      )}
                    </div>
                    {!m.is_deleted && (
                      <button
                        disabled={busyId === m.id}
                        onClick={async () => {
                          if (!confirm('Delete this message?')) return
                          setBusyId(m.id)
                          try {
                            await AdminRepository.deleteCommunityMessage(m.id)
                            load()
                          } catch (error) {
                            toast(mapApiErrorToToast(error, { action: 'delete this message' }))
                          } finally {
                            setBusyId(null)
                          }
                        }}
                        className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded transition-colors shrink-0"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MEDIA */}
        {!loading && tab === 'media' && (
          media.length === 0 ? (
            <p className="text-slate-500 text-center py-6 text-sm">No media uploads yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {media.map((item, idx) => (
                <div key={`${item.messageId}-${idx}`} className={cn('group relative rounded overflow-hidden border border-zinc-800', item.isDeleted && 'opacity-40')}>
                  {/\.(mp4|webm|mov)($|\?)/i.test(item.url) ? (
                    <video src={item.url} className="w-full h-28 object-cover" />
                  ) : (
                    <img src={item.url} alt="" className="w-full h-28 object-cover" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-[10px] text-slate-300 truncate">
                    {item.sender.display_name}
                  </div>
                  <button
                    disabled={busyId === item.url}
                    onClick={async () => {
                      if (!confirm('Remove this file from storage and the message?')) return
                      setBusyId(item.url)
                      try {
                        await AdminRepository.deleteCommunityMedia(item.messageId, item.url)
                        setMedia((prev) => prev.filter((x) => !(x.messageId === item.messageId && x.url === item.url)))
                        toast({ title: 'Media removed', variant: 'success' })
                      } catch (error) {
                        toast(mapApiErrorToToast(error, { action: 'remove this media' }))
                      } finally {
                        setBusyId(null)
                      }
                    }}
                    className="absolute top-1.5 right-1.5 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* MUTED */}
        {!loading && tab === 'muted' && (
          muted.length === 0 ? (
            <p className="text-slate-500 text-center py-6 text-sm">Nobody is muted</p>
          ) : (
            <div className="space-y-2">
              {muted.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 border border-zinc-800 rounded">
                  {u.avatar_url ? (
                    <img src={mediaUrl(u.avatar_url) || ''} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-slate-400 font-bold">
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200 font-semibold">{u.display_name}</p>
                    <p className="text-xs text-slate-500">
                      until {new Date(u.community_muted_until).toLocaleString()}
                      {u.community_mute_reason && ` · ${u.community_mute_reason}`}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {MUTE_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={async () => {
                          try {
                            await AdminRepository.muteCommunityUser(u.id, p.minutes, u.community_mute_reason || undefined)
                            load()
                          } catch (error) {
                            toast(mapApiErrorToToast(error, { action: 'update this mute' }))
                          }
                        }}
                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-slate-400 text-[10px] font-mono rounded"
                        title={`Re-mute for ${p.label}`}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      onClick={async () => {
                        try {
                          await AdminRepository.unmuteCommunityUser(u.id)
                          setMuted((prev) => prev.filter((x) => x.id !== u.id))
                          toast({ title: `${u.display_name} unmuted`, variant: 'success' })
                        } catch (error) {
                          toast(mapApiErrorToToast(error, { action: 'unmute this user' }))
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded"
                    >
                      <Check className="w-3 h-3" /> Unmute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </section>
  )
}

export default CommunityModeration
