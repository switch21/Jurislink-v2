'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState, t } from './shared-ui'
import { queryClient, STATUS_COLORS, INVOICE_TYPE_COLORS, PAYMENT_METHOD_COLORS } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, statusLabel, invoiceTypeLabel, invoiceStatusLabel, paymentMethodLabel, billingLabel } from './helpers'
import { useFormDraft, registerDirtyForm, unregisterDirtyForm } from '@/hooks/useFormDraft'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== INVOICES VIEW ====================
export function InvoicesView() {
  const { user, setHasUnsavedChanges } = useAppStore()
  const qc = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', method: 'virement', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' })
  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [createForm, setCreateForm] = useState({ type: 'facture', clientId: '', caseId: '', currencyId: '', dueDate: '', billingType: 'forfait', notes: '', taxRate: '0', discountAmount: '0', terms: '' })
  const { restoredDraft: invoiceRestoredDraft, isDirty: invoiceIsDirty, clearDraft: clearInvoiceDraft, getDraft: getInvoiceDraft } = useFormDraft('invoice-form', createForm as unknown as Record<string, unknown>, { enabled: createOpen })

  // Sync dirty state with global store
  useEffect(() => { registerDirtyForm('invoice-form', invoiceIsDirty); setHasUnsavedChanges(invoiceIsDirty); return () => { unregisterDirtyForm('invoice-form') } }, [invoiceIsDirty])

  // Restore draft on mount
  useEffect(() => { if (invoiceRestoredDraft) { const draft = getInvoiceDraft(); if (draft && draft.clientId) setCreateForm(draft as typeof createForm) } }, [invoiceRestoredDraft])
  const [timeEntryDialog, setTimeEntryDialog] = useState(false)
  const [selectedTimeEntries, setSelectedTimeEntries] = useState<Set<string>>(new Set())
  const [teClientId, setTeClientId] = useState('')
  const [teCaseId, setTeCaseId] = useState('')

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', user?.tenantId, typeFilter, statusFilter],
    queryFn: () => { const p = new URLSearchParams(); if (user?.tenantId) p.set('tenantId', user.tenantId); if (typeFilter !== 'all') p.set('type', typeFilter); if (statusFilter !== 'all') p.set('status', statusFilter); return fetch(`/api/invoices?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []) },
  })

  const { data: tenant } = useQuery({
    queryKey: ['tenant-info', user?.tenantId],
    queryFn: () => fetch(`/api/tenants/${user?.tenantId}`).then(r => r.json()),
    enabled: !!user?.tenantId,
  })

  const { data: invoiceDetail } = useQuery({
    queryKey: ['invoice-detail', selectedInvoice?.id],
    queryFn: () => fetch(`/api/invoices/${selectedInvoice!.id}?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!selectedInvoice?.id && detailOpen,
  })

  const { data: clients } = useQuery({ queryKey: ['clients-invoice', user?.tenantId], queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []) })
  const { data: cases } = useQuery({ queryKey: ['cases-invoice', user?.tenantId], queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []) })
  const { data: currencies } = useQuery({ queryKey: ['currencies-invoice'], queryFn: () => fetch('/api/currencies').then(r => r.json()).then(d => Array.isArray(d) ? d : []) })

  // Unbilled time entries
  const { data: unbilledData, isLoading: teLoading } = useQuery({
    queryKey: ['unbilled-entries', user?.tenantId, teClientId, teCaseId],
    queryFn: () => { const p = new URLSearchParams({ tenantId: user?.tenantId || '' }); if (teClientId) p.set('clientId', teClientId); if (teCaseId) p.set('caseId', teCaseId); return fetch(`/api/time-entries/unbilled?${p}`).then(r => r.json()) },
    enabled: timeEntryDialog,
  })
  const teEntries = (unbilledData?.allEntries || []) as TimeEntry[]
  const teGrouped = unbilledData?.grouped || []
  const toggleTe = (id: string) => { const s = new Set(selectedTimeEntries); if (s.has(id)) s.delete(id); else s.add(id); setSelectedTimeEntries(s) }
  const toggleTeGroup = (ids: string[]) => { const all = ids.every(id => selectedTimeEntries.has(id)); setSelectedTimeEntries(prev => { const s = new Set(prev); ids.forEach(id => all ? s.delete(id) : s.add(id)); return s }) }
  const selectedTeEntries = teEntries.filter(e => selectedTimeEntries.has(e.id))
  const selectedTeTotal = selectedTeEntries.reduce((s, e) => s + (e.totalAmount || 0), 0)
  const selectedTeSeconds = selectedTeEntries.reduce((s, e) => s + e.duration, 0)

  const createFromTeMut = useMutation({
    mutationFn: () => fetch('/api/invoices/from-time-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: user?.tenantId, clientId: teClientId || selectedTeEntries[0]?.case?.client?.id, caseId: teCaseId || null, timeEntryIds: Array.from(selectedTimeEntries), type: 'facture' }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['unbilled-entries'] }); toast.success(t('invoices.invoiceCreated')); setTimeEntryDialog(false); setSelectedTimeEntries(new Set()) },
    onError: () => toast.error(t('invoices.createError')),
  })

  const duplicateMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/invoices/${id}/duplicate`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success(t('invoices.invoiceUpdated')); setDetailOpen(false) },
    onError: () => toast.error(t('invoices.createError')),
  })

  const convertMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/invoices/${id}/convert`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success(t('invoices.invoiceUpdated')); setDetailOpen(false) },
    onError: (e: any) => { const msg = e?.info?.error || t('common.error'); toast.error(msg) },
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success(t('invoices.invoiceCreated')); setCreateOpen(false); resetCreateForm(); clearInvoiceDraft() },
    onError: () => toast.error(t('invoices.createError')),
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => fetch(`/api/invoices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-detail'] }); toast.success(t('invoices.invoiceUpdated')) },
    onError: () => toast.error(t('common.error')),
  })

  const payMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId, recordedBy: user?.id }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-detail'] }); toast.success(t('invoices.paymentRecorded')); setShowPayForm(false); setPayForm({ amount: '', method: 'virement', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' }) },
    onError: () => toast.error(t('invoices.paymentError')),
  })

  const resetCreateForm = () => { setCreateForm({ type: 'facture', clientId: '', caseId: '', currencyId: '', dueDate: '', billingType: 'forfait', notes: '', taxRate: '0', discountAmount: '0', terms: '' }); setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]) }
  const subtotal = lineItems.reduce((s, li) => s + (li.quantity * li.unitPrice), 0)
  const addLine = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])
  const removeLine = (i: number) => { if (lineItems.length <= 1) return; setLineItems(lineItems.filter((_, idx) => idx !== i)) }
  const updateLine = (i: number, field: string, value: string | number) => setLineItems(lineItems.map((li, idx) => idx === i ? { ...li, [field]: value } : li))

  const handleCreate = () => {
    if (!createForm.clientId || lineItems.every(li => !li.description.trim())) return
    createMut.mutate({
      ...createForm, taxRate: parseFloat(createForm.taxRate) || 0, discountAmount: parseFloat(createForm.discountAmount) || 0,
      caseId: createForm.caseId || null, currencyId: createForm.currencyId || null,
      lineItems: lineItems.filter(li => li.description.trim()).map((li, i) => ({ description: li.description, quantity: li.quantity, unitPrice: li.unitPrice, total: li.quantity * li.unitPrice, sortOrder: i })),
    })
  }

  const handlePay = () => {
    if (!selectedInvoice || !payForm.amount) return
    payMut.mutate({ invoiceId: selectedInvoice.id, amount: parseFloat(payForm.amount), method: payForm.method, reference: payForm.reference || null, paidAt: payForm.paidAt || null, notes: payForm.notes || null })
  }

  const handlePrint = async () => {
    if (!selectedInvoice) return
    try { const res = await fetch(`/api/invoices/${selectedInvoice.id}/pdf`); if (!res.ok) throw new Error(); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${selectedInvoice.invoiceNumber || 'facture'}.pdf`; a.click(); URL.revokeObjectURL(url) } catch { toast.error(t('invoices.pdfError')) }
  }

  const openDetail = (inv: Invoice) => { setSelectedInvoice(inv); setDetailOpen(true); setShowPayForm(false) }
  const paid = invoiceDetail?.paidAmount || 0
  const total = invoiceDetail?.amount || 0
  const remaining = Math.max(0, total - paid)
  const payPercent = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  const curCode = invoiceDetail?.currency?.code || 'XAF'

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('invoices.title')}</h2>
        <div className="flex gap-2">
          <Button onClick={() => {
            const draft = getInvoiceDraft()
            if (draft && draft.clientId) { setCreateForm(draft as typeof createForm); toast.info(t('cases.draftRestored')) } else { resetCreateForm() }
            setCreateOpen(true)
          }} size="sm" className="bg-jl-blue hover:bg-jl-blue"><Plus className="size-4 mr-1" />{t('invoices.new')}{invoiceIsDirty && <span className="ml-1 size-2 rounded-full bg-amber-400 inline-block" title={t('common.draft')} />}</Button>
          <Button onClick={() => { setSelectedTimeEntries(new Set()); setTeClientId(''); setTeCaseId(''); setTimeEntryDialog(true) }} size="sm" variant="outline"><Timer className="size-4 mr-1" />{t('invoices.fromTimeEntries')}</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder={t('invoices.type')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('invoices.all')}</SelectItem><SelectItem value="devis">{invoiceTypeLabel('devis')}</SelectItem><SelectItem value="facture">{invoiceTypeLabel('facture')}</SelectItem><SelectItem value="avoir">{invoiceTypeLabel('avoir')}</SelectItem><SelectItem value="recu">{invoiceTypeLabel('recu')}</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder={t('invoices.statusCol')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('invoices.all')}</SelectItem><SelectItem value="non_paye">{invoiceStatusLabel('non_paye')}</SelectItem><SelectItem value="partiel">{invoiceStatusLabel('partiel')}</SelectItem><SelectItem value="paye">{invoiceStatusLabel('paye')}</SelectItem><SelectItem value="annule">{invoiceStatusLabel('annule')}</SelectItem></SelectContent></Select>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (invoices || []).length === 0 ? <EmptyState icon={Receipt} title={t('invoices.noInvoice')} description={t('invoices.createFirst')} /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>{t('invoices.invoiceNumber')}</TableHead><TableHead className="hidden sm:table-cell">{t('common.type')}</TableHead><TableHead>{t('invoices.client')}</TableHead><TableHead className="text-right">{t('invoices.amount')}</TableHead><TableHead className="hidden md:table-cell text-right">{t('invoices.amountPaid')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="hidden lg:table-cell">{t('invoices.dueDate')}</TableHead><TableHead className="w-16"></TableHead>
          </TableRow></TableHeader><TableBody>
            {(invoices || []).map((inv: Invoice, i: number) => {
              const invPaid = inv.paidAmount || 0
              const invTotal = inv.amount || 0
              const invPercent = invTotal > 0 ? Math.min(100, (invPaid / invTotal) * 100) : 0
              return (
                <TableRow key={inv.id} className={cn(i % 2 === 1 && 'bg-jl-page', 'cursor-pointer')} onClick={() => openDetail(inv)}>
                  <TableCell className="font-medium text-sm">{inv.invoiceNumber || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge className={cn('text-[10px]', INVOICE_TYPE_COLORS[inv.type] || 'bg-jl-page text-white')}>{invoiceTypeLabel(inv.type)}</Badge></TableCell>
                  <TableCell className="text-sm text-jl-secondary">{inv.client?.fullName || '—'}</TableCell>
                  <TableCell className="text-sm font-medium text-right">{fmtMoney(invTotal, inv.currency?.code || 'XAF')}</TableCell>
                  <TableCell className="hidden md:table-cell"><div className="text-right"><p className="text-xs font-medium">{fmtMoney(invPaid, inv.currency?.code || 'XAF')}</p>{inv.status === 'partiel' && <div className="w-16 h-1.5 bg-jl-page rounded-full mt-1 ml-auto"><div className="h-full rounded-full bg-jl-gold" style={{ width: invPercent + '%' }} /></div>}</div></TableCell>
                  <TableCell><Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[inv.status])}>{statusLabel(inv.status)}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-jl-secondary">{fmtDate(inv.dueDate)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="size-7" onClick={e => { e.stopPropagation(); openDetail(inv) }}><Eye className="size-3.5" /></Button></TableCell>
                </TableRow>
              )
            })}
          </TableBody></Table>
        </div></CardContent></Card>}

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) resetCreateForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('invoices.new')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.type')} *</Label><Select value={createForm.type} onValueChange={v => setCreateForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="devis">{invoiceTypeLabel('devis')}</SelectItem><SelectItem value="facture">{invoiceTypeLabel('facture')}</SelectItem><SelectItem value="avoir">{invoiceTypeLabel('avoir')}</SelectItem><SelectItem value="recu">{invoiceTypeLabel('recu')}</SelectItem></SelectContent></Select></div>
              <div><Label>{t('invoices.client')} *</Label><Select value={createForm.clientId} onValueChange={v => setCreateForm(f => ({ ...f, clientId: v }))}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>{(clients || []).map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.fullName}{c.company ? ` (${c.company})` : ''}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('invoices.case')}</Label><Select value={createForm.caseId} onValueChange={v => setCreateForm(f => ({ ...f, caseId: v }))}><SelectTrigger><SelectValue placeholder={t('common.none')} /></SelectTrigger><SelectContent><SelectItem value="">{t('common.none')}</SelectItem>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('invoices.currency')}</Label><Select value={createForm.currencyId} onValueChange={v => setCreateForm(f => ({ ...f, currencyId: v }))}><SelectTrigger><SelectValue placeholder="XAF" /></SelectTrigger><SelectContent>{(currencies || []).map((c: CurrencyItem) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.symbol}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('invoices.dueDate')}</Label><Input type="date" value={createForm.dueDate} onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
            <div><Label>{t('invoices.billingType')}</Label><Select value={createForm.billingType} onValueChange={v => setCreateForm(f => ({ ...f, billingType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="forfait">{billingLabel('forfait')}</SelectItem><SelectItem value="horaire">{billingLabel('horaire')}</SelectItem><SelectItem value="abonnement">{billingLabel('abonnement')}</SelectItem><SelectItem value="success_fee">{billingLabel('success_fee')}</SelectItem><SelectItem value="provision">{billingLabel('provision')}</SelectItem></SelectContent></Select></div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-sm font-semibold">{t('invoices.lineItems')}</Label><Button type="button" size="sm" variant="outline" className="text-xs h-7" onClick={addLine}><Plus className="size-3 mr-1" />{t('invoices.addLine')}</Button></div>
              <div className="space-y-2">
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5"><Label className="text-[10px]">{t('invoices.description')}</Label><Input value={li.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder={t('invoices.description')} className="h-9 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">{t('invoices.quantity')}</Label><Input type="number" min={1} value={li.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 1)} className="h-9 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">{t('invoices.unitPrice')}</Label><Input type="number" min={0} value={li.unitPrice} onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-9 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">{t('invoices.total')}</Label><div className="h-9 flex items-center text-xs font-medium px-2 border rounded-md bg-jl-page">{fmtMoney(li.quantity * li.unitPrice)}</div></div>
                    <div className="col-span-1 flex justify-end"><Button type="button" variant="ghost" size="icon" className="size-9 text-[var(--danger)] hover:text-[var(--danger)]" onClick={() => removeLine(i)} disabled={lineItems.length <= 1}><Trash2 className="size-3.5" /></Button></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-[10px]">{t('invoices.tax')} (%)</Label><Input type="number" min={0} max={100} step={0.5} value={createForm.taxRate} onChange={e => setCreateForm(f => ({ ...f, taxRate: e.target.value }))} className="h-9 text-xs" /></div>
                <div><Label className="text-[10px]">{t('invoices.discount')}</Label><Input type="number" min={0} step={0.01} value={createForm.discountAmount} onChange={e => setCreateForm(f => ({ ...f, discountAmount: e.target.value }))} className="h-9 text-xs" /></div>
                <div className="flex items-end"><div className="w-full p-3 bg-jl-page rounded-lg text-right"><p className="text-[10px] text-jl-muted">{t('invoices.totalTtc')}</p><p className="text-sm font-bold">{fmtMoney(subtotal + (subtotal * (parseFloat(createForm.taxRate) || 0)) / 100 - (parseFloat(createForm.discountAmount) || 0))}</p></div></div>
              </div>
            </div>
            <div><Label>{t('invoices.terms')}</Label><Textarea value={createForm.terms} onChange={e => setCreateForm(f => ({ ...f, terms: e.target.value }))} rows={2} placeholder={t('invoices.termsPlaceholder')} /></div>
            <div><Label>{t('invoices.notes')}</Label><Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button><Button onClick={handleCreate} disabled={!createForm.clientId || createMut.isPending || lineItems.every(li => !li.description.trim())}>{createMut.isPending ? <RefreshCw className="size-4 mr-1 animate-spin" /> : t('common.create')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TIME ENTRY BILLING DIALOG */}
      <Dialog open={timeEntryDialog} onOpenChange={o => { setTimeEntryDialog(o); if (!o) setSelectedTimeEntries(new Set()) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('invoices.fromTimeEntries')}</DialogTitle><DialogDescription>{t('invoices.selectUnbilled')}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Client</Label><Select value={teClientId} onValueChange={v => { setTeClientId(v); setTeCaseId(''); setSelectedTimeEntries(new Set()) }}><SelectTrigger><SelectValue placeholder={t('invoices.all')} /></SelectTrigger><SelectContent><SelectItem value="">{t('invoices.all')}</SelectItem>{(clients || []).map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('invoices.case')}</Label><Select value={teCaseId} onValueChange={v => { setTeCaseId(v); setSelectedTimeEntries(new Set()) }}><SelectTrigger><SelectValue placeholder={t('invoices.all')} /></SelectTrigger><SelectContent><SelectItem value="">{t('invoices.all')}</SelectItem>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {teLoading ? <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin" /></div> : teGrouped.length === 0 ? <p className="text-sm text-jl-muted text-center py-8">{t('invoices.noUnbilledTime')}</p> : <div className="space-y-3 max-h-80 overflow-y-auto">
              {teGrouped.map((g: any) => {
                const gIds = Object.values(g.byCase).flatMap((c: any) => (c.entries || []).map((e: any) => e.id))
                const allSelected = gIds.every((id: string) => selectedTimeEntries.has(id))
                return <Card key={g.clientId}><CardHeader className="pb-2 py-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Checkbox checked={allSelected} onCheckedChange={() => toggleTeGroup(gIds)} /><CardTitle className="text-sm font-semibold">{g.clientName}{g.company ? ` (${g.company})` : ''}</CardTitle></div><span className="text-xs text-jl-secondary">{fmtDuration(g.totalSeconds)} — {fmtMoney(g.totalAmount)}</span></div></CardHeader><CardContent className="p-3 pt-0"><div className="space-y-1">
                  {Object.values(g.byCase).map((c: any) => (
                    <div key={c.caseId} className="ml-6 border-l-2 border-jl pl-3 py-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-jl-secondary mb-1"><span className="font-mono">{c.reference}</span><span>{c.title}</span><span className="ml-auto">{fmtDuration(c.totalSeconds)} — {fmtMoney(c.totalAmount)}</span></div>
                      {(c.entries || []).map((e: any) => (
                        <div key={e.id} className="flex items-center gap-2 py-1 hover:bg-jl-page rounded px-1 cursor-pointer" onClick={() => toggleTe(e.id)}>
                          <Checkbox checked={selectedTimeEntries.has(e.id)} onCheckedChange={() => toggleTe(e.id)} onClick={ev => ev.stopPropagation()} />
                          <span className="text-xs text-jl-secondary w-16 shrink-0">{e.user?.fullName?.split(' ')[0] || ''}</span>
                          <span className="text-xs flex-1 truncate">{e.description}</span>
                          <span className="text-xs text-jl-muted shrink-0">{fmtDuration(e.duration)}</span>
                          <span className="text-xs font-medium shrink-0 w-24 text-right">{fmtMoney(e.totalAmount || 0)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div></CardContent></Card>
              })}
            </div>}
            {selectedTimeEntries.size > 0 && <div className="border-t pt-3 flex items-center justify-between"><div className="text-sm"><span className="text-jl-secondary">{selectedTimeEntries.size} entrées sélectionnées</span> — <span className="font-medium">{fmtDuration(selectedTeSeconds)}</span> — <span className="font-bold">{fmtMoney(selectedTeTotal)}</span></div><Button onClick={() => createFromTeMut.mutate()} disabled={createFromTeMut.isPending || selectedTimeEntries.size === 0}>{createFromTeMut.isPending ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}{t('invoices.createInvoice')}</Button></div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG — Executive Document Style */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {/* === FIRM HEADER === */}
          <div className="border-b border-jl px-6 py-4">
            <div className="flex items-start gap-4">
              {tenant?.logoUrl ? (
                <img src={tenant.logoUrl} alt={tenant.name || 'Cabinet'} className="size-16 rounded-lg object-contain border border-jl shrink-0" />
              ) : (
                <div className="size-16 rounded-lg bg-jl-blue flex items-center justify-center shrink-0">
                  <Scale className="size-8 text-white" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-jl-primary">{tenant?.name || 'Cabinet'}</h3>
                {tenant?.address && <p className="text-xs text-jl-secondary mt-0.5">{tenant.address}{tenant.city ? `, ${tenant.city}` : ''}{tenant.country ? ` — ${tenant.country}` : ''}</p>}
                <p className="text-xs text-jl-muted mt-0.5">{[tenant?.phone, tenant?.email].filter(Boolean).join('  |  ')}</p>
                {tenant?.niu && <p className="text-xs text-jl-muted">NIU : {tenant.niu}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-jl-blue">{invoiceTypeLabel(invoiceDetail?.type)}</p>
                <p className="text-sm font-mono font-semibold text-jl-primary mt-1">{invoiceDetail?.invoiceNumber || '—'}</p>
                <div className="flex items-center gap-2 justify-end mt-2">
                  <Badge className={cn('text-[10px]', INVOICE_TYPE_COLORS[invoiceDetail?.type || ''] || 'bg-jl-page text-white')}>{invoiceTypeLabel(invoiceDetail?.type)}</Badge>
                  <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[invoiceDetail?.status || ''])}>{statusLabel(invoiceDetail?.status)}</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* === CLIENT & INVOICE INFO === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-jl rounded-lg p-3 space-y-1">
                <p className="text-[10px] font-semibold text-jl-muted uppercase tracking-wider">{t('invoices.client')}</p>
                <p className="text-sm font-semibold text-jl-primary">{invoiceDetail?.client?.fullName || '—'}</p>
                {invoiceDetail?.client?.company && <p className="text-xs text-jl-secondary">{invoiceDetail.client.company}</p>}
                {invoiceDetail?.client?.address && <p className="text-xs text-jl-muted">{invoiceDetail.client.address}</p>}
                <p className="text-xs text-jl-muted">{[invoiceDetail?.client?.email, invoiceDetail?.client?.phone].filter(Boolean).join(' | ')}</p>
              </div>
              <div className="border border-jl rounded-lg p-3 space-y-1">
                <p className="text-[10px] font-semibold text-jl-muted uppercase tracking-wider">{t('common.details')}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-jl-muted">t('invoices.issuedAt') :</span><span className="font-medium text-right">{fmtDate(invoiceDetail?.issuedAt)}</span>
                  <span className="text-jl-muted">{t('invoices.dueDate')} :</span><span className="font-medium text-right">{fmtDate(invoiceDetail?.dueDate)}</span>
                  {invoiceDetail?.case && <><span className="text-jl-muted">{t('invoices.case')} :</span><span className="font-medium text-right">{invoiceDetail.case.reference}</span></>}
                  <span className="text-jl-muted">{t('invoices.currency')} :</span><span className="font-medium text-right">{curCode === 'XAF' ? 'FCFA' : curCode}</span>
                </div>
              </div>
            </div>

            {/* === LINE ITEMS TABLE === */}
            {(invoiceDetail?.lineItems || []).length > 0 && (
              <div className="border border-jl rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-jl-blue hover:bg-jl-blue">
                      <TableHead className="text-[11px] text-white font-semibold">{t('invoices.description')}</TableHead>
                      <TableHead className="text-[11px] text-white font-semibold text-right w-16">Qté</TableHead>
                      <TableHead className="text-[11px] text-white font-semibold text-right w-28">Prix unitaire</TableHead>
                      <TableHead className="text-[11px] text-white font-semibold text-right w-28">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoiceDetail?.lineItems || []).map((li: InvoiceLineItem, idx: number) => (
                      <TableRow key={li.id} className={cn(idx % 2 === 1 && 'bg-jl-page')}>
                        <TableCell className="text-sm py-2.5">{li.description}</TableCell>
                        <TableCell className="text-sm text-right py-2.5">{li.quantity}</TableCell>
                        <TableCell className="text-sm text-right py-2.5 font-mono">{fmtMoney(li.unitPrice, curCode)}</TableCell>
                        <TableCell className="text-sm text-right py-2.5 font-mono font-semibold">{fmtMoney(li.total, curCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* TOTALS FOOTER */}
                <div className="border-t border-jl bg-jl-page px-4 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className="text-sm text-jl-secondary">{t('invoices.subtotal')}</span><span className="text-sm font-medium font-mono">{fmtMoney(total, curCode)}</span></div>
                    {(invoiceDetail?.taxRate || 0) > 0 && <div className="flex items-center justify-between"><span className="text-xs text-jl-muted">{t('invoices.tax')} ({invoiceDetail.taxRate}%)</span><span className="text-xs font-mono">{fmtMoney(total * ((invoiceDetail.taxRate || 0) / 100), curCode)}</span></div>}
                    {(invoiceDetail?.discountAmount || 0) > 0 && <div className="flex items-center justify-between"><span className="text-xs text-jl-muted">{t('invoices.discount')}</span><span className="text-xs font-mono text-[var(--danger)]">-{fmtMoney(invoiceDetail.discountAmount || 0, curCode)}</span></div>}
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-jl-secondary">{t('invoices.totalAmount')}</span>
                      <span className="text-xl font-bold text-jl-primary font-mono">{fmtMoney(total, curCode)}</span>
                    </div>
                    {paid > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-jl-muted">{t('invoices.paidRemaining')}</span>
                        <span className="text-xs font-medium"><span className="text-[var(--success)]">{fmtMoney(paid, curCode)}</span> / <span className={remaining > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>{fmtMoney(remaining, curCode)}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* === PAYMENT PROGRESS === */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-jl-secondary">{t('invoices.amountPaid')} : {fmtMoney(paid, curCode)}</span>
                <span className="font-semibold">{Math.round(payPercent)}%</span>
              </div>
              <Progress value={payPercent} className="h-2" />
            </div>

            {/* === STATUS CHANGE === */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-jl-secondary">{t('invoices.changeStatus')} :</span>
              <Select value={invoiceDetail?.status || ''} onValueChange={v => { if (selectedInvoice) updateStatusMut.mutate({ id: selectedInvoice.id, status: v }) }}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="non_paye">{invoiceStatusLabel('non_paye')}</SelectItem><SelectItem value="partiel">{invoiceStatusLabel('partiel')}</SelectItem><SelectItem value="paye">{invoiceStatusLabel('paye')}</SelectItem><SelectItem value="annule">{invoiceStatusLabel('annule')}</SelectItem></SelectContent>
              </Select>
            </div>
            <Separator />

            {/* === PAYMENTS SECTION === */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t('invoices.payments')} ({(invoiceDetail?.payments || []).length})</p>
                <div className="flex gap-2">
                  {(invoiceDetail?.status === 'non_paye' || invoiceDetail?.status === 'partiel') && <Button size="sm" variant="outline" className="text-xs" onClick={() => { setPayForm({ amount: remaining.toString(), method: 'virement', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' }); setShowPayForm(!showPayForm) }}><CreditCard className="size-3.5 mr-1" />{t('invoices.recordPayment')}</Button>}
                  <Button size="sm" variant="outline" className="text-xs" onClick={handlePrint}><Printer className="size-3.5 mr-1" />{t('invoices.generatePdf')}</Button>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="text-xs"><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => selectedInvoice && duplicateMut.mutate(selectedInvoice.id)}><Copy className="size-3.5 mr-2" />{t('invoices.duplicate')}</DropdownMenuItem>
                    {invoiceDetail?.type === 'devis' && invoiceDetail.status !== 'annule' && <DropdownMenuItem onClick={() => selectedInvoice && convertMut.mutate(selectedInvoice.id)}><FileCheck className="size-3.5 mr-2" />{t('invoices.convertToInvoice')}</DropdownMenuItem>}
                  </DropdownMenuContent></DropdownMenu>
                </div>
              </div>
              {showPayForm && (
                <div className="border rounded-lg p-4 bg-jl-page space-y-3">
                  <p className="text-xs font-semibold">{t('invoices.recordPayment')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Montant *</Label><Input type="number" min={0} step={0.01} value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
                    <div><Label>Méthode *</Label><Select value={payForm.method} onValueChange={v => setPayForm(f => ({ ...f, method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="especes">{paymentMethodLabel('especes')}</SelectItem><SelectItem value="virement">{paymentMethodLabel('virement')}</SelectItem><SelectItem value="mobile_money">{paymentMethodLabel('mobile_money')}</SelectItem><SelectItem value="carte">{paymentMethodLabel('carte')}</SelectItem><SelectItem value="cheque">{paymentMethodLabel('cheque')}</SelectItem></SelectContent></Select></div>
                    <div><Label>Référence</Label><Input value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder={t('invoices.refTransaction')} /></div>
                    <div><Label>Date</Label><Input type="date" value={payForm.paidAt} onChange={e => setPayForm(f => ({ ...f, paidAt: e.target.value }))} /></div>
                  </div>
                  <div><Label>{t('invoices.notes')}</Label><Input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('invoices.notesPlaceholder')} /></div>
                  <div className="flex gap-2"><Button size="sm" className="bg-[var(--success)] hover:bg-[var(--success)] text-white" onClick={handlePay} disabled={!payForm.amount || parseFloat(payForm.amount) <= 0 || payMut.isPending}>{payMut.isPending ? <RefreshCw className="size-3.5 mr-1 animate-spin" /> : <Banknote className="size-3.5 mr-1" />}{t('common.save')}</Button><Button size="sm" variant="outline" onClick={() => setShowPayForm(false)}>{t('common.cancel')}</Button></div>
                </div>
              )}
              {(invoiceDetail?.payments || []).length === 0 ? <p className="text-sm text-jl-muted text-center py-4">{t('invoices.noPayments')}</p> : (
                <div className="space-y-2">
                  {(invoiceDetail?.payments || []).map((p: Payment) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl">
                      <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', PAYMENT_METHOD_COLORS[p.method] || 'bg-jl-page')}><span className="text-white text-xs font-bold">{(paymentMethodLabel(p.method) || '?')[0]}</span></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium font-mono">{fmtMoney(p.amount, curCode)}</p>
                        <p className="text-[10px] text-jl-muted">{paymentMethodLabel(p.method)}{p.reference ? ` • ${p.reference}` : ''} • {p.recorder?.fullName || '—'}</p>
                      </div>
                      <span className="text-xs text-jl-muted shrink-0">{fmtDate(p.paidAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {invoiceDetail?.terms && <><Separator /><div><p className="text-xs font-semibold text-jl-secondary mb-1">{t('invoices.paymentTerms')}</p><p className="text-sm text-jl-secondary whitespace-pre-wrap">{invoiceDetail.terms}</p></div></>}
            {invoiceDetail?.notes && <><Separator /><div><p className="text-xs font-semibold text-jl-secondary mb-1">Notes</p><p className="text-sm text-jl-secondary whitespace-pre-wrap">{invoiceDetail.notes}</p></div></>}
          </div>

          {/* === FIRM FOOTER === */}
          <div className="border-t border-jl px-6 py-3 bg-jl-page">
            <p className="text-[10px] text-jl-muted text-center">{tenant?.name || 'Cabinet'}{tenant?.address ? ` — ${tenant.address}` : ''}{tenant?.phone ? ` — ${tenant.phone}` : ''}{tenant?.email ? ` — ${tenant.email}` : ''}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

