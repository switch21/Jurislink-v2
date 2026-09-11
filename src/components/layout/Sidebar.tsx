'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, ROLE_LABELS } from '@/lib/constants'
import { initials } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

export function Sidebar() {
  const { currentView, setCurrentView, user, sidebarOpen, setSidebarOpen } = useAppStore()
  const isAdmin = user?.role === 'firm_admin' || user?.role === 'root_admin' || user?.role === 'associate'
  const hasPermission = useAppStore(s => s.hasPermission)
  const { data: overdueCountData } = useQuery({ queryKey: ['sidebar-overdue-count', user?.tenantId], queryFn: () => fetch(`/api/invoices/overdue?tenantId=${user!.tenantId}`).then(r => r.json()).then(d => d?.kpis?.totalOverdue || 0), enabled: !!user?.tenantId, refetchInterval: 60000 })
  const overdueCount = overdueCountData || 0
  const navContent = (
    <nav className="space-y-1 mx-3">
      {NAV_ITEMS.filter(item => {
        if (item.adminOnly && !isAdmin) return false
        if (item.permission && !hasPermission(item.permission.resource, item.permission.action)) return false
        return true
      }).map(item => {
        const Icon = item.icon; const active = currentView === item.view
        return (
          <button key={item.view} onClick={() => { setCurrentView(item.view); setSidebarOpen(false) }}
            className={cn('w-full flex items-center h-11 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              active ? 'bg-[#E8F0F8] text-[#1E5A8A] border-l-[3px] border-[#C8A45D]' : 'text-[#374151] hover:bg-[#F9FAFB] border-l-[3px] border-transparent')}>
            <Icon className="size-5 shrink-0 mr-3" /><span className="whitespace-nowrap flex-1 text-left">{item.label}</span>
            {item.view === 'impayes' && overdueCount > 0 && <span className="size-5 rounded-full bg-[#DC2626] text-white text-[10px] flex items-center justify-center font-bold shrink-0">{overdueCount > 9 ? '9+' : overdueCount}</span>}
          </button>
        )
      })}
    </nav>
  )
  return (<>
    <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full bg-white flex-col w-[260px] border-r border-[#E5E7EB] overflow-hidden">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#E5E7EB] shrink-0">
        <img src="/icon.png" alt="JurisLink" className="size-8 rounded-lg shrink-0 object-cover" />
        <span className="text-lg font-bold tracking-tight whitespace-nowrap"><span className="text-[#1E5A8A]">Juris</span><span className="text-[#C8A45D]">Link</span></span>
      </div>
      <ScrollArea className="flex-1 min-h-0 py-4 custom-scrollbar">{navContent}</ScrollArea>
      <div className="p-4 border-t border-[#E5E7EB] shrink-0"><div className="flex items-center gap-3"><Avatar className="size-8 shrink-0"><AvatarFallback className="bg-[#1E5A8A] text-white text-xs">{user?.fullName ? initials(user.fullName) : 'U'}</AvatarFallback></Avatar><div className="min-w-0"><p className="text-sm font-medium truncate text-[#111827]">{user?.fullName}</p><p className="text-xs text-[#9CA3AF] truncate">{ROLE_LABELS[user?.role || ''] || user?.role}</p></div></div></div>
    </aside>
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side="left" className="w-[280px] p-0 bg-white border-[#E5E7EB]">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#E5E7EB] shrink-0"><img src="/icon.png" alt="JurisLink" className="size-8 rounded-lg shrink-0 object-cover" /><span className="text-lg font-bold tracking-tight whitespace-nowrap"><span className="text-[#1E5A8A]">Juris</span><span className="text-[#C8A45D]">Link</span></span><Button variant="ghost" size="icon" className="ml-auto text-[#6B7280] hover:text-[#111827]" onClick={() => setSidebarOpen(false)}><X className="size-5" /></Button></div>
      <ScrollArea className="flex-1 min-h-0 py-4 custom-scrollbar">{navContent}</ScrollArea>
    </SheetContent></Sheet>
  </>)
}
