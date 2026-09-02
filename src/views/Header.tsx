'use client'

import { useState, useEffect, useRef, useAppStore, cn, Button, Badge, ScrollArea, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Search, Bell, LogOut, MessageSquare, Menu, X, Briefcase, Receipt, ClipboardList, FileText, Calendar, MessageCircle, ExternalLink, ThemeToggle, Globe } from './shared-ui'
import { usePollingNotifications } from '@/hooks/use-polling-notifications'
import { relativeTime, t } from './helpers'
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from './constants'
import { useLocale, LOCALE_NAMES, LOCALE_FLAGS, SUPPORTED_LOCALES } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import type { Notification, ViewName } from './types'

// Map notification category → target view for deep-linking
const VIEW_MAP: Record<string, ViewName> = {
  dossier: 'cases',
  echeance: 'calendar',
  facture: 'invoices',
  document: 'documents',
  tache: 'tasks',
  message: 'messages',
  evenement: 'calendar',
}

// Map notification category → icon for dropdown items
const CAT_ICON_MAP: Record<string, React.ElementType> = {
  dossier: Briefcase,
  echeance: Calendar,
  facture: Receipt,
  document: FileText,
  tache: ClipboardList,
  message: MessageCircle,
  evenement: Calendar,
}

const CAT_COLORS: Record<string, string> = {
  dossier: 'text-jl-gold',
  echeance: 'text-[var(--accent)]',
  facture: 'text-[var(--danger)]',
  document: 'text-jl-secondary',
  tache: 'text-jl-blue',
  message: 'text-[var(--success)]',
  evenement: 'text-[var(--accent)]',
}

// Category filter chips for dropdown
const CAT_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'dossier', label: 'Dossiers', icon: Briefcase },
  { value: 'facture', label: 'Factures', icon: Receipt },
  { value: 'tache', label: 'Tâches', icon: ClipboardList },
  { value: 'message', label: 'Messages', icon: MessageCircle },
]

// Map resourceType → notification category for navigation
const RESOURCE_TYPE_TO_VIEW: Record<string, ViewName> = {
  case: 'cases',
  invoice: 'invoices',
  task: 'tasks',
  event: 'calendar',
  document: 'documents',
}

// ==================== Header ====================
export function Header() {
  const { currentView, user, logout, setCurrentView, setPendingResourceOpen } = useAppStore()
  const { locale, setLocale: setLocaleL } = useLocale()
  const [notifOpen, setNotifOpen] = useState(false)
  const [dropdownFilter, setDropdownFilter] = useState('all')
  const prevUnreadRef = useRef(0)
  const [badgePulse, setBadgePulse] = useState(false)
  const viewLabelKey = NAV_ITEMS.find(n => n.view === currentView)?.label || ADMIN_NAV_ITEMS.find(n => n.view === currentView)?.label || ''
  const viewLabel = t(viewLabelKey)

  // Polling hook — 30s interval, auto-pauses when unauthenticated
  const { notifications, unreadCount, refetchNow } = usePollingNotifications(!!user?.tenantId)
  const msgCount = 0

  // Visual pulse on bell when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      setBadgePulse(true)
      const t = setTimeout(() => setBadgePulse(false), 600)
      prevUnreadRef.current = unreadCount
      return () => clearTimeout(t)
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount])

  // Reset filter when dropdown opens
  useEffect(() => {
    if (notifOpen) setDropdownFilter('all')
  }, [notifOpen])

  // Mark a single notification as read, navigate to resource, close dropdown
  const handleNotifClick = (n: Notification) => {
    if (!n.read) {
      fetch(`/api/notifications/${n.id}`, { method: 'PUT' }).catch(() => {})
      refetchNow()
    }

    // Deep-link navigation
    const targetView = n.resourceType
      ? RESOURCE_TYPE_TO_VIEW[n.resourceType] || VIEW_MAP[n.category]
      : VIEW_MAP[n.category]

    if (targetView && n.resourceId && n.resourceType) {
      setPendingResourceOpen({ resourceType: n.resourceType, resourceId: n.resourceId })
    }
    setCurrentView(targetView || 'dashboard')
    setNotifOpen(false)
  }

  // Delete a notification from dropdown
  const handleDeleteNotif = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    fetch(`/api/notifications/${id}`, { method: 'DELETE' }).then(() => refetchNow()).catch(() => {})
  }

  // Mark all as read
  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    fetch(`/api/notifications/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, tenantId: user?.tenantId }),
    }).then(() => refetchNow()).catch(() => {})
  }

  // Filter notifications for dropdown display
  const filteredNotifs = dropdownFilter === 'all'
    ? notifications
    : notifications.filter(n => n.category === dropdownFilter)

  return (
    <header className='sticky top-0 z-30 bg-jl-card border-b border-jl transition-colors duration-300'>
      <div className='flex items-center gap-4 h-16 px-4 lg:px-6'>
        <Button variant='ghost' size='icon' className='lg:hidden' onClick={() => useAppStore.getState().toggleSidebar()} aria-label='Ouvrir le menu'><Menu className='size-5' /></Button>
        <h1 className='text-lg font-semibold text-jl-primary hidden sm:block'>{viewLabel}</h1>
        <div className='relative flex-1 max-w-md ml-auto'>
          <button
            onClick={() => {(window as any).__jlOpenSearch?.()}}
            className='relative w-full flex items-center'
            aria-label='Ouvrir la recherche globale (⌘K)'
          >
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-jl-muted' />
            <div className='w-full pl-9 pr-12 h-9 bg-jl-page border border-transparent hover:border-jl rounded-lg transition-colors duration-200 flex items-center'>
              <span className='text-sm text-jl-muted'>Rechercher dossiers, clients, factures, tâches…</span>
            </div>
            <kbd className='absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-jl-card border border-jl text-[10px] text-jl-muted font-mono pointer-events-none'>
              <span className='text-xs'>⌘</span>K
            </kbd>
          </button>
        </div>
        <div className='flex items-center gap-1'>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon' className='relative size-9' onClick={() => { setCurrentView('messages') }} aria-label='Messages'><MessageSquare className='size-5' />{msgCount ? <span className='absolute -top-0.5 -right-0.5 size-4 rounded-full bg-jl-blue text-white text-[10px] flex items-center justify-center font-bold'>{msgCount > 9 ? '9+' : msgCount}</span> : null}</Button></TooltipTrigger><TooltipContent>Messages</TooltipContent></Tooltip></TooltipProvider>
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost' size='icon' className='relative size-9'
                aria-label={`Notifications${unreadCount ? ` (${unreadCount} non lues)` : ''}`}
                onClick={() => refetchNow()}
              >
                <Bell className={cn('size-5', unreadCount > 0 && !badgePulse && 'text-jl-blue')} />
                {unreadCount > 0 && (
                  <span className={cn(
                    'absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[10px] flex items-center justify-center font-bold leading-none',
                    badgePulse && 'animate-pulse-glow scale-125 transition-transform duration-300'
                  )}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-[380px] max-w-[calc(100vw-2rem)] p-0'>
              {/* Header with mark all read */}
              <div className='flex items-center justify-between px-4 py-3'>
                <DropdownMenuLabel className='p-0 text-sm font-semibold'>
                  Notifications {unreadCount > 0 && <span className='text-jl-blue ml-1'>({unreadCount})</span>}
                </DropdownMenuLabel>
                {unreadCount > 0 && (
                  <button
                    className='text-[11px] text-jl-blue hover:underline cursor-pointer font-medium'
                    onClick={handleMarkAllRead}
                  >Tout marquer comme lu</button>
                )}
              </div>
              <DropdownMenuSeparator />

              {/* Category filter chips */}
              <div className='flex gap-1 px-3 py-2 overflow-x-auto'>
                {CAT_FILTERS.map(cf => {
                  const CIcon = cf.icon
                  return (
                    <button
                      key={cf.value}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                        dropdownFilter === cf.value
                          ? 'bg-jl-blue text-white'
                          : 'bg-jl-page text-jl-secondary hover:bg-[var(--border-light)]'
                      )}
                      onClick={(e) => { e.stopPropagation(); setDropdownFilter(cf.value) }}
                    >
                      {CIcon && <CIcon className='size-3' />}
                      {cf.label}
                    </button>
                  )
                })}
              </div>

              {/* Notification list */}
              <ScrollArea className='max-h-[320px]'>
                {filteredNotifs.length === 0 ? (
                  <div className='py-8 text-center'>
                    <Bell className='size-8 text-jl-muted mx-auto mb-2 opacity-40' />
                    <p className='text-sm text-jl-muted'>Aucune notification{dropdownFilter !== 'all' ? ` dans cette catégorie` : ' non lue'}</p>
                  </div>
                ) : (
                  filteredNotifs.slice(0, 10).map((n: Notification) => {
                    const CatIcon = CAT_ICON_MAP[n.category] || Bell
                    const hasResource = !!(n.resourceType && n.resourceId)
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--border-light)] transition-colors relative group',
                          !n.read && 'bg-jl-blue/5'
                        )}
                        onClick={() => handleNotifClick(n)}
                      >
                        {/* Unread dot + icon */}
                        <div className='flex items-center gap-2 shrink-0 mt-0.5'>
                          {!n.read && <span className='size-2 rounded-full bg-jl-blue shrink-0' />}
                          <CatIcon className={cn('size-4', CAT_COLORS[n.category] || 'text-jl-secondary')} />
                        </div>

                        {/* Content */}
                        <div className='min-w-0 flex-1'>
                          <p className={cn('text-sm leading-tight', !n.read ? 'font-medium text-jl-primary' : 'text-jl-secondary')}>{n.title}</p>
                          <p className='text-xs text-jl-muted line-clamp-1 mt-0.5'>{n.message}</p>
                          <div className='flex items-center gap-2 mt-1'>
                            <span className='text-[10px] text-jl-muted'>{relativeTime(n.createdAt)}</span>
                            {hasResource && (
                              <span className='text-[10px] text-jl-blue flex items-center gap-0.5'>
                                Ouvrir <ExternalLink className='size-2.5' />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          className='absolute top-2 right-2 size-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--danger)]/10 text-jl-muted hover:text-[var(--danger)] transition-all'
                          onClick={(e) => handleDeleteNotif(e, n.id)}
                          aria-label='Supprimer cette notification'
                        >
                          <X className='size-3.5' />
                        </button>
                      </div>
                    )
                  })
                )}
              </ScrollArea>

              {/* Footer: Voir tout */}
              <DropdownMenuSeparator />
              <button
                className='w-full text-center py-2.5 text-xs text-jl-blue hover:underline font-medium cursor-pointer'
                onClick={(e) => { e.stopPropagation(); setCurrentView('notifications'); setNotifOpen(false) }}
              >
                Voir toutes les notifications
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu><DropdownMenuTrigger asChild><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon' className='size-9' aria-label='Changer la langue'><Globe className='size-4' /></Button></TooltipTrigger><TooltipContent>{LOCALE_NAMES[locale]}</TooltipContent></Tooltip></TooltipProvider></DropdownMenuTrigger><DropdownMenuContent align='end'>{SUPPORTED_LOCALES.map((l: Locale) => (<DropdownMenuItem key={l} onClick={() => setLocaleL(l)} className={cn('cursor-pointer gap-2', locale === l && 'font-semibold bg-[var(--accent)]/10')}><span className='text-base'>{LOCALE_FLAGS[l]}</span><span>{LOCALE_NAMES[l]}</span></DropdownMenuItem>))}</DropdownMenuContent></DropdownMenu>
          <ThemeToggle />
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant='ghost' size='icon' aria-label='Menu utilisateur'><LogOut className='size-5 text-jl-secondary' /></Button></DropdownMenuTrigger><DropdownMenuContent align='end'><DropdownMenuItem onClick={logout} className='text-[var(--danger)] cursor-pointer'><LogOut className='size-4 mr-2' />Déconnexion</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </div>
    </header>
  )
}
