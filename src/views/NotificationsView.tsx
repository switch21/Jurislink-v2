'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, toast, useAppStore, cn, Button, Input, Card, CardContent, Badge, ScrollArea, Skeleton, Checkbox, EmptyState, Bell, Briefcase, Receipt, ClipboardList, FileText, Calendar, MessageSquare, X, ExternalLink, Search, Trash2, CheckCheck, ChevronLeft, ChevronRight } from './shared-ui'
import { relativeTime } from './helpers'
import type { Notification, ViewName } from './types'

// Category config
const CAT_TABS = [
  { value: 'all', label: 'Tous', icon: Bell },
  { value: 'dossier', label: 'Dossiers', icon: Briefcase },
  { value: 'echeance', label: 'Échéances', icon: Calendar },
  { value: 'facture', label: 'Factures', icon: Receipt },
  { value: 'document', label: 'Documents', icon: FileText },
  { value: 'tache', label: 'Tâches', icon: ClipboardList },
  { value: 'message', label: 'Messages', icon: MessageSquare },
]

const CAT_COLORS: Record<string, string> = { dossier: 'text-jl-gold', echeance: 'text-[var(--accent)]', facture: 'text-[var(--danger)]', document: 'text-jl-secondary', tache: 'text-jl-blue', message: 'text-[var(--success)]' }

const EMPTY_MESSAGES: Record<string, { title: string; description: string }> = {
  all: { title: 'Aucune notification', description: 'Vous êtes à jour !' },
  dossier: { title: 'Aucune notification de dossier', description: 'Pas de mise à jour sur vos dossiers' },
  echeance: { title: 'Aucune échéance', description: 'Pas d\'échéance à venir' },
  facture: { title: 'Aucune notification de facture', description: 'Pas de mise à jour sur vos factures' },
  document: { title: 'Aucun document récent', description: 'Pas de nouveau document ajouté' },
  tache: { title: 'Aucune tâche', description: 'Pas de notification de tâche' },
  message: { title: 'Aucun message', description: 'Pas de nouveau message' },
}

// Map category/resourceType → view
const VIEW_MAP: Record<string, ViewName> = {
  dossier: 'cases', echeance: 'calendar', facture: 'invoices', document: 'documents', tache: 'tasks', message: 'messages',
}
const RESOURCE_TYPE_VIEW: Record<string, ViewName> = {
  case: 'cases', invoice: 'invoices', task: 'tasks', event: 'calendar', document: 'documents',
}

const PAGE_SIZE = 20

// ==================== NOTIFICATIONS VIEW ====================
export function NotificationsView() {
  const { user, setCurrentView, setPendingResourceOpen } = useAppStore()
  const qc = useQueryClient()
  const [category, setCategory] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Fetch notifications
  const { data: notifsData, isLoading } = useQuery({
    queryKey: ['notifications-view', user?.tenantId, category, unreadOnly],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (category !== 'all') p.set('category', category)
      if (unreadOnly) p.set('unreadOnly', 'true')
      return fetch(`/api/notifications?${p}`).then(r => r.json()).then(d => { if (Array.isArray(d)) return d; if (Array.isArray(d?.notifications)) return d.notifications; return [] })
    },
  })

  // Client-side search filter + pagination
  const allNotifs: Notification[] = useMemo(() => {
    const raw: Notification[] = Array.isArray(notifsData) ? notifsData : Array.isArray(notifsData?.notifications) ? notifsData.notifications : []
    if (!search.trim()) return raw
    const q = search.toLowerCase()
    return raw.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q))
  }, [notifsData, search])

  const totalPages = Math.max(1, Math.ceil(allNotifs.length / PAGE_SIZE))
  const paginatedNotifs = allNotifs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const unreadCount = allNotifs.filter(n => !n.read).length
  const selectedCount = selectedIds.size
  const allOnPageSelected = paginatedNotifs.length > 0 && paginatedNotifs.every(n => selectedIds.has(n.id))

  // Reset page when filters change
  useEffect(() => { setPage(1); setSelectedIds(new Set()) }, [category, unreadOnly, search])

  // Mark all read
  const markAllRead = useMutation({
    mutationFn: () => fetch(`/api/notifications/read-all`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: (data) => { toast.success(`Toutes les notifications marquées comme lues (${data?.updated ?? 0})`); qc.invalidateQueries({ queryKey: ['notifications'] }) },
    onError: () => toast.error(t('common.error')),
  })

  // Delete single
  const deleteOne = useMutation({
    mutationFn: (id: string) => fetch(`/api/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); setSelectedIds(prev => { const next = new Set(prev); return next }) },
  })

  // Bulk delete
  const deleteBulk = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => fetch(`/api/notifications/${id}`, { method: 'DELETE' }))),
    onSuccess: () => { toast.success(`${selectedCount} notification(s) supprimée(s)`); setSelectedIds(new Set()); qc.invalidateQueries({ queryKey: ['notifications'] }) },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  // Toggle select one
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Toggle select all on current page
  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        paginatedNotifs.forEach(n => next.delete(n.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        paginatedNotifs.forEach(n => next.add(n.id))
        return next
      })
    }
  }

  // Handle search debounce
  const handleSearchChange = (v: string) => {
    setSearch(v)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setPage(1), 300)
  }

  // Handle notification click → deep-link
  const handleNotifClick = (n: Notification) => {
    if (!n.read) {
      fetch(`/api/notifications/${n.id}`, { method: 'PUT' }).then(() => qc.invalidateQueries({ queryKey: ['notifications'] })).catch(() => {})
    }
    const targetView = n.resourceType
      ? RESOURCE_TYPE_VIEW[n.resourceType] || VIEW_MAP[n.category]
      : VIEW_MAP[n.category]
    if (targetView && n.resourceId && n.resourceType) {
      setPendingResourceOpen({ resourceType: n.resourceType, resourceId: n.resourceId })
    }
    setCurrentView(targetView || 'dashboard')
  }

  return (
    <div className='p-4 md:p-6 space-y-4'>
      {/* Header row */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <h2 className='text-lg font-semibold text-jl-primary'>Notifications</h2>
          {unreadCount > 0 && <Badge className='bg-[var(--danger)] text-white text-[10px]'>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Badge>}
        </div>
        <div className='flex items-center gap-2'>
          {selectedCount > 0 && (
            <Button variant='outline' size='sm' className='text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger)]/10 text-xs h-8'
              onClick={() => deleteBulk.mutate(Array.from(selectedIds))}
              disabled={deleteBulk.isPending}
            >
              <Trash2 className='size-3.5 mr-1' />Supprimer ({selectedCount})
            </Button>
          )}
          <Button variant='outline' size='sm' onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unreadCount === 0} className='text-xs h-8'>
            <CheckCheck className='size-3.5 mr-1' />Tout marquer comme lu
          </Button>
        </div>
      </div>

      {/* Search + Unread toggle */}
      <div className='flex flex-col sm:flex-row gap-2'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-jl-muted' />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className='pl-9 h-9 text-sm'
          />
        </div>
        <Button size='sm' variant={unreadOnly ? 'default' : 'outline'} className={cn('text-xs h-8 shrink-0', unreadOnly && 'bg-jl-gold hover:bg-[#926B2D] text-white')} onClick={() => setUnreadOnly(!unreadOnly)}>
          {unreadOnly ? 'Non lues uniquement' : 'Toutes'}
        </Button>
      </div>

      {/* Category tabs */}
      <div className='flex flex-wrap gap-2'>
        {CAT_TABS.map(ct => {
          const Icon = ct.icon
          return (
            <Button key={ct.value} size='sm' variant={category === ct.value ? 'default' : 'outline'} className={cn('text-xs h-8 gap-1.5', category === ct.value && 'bg-jl-blue hover:bg-jl-blue')} onClick={() => setCategory(ct.value)}>
              <Icon className='size-3.5' />{ct.label}
            </Button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex items-center gap-3 p-4 rounded-lg bg-jl-card border border-jl'>
              <Skeleton className='size-4 rounded-full' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-3 w-1/2' />
              </div>
            </div>
          ))}
        </div>
      ) : paginatedNotifs.length === 0 ? (
        <EmptyState
          icon={CAT_TABS.find(c => c.value === category)?.icon || Bell}
          title={EMPTY_MESSAGES[category]?.title || EMPTY_MESSAGES.all.title}
          description={EMPTY_MESSAGES[category]?.description || EMPTY_MESSAGES.all.description}
        />
      ) : (
        <>
          {/* Bulk select header */}
          <div className='flex items-center gap-3 px-1 text-xs text-jl-muted'>
            <Checkbox
              checked={allOnPageSelected}
              onCheckedChange={toggleSelectAll}
              aria-label='Sélectionner tout sur cette page'
            />
            <span>{allNotifs.length} notification{allNotifs.length > 1 ? 's' : ''}{category !== 'all' ? ` dans ${CAT_TABS.find(c => c.value === category)?.label}` : ''}</span>
          </div>

          {/* Notification list */}
          <div className='space-y-2'>
            <AnimatePresence>
              {paginatedNotifs.map(n => {
                const CatIcon = CAT_TABS.find(c => c.value === n.category)?.icon || Bell
                const hasResource = !!(n.resourceType && n.resourceId)
                const isSelected = selectedIds.has(n.id)
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card className={cn(
                      'transition-colors cursor-pointer group',
                      !n.read && 'border-l-4 border-l-jl-blue',
                      n.read && 'opacity-70',
                      isSelected && 'ring-2 ring-jl-blue/30'
                    )}>
                      <CardContent className='p-4'>
                        <div className='flex items-start gap-3'>
                          {/* Checkbox */}
                          <div className='flex items-center shrink-0 mt-0.5'>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(n.id)}
                              onClick={e => e.stopPropagation()}
                              aria-label={`Sélectionner: ${n.title}`}
                            />
                          </div>

                          {/* Unread dot + icon */}
                          <div className='flex items-center gap-2 shrink-0 mt-0.5'>
                            {!n.read && <span className='size-2 rounded-full bg-jl-blue shrink-0' />}
                            <CatIcon className={cn('size-4', CAT_COLORS[n.category] || 'text-jl-secondary')} />
                          </div>

                          {/* Content */}
                          <div className='min-w-0 flex-1' onClick={() => handleNotifClick(n)}>
                            <div className='flex items-center gap-2 mb-0.5 flex-wrap'>
                              <p className={cn('text-sm', !n.read ? 'font-medium text-jl-primary' : 'text-jl-secondary')}>{n.title}</p>
                              <Badge variant='outline' className='text-[9px] shrink-0'>{n.category}</Badge>
                            </div>
                            <p className='text-xs text-jl-secondary line-clamp-2'>{n.message}</p>
                            <div className='flex items-center gap-3 mt-1.5'>
                              <span className='text-[10px] text-jl-muted'>{relativeTime(n.createdAt)}</span>
                              {hasResource && (
                                <button className='text-[10px] text-jl-blue hover:underline flex items-center gap-0.5' onClick={e => { e.stopPropagation(); handleNotifClick(n) }}>
                                  Ouvrir <ExternalLink className='size-2.5' />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Delete button */}
                          <Button
                            variant='ghost' size='icon' className='size-7 shrink-0 opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition-opacity'
                            onClick={e => { e.stopPropagation(); deleteOne.mutate(n.id) }}
                            disabled={deleteOne.isPending}
                            aria-label='Supprimer cette notification'
                          >
                            <X className='size-4' />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between pt-2'>
              <p className='text-xs text-jl-muted'>
                Page {page} sur {totalPages} ({allNotifs.length} résultat{allNotifs.length > 1 ? 's' : ''})
              </p>
              <div className='flex items-center gap-1'>
                <Button variant='outline' size='icon' className='size-8' disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className='size-4' />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <Button key={pageNum} variant={page === pageNum ? 'default' : 'outline'} size='icon' className='size-8 text-xs' onClick={() => setPage(pageNum)}>
                      {pageNum}
                    </Button>
                  )
                })}
                <Button variant='outline' size='icon' className='size-8' disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className='size-4' />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
