'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== Dashboard ====================
export function DashboardView() {
  const { user, setCurrentView } = useAppStore()
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard', user?.tenantId],
    queryFn: () => fetch(`/api/dashboard?tenantId=${user!.tenantId}&userId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.tenantId, refetchInterval: 60000
  })

  const { data: subData } = useQuery({
    queryKey: ['subscription', user?.tenantId],
    queryFn: () => fetch(`/api/subscriptions?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!user?.tenantId,
  })
  const subscriptionAlert = useMemo(() => {
    if (!subData?.currentPeriodEnd) return null
    const days = differenceInDays(new Date(subData.currentPeriodEnd), new Date())
    if (days > 30) return null
    return { daysLeft: days, planName: subData.plan?.name || 'Starter', endDate: new Date(subData.currentPeriodEnd).toLocaleDateString('fr-FR') }
  }, [subData])
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const hour = new Date().getHours()
  const minute = new Date().getMinutes()

  if (isLoading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-6" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>
  if (!stats) return null

  const finData = stats.financial
  const urgencyCount = (stats.urgencies?.length || 0) + (stats.overdueInvoices?.length || 0)
  const myTaskCount = stats.myTasks?.length || 0
  const todayEvtCount = stats.todayEventsCount || 0
  const totalPending = (stats.overdueInvoices || []).reduce((s, i) => s + i.amount, 0)

  const statusChartData = Object.entries(stats.casesByStatus || {}).map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value })).filter(d => d.value > 0)
  const typeChartData = Object.entries(stats.casesByType || {}).map(([name, value]) => ({ name: TYPE_LABELS[name] || name, value })).filter(d => d.value > 0)

  return (
    <div className="p-4 lg:p-6 space-y-6 transition-colors duration-300">
      {/* Subscription expiry alert */}
      {subscriptionAlert && (
        <div className={cn('rounded-xl p-4 border-l-4 flex items-center gap-3', subscriptionAlert.daysLeft <= 0 ? 'border-l-[#DC2626] bg-[#FEF2F2] dark:bg-red-950/50' : subscriptionAlert.daysLeft <= 5 ? 'border-l-[#DC2626] bg-[#FEE2E2]' : 'border-l-[#D97706] bg-[#FEF3C7]')}>
          {subscriptionAlert.daysLeft <= 0 ? <AlertOctagon className="size-5 text-[#DC2626] shrink-0" /> : <AlertTriangle className="size-5 text-[#D97706] shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{subscriptionAlert.daysLeft <= 0 ? 'Abonnement expiré' : `Abonnement expire dans ${subscriptionAlert.daysLeft} jour${subscriptionAlert.daysLeft > 1 ? 's' : ''}`}</p>
            <p className="text-xs text-[var(--text-secondary)]">Votre abonnement {subscriptionAlert.planName} se termine le {subscriptionAlert.endDate}. {subscriptionAlert.daysLeft <= 0 ? 'Votre cabinet a été désactivé. Contactez l\'administrateur.' : 'Renouvelez-le dans les Paramètres > Abonnement.'}</p>
          </div>
          {subscriptionAlert.daysLeft > 0 && <Button size="sm" variant="outline" className="shrink-0" onClick={() => setCurrentView('settings')}>Renouveler</Button>}
        </div>
      )}

      {/* Welcome + Aujourd'hui section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div><h2 className="text-xl font-bold text-[var(--text-primary)]">{greeting}, {user?.fullName?.split(' ').slice(-1)}</h2><p className="text-sm text-[var(--text-secondary)]">{format(now, 'EEEE d MMMM yyyy', { locale: fr })} — {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</p></div>
              <div className="flex gap-2"><Button size="sm" onClick={() => setCurrentView('cases')} className="hidden sm:flex"><Plus className="size-4 mr-1" />Nouveau dossier</Button><Button size="sm" variant="outline" onClick={() => setCurrentView('invoices')} className="hidden sm:flex"><Receipt className="size-4 mr-1" />Nouvelle facture</Button></div>
            </div>
            <Separator className="mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={cn('rounded-xl p-3 border-l-4', urgencyCount > 0 ? 'border-l-[#EF4444] bg-[#FEF2F2] dark:bg-red-950/50' : 'border-l-[#059669] bg-[#ECFDF5]')}>
                <p className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] mb-1">Aujourd'hui</p>
                <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{urgencyCount > 0 ? <><span className="text-[#DC2626]">{urgencyCount}</span> <span className="text-xs sm:text-sm font-normal">urgence{urgencyCount > 1 ? 's' : ''}</span></> : <><CheckCircle2 className="size-5 sm:size-6 text-[#059669] inline" /> <span className="text-xs sm:text-sm font-normal text-[#059669]">Tout va bien</span></>}</p>
                {todayEvtCount > 0 && <p className="text-[10px] text-[var(--primary)] mt-0.5"><Calendar className="size-3 inline mr-0.5" />{todayEvtCount} événement{todayEvtCount > 1 ? 's' : ''}</p>}
              </div>
              <div className="rounded-xl p-3 border-l-4 border-l-[var(--accent)] bg-[#FEF3C7]">
                <p className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] mb-1">Actions à faire</p>
                <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{myTaskCount} <span className="text-xs sm:text-sm font-normal text-[var(--text-secondary)]">tâche{myTaskCount > 1 ? 's' : ''}</span></p>
              </div>
              <div className="rounded-xl p-3 border-l-4 border-l-[var(--primary)] bg-[var(--primary-light)]">
                <p className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] mb-1">Dossiers actifs</p>
                <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{stats.activeCases}</p>
              </div>
              <div className="rounded-xl p-3 border-l-4 border-l-[#D97706] bg-[#FEF3C7] min-w-0 overflow-hidden">
                <p className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] mb-1">Honoraires en attente</p>
                <p className="text-lg sm:text-xl font-bold text-[#D97706] truncate" title={fmtMoney(totalPending, 'XAF')}>{fmtMoney(totalPending, 'XAF', true)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* My Tasks quick panel */}
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="size-4 text-[var(--accent)]" />Mes tâches en cours</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="space-y-2 max-h-48 overflow-y-auto">{(stats.myTasks || []).length === 0 ? <p className="text-xs text-[var(--text-muted)] py-4 text-center">Aucune tâche en cours</p> : (stats.myTasks || []).map(t => (<div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--border-light)] cursor-pointer" onClick={() => setCurrentView('tasks')}><span className={cn('size-2 rounded-full shrink-0', t.priority === 'urgente' ? 'bg-[#EF4444]' : t.priority === 'haute' ? 'bg-[#D97706]' : 'bg-[var(--accent)]')} /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{t.title}</p><p className="text-xs text-[var(--text-muted)]">{t.caseReference ? `${t.caseReference} — ` : ''}{t.dueDate ? `Échéance: ${fmtDate(t.dueDate)}` : ''}</p></div></div>))}</div></CardContent></Card>
      </div>

      {/* Today's events + Urgencies + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's events or Urgencies */}
        <Card className={cn('border-l-4', todayEvtCount > 0 ? 'border-l-[var(--primary)]' : urgencyCount > 0 ? 'border-l-[#DC2626]' : 'border-l-[#059669]')}><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">{todayEvtCount > 0 ? <><Calendar className="size-4 text-[var(--primary)]" />Événements aujourd'hui ({todayEvtCount})</> : urgencyCount > 0 ? <><AlertOctagon className="size-4 text-[#DC2626]" />Urgences ({urgencyCount})</> : <><CheckCircle2 className="size-4 text-[#059669]" />Aucune urgence</>}</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="space-y-2 max-h-64 overflow-y-auto">
            {todayEvtCount > 0 ? (stats.todayEvents || []).map((e: { id: string; title: string; startTime: string; eventType: string; criticality: string; caseReference: string | null; assignments: Array<{ userName: string }> }) => (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--primary-light)] cursor-pointer" onClick={() => setCurrentView('calendar')}><span className={cn('w-1 h-8 rounded-full shrink-0', CRIT_COLORS[e.criticality] || CRIT_COLORS.normal)} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{e.title}</p><p className="text-xs text-[var(--text-secondary)]">{fmtDateTime(e.startTime)}{e.caseReference ? ` • ${e.caseReference}` : ''}</p><p className="text-[10px] text-[var(--text-muted)] mt-0.5">{e.assignments.map(a => a.userName).join(', ') || 'Non assigné'}</p></div><Badge variant="outline" className="text-[10px] shrink-0">{EVENT_TYPE_LABELS[e.eventType] || e.eventType}</Badge></div>
            )) : urgencyCount > 0 ? <>
              {stats.urgencies?.map(u => (<div key={u.id} className="flex items-start gap-3 p-2 rounded-lg bg-[#FEF2F2] dark:bg-red-950/50 cursor-pointer hover:bg-[#FEE2E2]" onClick={() => setCurrentView('cases')}><div className="mt-0.5"><Gavel className="size-4 text-[#EF4444]" /></div><div className="min-w-0"><p className="text-sm font-medium">{u.reference} — {u.title}</p><p className="text-xs text-[var(--text-secondary)]">{u.clientName} • <span className="font-semibold text-[#DC2626]">{u.daysRemaining <= 0 ? 'Aujourd\'hui !' : `Dans ${u.daysRemaining} jour${u.daysRemaining > 1 ? 's' : ''}`}</span></p></div></div>))}
              {stats.overdueInvoices?.map(inv => (<div key={inv.id} className="flex items-start gap-3 p-2 rounded-lg bg-[#FEF3C7] cursor-pointer hover:bg-[#FDE68A]" onClick={() => setCurrentView('invoices')}><div className="mt-0.5"><AlertTriangle className="size-4 text-[#D97706]" /></div><div className="min-w-0"><p className="text-sm font-medium">{inv.clientName}</p><p className="text-xs text-[var(--text-secondary)]">{fmtMoney(inv.amount, inv.currencyCode)} • <span className="font-semibold text-[#D97706]">{inv.daysOverdue}j de retard</span></p></div></div>))}
              {stats.urgentTasks?.slice(0, 3).map(t => (<div key={t.id} className="flex items-start gap-3 p-2 rounded-lg bg-[#FEF3C7] cursor-pointer hover:bg-[#FDE68A]" onClick={() => setCurrentView('tasks')}><div className="mt-0.5"><Timer className="size-4 text-[var(--accent)]" /></div><div className="min-w-0"><p className="text-sm font-medium">{t.title}</p><p className="text-xs text-[var(--text-secondary)]">{t.caseReference ? `• ${t.caseReference}` : ''}</p></div></div>))}
            </> : <p className="text-xs text-[#059669] text-center py-6">Aucun événement aujourd'hui, aucune urgence ni impayé. Parfait ! 🎉</p>}
          </div></CardContent></Card>
          {/* Upcoming Events */}
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="size-4 text-[var(--accent)]" />Prochains événements (7j)</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="space-y-2 max-h-64 overflow-y-auto">{(stats.upcomingEventsEnhanced || []).length === 0 ? <p className="text-xs text-[var(--text-muted)] py-4 text-center">Aucun événement à venir</p> : (stats.upcomingEventsEnhanced || []).map(e => (<div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--border-light)] cursor-pointer" onClick={() => setCurrentView('calendar')}><span className={cn('w-1 h-8 rounded-full shrink-0', CRIT_COLORS[e.criticality] || CRIT_COLORS.normal)} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{e.title}</p><p className="text-xs text-[var(--text-secondary)]">{fmtDateTime(e.startTime)}{e.caseReference ? ` • ${e.caseReference}` : ''}</p><p className="text-xs text-[var(--text-muted)] mt-0.5">{e.assignments.map(a => a.userName).join(', ')}</p></div><Badge variant="outline" className="text-[10px] shrink-0">{EVENT_TYPE_LABELS[e.eventType] || e.eventType}</Badge></div>))}</div></CardContent></Card>
      </div>

      {/* Documents en attente + Dossiers sans échéance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-[#7C3AED]">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="size-4 text-[#7C3AED]" />Documents en attente{(stats.pendingDocumentsCount ?? 0) > 0 && <Badge className="bg-[#7C3AED] text-white text-[10px] ml-auto">{stats.pendingDocumentsCount}</Badge>}</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="space-y-2 max-h-64 overflow-y-auto">
            {(stats.pendingDocuments || []).length === 0 ? <p className="text-xs text-[var(--text-muted)] py-4 text-center">Tous les documents sont traités</p> : (stats.pendingDocuments || []).map(d => (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#F5F3FF] hover:bg-[#EDE9FE] cursor-pointer" onClick={() => setCurrentView('documents')}>
                <div className="size-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center shrink-0"><FileText className="size-4 text-[#7C3AED]" /></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{d.fileName}</p><p className="text-[10px] text-[var(--text-secondary)]">{d.caseReference ? `${d.caseReference} — ${d.caseTitle || ''}` : 'Hors dossier'}{d.uploadedBy ? ` • Par ${d.uploadedBy}` : ''}</p><p className="text-[10px] text-[var(--text-muted)]">{fmtDateTime(d.createdAt)}</p></div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', d.status === 'brouillon' ? 'border-[var(--text-muted)] text-[var(--text-secondary)]' : 'border-[#D97706] text-[#D97706]')}>{d.status === 'brouillon' ? 'Brouillon' : 'En attente'}</Badge>
              </div>
            ))}
          </div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#6366F1]">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertCircle className="size-4 text-[#6366F1]" />Dossiers sans échéance{(stats.casesWithoutDeadlinesCount ?? 0) > 0 && <Badge className="bg-[#6366F1] text-white text-[10px] ml-auto">{stats.casesWithoutDeadlinesCount}</Badge>}</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="space-y-2 max-h-64 overflow-y-auto">
            {(stats.casesWithoutDeadlines || []).length === 0 ? <p className="text-xs text-[#059669] py-4 text-center">Tous les dossiers actifs ont des échéances</p> : (stats.casesWithoutDeadlines || []).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] cursor-pointer" onClick={() => setCurrentView('cases')}>
                <div className="size-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center shrink-0"><FolderOpen className="size-4 text-[#6366F1]" /></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{c.reference} — {c.title}</p><p className="text-[10px] text-[var(--text-secondary)]">{c.clientName || 'Sans client'}{c.pendingTasksCount > 0 ? ` • ${c.pendingTasksCount} tâche${c.pendingTasksCount > 1 ? 's' : ''} en cours` : ''}</p><p className="text-[10px] text-[var(--text-muted)]">Dernière MAJ : {fmtDateTime(c.updatedAt)}</p></div>
                <Badge variant="outline" className="text-[10px] shrink-0 border-[#6366F1] text-[#6366F1]">{STATUS_LABELS[c.status] || c.status}</Badge>
              </div>
            ))}
          </div></CardContent>
        </Card>
      </div>

      {/* Activité du cabinet - Financial comparison + Counts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {finData && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="size-4 text-[#059669]" />Activité du cabinet</CardTitle></CardHeader>
          <CardContent>
            {stats.activityCounts && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {stats.activityCounts.dossiersOuverts != null && <div className="rounded-xl p-3 border-l-4 border-l-[var(--primary)] bg-[var(--primary-light)]"><p className="text-[10px] text-[var(--text-secondary)]">Dossiers ouverts</p><p className="text-lg font-bold text-[var(--primary)]">{stats.activityCounts.dossiersOuverts}</p></div>}
                {stats.activityCounts.dossiersCloses != null && <div className="rounded-xl p-3 border-l-4 border-l-[#059669] bg-[#ECFDF5]"><p className="text-[10px] text-[var(--text-secondary)]">Dossiers clos</p><p className="text-lg font-bold text-[#059669]">{stats.activityCounts.dossiersCloses}</p></div>}
                {stats.activityCounts.nouveauxClients != null && <div className="rounded-xl p-3 border-l-4 border-l-[var(--accent)] bg-[#FEF3C7]"><p className="text-[10px] text-[var(--text-secondary)]">Nouveaux clients</p><p className="text-lg font-bold text-[var(--accent)]">{stats.activityCounts.nouveauxClients}</p></div>}
                {stats.activityCounts.audiences != null && <div className="rounded-xl p-3 border-l-4 border-l-[#D97706] bg-[#FEF3C7]"><p className="text-[10px] text-[var(--text-secondary)]">Audiences</p><p className="text-lg font-bold text-[#D97706]">{stats.activityCounts.audiences}</p></div>}
                {stats.activityCounts.facturesEmises != null && <div className="rounded-xl p-3 border-l-4 border-l-[#DC2626] bg-[#FEF2F2] dark:bg-red-950/50"><p className="text-[10px] text-[var(--text-secondary)]">Factures émises</p><p className="text-lg font-bold text-[#DC2626]">{stats.activityCounts.facturesEmises}</p></div>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 border-l-4 border-l-[#059669] bg-[#ECFDF5] min-w-0 overflow-hidden">
                <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mb-1">CA ce mois</p>
                <p className="text-base sm:text-lg font-bold truncate" title={fmtMoney(finData.revenueThisMonth || 0)}>{fmtMoney(finData.revenueThisMonth || 0, 'XAF', true)}</p>
                {finData.revenueLastMonth > 0 && <p className={cn("text-[10px] sm:text-xs mt-1 truncate", (finData.revenueThisMonth || 0) >= finData.revenueLastMonth ? "text-[#059669]" : "text-[#DC2626]")}>{(finData.revenueThisMonth || 0) >= finData.revenueLastMonth ? "↑" : "↓"} vs mois dernier</p>}
              </div>
              <div className="rounded-xl p-3 border-l-4 border-l-[#059669] bg-[#ECFDF5] min-w-0 overflow-hidden">
                <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mb-1">Encaissé</p>
                <p className="text-base sm:text-lg font-bold truncate" title={fmtMoney(finData.collectedThisMonth || 0)}>{fmtMoney(finData.collectedThisMonth || 0, 'XAF', true)}</p>
                {finData.collectedLastMonth > 0 && <p className={cn("text-[10px] sm:text-xs mt-1 truncate", (finData.collectedThisMonth || 0) >= finData.collectedLastMonth ? "text-[#059669]" : "text-[#DC2626]")}>{(finData.collectedThisMonth || 0) >= finData.collectedLastMonth ? "↑" : "↓"} vs mois dernier</p>}
              </div>
              <div className="rounded-xl p-3 border-l-4 border-l-[#DC2626] bg-[#FEF2F2] dark:bg-red-950/50 min-w-0 overflow-hidden">
                <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mb-1">À recouvrer</p>
                <p className="text-base sm:text-lg font-bold text-[#DC2626] truncate" title={fmtMoney(finData.toRecover || 0)}>{fmtMoney(finData.toRecover || 0, 'XAF', true)}</p>
              </div>
              <div className="rounded-xl p-3 border-l-4 border-l-[var(--accent)] bg-[#FEF3C7]">
                <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mb-1">Impayés</p>
                <p className="text-base sm:text-lg font-bold text-[var(--accent)]">{finData.overdueInvoicesCount || 0} <span className="text-xs font-normal text-[var(--text-secondary)]">facture{finData.overdueInvoicesCount > 1 ? 's' : ''}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Activité récente */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="size-4 text-[var(--primary)]" />Activité récente</CardTitle></CardHeader>
          <CardContent><div className="space-y-3 max-h-80 overflow-y-auto">
            {(stats.recentActivity || []).length === 0 ? <p className="text-sm text-[var(--text-muted)] text-center py-8">Aucune activité récente</p> :
            (stats.recentActivity || []).map((a: AuditLogItem) => {
              const resIcon: Record<string, React.ElementType> = { Case: Briefcase, Client: Users, Invoice: Receipt, Document: FileText, Task: ClipboardList, Event: Calendar, User: UserCircle }
              const ResIcon = resIcon[a.resourceType || ''] || FileText
              const resBadge: Record<string, string> = { Case: 'Dossier', Client: 'Client', Invoice: 'Facture', Document: 'Document', Task: 'Tâche', Event: 'Événement', User: 'Utilisateur' }
              return (
                <div key={a.id} className="flex items-start gap-3">
                  <Avatar className="size-7 mt-0.5"><AvatarFallback className="text-[9px] bg-[var(--border-light)] text-[var(--text-secondary)]">{a.user?.fullName ? initials(a.user.fullName) : 'S'}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><span className="font-medium">{a.user?.fullName || 'Système'}</span> <span className="text-[var(--text-secondary)]">{a.action.toLowerCase()}</span></p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.resourceType && <Badge variant="outline" className="text-[9px] px-1.5 py-0"><ResIcon className="size-2.5 mr-0.5" />{resBadge[a.resourceType] || a.resourceType}</Badge>}
                      <span className="text-[10px] text-[var(--text-muted)]">{relativeTime(a.timestamp)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Dossiers par statut</CardTitle></CardHeader><CardContent><div className="space-y-2 pt-2">{statusChartData.map((d, i) => <div key={d.name} className="flex items-center gap-3"><span className="text-xs text-[var(--text-secondary)] w-24 truncate">{d.name}</span><div className="flex-1 h-6 bg-[var(--border-light)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (d.value / Math.max(...statusChartData.map(x => x.value), 1)) * 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /></div><span className="text-xs font-semibold w-6 text-right">{d.value}</span></div>)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Dossiers par type</CardTitle></CardHeader><CardContent><div className="space-y-2 pt-2">{typeChartData.map((d, i) => <div key={d.name} className="flex items-center gap-3"><div className="size-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-xs flex-1">{d.name}</span><span className="text-xs font-semibold">{d.value}</span></div>)}</div></CardContent></Card>
      </div>
    </div>
  )
}
