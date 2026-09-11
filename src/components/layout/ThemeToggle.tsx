'use client'

import React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        <Sun className="size-5 rotate-0 scale-100 transition-all" />
        <Moon className="absolute size-5 rotate-90 scale-0 transition-all" />
        <span className="sr-only">Basculer le thème</span>
      </Button>
    </TooltipTrigger><TooltipContent>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</TooltipContent></Tooltip></TooltipProvider>
  )
}
