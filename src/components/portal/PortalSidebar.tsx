'use client'

import { LayoutDashboard, Briefcase, Receipt, FileText, MessageSquare, User, X } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import type { PortalViewName } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'

const PORTAL_NAV_ITEMS: { view: PortalViewName; label: string; icon: React.ElementType }[] = [
  { view: 'portal-dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { view: 'portal-cases', label: 'Mes dossiers', icon: Briefcase },
  { view: 'portal-invoices', label: 'Mes factures', icon: Receipt },
  { view: 'portal-documents', label: 'Documents', icon: FileText },
  { view: 'portal-messages', label: 'Messagerie', icon: MessageSquare },
  { view: 'portal-profile', label: 'Mon profil', icon: User },
]

export default function PortalSidebar() {
  const { portalUser, portalCurrentView, setPortalView, sidebarOpen, setSidebarOpen } = useAppStore()
  const tenantName = portalUser?.tenant?.name || 'JurisLink'
  const clientName = portalUser?.client?.fullName || ''
  const navContent = (
    <nav className='space-y-1 mx-3'>
      {PORTAL_NAV_ITEMS.map(item => {
        const Icon = item.icon
        const active = portalCurrentView === item.view
        return (
          <button key={item.view} onClick={() => { setPortalView(item.view); setSidebarOpen(false) }}
            className={cn('w-full flex items-center h-11 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              active ? 'bg-[#E8F0F8] text-[#1E5A8A] border-l-[3px] border-[#C8A45D]' : 'text-[#374151] hover:bg-[#F9FAFB] border-l-[3px] border-transparent')}>
            <Icon className='size-5 shrink-0 mr-3' /><span className='whitespace-nowrap'>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
  return (<>
    <aside className='hidden lg:flex fixed top-0 left-0 z-40 h-full bg-white flex-col w-[260px] border-r border-[#E5E7EB] overflow-hidden'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-[#E5E7EB] shrink-0'>
        <img src="/icon.png" alt="JurisLink" className='size-8 rounded-lg shrink-0 object-cover' />
        <div className='min-w-0'><span className='text-lg font-bold tracking-tight whitespace-nowrap'><span className='text-[#1E5A8A]'>Juris</span><span className='text-[#C8A45D]'>Link</span></span><p className='text-[10px] text-[#9CA3AF]'>{tenantName} · Espace client</p></div>
      </div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
      <div className='p-4 border-t border-[#E5E7EB] shrink-0'>
        <div className='flex items-center gap-3'>
          <Avatar className='size-8 shrink-0'><AvatarFallback className='bg-[#C8A45D] text-white text-xs'>{initials(clientName) || 'C'}</AvatarFallback></Avatar>
          <div className='min-w-0'><p className='text-sm font-medium truncate text-[#111827]'>{clientName}</p><p className='text-xs text-[#9CA3AF] truncate'>Client</p></div>
        </div>
      </div>
    </aside>
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side='left' className='w-[280px] p-0 bg-white border-[#E5E7EB]'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-[#E5E7EB] shrink-0'>
        <img src="/icon.png" alt="JurisLink" className='size-8 rounded-lg shrink-0 object-cover' />
        <div className='min-w-0'><span className='text-sm font-bold tracking-tight'><span className='text-[#1E5A8A]'>Juris</span><span className='text-[#C8A45D]'>Link</span></span></div>
        <Button variant='ghost' size='icon' className='ml-auto text-[#6B7280]' onClick={() => setSidebarOpen(false)}><X className='size-5' /></Button>
      </div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
    </SheetContent></Sheet>
  </>)
}
