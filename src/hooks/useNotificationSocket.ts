'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/store/appStore'
import { toast } from '@/hooks/use-toast'

export function useNotificationSocket() {
  const { isAuthenticated, user } = useAppStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !user?.tenantId) return

    const socket = io('/?XTransformPort=3004', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      // Authenticate with user info
      socket.emit('auth', {
        userId: user.id,
        tenantId: user.tenantId,
      })
    })

    socket.on('notification', (data: {
      id: string
      title: string
      message: string
      resourceType?: string | null
      resourceId?: string | null
    }) => {
      // Show in-app toast
      toast.success(data.title, {
        description: data.message,
      })
      // Update Zustand store
      useAppStore.getState().incrementUnread()
      useAppStore.getState().setLastNotification(data)
    })

    socket.on('unread-count', (count: number) => {
      useAppStore.getState().setUnreadCount(count)
    })

    socket.on('connect_error', (err) => {
      console.warn('[notif-socket] Connection error:', err.message)
    })

    socket.on('disconnect', (reason) => {
      console.log('[notif-socket] Disconnected:', reason)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, user?.id, user?.tenantId])
}
