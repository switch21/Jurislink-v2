'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/store/appStore'
import { toast } from '@/hooks/use-toast'

export function usePortalSocket() {
  const { isPortalAuthenticated, portalUser } = useAppStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isPortalAuthenticated || !portalUser?.id) return

    const socket = io('/?XTransformPort=3004', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    const authenticate = () => {
      socket.emit('portal-auth', {
        portalId: portalUser.id,
        tenantId: portalUser.tenant.id,
        clientId: portalUser.clientId,
      })
    }

    socket.on('connect', authenticate)

    socket.on('portal-notification', (data: {
      id: string
      title: string
      message: string
      resourceType?: string | null
      resourceId?: string | null
    }) => {
      toast.success(data.title, {
        description: data.message,
      })
      useAppStore.getState().incrementPortalUnread()
    })

    socket.on('portal-unread-count', (count: number) => {
      useAppStore.getState().setPortalUnreadCount(count)
    })

    socket.on('portal-auth-error', (err) => {
      console.warn('[portal-socket] Auth error:', err)
      socket.disconnect()
    })

    socket.on('connect_error', (err) => {
      console.warn('[portal-socket] Connection error:', err.message)
    })

    socket.on('disconnect', (reason) => {
      console.log('[portal-socket] Disconnected:', reason)
      // Reconnect with same auth when reconnecting
      if (reason === 'io server disconnect') {
        socket.connect()
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isPortalAuthenticated, portalUser?.id])
}
