'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { useAppStore, type ViewName } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/helpers'
import type { Notification } from '@/types'
import { EmptyState } from '@/components/layout/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Briefcase, Clock, Receipt, FileText, ClipboardList, MessageSquare, CheckCheck, ExternalLink } from 'lucide-react'
import React from 'react'

// ==================== NOTIFICATIONS VIEW ====================
export default function NotificationsView() {
  const { user, setCurrentView } = useAppStore()
  const qc = useQueryClient()
  const [category, setCategory] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data: notifsData, isLoading } = useQuery({
    queryKey: ['notifications-view', user?.tenantId, category, unreadOnly],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (category !== 'all') p.set('category', category)
      if (unreadOnly) p.set('unreadOnly', 'true')
      return fetch(`/api/notifications?${p}`).then(r => r.json())
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => fetch(`/api/notifications?tenantId=${user?.tenantId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }).then(r => r.json()),
    onSuccess: () => { toast.success('Toutes les notifications marquées comme lues'); qc.invalidateQueries({ queryKey: ['notifications'] }) },
    onError: () => toast.error('Erreur'),
  })

  const notifications: Notification[] = notifsData?.notifications || notifsData || []
  const unreadCount = notifications.filter(n => !n.read).length

  const catTabs = [
    { value: 'all', label: 'Tous' },
    { value: 'dossier', label: 'Dossiers' },
    { value: 'echeance', label: 'Échéances' },
    { value: 'facture', label: 'Factures' },
    { value: 'document', label: 'Documents' },
    { value: 'tache', label: 'Tâches' },
    { value: 'message', label: 'Messages' },
  ]

  const catIcons: Record<string, React.ElementType> = { dossier: Briefcase, echeance: Clock, facture: Receipt, document: FileText, tache: ClipboardList, message: MessageSquare }
  const viewMap: Record<string, ViewName> = { dossier: 'cases', echeance: 'calendar', facture: 'invoices', document: 'documents', tache: 'tasks', message: 'messages' }
  const catColors: Record<string, string> = { dossier: 'text-[#926B2D]', echeance: 'text-[#D97706]', facture: 'text-[#DC2626]', document: 'text-[#6B7280]', tache: 'text-[#1E5A8A]', message: 'text-[#059669]' }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3"><h2 className="text-lg font-semibold">Notifications</h2>{unreadCount > 0 && <Badge className="bg-[#EF4444] text-white text-[10px]">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Badge>}</div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unreadCount === 0}><CheckCheck className="size-4 mr-1" />Tout marquer comme lu</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {catTabs.map(ct => (
          <Button key={ct.value} size="sm" variant={category === ct.value ? 'default' : 'outline'} className={cn('text-xs h-8', category === ct.value && 'bg-[#1E5A8A] hover:bg-[#164070]')} onClick={() => setCategory(ct.value)}>{ct.label}</Button>
        ))}
        <Button size="sm" variant={unreadOnly ? 'default' : 'outline'} className={cn('text-xs h-8', unreadOnly && 'bg-[#C8A45D] hover:bg-[#926B2D]')} onClick={() => setUnreadOnly(!unreadOnly)}>{unreadOnly ? 'Non lues uniquement' : 'Toutes'}</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        notifications.length === 0 ? <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour !" /> :
        <div className="max-h-[600px] overflow-y-auto space-y-2">
          {notifications.map(n => {
            const CatIcon = catIcons[n.category] || Bell
            const targetView = viewMap[n.category]
            return (
              <Card key={n.id} className={cn(!n.read && 'border-l-4 border-l-[#1E5A8A] bg-white', n.read && 'opacity-70')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      {!n.read && <span className="size-2 rounded-full bg-[#1E5A8A] shrink-0" />}
                      <CatIcon className={cn('size-4', catColors[n.category] || 'text-[#6B7280]')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={cn('text-sm font-medium', !n.read && 'text-[#111827]')}>{n.title}</p>
                        <Badge variant="outline" className="text-[9px] shrink-0">{n.category}</Badge>
                      </div>
                      <p className="text-xs text-[#6B7280] line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-[#9CA3AF]">{relativeTime(n.createdAt)}</span>
                        {targetView && n.resourceId && <button className="text-[10px] text-[#1E5A8A] hover:underline flex items-center gap-0.5" onClick={() => setCurrentView(targetView)}>Voir <ExternalLink className="size-2.5" /></button>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>}
    </div>
  )
}
