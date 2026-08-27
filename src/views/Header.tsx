'use client'

import { useState, useEffect, useRef, useQuery, useAppStore, cn, Button, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Search, Bell, LogOut, MessageSquare, Menu, ThemeToggle } from './shared-ui'
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from './constants'
import type { Message, Notification, ViewName } from './types'

// ==================== Header ====================
export function Header() {
  const { currentView, user, logout, setCurrentView, unreadCount: realtimeUnread } = useAppStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const prevUnreadRef = useRef(0)
  const [badgePulse, setBadgePulse] = useState(false)
  const viewLabel = NAV_ITEMS.find(n => n.view === currentView)?.label || ADMIN_NAV_ITEMS.find(n => n.view === currentView)?.label || 'JurisLink'

  const { data: notifs } = useQuery({ queryKey: ['notifications', user?.tenantId], queryFn: () => fetch(`/api/notifications?tenantId=${user!.tenantId}`).then(r => r.json()), enabled: !!user?.tenantId, refetchInterval: 30000 })
  const pollUnread = (Array.isArray(notifs) ? notifs : []).filter((n: Notification) => !n.read).length
  // Merge: use realtime count from WebSocket, fallback to polled count
  const unreadCount = realtimeUnread > 0 ? realtimeUnread : pollUnread
  const msgCount = 0

  // Animate badge when count changes
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBadgePulse(true)
      const t = setTimeout(() => setBadgePulse(false), 600)
      return () => clearTimeout(t)
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount])

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
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}><DropdownMenuTrigger asChild><Button variant='ghost' size='icon' className='relative size-9' aria-label={`Notifications${unreadCount ? ` (${unreadCount} non lues)` : ''}`}><Bell className='size-5' />{unreadCount ? <span className={cn('absolute -top-0.5 -right-0.5 size-4 rounded-full bg-[var(--danger)] text-white text-[10px] flex items-center justify-center font-bold', badgePulse && 'animate-pulse-glow scale-125 transition-transform duration-300')}>{unreadCount > 9 ? '9+' : unreadCount}</span> : null}</Button></DropdownMenuTrigger><DropdownMenuContent align='end' className='w-80 max-h-96 overflow-y-auto'><DropdownMenuLabel>Notifications ({unreadCount})</DropdownMenuLabel><DropdownMenuSeparator />{(notifs?.notifications || []).slice(0, 8).map((n: Notification) => (<DropdownMenuItem key={n.id} className='flex flex-col items-start gap-1 p-3 cursor-pointer' onClick={() => { const vmap: Record<string, ViewName> = { dossier: 'cases', echeance: 'calendar', facture: 'invoices', document: 'documents', tache: 'tasks', message: 'messages' }; setCurrentView(vmap[n.category] || 'dashboard'); setNotifOpen(false) }}><p className={cn('text-sm font-medium', !n.read && 'text-jl-primary')}><s className='sr-only'>{!n.read ? 'Non lue : ' : ''}</s>{n.title}</p><p className='text-xs text-jl-muted line-clamp-2'>{n.message}</p></DropdownMenuItem>))}</DropdownMenuContent></DropdownMenu>
          <ThemeToggle />
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant='ghost' size='icon' aria-label='Menu utilisateur'><LogOut className='size-5 text-jl-secondary' /></Button></DropdownMenuTrigger><DropdownMenuContent align='end'><DropdownMenuItem onClick={logout} className='text-[var(--danger)] cursor-pointer'><LogOut className='size-4 mr-2' />Déconnexion</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </div>
    </header>
  )
}
