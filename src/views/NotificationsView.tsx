'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== NOTIFICATIONS VIEW ====================
export function NotificationsView() {
  const { user, setCurrentView } = useAppStore()
  const qc = useQueryClient()
  const [category, setCategory] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data: notifsData, isLoading } = useQuery({
    queryKey: ['notifications-view', user?.tenantId, category, unreadOnly],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (category !== 'all') p.set('category', category)
      if (unreadOnly) p.set('unreadOnly', 'true')
      return fetch(`/api/notifications?${p}`).then(r => r.json())
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => fetch(`/api/notifications?tenantId=${user?.tenantId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }).then(r => r.json()),
    onSuccess: () => { toast.success('Toutes les notifications marquées comme lues'); qc.invalidateQueries({ queryKey: ['notifications'] }) },
    onError: () => toast.error('Erreur'),
  })

  const notifications: Notification[] = notifsData?.notifications || notifsData || []
  const unreadCount = notifications.filter(n => !n.read).length

  const catTabs = [
    { value: 'all', label: 'Tous' },
    { value: 'dossier', label: 'Dossiers' },
    { value: 'echeance', label: 'Échéances' },
    { value: 'facture', label: 'Factures' },
    { value: 'document', label: 'Documents' },
    { value: 'tache', label: 'Tâches' },
    { value: 'message', label: 'Messages' },
  ]

  const catIcons: Record<string, React.ElementType> = { dossier: Briefcase, echeance: Clock, facture: Receipt, document: FileText, tache: ClipboardList, message: MessageSquare }
  const viewMap: Record<string, ViewName> = { dossier: 'cases', echeance: 'calendar', facture: 'invoices', document: 'documents', tache: 'tasks', message: 'messages' }
  const catColors: Record<string, string> = { dossier: 'text-jl-gold', echeance: 'text-[var(--accent)]', facture: 'text-[var(--danger)]', document: 'text-jl-secondary', tache: 'text-jl-blue', message: 'text-[var(--success)]' }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3"><h2 className="text-lg font-semibold">Notifications</h2>{unreadCount > 0 && <Badge className="bg-[var(--danger)] text-white text-[10px]">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Badge>}</div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unreadCount === 0}><CheckCheck className="size-4 mr-1" />Tout marquer comme lu</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {catTabs.map(ct => (
          <Button key={ct.value} size="sm" variant={category === ct.value ? 'default' : 'outline'} className={cn('text-xs h-8', category === ct.value && 'bg-jl-blue hover:bg-jl-blue')} onClick={() => setCategory(ct.value)}>{ct.label}</Button>
        ))}
        <Button size="sm" variant={unreadOnly ? 'default' : 'outline'} className={cn('text-xs h-8', unreadOnly && 'bg-jl-gold hover:bg-[#926B2D]')} onClick={() => setUnreadOnly(!unreadOnly)}>{unreadOnly ? 'Non lues uniquement' : 'Toutes'}</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        notifications.length === 0 ? <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour !" /> :
        <div className="max-h-[600px] overflow-y-auto space-y-2">
          {notifications.map(n => {
            const CatIcon = catIcons[n.category] || Bell
            const targetView = viewMap[n.category]
            return (
              <Card key={n.id} className={cn(!n.read && 'border-l-4 border-l-[#1E5A8A] bg-jl-card', n.read && 'opacity-70')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      {!n.read && <span className="size-2 rounded-full bg-jl-blue shrink-0" />}
                      <CatIcon className={cn('size-4', catColors[n.category] || 'text-jl-secondary')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={cn('text-sm font-medium', !n.read && 'text-jl-primary')}>{n.title}</p>
                        <Badge variant="outline" className="text-[9px] shrink-0">{n.category}</Badge>
                      </div>
                      <p className="text-xs text-jl-secondary line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-jl-muted">{relativeTime(n.createdAt)}</span>
                        {targetView && n.resourceId && <button className="text-[10px] text-jl-blue hover:underline flex items-center gap-0.5" onClick={() => setCurrentView(targetView)}>Voir <ExternalLink className="size-2.5" /></button>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>}
    </div>
  )
}

