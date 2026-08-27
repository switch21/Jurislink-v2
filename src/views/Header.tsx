'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , ThemeToggle } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== Header ====================
export function Header() {
  const { currentView, user, logout, setCurrentView } = useAppStore()
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<{_type: string; _label: string; _sub: string; _view: ViewName; _id: string}[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const viewLabel = NAV_ITEMS.find(n => n.view === currentView)?.label || ADMIN_NAV_ITEMS.find(n => n.view === currentView)?.label || 'JurisLink'

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !user?.tenantId) return
    try {
      const res = await fetch(`/api/search?tenantId=${user.tenantId}&q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      const results: { _type: string; _label: string; _sub: string; _view: ViewName; _id: string }[] = []
      const items = data.results || data || []
      for (const item of items) {
        const viewMap: Record<string, ViewName> = { case: 'cases', client: 'clients', task: 'tasks', document: 'documents', event: 'calendar', invoice: 'invoices' }
        results.push({ _type: item._type || 'autre', _label: item._label || item.title || item.fullName || item.fileName || '', _sub: item._sub || item.reference || item.email || '', _view: viewMap[item._type] || 'dashboard', _id: item.id })
      }
      setSearchResults(results.slice(0, 15))
    } catch {
      try {
        const base = `tenantId=${user.tenantId}&search=${encodeURIComponent(q.trim())}`
        const [casesRes, clientsRes] = await Promise.all([
          fetch(`/api/cases?${base}`).then(r => r.json()).catch(() => []),
          fetch(`/api/clients?${base}`).then(r => r.json()).catch(() => []),
        ])
        const results: { _type: string; _label: string; _sub: string; _view: ViewName; _id: string }[] = []
        for (const c of (casesRes.cases || casesRes || [])) results.push({ _type: 'case', _label: c.reference, _sub: c.title, _view: 'cases', _id: c.id })
        for (const c of (clientsRes.clients || clientsRes || [])) results.push({ _type: 'client', _label: c.fullName, _sub: c.company || c.email || '', _view: 'clients', _id: c.id })
        setSearchResults(results.slice(0, 10))
      } catch { /* ignore */ }
    }
  }, [user])

  const handleSearchChange = (val: string) => { setSearch(val); setSearchOpen(true); if (searchTimerRef.current) clearTimeout(searchTimerRef.current); searchTimerRef.current = setTimeout(() => doSearch(val), 300) }

  const { data: notifs } = useQuery({ queryKey: ['notifications', user?.tenantId], queryFn: () => fetch(`/api/notifications?tenantId=${user!.tenantId}`).then(r => r.json()), enabled: !!user?.tenantId, refetchInterval: 30000 })
  const unreadCount = (Array.isArray(notifs) ? notifs : []).filter((n: Notification) => !n.read).length
  const msgCount = 0

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB]">
      <div className="flex items-center gap-4 h-16 px-4 lg:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => useAppStore.getState().toggleSidebar()}><Menu className="size-5" /></Button>
        <h1 className="text-lg font-semibold text-[#111827] hidden sm:block">{viewLabel}</h1>
        <div className="relative flex-1 max-w-md ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
          <Input placeholder="Rechercher dossiers, clients, factures, tâches..." className="pl-9 h-9 bg-[#F3F4F6] border-transparent rounded-lg" value={search} onChange={e => handleSearchChange(e.target.value)} onFocus={() => search && setSearchOpen(true)} />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-lg border border-[#E5E7EB] shadow-lg z-50 max-h-80 overflow-y-auto">
              {(() => {
                const categories: Record<string, { icon: React.ElementType; color: string; label: string }> = {
                  case: { icon: Briefcase, color: 'text-[#926B2D]', label: 'Dossiers' },
                  client: { icon: Users, color: 'text-[#059669]', label: 'Clients' },
                  task: { icon: ClipboardList, color: 'text-[#1E5A8A]', label: 'Tâches' },
                  document: { icon: FileText, color: 'text-[#6B7280]', label: 'Documents' },
                  event: { icon: Calendar, color: 'text-[#C8A45D]', label: 'Événements' },
                  invoice: { icon: Receipt, color: 'text-[#DC2626]', label: 'Factures' },
                }
                const grouped: Record<string, typeof searchResults> = {}
                for (const r of searchResults) {
                  const cat = r._type
                  if (!grouped[cat]) grouped[cat] = []
                  grouped[cat].push(r)
                }
                return Object.entries(grouped).map(([cat, items]) => {
                  const meta = categories[cat] || { icon: FileText, color: 'text-[#6B7280]', label: cat }
                  const CatIcon = meta.icon
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F9FAFB] sticky top-0"><CatIcon className={cn('size-3.5', meta.color)} /><span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{meta.label}</span><Badge variant="secondary" className="text-[9px] ml-auto">{items.length}</Badge></div>
                      {items.map((r, i) => (
                        <button key={`${r._id}-${i}`} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F9FAFB] text-left" onMouseDown={e => { e.preventDefault(); setSearchOpen(false); setCurrentView(r._view); setSearch('') }}>
                          <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{r._label}</p><p className="text-xs text-[#9CA3AF] truncate">{r._sub}</p></div>
                        </button>
                      ))}
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="relative size-9" onClick={() => { setCurrentView('messages') }}><MessageSquare className="size-5" />{msgCount ? <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-[#1E5A8A] text-white text-[10px] flex items-center justify-center font-bold">{msgCount > 9 ? '9+' : msgCount}</span> : null}</Button></TooltipTrigger><TooltipContent>Messages</TooltipContent></Tooltip></TooltipProvider>
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative size-9"><Bell className="size-5" />{unreadCount ? <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto"><DropdownMenuLabel>Notifications ({unreadCount})</DropdownMenuLabel><DropdownMenuSeparator />{(notifs?.notifications || []).slice(0, 8).map((n: Notification) => (<DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer" onClick={() => { const vmap: Record<string, ViewName> = { dossier: 'cases', echeance: 'calendar', facture: 'invoices', document: 'documents', tache: 'tasks', message: 'messages' }; setCurrentView(vmap[n.category] || 'dashboard'); setNotifOpen(false) }}><p className={cn('text-sm font-medium', !n.read && 'text-[#111827]')}>{n.title}</p><p className="text-xs text-[#9CA3AF] line-clamp-2">{n.message}</p></DropdownMenuItem>))}</DropdownMenuContent></DropdownMenu>
          <ThemeToggle />
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><LogOut className="size-5 text-[#6B7280]" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={logout} className="text-[#DC2626] cursor-pointer"><LogOut className="size-4 mr-2" />Déconnexion</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </div>
    </header>
  )
}

