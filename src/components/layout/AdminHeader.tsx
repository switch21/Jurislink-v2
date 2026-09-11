'use client'

import React from 'react'
import { useAppStore } from '@/store/appStore'
import { initials } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Crown, LogOut, Menu } from 'lucide-react'

export function AdminHeader() {
  const { user, logout, sidebarOpen, setSidebarOpen } = useAppStore()
  return (
    <header className='sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 md:px-6 h-14 flex items-center gap-4 shrink-0'>
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className='lg:hidden text-[#6B7280] hover:text-[#111827]'><Menu className='size-5' /></button>
      <div className='flex items-center gap-2'><Crown className='size-5 text-[#C8A45D]' /><h1 className='text-sm font-semibold text-[#111827]'>Administration</h1></div>
      <div className='ml-auto flex items-center gap-3'>
        <div className='hidden sm:flex items-center gap-2'>
          <Avatar className='size-7'><AvatarFallback className='bg-[#C8A45D] text-white text-[10px]'>{user?.fullName ? initials(user.fullName) : 'A'}</AvatarFallback></Avatar>
          <span className='text-sm font-medium text-[#111827]'>{user?.fullName}</span>
        </div>
        <Button variant='ghost' size='icon' className='text-[#6B7280] hover:text-[#DC2626]' onClick={logout}><LogOut className='size-4' /></Button>
      </div>
    </header>
  )
}
