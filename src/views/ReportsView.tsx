'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== REPORTS VIEW ====================
export function ReportsView() {
  const { user } = useAppStore()
  const [period, setPeriod] = useState('month')

  const { data: invoices } = useQuery({
    queryKey: ['invoices-report', user?.tenantId],
    queryFn: () => fetch(`/api/invoices?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard-report', user?.tenantId],
    queryFn: () => fetch(`/api/dashboard?tenantId=${user?.tenantId}`).then(r => r.json()),
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-report', user?.tenantId],
    queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const periodStart = useMemo(() => {
    const now = new Date()
    if (period === 'month') return startOfMonth(now).toISOString()
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), q * 3, 1).toISOString()
    }
    if (period === 'year') return new Date(now.getFullYear(), 0, 1).toISOString()
    return '2000-01-01'
  }, [period])

  const filteredInvoices = useMemo(() => {
    const all = (invoices || []) as Invoice[]
    if (period === 'all') return all
    return all.filter(i => i.createdAt >= periodStart || (i.issuedAt && i.issuedAt >= periodStart))
  }, [invoices, period, periodStart])

  const stats = useMemo(() => {
    const all = filteredInvoices
    const paid = all.filter(i => i.status === 'paye')
    const unpaid = all.filter(i => i.status === 'non_paye')
    const partial = all.filter(i => i.status === 'partiel')
    const totalRevenue = paid.reduce((s, i) => s + i.amount, 0)
    const monthRevenue = paid.filter(i => {
      try { return format(parseISO(i.paidAt || i.createdAt), 'yyyy-MM') === format(new Date(), 'yyyy-MM') } catch { return false }
    }).reduce((s, i) => s + i.amount, 0)
    const totalPending = unpaid.reduce((s, i) => s + i.amount, 0) + partial.reduce((s, i) => s + i.amount - (i.paidAmount || 0), 0)
    const newClientsCount = (clients || []).filter((c: Client) => {
      try { return c.createdAt >= periodStart } catch { return false }
    }).length
    return { totalRevenue, monthRevenue, totalPending, paidCount: paid.length, pendingCount: unpaid.length + partial.length, totalInvoices: all.length, newClientsCount, activeCases: dashboard?.activeCases || 0 }
  }, [filteredInvoices, clients, dashboard, periodStart])

  const monthlyData = useMemo(() => {
    const all = (invoices || []) as Invoice[]
    const months: Record<string, { month: string; label: string; revenue: number }> = {}
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i)
      const key = format(d, 'yyyy-MM')
      const label = format(d, 'MMM yy', { locale: fr })
      months[key] = { month: key, label, revenue: 0 }
    }
    for (const inv of all) {
      if (inv.status === 'annule') continue
      const m = format(parseISO(inv.createdAt), 'yyyy-MM')
      if (months[m]) months[m].revenue += inv.amount
    }
    return Object.values(months)
  }, [invoices])

  const maxMonthlyRevenue = useMemo(() => Math.max(...monthlyData.map(x => x.revenue), 1), [monthlyData])

  const caseTypeData = useMemo(() => {
    const all = (invoices || []) as Invoice[]
    const types: Record<string, number> = {}
    for (const inv of all) {
      if (inv.status === 'annule') continue
      const t = inv.case?.caseType || TYPE_LABELS[inv.case?.caseType as keyof typeof TYPE_LABELS] || 'Autre'
      types[t] = (types[t] || 0) + inv.amount
    }
    return Object.entries(types).sort((a, b) => b[1] - a[1]).map(([type, amount], i) => ({ type: TYPE_LABELS[type] || type, amount, color: CHART_COLORS[i % CHART_COLORS.length] }))
  }, [invoices])

  const maxCaseTypeAmount = useMemo(() => Math.max(...caseTypeData.map(x => x.amount), 1), [caseTypeData])

  const topClients = useMemo(() => {
    const all = filteredInvoices
    const map: Record<string, { name: string; total: number; count: number; lastDate: string }> = {}
    for (const inv of all) {
      if (inv.status === 'annule') continue
      const name = inv.client?.fullName || 'Inconnu'
      if (!map[inv.clientId]) map[inv.clientId] = { name, total: 0, count: 0, lastDate: inv.createdAt }
      map[inv.clientId].total += inv.amount
      map[inv.clientId].count++
      if (inv.createdAt > map[inv.clientId].lastDate) map[inv.clientId].lastDate = inv.createdAt
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
  }, [filteredInvoices])

  const exportReportCSV = useCallback(() => {
    const rows = [['Période', 'Métrique', 'Valeur']]
    rows.push([period, 'CA total', String(stats.totalRevenue)])
    rows.push([period, 'CA ce mois', String(stats.monthRevenue)])
    rows.push([period, 'Factures payées', String(stats.paidCount)])
    rows.push([period, 'Factures en attente', String(stats.pendingCount)])
    rows.push([period, 'Nouveaux clients', String(stats.newClientsCount)])
    rows.push([period, 'Dossiers actifs', String(stats.activeCases)])
    rows.push([])
    rows.push(['Mois', 'Revenus'])
    for (const m of monthlyData) rows.push([m.label, String(m.revenue)])
    rows.push([])
    rows.push(['#', 'Client', 'Revenu total', 'Factures'])
    topClients.forEach((c, i) => rows.push([String(i + 1), c.name, String(c.total), String(c.count)]))
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `rapport_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [period, stats, monthlyData, topClients])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Rapports</h2>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="h-8 text-xs"><TabsTrigger value="month" className="text-xs px-3">Ce mois</TabsTrigger><TabsTrigger value="quarter" className="text-xs px-3">Ce trimestre</TabsTrigger><TabsTrigger value="year" className="text-xs px-3">Cette année</TabsTrigger><TabsTrigger value="all" className="text-xs px-3">Tout</TabsTrigger></TabsList>
          </Tabs>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportReportCSV}><Download className="size-3 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.print()}><Printer className="size-3 mr-1" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card><CardContent className="p-4 overflow-hidden"><p className="text-xs text-[#6B7280]">CA total</p><p className="text-base sm:text-lg font-bold text-[#1E5A8A] mt-1 truncate" title={fmtMoney(stats.totalRevenue)}>{fmtMoney(stats.totalRevenue, 'XAF', true)}</p></CardContent></Card>
        <Card><CardContent className="p-4 overflow-hidden"><p className="text-xs text-[#6B7280]">CA ce mois</p><p className="text-base sm:text-lg font-bold text-[#059669] mt-1 truncate" title={fmtMoney(stats.monthRevenue)}>{fmtMoney(stats.monthRevenue, 'XAF', true)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Factures payées</p><p className="text-lg font-bold text-[#059669] mt-1">{stats.paidCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Factures en attente</p><p className="text-lg font-bold text-[#D97706] mt-1">{stats.pendingCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Nouveaux clients</p><p className="text-lg font-bold text-[#1E5A8A] mt-1">{stats.newClientsCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Dossiers actifs</p><p className="text-lg font-bold mt-1">{stats.activeCases}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tendance revenus mensuels</CardTitle></CardHeader><CardContent>
          {monthlyData.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune donnée</p> : (
            <div className="flex items-end gap-1.5 h-48 pt-2">
              {monthlyData.map(d => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#6B7280] font-medium">{d.revenue > 0 ? fmtMoney(d.revenue) : ''}</span>
                  <div className="w-full bg-[#F3F4F6] rounded-t relative" style={{ height: '100%' }}>
                    <div className="absolute bottom-0 w-full rounded-t transition-all duration-500" style={{ height: `${Math.max(2, (d.revenue / maxMonthlyRevenue) * 100)}%`, backgroundColor: CHART_COLORS[0] }} />
                  </div>
                  <span className="text-[9px] text-[#9CA3AF]">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Répartition par type de dossier</CardTitle></CardHeader><CardContent>
          {caseTypeData.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune donnée</p> : (
            <div className="space-y-3 pt-2">
              {caseTypeData.map(d => (
                <div key={d.type} className="flex items-center gap-3">
                  <span className="text-xs text-[#6B7280] w-24 text-right truncate">{d.type}</span>
                  <div className="flex-1 h-5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (d.amount / maxCaseTypeAmount) * 100)}%`, backgroundColor: d.color }} />
                  </div>
                  <span className="text-xs font-semibold w-28 text-right">{fmtMoney(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      </div>

      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top clients par revenus</CardTitle></CardHeader><CardContent>
        {topClients.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune donnée</p> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead className="w-12">#</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Revenu total</TableHead><TableHead className="hidden md:table-cell text-right">Factures</TableHead><TableHead className="hidden lg:table-cell">Dernière facture</TableHead>
          </TableRow></TableHeader><TableBody>
            {topClients.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs font-bold">{i + 1}</TableCell>
                <TableCell className="text-sm font-medium">{c.name}</TableCell>
                <TableCell className="text-sm font-semibold text-right">{fmtMoney(c.total)}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-right">{c.count}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-[#9CA3AF]">{fmtDate(c.lastDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>
        )}
      </CardContent></Card>
    </div>
  )
}

