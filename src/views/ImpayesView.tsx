'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== IMPAYÉS VIEW ====================
export function ImpayesView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [remindDialog, setRemindDialog] = useState<{ invoiceId: string; invoiceNumber: string; clientName: string; level: number; label: string; remaining: number; daysOverdue: number } | null>(null)
  const [historyDialog, setHistoryDialog] = useState<string | null>(null)
  const [sendingRemind, setSendingRemind] = useState(false)

  const { data: overdueData, isLoading } = useQuery({
    queryKey: ['overdue', user?.tenantId, levelFilter],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (levelFilter !== 'all') p.set('level', levelFilter)
      return fetch(`/api/invoices/overdue?${p}`).then(r => r.json())
    },
  })

  const { data: reminderHistory } = useQuery({
    queryKey: ['reminder-history', historyDialog],
    queryFn: () => fetch(`/api/invoices/${historyDialog}/remind`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: !!historyDialog,
  })

  const kpis = (overdueData as any)?.kpis || {}
  const invoices = (overdueData as any)?.invoices || []
  const thresholds = (overdueData as any)?.thresholds || []
  const byLevel = kpis.byLevel || []
  const byClient = kpis.byClient || []

  const remindMut = useMutation({
    mutationFn: ({ id, level }: { id: string; level: number }) =>
      fetch(`/api/invoices/${id}/remind`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['overdue'] }); toast.success(t('impayes.reminderSent')); setRemindDialog(null) },
    onError: (e: any) => { const msg = e?.info?.error || t('common.error'); toast.error(msg) },
  })

  const handleRemind = () => {
    if (!remindDialog) return
    setSendingRemind(true)
    remindMut.mutate({ id: remindDialog.invoiceId, level: remindDialog.level }, { onSettled: () => setSendingRemind(false) })
  }

  const levelColor = (level: number) => {
    if (level >= 4) return 'bg-[#991B1B] text-white'
    if (level >= 3) return 'bg-[var(--danger)] text-white'
    if (level >= 2) return 'bg-[var(--accent)] text-white'
    if (level >= 1) return 'bg-[var(--accent)] text-white'
    return 'bg-jl-page text-white'
  }

  const levelLabel = (level: number) => {
    if (level === 0) return t('common.noData')
    if (level === 1) return t('impayes.firstReminder')
    if (level === 2) return t('impayes.secondReminder')
    if (level === 3) return t('impayes.thirdReminder')
    return t('impayes.formalNotice')
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><AlertOctagon className="size-5 text-[var(--danger)]" />{t('impayes.title')}</h2>
          <p className="text-xs text-jl-secondary">{t('impayes.subtitle')}</p>
        </div>
      </div>

      {isLoading ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Skeleton className="h-24 rounded-lg" /><Skeleton className="h-24 rounded-lg" /><Skeleton className="h-24 rounded-lg" /><Skeleton className="h-24 rounded-lg" /></div> :
      <>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-[#DC2626]"><CardContent className="p-3"><p className="text-[10px] text-jl-secondary uppercase tracking-wide">{t('impayes.overdueInvoices')}</p><p className="text-2xl font-bold text-[var(--danger)] mt-1">{kpis.totalOverdue || 0}</p></CardContent></Card>
          <Card className="border-l-4 border-l-[#D97706]"><CardContent className="p-3"><p className="text-[10px] text-jl-secondary uppercase tracking-wide">{t('impayes.totalDue')}</p><p className="text-lg font-bold text-[var(--accent)] mt-1">{fmtMoney(kpis.totalAmount || 0, 'XAF')}</p></CardContent></Card>
          <Card className="border-l-4 border-l-[#EA580C]"><CardContent className="p-3"><p className="text-[10px] text-jl-secondary uppercase tracking-wide">{t('impayes.avgDelay')}</p><p className="text-2xl font-bold text-[var(--accent)] mt-1">{kpis.avgDaysOverdue || 0}<span className="text-xs font-normal ml-1">{t('impayes.days')}</span></p></CardContent></Card>
          <Card className="border-l-4 border-l-[#991B1B]"><CardContent className="p-3"><p className="text-[10px] text-jl-secondary uppercase tracking-wide">{t('impayes.maxDelay')}</p><p className="text-2xl font-bold text-[#991B1B] mt-1">{kpis.maxDaysOverdue || 0}<span className="text-xs font-normal ml-1">{t('impayes.days')}</span></p></CardContent></Card>
          <Card className="border-l-4 border-l-[#1E5A8A]"><CardContent className="p-3"><p className="text-[10px] text-jl-secondary uppercase tracking-wide">{t('impayes.actionsPossible')}</p><p className="text-2xl font-bold text-jl-blue mt-1">{kpis.actionable || 0}</p></CardContent></Card>
        </div>

        {/* By Level Progress + By Client */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Relance levels breakdown */}
          <Card><CardHeader className="pb-2 px-4 pt-3"><CardTitle className="text-sm">{t('impayes.byLevel')}</CardTitle></CardHeader><CardContent className="px-4 pb-4 space-y-3">
            {[1, 2, 3, 4].map(l => {
              const data = (byLevel as any[]).find(b => b.level === l)
              const count = data?.count || 0
              const pct = (kpis.totalOverdue || 0) > 0 ? Math.round((count / (kpis.totalOverdue || 1)) * 100) : 0
              const colors = ['', 'bg-[var(--accent)]', 'bg-[var(--accent)]', 'bg-[var(--danger)]', 'bg-[#991B1B]']
              return (
                <div key={l}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1.5"><span className={cn('inline-block size-2 rounded-full', colors[l])} />{levelLabel(l)}</span>
                    <span className="text-xs text-jl-secondary">{count} {t('impayes.invoiceCount')} • {fmtMoney(data?.amount || 0, 'XAF')}</span>
                  </div>
                  <div className="h-2 bg-jl-page rounded-full overflow-hidden"><motion.div className={cn('h-full rounded-full', colors[l])} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} /></div>
                </div>
              )
            })}
          </CardContent></Card>

          {/* Top clients with overdue */}
          <Card><CardHeader className="pb-2 px-4 pt-3"><CardTitle className="text-sm">{t('impayes.topClients')}</CardTitle></CardHeader><CardContent className="px-4 pb-4 space-y-2">
            {byClient.length === 0 ? <p className="text-xs text-jl-muted text-center py-4">{t('impayes.noUnpaid')}</p> :
            (byClient as any[]).slice(0, 6).map((c: any, i: number) => (
              <div key={c.clientId || i} className="flex items-center justify-between p-2 rounded-lg hover:bg-jl-page">
                <div className="flex items-center gap-2"><span className="text-xs font-bold text-jl-secondary w-5">{i + 1}</span><span className="text-sm font-medium">{c.clientName}</span><Badge variant="outline" className="text-[10px]">{c.count} {t('impayes.invoiceCount')}</Badge></div>
                <span className="text-sm font-semibold text-[var(--danger)]">{fmtMoney(c.amount, 'XAF')}</span>
              </div>
            ))}
          </CardContent></Card>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-jl-secondary">{t('common.filter')} :</span>
          <button onClick={() => setLevelFilter('all')} className={cn('text-[10px] px-2.5 py-1 rounded-full transition-colors', levelFilter === 'all' ? 'bg-jl-blue text-white' : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}>{t('common.all')}</button>
          <button onClick={() => setLevelFilter('0')} className={cn('text-[10px] px-2.5 py-1 rounded-full transition-colors', levelFilter === '0' ? 'bg-jl-page text-white' : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}>{t('impayes.notReminded')}</button>
          {[1, 2, 3, 4].map(l => (
            <button key={l} onClick={() => setLevelFilter(String(l))} className={cn('text-[10px] px-2.5 py-1 rounded-full transition-colors', levelFilter === String(l) ? levelColor(l) : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}>{levelLabel(l)}</button>
          ))}
        </div>

        {/* Invoice list */}
        {invoices.length === 0 ? <Card className="border-dashed"><CardContent className="py-16 text-center"><CheckCircle2 className="size-12 mx-auto text-jl-muted mb-3" /><p className="text-sm font-medium">{t('impayes.noUnpaidInvoice')}</p><p className="text-xs text-jl-muted mt-1">{t('impayes.allUpToDate')}</p></CardContent></Card> :
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {invoices.map((inv: any) => (
            <motion.div key={inv.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
              <Card className={cn('overflow-hidden', inv.reminderLevel >= 3 ? 'border-[#DC2626]/30' : inv.reminderLevel >= 1 ? 'border-[#D97706]/20' : '')}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Level badge */}
                    <div className={cn('shrink-0 px-2 py-1 rounded-md text-[10px] font-bold text-center min-w-[80px]', levelColor(inv.reminderLevel))}>
                      {levelLabel(inv.reminderLevel)}
                    </div>
                    {/* Invoice info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{inv.invoiceNumber || inv.id.slice(0, 8)}</p>
                        {inv.case && <Badge variant="outline" className="text-[9px]">{inv.case.reference}</Badge>}
                        <Badge variant="secondary" className="text-[9px] bg-jl-page text-jl-secondary">{inv._count?.reminders || 0} {t('impayes.reminderCount')}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-jl-secondary">
                        <span>{inv.client?.fullName}{inv.client?.company ? ` (${inv.client.company})` : ''}</span>
                        <span>•</span>
                        <span>{t('impayes.dueDate')}: {fmtDate(inv.dueDate)}</span>
                        <span className={cn('font-bold', inv.daysOverdue >= 30 ? 'text-[var(--danger)]' : inv.daysOverdue >= 15 ? 'text-[var(--accent)]' : 'text-[var(--accent)]')}>{inv.daysOverdue}{t('impayes.daysLate')}</span>
                      </div>
                    </div>
                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{fmtMoney(inv.remaining, inv.currency?.code || 'XAF')}</p>
                      <p className="text-[10px] text-jl-muted">{t('common.of')} {fmtMoney(inv.amount, inv.currency?.code || 'XAF')}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7" onClick={() => setHistoryDialog(inv.id)}><History className="size-3.5" /></Button></TooltipTrigger><TooltipContent>{t('impayes.history')}</TooltipContent></Tooltip></TooltipProvider>
                      {inv.suggestedAction && (
                        <Button size="sm" className={cn('text-[10px] h-7 px-2', inv.suggestedAction.level >= 3 ? 'bg-[var(--danger)] hover:bg-[var(--danger)]' : 'bg-[var(--accent)] hover:bg-[var(--accent)]')} onClick={() => setRemindDialog({ invoiceId: inv.id, invoiceNumber: inv.invoiceNumber || inv.id.slice(0, 8), clientName: inv.client?.fullName || '?', level: inv.suggestedAction.level, label: inv.suggestedAction.label, remaining: inv.remaining, daysOverdue: inv.daysOverdue })}><Send className="size-3 mr-1" />{inv.suggestedAction.label}</Button>
                      )}
                      {inv.reminderLevel >= 4 && <Badge className="text-[9px] bg-[#991B1B] text-white">{t('impayes.maxReached')}</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>}
      </>}

      {/* Send Reminder Confirmation Dialog */}
      <Dialog open={!!remindDialog} onOpenChange={() => setRemindDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('impayes.confirmReminder')}</DialogTitle><DialogDescription>{t('impayes.confirmReminderDesc')}</DialogDescription></DialogHeader>
          {remindDialog && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[var(--accent-light)] border border-[#D97706]/20 space-y-1">
                <p className="text-sm font-medium">{remindDialog.invoiceNumber}</p>
                <p className="text-xs text-jl-secondary">{t('impayes.client')}: {remindDialog.clientName}</p>
                <p className="text-xs text-jl-secondary">{t('impayes.amountDue')}: <span className="font-bold text-[var(--accent)]">{fmtMoney(remindDialog.remaining, 'XAF')}</span></p>
                <p className="text-xs text-jl-secondary">{t('impayes.delay')}: <span className="font-bold text-[var(--accent)]">{remindDialog.daysOverdue} {t('impayes.days')}</span></p>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-jl-page">
                <span className={cn('text-[10px] px-2 py-0.5 rounded font-bold', levelColor(remindDialog.level))}>{remindDialog.label}</span>
                <span className="text-xs text-jl-secondary">{t('impayes.actionLog')}</span>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setRemindDialog(null)}>{t('common.cancel')}</Button><Button onClick={handleRemind} disabled={sendingRemind} className="bg-[var(--accent)] hover:bg-[var(--accent)]"><Send className="size-4 mr-1" />{sendingRemind ? t('communications.sent') + '...' : t('impayes.sendReminder')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={() => setHistoryDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="size-5" />{t('impayes.historyTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {(!reminderHistory || (reminderHistory as any[]).length === 0) ? <p className="text-xs text-jl-muted text-center py-8">{t('impayes.noHistory')}</p> :
            (reminderHistory as any[]).map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-jl">
                <div className={cn('shrink-0 mt-0.5 p-1 rounded text-[10px] font-bold text-white', levelColor(r.level))}>{levelLabel(r.level)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.subject}</p>
                  <p className="text-[10px] text-jl-secondary mt-0.5">{fmtDateTime(r.sentAt)} • {r.daysOverdue}{t('impayes.daysLate')} • {fmtMoney(r.amountDue, 'XAF')}</p>
                  <p className="text-[10px] text-jl-muted mt-1">{r.sentBy?.fullName ? `${t('impayes.by')} ${r.sentBy.fullName}` : t('impayes.automatic')}</p>
                </div>
                <Badge variant={r.status === 'sent' ? 'outline' : 'secondary'} className={cn('text-[10px] shrink-0', r.status === 'sent' ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700')}>{r.status === 'sent' ? t('impayes.sent') : t('impayes.failed')}</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

