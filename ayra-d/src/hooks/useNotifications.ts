'use client'

import { useState, useEffect, useCallback } from 'react'
import { initSocket } from '@/lib/socketClient'
import { NotificationRepository, type AppNotification } from '@/repositories/NotificationRepository'

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, count] = await Promise.all([
        NotificationRepository.list(),
        NotificationRepository.unreadCount(),
      ])
      setNotifications(list.notifications)
      setUnreadCount(count)
    } catch {
      // not signed in / backend down — bell stays quiet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) return

    load()

    let socket
    try {
      socket = initSocket()
    } catch {
      return
    }

    const onNew = (notification: AppNotification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50))
      setUnreadCount((c) => c + 1)
    }

    socket.on('notification:new', onNew)
    return () => {
      socket?.off('notification:new', onNew)
    }
  }, [load])

  const markAllRead = useCallback(async () => {
    try {
      await NotificationRepository.markRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }, [])

  const markRead = useCallback(async (id: string) => {
    try {
      await NotificationRepository.markRead([id])
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // ignore
    }
  }, [])

  return { notifications, unreadCount, loading, refresh: load, markAllRead, markRead }
}

