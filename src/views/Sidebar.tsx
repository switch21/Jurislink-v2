'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, PRIORITY_COLORS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, NAV_ITEMS } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, roleLabel, t } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'

// ==================== Sidebar ====================
export function Sidebar() {
  const currentView = useAppStore(s => s.currentView)
  const setCurrentView = useAppStore(s => s.setCurrentView)
  const user = useAppStore(s => s.user)
  const sidebarOpen = useAppStore(s => s.sidebarOpen)
  const setSidebarOpen = useAppStore(s => s.setSidebarOpen)
  const isAdmin = user?.role === 'firm_admin' || user?.role === 'root_admin' || user?.role === 'associate'
  const hasPermission = useAppStore(s => s.hasPermission)
  const { data: overdueCountData } = useQuery({ queryKey: ['sidebar-overdue-count', user?.tenantId], queryFn: () => fetch(`/api/invoices/overdue?tenantId=${user!.tenantId}`).then(r => r.json()).then(d => d?.kpis?.totalOverdue || 0), enabled: !!user?.tenantId, refetchInterval: 60000 })
  const overdueCount = overdueCountData || 0
  const navContent = (
    <nav className='space-y-1 mx-3' role='navigation' aria-label='Navigation principale'>
      {NAV_ITEMS.filter(item => {
        if (item.adminOnly && !isAdmin) return false
        if (item.permission && !hasPermission(item.permission.resource, item.permission.action)) return false
        return true
      }).map(item => {
        const Icon = item.icon; const active = currentView === item.view
        return (
          <button key={item.view} onClick={() => { setCurrentView(item.view); setSidebarOpen(false) }}
            aria-current={active ? 'page' : undefined}
            className={cn('w-full flex items-center h-11 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              active
                ? 'bg-jl-blue-light text-jl-blue border-l-[3px] border-jl-gold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-light)] border-l-[3px] border-transparent')}>
            <Icon className='size-5 shrink-0 mr-3' /><span className='whitespace-nowrap flex-1 text-left'>{t(item.label)}</span>
            {item.view === 'impayes' && overdueCount > 0 && <span className='size-5 rounded-full bg-[var(--danger)] text-white text-[10px] flex items-center justify-center font-bold shrink-0 animate-pulse-glow'>{overdueCount > 9 ? '9+' : overdueCount}</span>}
          </button>
        )
      })}
    </nav>
  )
  return (<>
    {/* Desktop Sidebar */}
    <aside className='hidden lg:flex fixed top-0 left-0 z-40 h-full bg-jl-card flex-col w-[260px] border-r border-jl overflow-hidden transition-colors duration-300' role='complementary' aria-label='Menu latéral'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-jl shrink-0'>
        <img src='/icon.png' alt='JurisLink' className='size-8 rounded-lg shrink-0 object-cover' />
        <span className='text-lg font-bold tracking-tight whitespace-nowrap'><span className='text-jl-blue'>Juris</span><span className='text-jl-gold'>Link</span></span>
      </div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
      <div className='p-4 border-t border-jl shrink-0'><div className='flex items-center gap-3'><Avatar className='size-8 shrink-0'><AvatarFallback className='bg-jl-blue text-white text-xs'>{user?.fullName ? initials(user.fullName) : 'U'}</AvatarFallback></Avatar><div className='min-w-0'><p className='text-sm font-medium truncate text-jl-primary'>{user?.fullName}</p><p className='text-xs text-jl-muted truncate'>{roleLabel(user?.role || '')}</p></div></div></div>
    </aside>
    {/* Mobile Sidebar (Sheet) */}
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side='left' className='w-[280px] p-0 bg-jl-card border-jl'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-jl shrink-0'><img src='/icon.png' alt='JurisLink' className='size-8 rounded-lg shrink-0 object-cover' /><span className='text-lg font-bold tracking-tight whitespace-nowrap'><span className='text-jl-blue'>Juris</span><span className='text-jl-gold'>Link</span></span><Button variant='ghost' size='icon' className='ml-auto text-jl-secondary hover:text-jl-primary' onClick={() => setSidebarOpen(false)} aria-label='Fermer le menu'><X className='size-5' /></Button></div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
    </SheetContent></Sheet>
  </>)
}
