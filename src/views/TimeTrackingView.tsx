'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState , t , statusLabel, priorityLabel, typeLabel, eventTypeLabel, roleLabel, billingLabel, invoiceTypeLabel, invoiceStatusLabel, paymentMethodLabel, commTypeLabel, commStatusLabel, riskLabel, outcomeLabel, payStatusLabel, timelineTypeLabel, ROLE_OPTIONS } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, COMM_TYPE_LABELS, COMM_TYPE_COLORS, COMM_STATUS_LABELS, COMM_STATUS_COLORS, QUICK_TEMPLATES } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import { useFormDraft, registerDirtyForm, unregisterDirtyForm } from '@/hooks/useFormDraft'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== TIME TRACKING VIEW ====================
const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string }> = {
  contrat: { label: 'Contrat', color: 'bg-jl-blue text-white' },
  conclusion: { label: 'Conclusion', color: 'bg-jl-gold text-white' },
  correspondance: { label: 'Correspondance', color: 'bg-[var(--success)] text-white' },
  assignation: { label: 'Assignation', color: 'bg-[var(--danger)] text-white' },
  general: { label: 'Général', color: 'bg-jl-page text-white' },
}

export function TimeTrackingView() {
  const { user, setHasUnsavedChanges } = useAppStore()
  const qc = useQueryClient()
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [timerDesc, setTimerDesc] = useState('')
  const [timerCaseId, setTimerCaseId] = useState('')
  const [timerIsBillable, setTimerIsBillable] = useState(true)
  const timerFormData = useMemo(() => ({ description: timerDesc, caseId: timerCaseId, isBillable: timerIsBillable }), [timerDesc, timerCaseId, timerIsBillable])
  const { restoredDraft: ttRestoredDraft, isDirty: ttIsDirty, clearDraft: clearTtDraft, getDraft: getTtDraft } = useFormDraft('time-tracking-form', timerFormData as unknown as Record<string, unknown>, { enabled: timerState === 'idle' })

  // Sync dirty state with global store
  useEffect(() => { registerDirtyForm('time-tracking-form', ttIsDirty); setHasUnsavedChanges(ttIsDirty); return () => { unregisterDirtyForm('time-tracking-form') } }, [ttIsDirty])

  // Restore draft on mount
  useEffect(() => { if (ttRestoredDraft) { const draft = getTtDraft(); if (draft) { if (draft.description) setTimerDesc(draft.description as string); if (draft.caseId) setTimerCaseId(draft.caseId as string); if (typeof draft.isBillable === 'boolean') setTimerIsBillable(draft.isBillable) } } }, [ttRestoredDraft])
  const [dateRange, setDateRange] = useState('week')
  const [filterCaseId, setFilterCaseId] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<string>('')

  const { data: cases } = useQuery({
    queryKey: ['cases-tt', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}&limit=200`).then(r => r.json()).then((d: any) => Array.isArray(d) ? d : (d.cases || d.data || [])),
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['time-entries', user?.tenantId, dateRange, filterCaseId],
    queryFn: () => {
      const p = new URLSearchParams({ tenantId: user?.tenantId || "" })
      if (filterCaseId) p.set('caseId', filterCaseId)
      const now = new Date()
      if (dateRange === 'week') { p.set('fromDate', startOfWeek(now, { weekStartsOn: 1 }).toISOString()) }
      else if (dateRange === 'month') { p.set('fromDate', startOfMonth(now).toISOString()) }
      else if (dateRange === 'year') { p.set('fromDate', new Date(now.getFullYear(), 0, 1).toISOString()) }
      return fetch(`/api/time-entries?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
    enabled: !!user?.tenantId,
  })

  const { data: summary } = useQuery({
    queryKey: ['time-summary', user?.tenantId],
    queryFn: () => fetch(`/api/time-entries/summary?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!user?.tenantId,
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/time-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success(t('timeTracking.recorded')); qc.invalidateQueries({ queryKey: ['time-entries'] }); qc.invalidateQueries({ queryKey: ['time-summary'] }); clearTtDraft() },
    onError: () => toast.error(t('timeTracking.errorRecord')),
  })

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerState])

  const handleStart = () => {
    startRef.current = new Date().toISOString()
    setElapsed(0)
    setTimerState('running')
  }
  const handlePause = () => setTimerState('paused')
  const handleResume = () => setTimerState('running')
  const handleStop = () => {
    setTimerState('idle')
    if (elapsed < 5) return
    createMut.mutate({
      tenantId: user?.tenantId, userId: user?.id,
      caseId: timerCaseId || undefined,
      description: timerDesc || t('timeTracking.timeTracked'),
      startTime: startRef.current,
      endTime: new Date().toISOString(),
      duration: elapsed, isBillable: timerIsBillable,
    })
    setTimerDesc('')
    setTimerCaseId('')
    setElapsed(0)
  }

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const hh = Math.floor(elapsed / 3600)
  const mm = Math.floor((elapsed % 3600) / 60)
  const ss = elapsed % 60
  const timerDisplay = `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`

  const sum = summary as TimeSummary | undefined

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h2 className="text-lg font-semibold">{t('timeTracking.titleFull')}</h2>

      <Card className="bg-jl-page border-jl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              {timerState === 'running' && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-red-500 animate-pulse" />}
              <span className="text-5xl md:text-6xl font-mono font-bold text-jl-blue tabular-nums tracking-wider">{timerDisplay}</span>
            </div>
            <div className="flex-1 flex flex-col gap-3 w-full max-w-md">
              <div className="flex gap-2">
                <Select value={timerCaseId} onValueChange={v => setTimerCaseId(v)} disabled={timerState === 'running'}>
                  <SelectTrigger className="h-9 text-xs flex-1"><SelectValue placeholder={t('timeTracking.casePlaceholder')} /></SelectTrigger>
                  <SelectContent>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent>
                </Select>
                <Checkbox checked={timerIsBillable} onCheckedChange={v => setTimerIsBillable(!!v)} disabled={timerState === 'running'} />
                <Label className="text-xs text-jl-secondary whitespace-nowrap">{t('timeTracking.billable')}</Label>
              </div>
              <Input value={timerDesc} onChange={e => setTimerDesc(e.target.value)} placeholder={t('timeTracking.descriptionPlaceholder')} className="h-9 text-sm" disabled={timerState === 'running'} />
              <div className="flex gap-2">
                {timerState === 'idle' && <Button onClick={handleStart} className="bg-[var(--success)] hover:bg-[var(--success)] text-white" size="sm"><Play className="size-4 mr-1" />{t('timeTracking.start')}</Button>}
                {timerState === 'running' && <><Button onClick={handlePause} variant="outline" size="sm"><Pause className="size-4 mr-1" />{t('timeTracking.pause')}</Button><Button onClick={handleStop} variant="destructive" size="sm"><Square className="size-4 mr-1" />{t('timeTracking.stop')}</Button></>}
                {timerState === 'paused' && <><Button onClick={handleResume} className="bg-[var(--success)] hover:bg-[var(--success)] text-white" size="sm"><Play className="size-4 mr-1" />{t('timeTracking.resume')}</Button><Button onClick={handleStop} variant="destructive" size="sm"><Square className="size-4 mr-1" />{t('timeTracking.stop')}</Button></>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-jl-secondary">{t('timeTracking.totalHoursWeek')}</p><p className="text-xl font-bold text-jl-blue mt-1">{fmtDuration(sum?.totalSeconds || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-jl-secondary">{t('timeTracking.billableHours')}</p><p className="text-xl font-bold text-[var(--success)] mt-1">{fmtDuration(sum?.totalBillableSeconds || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4 overflow-hidden"><p className="text-xs text-jl-secondary">{t('timeTracking.estimatedAmount')}</p><p className="text-lg sm:text-xl font-bold text-jl-gold mt-1 truncate" title={fmtMoney(sum?.totalAmount || 0)}>{fmtMoney(sum?.totalAmount || 0, 'XAF', true)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-jl-secondary">{t('timeTracking.entriesThisWeek')}</p><p className="text-xl font-bold mt-1">{sum?.totalEntries || 0}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="week">{t('timeTracking.thisWeek')}</SelectItem><SelectItem value="month">{t('timeTracking.thisMonth')}</SelectItem><SelectItem value="year">{t('timeTracking.thisYear')}</SelectItem></SelectContent>
        </Select>
        <Select value={filterCaseId} onValueChange={v => setFilterCaseId(v)}>
          <SelectTrigger className="w-[200px] h-9 text-xs"><SelectValue placeholder={t('timeTracking.allCases')} /></SelectTrigger>
          <SelectContent><SelectItem value="all">{t('timeTracking.allCases')}</SelectItem>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (entries || []).length === 0 ? <EmptyState icon={Timer} title={t('timeTracking.noEntries')} description={t('timeTracking.noEntriesDesc')} /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>{t('common.date')}</TableHead><TableHead>{t('common.description')}</TableHead><TableHead className="hidden md:table-cell">{t('common.case')}</TableHead><TableHead>{t('common.duration')}</TableHead><TableHead>{t('timeTracking.billable')}</TableHead><TableHead className="hidden md:table-cell text-right">{t('common.amount')}</TableHead>
          </TableRow></TableHeader><TableBody>
            {(entries || []).map((e: TimeEntry) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs text-jl-secondary">{fmtDate(e.createdAt)}</TableCell>
                <TableCell className="text-sm">{e.description}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-jl-secondary">{e.case ? `${e.case.reference}` : '—'}</TableCell>
                <TableCell className="text-sm font-medium">{fmtDuration(e.duration)}</TableCell>
                <TableCell><Badge className={cn('text-[10px]', e.isBillable ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-jl-page text-jl-secondary')}>{e.isBillable ? t('common.yes') : t('common.no')}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-sm text-right font-medium">{e.totalAmount ? fmtMoney(e.totalAmount) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div></CardContent></Card>}
    </div>
  )
}

