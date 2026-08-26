'use client'

// Test 10: Import shadcn/radix portal components (Dialog, Sheet, DropdownMenu, Select, Tooltip)
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function DummyModule() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <p className="text-lg text-gray-700">Test 10: shadcn portal components</p>
    </div>
  )
}
