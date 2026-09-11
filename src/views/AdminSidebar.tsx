'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, ADMIN_NAV_ITEMS } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, t } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== Admin Sidebar ====================
export function AdminSidebar() {
  const currentView = useAppStore(s => s.currentView)
  const setCurrentView = useAppStore(s => s.setCurrentView)
  const user = useAppStore(s => s.user)
  const sidebarOpen = useAppStore(s => s.sidebarOpen)
  const setSidebarOpen = useAppStore(s => s.setSidebarOpen)
  const navContent = (
    <nav className='space-y-1 mx-3' role='navigation' aria-label='Navigation admin'>
      {ADMIN_NAV_ITEMS.map(item => {
        const Icon = item.icon; const active = currentView === item.view
        return (
          <button key={item.view} onClick={() => { setCurrentView(item.view); setSidebarOpen(false) }}
            aria-current={active ? 'page' : undefined}
            className={cn('w-full flex items-center h-11 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              active
                ? 'bg-jl-gold-light text-jl-gold border-l-[3px] border-jl-gold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-light)] border-l-[3px] border-transparent')}>
            <Icon className='size-5 shrink-0 mr-3' /><span className='whitespace-nowrap'>{t(item.label)}</span>
          </button>
        )
      })}
    </nav>
  )
  return (<>
    {/* Desktop */}
    <aside className='hidden lg:flex fixed top-0 left-0 z-40 h-full bg-jl-card flex-col w-[260px] border-r border-jl overflow-hidden transition-colors duration-300' role='complementary' aria-label='Menu admin'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-jl shrink-0'>
        <img src='/icon.png' alt='JurisLink' className='size-8 rounded-lg shrink-0 object-cover' />
        <div className='flex-1 min-w-0'><span className='text-lg font-bold tracking-tight whitespace-nowrap'><span className='text-jl-blue'>Juris</span><span className='text-jl-gold'>Link</span></span><div className='flex items-center gap-1'><Badge className='bg-jl-gold text-white text-[9px] px-1.5 py-0'><Crown className='size-2.5 mr-0.5' />Admin</Badge></div></div>
      </div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
      <div className='p-4 border-t border-jl shrink-0'>
        <div className='flex items-center gap-3'>
          <Avatar className='size-8 shrink-0'><AvatarFallback className='bg-jl-gold text-white text-xs'>{user?.fullName ? initials(user.fullName) : 'A'}</AvatarFallback></Avatar>
          <div className='min-w-0'><p className='text-sm font-medium truncate text-jl-primary'>{user?.fullName}</p><p className='text-xs text-jl-muted truncate'>Admin Racine</p></div>
        </div>
      </div>
    </aside>
    {/* Mobile */}
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side='left' className='w-[280px] p-0 bg-jl-card border-jl'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-jl shrink-0'>
        <img src='/icon.png' alt='JurisLink' className='size-8 rounded-lg shrink-0 object-cover' />
        <span className='text-lg font-bold tracking-tight whitespace-nowrap'><span className='text-jl-blue'>Juris</span><span className='text-jl-gold'>Link</span></span>
        <Button variant='ghost' size='icon' className='ml-auto text-jl-secondary hover:text-jl-primary' onClick={() => setSidebarOpen(false)} aria-label='Fermer le menu'><X className='size-5' /></Button>
      </div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
    </SheetContent></Sheet>
  </>)
}
