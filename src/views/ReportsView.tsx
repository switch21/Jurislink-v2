'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, subMonths, isBefore, fr, toast, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, ScrollArea, Separator, Skeleton, Switch, BarChart3, TrendingUp, Users, Clock, Briefcase, Activity, Download, Printer, ArrowUpRight, ArrowDownRight, Minus, DollarSign, FileText, CheckCircle2, AlertCircle, Loader2, ChevronUp, ChevronDown } from './shared-ui'
import { queryClient, CHART_COLORS, STATUS_COLORS, STATUS_LABELS, TYPE_LABELS, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, PRIORITY_LABELS, RISK_COLORS, BILLING_LABELS } from './constants'
import { fmtDate, fmtMoney, fmtDuration } from './helpers'

// ==================== HELPER COMPONENTS ====================
function ReportTooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const [show, setShow] = useState(false)
  return <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>{children}{show && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap z-50 pointer-events-none">{label}</div>}</div>
}

function ReportBarChart({ data, valueKey = 'value', labelKey = 'label', color = CHART_COLORS[0], height = 192, emptyText = 'Aucune donnée' }: { data: any[]; valueKey?: string; labelKey?: string; color?: string; height?: number; emptyText?: string }) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1)
  if (data.length === 0) return <p className="text-sm text-jl-muted text-center py-8">{emptyText}</p>
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <ReportTooltip key={i} label={`${d[labelKey]}: ${typeof d[valueKey] === 'number' ? d[valueKey].toLocaleString('fr-FR') : d[valueKey]}`}>
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[9px] text-jl-secondary font-medium truncate max-w-full">{d[valueKey] > 0 ? (typeof d[valueKey] === 'number' && d[valueKey] > 999 ? fmtMoney(d[valueKey], 'XAF', true) : d[valueKey]) : ''}</span>
            <div className="w-full bg-jl-page rounded-t relative flex-1">
              <div className="absolute bottom-0 w-full rounded-t transition-all duration-500" style={{ height: `${Math.max(2, (d[valueKey] / max) * 100)}%`, backgroundColor: color }} />
            </div>
            <span className="text-[9px] text-jl-muted truncate max-w-full">{d[labelKey]}</span>
          </div>
        </ReportTooltip>
      ))}
    </div>
  )
}

function ReportHBar({ items, valueKey, labelKey, colors }: { items: any[]; valueKey: string; labelKey: string; colors?: Record<string, string> }) {
  const max = Math.max(...items.map(d => d[valueKey] || 0), 1)
  if (items.length === 0) return <p className="text-sm text-jl-muted text-center py-8">Aucune donnée</p>
  return <div className="space-y-2.5 pt-1">{items.map((d, i) => (
    <div key={i} className="flex items-center gap-3">
      <span className="text-xs text-jl-secondary w-28 text-right truncate">{d[labelKey]}</span>
      <div className="flex-1 h-5 bg-jl-page rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (d[valueKey] / max) * 100)}%`, backgroundColor: colors?.[d[labelKey]] || CHART_COLORS[i % CHART_COLORS.length] }} />
      </div>
      <span className="text-xs font-semibold w-24 text-right">{typeof d[valueKey] === 'number' && d[valueKey] > 999 ? fmtMoney(d[valueKey]) : d[valueKey]}</span>
    </div>
  ))}</div>
}

function KpiCard({ label, value, sub, icon: Icon, color = 'text-jl-primary' }: { label: string; value: string | number; sub?: React.ReactNode; icon?: any; color?: string }) {
  return <Card><CardContent className="p-4"><div className="flex items-center gap-3">
    {Icon && <div className="size-10 rounded-lg bg-[var(--primary-light)] flex items-center justify-center shrink-0"><Icon className="size-5 text-jl-blue" /></div>}
    <div className="min-w-0"><p className="text-xs text-jl-secondary">{label}</p><p className={cn('text-base sm:text-lg font-bold truncate', color)} title={String(value)}>{value}</p>{sub && <p className="text-[10px] text-jl-muted">{sub}</p>}</div>
  </div></CardContent></Card>
}

function ChangeIndicator({ val }: { val: number }) {
  if (val > 0) return <span className="flex items-center gap-0.5 text-xs font-medium text-[var(--success)]"><ArrowUpRight className="size-3" />+{val.toFixed(1)}%</span>
  if (val < 0) return <span className="flex items-center gap-0.5 text-xs font-medium text-[var(--danger)]"><ArrowDownRight className="size-3" />{val.toFixed(1)}%</span>
  return <span className="flex items-center gap-0.5 text-xs text-jl-muted"><Minus className="size-3" />0%</span>
}

// ==================== REPORTS VIEW ====================
export function ReportsView() {
  const { user } = useAppStore()
  const [tab, setTab] = useState('financier')
  const [period, setPeriod] = useState('ce_mois')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const dateRange = useMemo(() => {
    const n = new Date()
    let from: Date, to: Date
    switch (period) {
      case 'ce_mois': from = startOfMonth(n); to = n; break
      case 'ce_trimestre': { const q = Math.floor(n.getMonth() / 3); from = new Date(n.getFullYear(), q * 3, 1); to = n; break }
      case 'cette_annee': from = new Date(n.getFullYear(), 0, 1); to = n; break
      case 'le_mois_dernier': from = startOfMonth(subMonths(n, 1)); to = endOfMonth(subMonths(n, 1)); break
      case 'personnalise': from = customFrom ? new Date(customFrom) : startOfMonth(n); to = customTo ? new Date(customTo) : n; break
      default: from = startOfMonth(n); to = n
    }
    // Previous period for comparison
    const diffMs = to.getTime() - from.getTime()
    const prevFrom = subMonths(from, Math.round(diffMs / (30.44 * 86400000)))
    const prevTo = subMonths(to, Math.round(diffMs / (30.44 * 86400000)))
    return { from: from.toISOString(), to: to.toISOString(), prevFrom: prevFrom.toISOString(), prevTo: prevTo.toISOString() }
  }, [period, customFrom, customTo])

  // Data queries
  const { data: finData, isLoading: finLoading } = useQuery({
    queryKey: ['report-financial', user?.tenantId, dateRange.from, dateRange.to],
    queryFn: () => fetch(`/api/reports/financial?tenantId=${user?.tenantId}&from=${dateRange.from}&to=${dateRange.to}&prevFrom=${dateRange.prevFrom}&prevTo=${dateRange.prevTo}`).then(r => r.json()),
    enabled: !!user?.tenantId && tab === 'financier',
  })
  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ['report-cases', user?.tenantId, dateRange.from, dateRange.to],
    queryFn: () => fetch(`/api/reports/cases?tenantId=${user?.tenantId}&from=${dateRange.from}&to=${dateRange.to}`).then(r => r.json()),
    enabled: !!user?.tenantId && tab === 'dossiers',
  })
  const { data: timeData, isLoading: timeLoading } = useQuery({
    queryKey: ['report-time', user?.tenantId, dateRange.from, dateRange.to],
    queryFn: () => fetch(`/api/reports/time-billing?tenantId=${user?.tenantId}&from=${dateRange.from}&to=${dateRange.to}`).then(r => r.json()),
    enabled: !!user?.tenantId && tab === 'temps',
  })
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['report-clients', user?.tenantId, dateRange.from, dateRange.to],
    queryFn: () => fetch(`/api/reports/clients?tenantId=${user?.tenantId}&from=${dateRange.from}&to=${dateRange.to}`).then(r => r.json()),
    enabled: !!user?.tenantId && tab === 'clients',
  })
  const { data: actData, isLoading: actLoading } = useQuery({
    queryKey: ['report-activity', user?.tenantId, dateRange.from, dateRange.to],
    queryFn: () => fetch(`/api/reports/activity?tenantId=${user?.tenantId}&from=${dateRange.from}&to=${dateRange.to}`).then(r => r.json()),
    enabled: !!user?.tenantId && tab === 'activite',
  })

  const isLoading = finLoading || caseLoading || timeLoading || clientLoading || actLoading

  // CSV export
  const exportCSV = useCallback((filename: string, rows: string[][]) => {
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [])

  const kpi = finData?.kpis || {}
  const tkpi = timeData?.kpis || {}
  const ckpi = caseData?.kpis || {}
  const clkpi = clientData?.kpis || {}
  const akpi = actData?.kpis || {}

  const finMonthData = useMemo(() => {
    if (!finData?.byMonth) return []
    return Object.entries(finData.byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([m, d]: [string, any]) => ({ label: format(parseISO(m + '-01'), 'MMM yy', { locale: fr }), value: d.invoiced }))
  }, [finData])

  const finByType = useMemo(() => {
    if (!finData?.byType) return []
    return Object.entries(finData.byType).map(([t, d]: [string, any]) => ({ label: INVOICE_TYPE_LABELS[t] || t, value: d.amount }))
  }, [finData])

  const finByStatus = useMemo(() => {
    if (!finData?.byStatus) return []
    return Object.entries(finData.byStatus).map(([s, d]: [string, any]) => ({ label: INVOICE_STATUS_LABELS[s] || s, value: d.amount }))
  }, [finData])

  const finByMethod = useMemo(() => {
    if (!finData?.byMethod) return []
    return Object.entries(finData.byMethod).map(([m, d]: [string, any]) => ({ label: PAYMENT_METHOD_LABELS[m] || m, value: d.amount }))
  }, [finData])

  if (isLoading && tab !== 'financier') return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Rapports</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[170px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ce_mois">Ce mois</SelectItem>
              <SelectItem value="le_mois_dernier">Le mois dernier</SelectItem>
              <SelectItem value="ce_trimestre">Ce trimestre</SelectItem>
              <SelectItem value="cette_annee">Cette année</SelectItem>
              <SelectItem value="personnalise">Personnalisé</SelectItem>
            </SelectContent>
          </Select>
          {period === 'personnalise' && <>
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 text-xs w-[140px]" />
            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 text-xs w-[140px]" />
          </>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="financier" className="text-xs gap-1.5"><DollarSign className="size-3.5" />Financier</TabsTrigger>
          <TabsTrigger value="dossiers" className="text-xs gap-1.5"><Briefcase className="size-3.5" />Dossiers</TabsTrigger>
          <TabsTrigger value="temps" className="text-xs gap-1.5"><Clock className="size-3.5" />Temps & Facturation</TabsTrigger>
          <TabsTrigger value="clients" className="text-xs gap-1.5"><Users className="size-3.5" />Clients</TabsTrigger>
          <TabsTrigger value="activite" className="text-xs gap-1.5"><Activity className="size-3.5" />Activité</TabsTrigger>
        </TabsList>

        {/* ═══ FINANCIER TAB ═══ */}
        <TabsContent value="financier" className="space-y-6">
          {finLoading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard icon={TrendingUp} label="CA facturé" value={fmtMoney(kpi.totalInvoiced || 0, 'XAF', true)} sub={<ChangeIndicator val={kpi.revenueChange || 0} />} />
              <KpiCard icon={CheckCircle2} label="Encaissé" value={fmtMoney(kpi.totalPaid || 0, 'XAF', true)} />
              <KpiCard icon={AlertCircle} label="Impayés" value={fmtMoney(kpi.outstanding || 0, 'XAF', true)} color="text-[var(--danger)]" />
              <KpiCard icon={FileText} label="Nb factures" value={kpi.invoiceCount || 0} sub={`${kpi.paidCount || 0} payées`} />
              <KpiCard icon={DollarSign} label="Remises" value={fmtMoney(kpi.totalDiscount || 0, 'XAF', true)} />
              <KpiCard icon={BarChart3} label="Pan moyen" value={fmtMoney(kpi.avgInvoice || 0, 'XAF', true)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">CA par mois</CardTitle></CardHeader><CardContent><ReportBarChart data={finMonthData} /></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Par type de document</CardTitle></CardHeader><CardContent><ReportHBar items={finByType} valueKey="value" labelKey="label" /></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Par statut</CardTitle></CardHeader><CardContent><ReportHBar items={finByStatus} valueKey="value" labelKey="label" /></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Méthodes de paiement</CardTitle></CardHeader><CardContent><ReportHBar items={finByMethod} valueKey="value" labelKey="label" /></CardContent></Card>
            </div>

            {/* Aging */}
            {finData?.aging && <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Balance âgée</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(finData.aging).map(([range, amount]: [string, any]) => (
                  <div key={range} className="text-center p-3 rounded-lg bg-jl-page">
                    <p className="text-xs text-jl-secondary">{range} jours</p>
                    <p className="text-sm font-bold mt-1">{fmtMoney(amount, 'XAF', true)}</p>
                  </div>
                ))}
              </div>
            </CardContent></Card>}

            {/* Top clients */}
            {finData?.topClients && finData.topClients.length > 0 && <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold">Top clients par revenus</CardTitle><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => exportCSV('rapport_financier', [['Client', 'CA', 'Payé', 'Nb factures'], ...finData.topClients.map((c: any) => [c.name, String(c.amount), String(c.paid), String(c.count)])])}><Download className="size-3 mr-1" />CSV</Button></div></CardHeader><CardContent>
              <div className="max-h-80 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Client</TableHead><TableHead className="text-right">CA</TableHead><TableHead className="hidden sm:table-cell text-right">Payé</TableHead><TableHead className="hidden md:table-cell text-right">Factures</TableHead></TableRow></TableHeader><TableBody>
                {finData.topClients.map((c: any, i: number) => <TableRow key={i}><TableCell className="text-xs font-bold">{i + 1}</TableCell><TableCell className="text-sm font-medium">{c.name}</TableCell><TableCell className="text-sm font-semibold text-right">{fmtMoney(c.amount)}</TableCell><TableCell className="hidden sm:table-cell text-sm text-right text-[var(--success)]">{fmtMoney(c.paid)}</TableCell><TableCell className="hidden md:table-cell text-sm text-right">{c.count}</TableCell></TableRow>)}
              </TableBody></Table></div>
            </CardContent></Card>}
          </>}
        </TabsContent>

        {/* ═══ DOSSIERS TAB ═══ */}
        <TabsContent value="dossiers" className="space-y-6">
          {caseLoading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard icon={Briefcase} label="Total dossiers" value={ckpi.total || 0} />
              <KpiCard icon={Activity} label="Dossiers actifs" value={ckpi.activeCases || 0} />
              <KpiCard icon={CheckCircle2} label="Résolus" value={ckpi.resolvedCount || 0} />
              <KpiCard icon={Clock} label="Durée moy. résolution" value={`${ckpi.avgResolutionTime || 0}j`} />
              <KpiCard icon={DollarSign} label="Montant en litige" value={fmtMoney(ckpi.totalAmountDispute || 0, 'XAF', true)} />
              <KpiCard icon={BarChart3} label="Durée médiane" value={`${ckpi.medianResolutionTime || 0}j`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Par statut</CardTitle></CardHeader><CardContent>
                {caseData?.byStatus && <ReportHBar items={Object.entries(caseData.byStatus).map(([s, c]: [string, any]) => ({ label: STATUS_LABELS[s] || s, value: c }))} valueKey="value" labelKey="label" />}
              </CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Par type</CardTitle></CardHeader><CardContent>
                {caseData?.byType && <ReportHBar items={Object.entries(caseData.byType).map(([t, c]: [string, any]) => ({ label: TYPE_LABELS[t] || t, value: c }))} valueKey="value" labelKey="label" />}
              </CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Par priorité</CardTitle></CardHeader><CardContent>
                {caseData?.byPriority && <ReportHBar items={Object.entries(caseData.byPriority).map(([p, c]: [string, any]) => ({ label: PRIORITY_LABELS[p] || p, value: c }))} valueKey="value" labelKey="label" />}
              </CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Répartition par avocat</CardTitle></CardHeader><CardContent>
                {caseData?.byLawyer && <ReportHBar items={caseData.byLawyer} valueKey="count" labelKey="name" />}
              </CardContent></Card>
            </div>

            {/* Case details table */}
            {caseData?.caseDetails && <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold">Détail des dossiers</CardTitle><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => exportCSV('rapport_dossiers', [['Réf', 'Titre', 'Client', 'Type', 'Statut', 'Facturé', 'Payé', 'Temps', 'Tâches'], ...caseData.caseDetails.map((c: any) => [c.reference || '', c.title, c.clientName, TYPE_LABELS[c.caseType] || c.caseType, STATUS_LABELS[c.status] || c.status, String(c.totalInvoiced), String(c.totalPaid), fmtDuration(c.totalTimeSeconds), String(c.taskCount)])])}><Download className="size-3 mr-1" />CSV</Button></div></CardHeader><CardContent>
              <div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Réf</TableHead><TableHead>Titre</TableHead><TableHead className="hidden md:table-cell">Client</TableHead><TableHead className="hidden lg:table-cell">Type</TableHead><TableHead>Statut</TableHead><TableHead className="text-right hidden sm:table-cell">Facturé</TableHead><TableHead className="text-right hidden lg:table-cell">Temps</TableHead></TableRow></TableHeader><TableBody>
                {caseData.caseDetails.map((c: any) => <TableRow key={c.id}><TableCell className="text-xs font-mono text-jl-muted">{c.reference || '—'}</TableCell><TableCell className="text-sm font-medium max-w-[200px] truncate">{c.title}</TableCell><TableCell className="hidden md:table-cell text-xs text-jl-secondary">{c.clientName}</TableCell><TableCell className="hidden lg:table-cell text-xs">{TYPE_LABELS[c.caseType] || c.caseType}</TableCell><TableCell><Badge className={cn('text-[10px]', STATUS_COLORS[c.status] || '')}>{STATUS_LABELS[c.status] || c.status}</Badge></TableCell><TableCell className="text-sm text-right hidden sm:table-cell">{fmtMoney(c.totalInvoiced, 'XAF', true)}</TableCell><TableCell className="text-xs text-right hidden lg:table-cell">{fmtDuration(c.totalTimeSeconds)}</TableCell></TableRow>)}
              </TableBody></Table></div>
            </CardContent></Card>}
          </>}
        </TabsContent>

        {/* ═══ TEMPS TAB ═══ */}
        <TabsContent value="temps" className="space-y-6">
          {timeLoading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard icon={Clock} label="Temps total" value={fmtDuration(tkpi.totalSeconds || 0)} />
              <KpiCard icon={CheckCircle2} label="Temps facturable" value={fmtDuration(tkpi.billableSeconds || 0)} />
              <KpiCard icon={DollarSign} label="Montant facturé" value={fmtMoney(tkpi.totalBilledAmount || 0, 'XAF', true)} />
              <KpiCard icon={AlertCircle} label="Temps non facturé" value={fmtDuration(tkpi.unbilledSeconds || 0)} color="text-[var(--accent)]" />
              <KpiCard icon={BarChart3} label="Montant non facturé" value={fmtMoney(tkpi.unbilledAmount || 0, 'XAF', true)} color="text-[var(--danger)]" />
              <KpiCard icon={TrendingUp} label="Efficacité" value={`${(tkpi.billingEfficiency || 0).toFixed(0)}%`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Temps par collaborateur</CardTitle></CardHeader><CardContent>
                <div className="max-h-80 overflow-y-auto space-y-2.5">
                  {(timeData?.byUser || []).map((u: any, i: number) => {
                    const pct = tkpi.totalSeconds > 0 ? (u.totalSeconds / tkpi.totalSeconds) * 100 : 0
                    return <div key={i} className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="text-xs font-medium">{u.name}</span><span className="text-xs text-jl-secondary">{fmtDuration(u.totalSeconds)} ({u.entryCount} entrées)</span></div><div className="h-2 bg-jl-page rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /></div></div>
                  })}
                </div>
              </CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Temps par dossier</CardTitle></CardHeader><CardContent>
                <div className="max-h-80 overflow-y-auto space-y-2.5">
                  {(timeData?.byCase || []).slice(0, 15).map((c: any, i: number) => {
                    const maxS = Math.max(...(timeData?.byCase || []).map((x: any) => x.totalSeconds), 1)
                    return <div key={i} className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="text-xs font-medium truncate max-w-[60%]">[{c.reference}] {c.title}</span><span className="text-xs text-jl-secondary">{fmtDuration(c.totalSeconds)}</span></div><div className="h-1.5 bg-jl-page rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(c.totalSeconds / maxS) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /></div></div>
                  })}
                </div>
              </CardContent></Card>
            </div>

            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Taux horaire distribution</CardTitle></CardHeader><CardContent>
              {timeData?.rateDistribution ? <ReportHBar items={Object.entries(timeData.rateDistribution).map(([r, d]: [string, any]) => ({ label: r === 'non défini' ? 'Non défini' : `${Number(r).toLocaleString('fr-FR')} FCFA/h`, value: d.totalSeconds }))} valueKey="value" labelKey="label" /> : <p className="text-sm text-jl-muted text-center py-8">Aucune donnée</p>}
            </CardContent></Card>
          </>}
        </TabsContent>

        {/* ═══ CLIENTS TAB ═══ */}
        <TabsContent value="clients" className="space-y-6">
          {clientLoading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard icon={Users} label="Total clients" value={clkpi.totalClients || 0} />
              <KpiCard icon={CheckCircle2} label="Clients actifs" value={clkpi.activeClients || 0} />
              <KpiCard icon={TrendingUp} label="Nouveaux clients" value={clkpi.newClients || 0} />
              <KpiCard icon={DollarSign} label="CA total" value={fmtMoney(clkpi.totalRevenue || 0, 'XAF', true)} />
              <KpiCard icon={BarChart3} label="CA moyen/client" value={fmtMoney(clkpi.avgRevenuePerClient || 0, 'XAF', true)} />
              <KpiCard icon={Briefcase} label="Avec dossiers" value={clkpi.clientsWithCases || 0} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Par niveau de risque</CardTitle></CardHeader><CardContent>
                {clientData?.byRisk && <ReportHBar items={Object.entries(clientData.byRisk).map(([r, c]: [string, any]) => ({ label: r.charAt(0).toUpperCase() + r.slice(1), value: c }))} valueKey="value" labelKey="label" />}
              </CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top clients par CA</CardTitle></CardHeader><CardContent>
                <div className="max-h-80 overflow-y-auto space-y-2.5">
                  {(clientData?.topClients || []).slice(0, 15).map((c: any, i: number) => {
                    const maxR = Math.max(...(clientData?.topClients || []).map((x: any) => x.revenue), 1)
                    return <div key={i} className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="text-xs font-medium truncate max-w-[60%]">{c.fullName}{c.company ? ` (${c.company})` : ''}</span><span className="text-xs font-semibold">{fmtMoney(c.revenue, 'XAF', true)}</span></div><div className="h-1.5 bg-jl-page rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(c.revenue / maxR) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /></div></div>
                  })}
                </div>
              </CardContent></Card>
            </div>

            {/* Outstanding clients */}
            {clientData?.outstandingClients && clientData.outstandingClients.length > 0 && <Card className="border-l-4 border-l-[#DC2626]"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2 text-[var(--danger)]"><AlertCircle className="size-4" />Clients avec impayés ({clientData.outstandingClients.length})</CardTitle></CardHeader><CardContent>
              <div className="max-h-64 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Client</TableHead><TableHead className="hidden md:table-cell">Dossiers</TableHead><TableHead className="text-right">CA</TableHead><TableHead className="text-right">Impayé</TableHead><TableHead className="hidden lg:table-cell text-right">Factures en retard</TableHead></TableRow></TableHeader><TableBody>
                {clientData.outstandingClients.slice(0, 15).map((c: any) => <TableRow key={c.id}><TableCell className="text-sm font-medium">{c.fullName}{c.company ? ` (${c.company})` : ''}</TableCell><TableCell className="hidden md:table-cell text-xs text-jl-secondary">{c.caseCount}</TableCell><TableCell className="text-sm text-right">{fmtMoney(c.revenue)}</TableCell><TableCell className="text-sm text-right font-semibold text-[var(--danger)]">{fmtMoney(c.outstanding)}</TableCell><TableCell className="hidden lg:table-cell text-xs text-right">{c.overdueCount}</TableCell></TableRow>)}
              </TableBody></Table></div>
            </CardContent></Card>}
          </>}
        </TabsContent>

        {/* ═══ ACTIVITÉ TAB ═══ */}
        <TabsContent value="activite" className="space-y-6">
          {actLoading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard icon={CheckCircle2} label="Tâches terminées" value={akpi.tasksCompleted || 0} sub={`${akpi.tasksOverdue || 0} en retard`} />
              <KpiCard icon={FileText} label="Documents" value={akpi.totalDocs || 0} />
              <KpiCard icon={Briefcase} label="Dossiers créés" value={akpi.totalCases || 0} />
              <KpiCard icon={Clock} label="Temps enregistré" value={fmtDuration(akpi.totalTimeSeconds || 0)} />
              <KpiCard icon={Users} label="Communications" value={akpi.totalComms || 0} />
              <KpiCard icon={BarChart3} label="Factures émises" value={akpi.totalInvoices || 0} />
            </div>

            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Productivité par collaborateur</CardTitle></CardHeader><CardContent>
              <div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Collaborateur</TableHead><TableHead className="text-center">Tâches</TableHead><TableHead className="text-center hidden md:table-cell">Terminées</TableHead><TableHead className="text-center hidden sm:table-cell">Docs</TableHead><TableHead className="text-center hidden lg:table-cell">Temps</TableHead><TableHead className="text-center hidden lg:table-cell">Notes</TableHead><TableHead className="text-center hidden xl:table-cell">Comms</TableHead></TableRow></TableHeader><TableBody>
                {(actData?.byUser || []).sort((a: any, b: any) => b.tasksTotal - a.tasksTotal).map((u: any, i: number) => <TableRow key={i}><TableCell className="text-sm font-medium">{u.name}<span className="text-[10px] text-jl-muted ml-2">{u.role}</span></TableCell><TableCell className="text-sm text-center">{u.tasksTotal}</TableCell><TableCell className="text-sm text-center hidden md:table-cell"><span className="text-[var(--success)]">{u.tasksCompleted}</span></TableCell><TableCell className="text-sm text-center hidden sm:table-cell">{u.docsUploaded}</TableCell><TableCell className="text-xs text-center hidden lg:table-cell">{fmtDuration(u.timeSeconds)}</TableCell><TableCell className="text-sm text-center hidden lg:table-cell">{u.notesAdded}</TableCell><TableCell className="text-sm text-center hidden xl:table-cell">{u.commsSent}</TableCell></TableRow>)}
              </TableBody></Table></div>
            </CardContent></Card>
          </>}
        </TabsContent>
      </Tabs>
    </div>
  )
}

