'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/appStore'
import type { Notification } from '@/views/types'

interface PollingNotifResult {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  refetchNow: () => void
}

export function usePollingNotifications(enabled: boolean = true): PollingNotifResult {
  const user = useAppStore(s => s.user)
  const qc = useQueryClient()
  const prevCountRef = useRef(0)

  const query = useQuery({
    queryKey: ['polling-notifications', user?.tenantId],
    queryFn: () =>
      fetch(`/api/notifications?tenantId=${user!.tenantId}&unreadOnly=true`).then(r => r.json()),
    enabled: !!user?.tenantId && enabled,
    refetchInterval: 30000,
    staleTime: 15000,
  })

  // Extract data — API returns { count, notifications } when unreadOnly=true, or raw array as fallback
  const data = query.data
  const notifications: Notification[] = data?.notifications || (Array.isArray(data) ? data : [])
  const unreadCount: number = data?.count ?? notifications.length

  // Toast + Zustand sync when count increases (new notification arrived)
  useEffect(() => {
    if (prevCountRef.current > 0 && unreadCount > prevCountRef.current) {
      toast.info('Nouvelle notification', {
        description: `${unreadCount - prevCountRef.current} notification${unreadCount - prevCountRef.current > 1 ? 's' : ''} non lue${unreadCount - prevCountRef.current > 1 ? 's' : ''}`,
      })
    }
    // Sync Zustand store for other consumers
    if (unreadCount !== prevCountRef.current) {
      useAppStore.getState().setUnreadCount(unreadCount)
    }
    prevCountRef.current = unreadCount
  }, [unreadCount])

  const markOneRead = useMutation({
    mutationFn: (id: string) => fetch(`/api/notifications/${id}`, { method: 'PUT' }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polling-notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    refetchNow: () => query.refetch(),
  }
}
