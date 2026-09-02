'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, PRIORITY_COLORS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, PAYMENT_METHOD_COLORS } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, paymentMethodLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== FINANCES VIEW ====================
export function FinancesView() {
  const { user } = useAppStore()

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard-finances', user?.tenantId],
    queryFn: () => fetch(`/api/dashboard?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!user?.tenantId,
  })

  const { data: paymentsData, isLoading: payLoading } = useQuery({
    queryKey: ['payments-finances', user?.tenantId],
    queryFn: () => fetch(`/api/payments?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : Array.isArray(d?.payments) ? d.payments : []),
    enabled: !!user?.tenantId,
  })

  const { data: overdueData, isLoading: odLoading } = useQuery({
    queryKey: ['invoices-overdue', user?.tenantId],
    queryFn: () => fetch(`/api/invoices?tenantId=${user?.tenantId}&status=non_paye`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: !!user?.tenantId,
  })

  const fin = dashData?.financial
  const payments: Payment[] = Array.isArray(paymentsData) ? paymentsData : Array.isArray(paymentsData?.payments) ? paymentsData.payments : []
  const overdueInvoices: Invoice[] = Array.isArray(overdueData) ? overdueData : []
  const now = new Date()

  const overdueList = useMemo(() => {
    return overdueInvoices.filter(inv => inv.dueDate && isBefore(parseISO(inv.dueDate), now) && (inv.status === 'non_paye' || inv.status === 'partiel')).map(inv => ({
      ...inv,
      daysOverdue: differenceInDays(now, parseISO(inv.dueDate as string)),
    }))
  }, [overdueInvoices])

  const [periodFilter, setPeriodFilter] = useState('ce_mois')
  const [clientFilter, setClientFilter] = useState('all')
  const [statusFilterFin, setStatusFilterFin] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { data: finClients } = useQuery({
    queryKey: ['fin-clients', user?.tenantId],
    queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : d.clients || []),
    enabled: !!user?.tenantId,
  })

  const dateRange = useMemo(() => {
    const n = new Date()
    switch (periodFilter) {
      case 'ce_mois': return { start: startOfMonth(n).toISOString(), end: n.toISOString() }
      case 'ce_trimestre': {
        const q = Math.floor(n.getMonth() / 3);
        return { start: new Date(n.getFullYear(), q * 3, 1).toISOString(), end: n.toISOString() }
      }
      case 'ce_semestre': {
        const s = n.getMonth() < 6 ? 0 : 6;
        return { start: new Date(n.getFullYear(), s, 1).toISOString(), end: n.toISOString() }
      }
      case 'cette_annee': return { start: new Date(n.getFullYear(), 0, 1).toISOString(), end: n.toISOString() }
      case 'personnalise': return { start: customStart || undefined, end: customEnd || undefined }
      default: return {}
    }
  }, [periodFilter, customStart, customEnd])

  const filteredPayments = useMemo(() => {
    let result = payments
    if (dateRange.start) result = result.filter(p => p.paidAt && parseISO(p.paidAt) >= parseISO(dateRange.start!))
    if (dateRange.end) result = result.filter(p => p.paidAt && parseISO(p.paidAt) <= parseISO(dateRange.end!))
    if (clientFilter !== 'all') result = result.filter(p => p.invoice?.client?.id === clientFilter)
    return result
  }, [payments, dateRange, clientFilter])

  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of filteredPayments) {
      if (!map[p.method]) map[p.method] = 0
      map[p.method] += p.amount
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filteredPayments])

  const filteredTotal = useMemo(() => filteredPayments.reduce((s, p) => s + p.amount, 0), [filteredPayments])

  const exportCSV = useCallback(() => {
    const rows = [['Date', 'Client', 'Facture', 'Montant', 'Méthode', 'Enregistré par']]
    for (const p of filteredPayments) {
      rows.push([
        p.paidAt ? format(parseISO(p.paidAt), 'yyyy-MM-dd') : '',
        p.invoice?.client?.fullName || '',
        p.invoice?.invoiceNumber || '',
        String(p.amount),
        paymentMethodLabel(p.method),
        p.recorder?.fullName || '',
      ])
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `finances_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [filteredPayments])

  const exportExcel = useCallback(async () => {
    try {
      const params = new URLSearchParams({ tenantId: user?.tenantId || '' })
      if (dateRange.start) params.set('start', dateRange.start)
      if (dateRange.end) params.set('end', dateRange.end)
      if (clientFilter !== 'all') params.set('clientId', clientFilter)
      const res = await fetch(`/api/finances/export/excel?${params}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `finances_${format(new Date(), 'yyyy-MM-dd')}.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Erreur export Excel') }
  }, [user?.tenantId, dateRange, clientFilter])

  const exportFinPDF = useCallback(async () => {
    try {
      const params = new URLSearchParams({ tenantId: user?.tenantId || '' })
      if (dateRange.start) params.set('start', dateRange.start)
      if (dateRange.end) params.set('end', dateRange.end)
      if (clientFilter !== 'all') params.set('clientId', clientFilter)
      const res = await fetch(`/api/finances/export/pdf?${params}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `rapport_financier_${format(new Date(), 'yyyy-MM-dd')}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Erreur export PDF') }
  }, [user?.tenantId, dateRange, clientFilter])

  const isLoading = dashLoading || payLoading || odLoading

  if (isLoading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-6" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Finances</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[170px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ce_mois">Ce mois</SelectItem>
            <SelectItem value="ce_trimestre">Ce trimestre</SelectItem>
            <SelectItem value="ce_semestre">Ce semestre</SelectItem>
            <SelectItem value="cette_annee">Cette année</SelectItem>
            <SelectItem value="personnalise">Personnalisé</SelectItem>
          </SelectContent>
        </Select>
        {periodFilter === 'personnalise' && (
          <>
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-8 text-xs w-[140px]" />
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-8 text-xs w-[140px]" />
          </>
        )}
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Tous les clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {(Array.isArray(finClients) ? finClients : []).map((c: Client) => (
              <SelectItem key={c.id} value={c.id}>{c.fullName}{c.company ? ` (${c.company})` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV}><Download className="size-3 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportExcel}><FileSpreadsheet className="size-3 mr-1" />Excel</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportFinPDF}><FileText className="size-3 mr-1" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-jl-blue-light flex items-center justify-center shrink-0"><TrendingUp className="size-5 text-jl-blue" /></div><div className="min-w-0"><p className="text-xs text-jl-secondary">Encaissé (filtré)</p><p className="text-base sm:text-lg font-bold text-jl-blue truncate" title={fmtMoney(filteredTotal)}>{fmtMoney(filteredTotal, 'XAF', true)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center"><Banknote className="size-5 text-[var(--success)]" /></div><div><p className="text-xs text-jl-secondary">Nb paiements</p><p className="text-lg font-bold text-[var(--success)]">{filteredPayments.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center shrink-0"><Clock className="size-5 text-[var(--accent)]" /></div><div className="min-w-0"><p className="text-xs text-jl-secondary">À recouvrer</p><p className="text-base sm:text-lg font-bold text-[var(--accent)] truncate" title={fmtMoney(fin?.toRecover || 0)}>{fmtMoney(fin?.toRecover || 0, 'XAF', true)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[var(--danger)]/10 flex items-center justify-center"><AlertCircle className="size-5 text-[var(--danger)]" /></div><div><p className="text-xs text-jl-secondary">Impayés</p><p className="text-lg font-bold text-[var(--danger)]">{fin?.overdueInvoicesCount || 0} facture{(fin?.overdueInvoicesCount || 0) !== 1 ? 's' : ''}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CreditCard className="size-4 text-jl-blue" />Paiements récents</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {filteredPayments.length === 0 ? <p className="text-sm text-jl-muted text-center py-8">Aucun paiement</p> : (
              <div className="max-h-96 overflow-y-auto">
                <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead className="hidden sm:table-cell">Facture</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="hidden md:table-cell">Méthode</TableHead><TableHead className="hidden lg:table-cell">Enregistré par</TableHead></TableRow></TableHeader><TableBody>
                  {filteredPayments.slice(0, 20).map((p: Payment) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm text-jl-secondary">{fmtDate(p.paidAt)}</TableCell>
                      <TableCell className="text-sm font-medium">{p.invoice?.client?.fullName || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-jl-muted">{p.invoice?.invoiceNumber || p.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm font-medium text-right">{fmtMoney(p.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell"><div className="flex items-center gap-1.5"><span className={cn('size-2 rounded-full', PAYMENT_METHOD_COLORS[p.method] || 'bg-jl-page')} /><span className="text-xs text-jl-secondary">{paymentMethodLabel(p.method)}</span></div></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-jl-muted">{p.recorder?.fullName || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Wallet className="size-4 text-jl-gold" />Répartition par méthode</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {methodBreakdown.length === 0 ? <p className="text-sm text-jl-muted text-center py-8">Aucune donnée</p> : (
              <div className="space-y-3">
                {methodBreakdown.map(([method, amount]) => {
                  const pct = filteredTotal > 0 ? (amount / filteredTotal) * 100 : 0
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className={cn('size-3 rounded-full', PAYMENT_METHOD_COLORS[method] || 'bg-jl-page')} /><span className="text-xs font-medium">{paymentMethodLabel(method)}</span></div><span className="text-xs font-semibold">{fmtMoney(amount)}</span></div>
                      <div className="h-1.5 bg-jl-page rounded-full overflow-hidden"><div className={cn('h-full rounded-full', PAYMENT_METHOD_COLORS[method] || 'bg-jl-page')} style={{ width: pct + '%' }} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {overdueList.length > 0 && (
        <Card className="border-l-4 border-l-[#DC2626]">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2 text-[var(--danger)]"><AlertTriangle className="size-4" />Factures en retard ({overdueList.length})</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {overdueList.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--danger)]/10 hover:bg-[#FEE2E2]">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{inv.client?.fullName || '—'}</p>
                    <p className="text-[10px] text-jl-secondary">{inv.invoiceNumber || '—'} • {fmtDate(inv.dueDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{fmtMoney(inv.amount, inv.currency?.code || 'XAF')}</p>
                    <p className="text-[10px] font-semibold text-[var(--danger)]">{inv.daysOverdue}j de retard</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

