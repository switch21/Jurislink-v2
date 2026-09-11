'use client'

import { useState } from 'react'
import { Menu, Bell, User, LogOut, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function PortalHeader() {
  const { portalUser, portalLogout, setSidebarOpen } = useAppStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const clientName = portalUser?.client?.fullName || ''
  return (
    <header className='sticky top-0 z-30 bg-white border-b border-[#E5E7EB] h-16 flex items-center px-4 lg:px-6 shrink-0'>
      <Button variant='ghost' size='icon' className='lg:hidden mr-3 text-[#374151]' onClick={() => setSidebarOpen(true)}><Menu className='size-5' /></Button>
      <div className='flex-1 min-w-0'>
        <h1 className='text-lg font-bold text-[#111827] truncate'>Espace Client</h1>
        <p className='text-xs text-[#9CA3AF] truncate -mt-0.5'>{portalUser?.tenant?.name}</p>
      </div>
      <div className='flex items-center gap-2'>
        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon' className='relative text-[#6B7280] hover:text-[#111827]'><Bell className='size-5' /></Button></TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip></TooltipProvider>
        <div className='relative'>
          <Button variant='ghost' className='flex items-center gap-2 h-9 px-2' onClick={() => setDropdownOpen(!dropdownOpen)}>
            <Avatar className='size-7'><AvatarFallback className='bg-[#C8A45D] text-white text-[10px]'>{initials(clientName) || 'C'}</AvatarFallback></Avatar>
            <ChevronDown className={cn('size-3.5 text-[#9CA3AF] transition-transform', dropdownOpen && 'rotate-180')} />
          </Button>
          {dropdownOpen && (<>
            <div className='fixed inset-0 z-40' onClick={() => setDropdownOpen(false)} />
            <div className='absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1'>
              <button onClick={() => { setDropdownOpen(false); useAppStore.getState().setPortalView('portal-profile') }} className='w-full flex items-center gap-2 px-3 py-2 text-sm text-[#374151] hover:bg-[#F9FAFB]'><User className='size-4' />Mon profil</button>
              <div className='border-t border-[#E5E7EB] my-1' />
              <button onClick={() => { setDropdownOpen(false); portalLogout() }} className='w-full flex items-center gap-2 px-3 py-2 text-sm text-[#DC2626] hover:bg-[#FEF2F2]'><LogOut className='size-4' />Se déconnecter</button>
            </div>
          </>)}
        </div>
      </div>
    </header>
  )
}
