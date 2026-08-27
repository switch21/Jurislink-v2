'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== INVOICES VIEW ====================
export function InvoicesView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', method: 'virement', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' })
  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [createForm, setCreateForm] = useState({ type: 'facture', clientId: '', caseId: '', currencyId: '', dueDate: '', billingType: 'forfait', notes: '' })

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', user?.tenantId, typeFilter, statusFilter],
    queryFn: () => { const p = new URLSearchParams(); if (user?.tenantId) p.set('tenantId', user.tenantId); if (typeFilter !== 'all') p.set('type', typeFilter); if (statusFilter !== 'all') p.set('status', statusFilter); return fetch(`/api/invoices?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []) },
  })

  const { data: invoiceDetail } = useQuery({
    queryKey: ['invoice-detail', selectedInvoice?.id],
    queryFn: () => fetch(`/api/invoices/${selectedInvoice!.id}?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!selectedInvoice?.id && detailOpen,
  })

  const { data: clients } = useQuery({ queryKey: ['clients-invoice', user?.tenantId], queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []) })
  const { data: cases } = useQuery({ queryKey: ['cases-invoice', user?.tenantId], queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []) })
  const { data: currencies } = useQuery({ queryKey: ['currencies-invoice'], queryFn: () => fetch('/api/currencies').then(r => r.json()).then(d => Array.isArray(d) ? d : []) })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Facture créée'); setCreateOpen(false); resetCreateForm() },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => fetch(`/api/invoices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-detail'] }); toast.success('Statut mis à jour') },
    onError: () => toast.error('Erreur'),
  })

  const payMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId, recordedBy: user?.id }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-detail'] }); toast.success('Paiement enregistré'); setShowPayForm(false); setPayForm({ amount: '', method: 'virement', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' }) },
    onError: () => toast.error('Erreur de paiement'),
  })

  const resetCreateForm = () => { setCreateForm({ type: 'facture', clientId: '', caseId: '', currencyId: '', dueDate: '', billingType: 'forfait', notes: '' }); setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]) }
  const subtotal = lineItems.reduce((s, li) => s + (li.quantity * li.unitPrice), 0)
  const addLine = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])
  const removeLine = (i: number) => { if (lineItems.length <= 1) return; setLineItems(lineItems.filter((_, idx) => idx !== i)) }
  const updateLine = (i: number, field: string, value: string | number) => setLineItems(lineItems.map((li, idx) => idx === i ? { ...li, [field]: value } : li))

  const handleCreate = () => {
    if (!createForm.clientId || lineItems.every(li => !li.description.trim())) return
    createMut.mutate({
      ...createForm, caseId: createForm.caseId || null, currencyId: createForm.currencyId || null,
      lineItems: lineItems.filter(li => li.description.trim()).map((li, i) => ({ description: li.description, quantity: li.quantity, unitPrice: li.unitPrice, total: li.quantity * li.unitPrice, sortOrder: i })),
    })
  }

  const handlePay = () => {
    if (!selectedInvoice || !payForm.amount) return
    payMut.mutate({ invoiceId: selectedInvoice.id, amount: parseFloat(payForm.amount), method: payForm.method, reference: payForm.reference || null, paidAt: payForm.paidAt || null, notes: payForm.notes || null })
  }

  const handlePrint = async () => {
    if (!selectedInvoice) return
    try { const res = await fetch(`/api/invoices/${selectedInvoice.id}/pdf`); if (!res.ok) throw new Error(); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${selectedInvoice.invoiceNumber || 'facture'}.pdf`; a.click(); URL.revokeObjectURL(url) } catch { toast.error('Erreur lors de la génération du PDF') }
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
        <h2 className="text-lg font-semibold">Factures</h2>
        <Button onClick={() => { resetCreateForm(); setCreateOpen(true) }} size="sm" className="bg-[#1E5A8A] hover:bg-[#164070]"><Plus className="size-4 mr-1" />Nouvelle facture</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="devis">Devis</SelectItem><SelectItem value="facture">Facture</SelectItem><SelectItem value="avoir">Avoir</SelectItem><SelectItem value="recu">Reçu</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="non_paye">Non payé</SelectItem><SelectItem value="partiel">Partiel</SelectItem><SelectItem value="paye">Payé</SelectItem><SelectItem value="annule">Annulé</SelectItem></SelectContent></Select>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (invoices || []).length === 0 ? <EmptyState icon={Receipt} title="Aucune facture" description="Créez votre première facture" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Numéro</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="hidden md:table-cell text-right">Payé</TableHead><TableHead>Statut</TableHead><TableHead className="hidden lg:table-cell">Échéance</TableHead><TableHead className="w-16"></TableHead>
          </TableRow></TableHeader><TableBody>
            {(invoices || []).map((inv: Invoice, i: number) => {
              const invPaid = inv.paidAmount || 0
              const invTotal = inv.amount || 0
              const invPercent = invTotal > 0 ? Math.min(100, (invPaid / invTotal) * 100) : 0
              return (
                <TableRow key={inv.id} className={cn(i % 2 === 1 && 'bg-[#F9FAFB]', 'cursor-pointer')} onClick={() => openDetail(inv)}>
                  <TableCell className="font-medium text-sm">{inv.invoiceNumber || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge className={cn('text-[10px]', INVOICE_TYPE_COLORS[inv.type] || 'bg-[#6B7280] text-white')}>{INVOICE_TYPE_LABELS[inv.type] || inv.type}</Badge></TableCell>
                  <TableCell className="text-sm text-[#6B7280]">{inv.client?.fullName || '—'}</TableCell>
                  <TableCell className="text-sm font-medium text-right">{fmtMoney(invTotal, inv.currency?.code || 'XAF')}</TableCell>
                  <TableCell className="hidden md:table-cell"><div className="text-right"><p className="text-xs font-medium">{fmtMoney(invPaid, inv.currency?.code || 'XAF')}</p>{inv.status === 'partiel' && <div className="w-16 h-1.5 bg-[#F3F4F6] rounded-full mt-1 ml-auto"><div className="h-full rounded-full bg-[#C8A45D]" style={{ width: invPercent + '%' }} /></div>}</div></TableCell>
                  <TableCell><Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[inv.status])}>{STATUS_LABELS[inv.status] || inv.status}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-[#6B7280]">{fmtDate(inv.dueDate)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="size-7" onClick={e => { e.stopPropagation(); openDetail(inv) }}><Eye className="size-3.5" /></Button></TableCell>
                </TableRow>
              )
            })}
          </TableBody></Table>
        </div></CardContent></Card>}

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) resetCreateForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle facture</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type *</Label><Select value={createForm.type} onValueChange={v => setCreateForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="devis">Devis</SelectItem><SelectItem value="facture">Facture</SelectItem><SelectItem value="avoir">Avoir</SelectItem><SelectItem value="recu">Reçu</SelectItem></SelectContent></Select></div>
              <div><Label>Client *</Label><Select value={createForm.clientId} onValueChange={v => setCreateForm(f => ({ ...f, clientId: v }))}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{(clients || []).map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.fullName}{c.company ? ` (${c.company})` : ''}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Dossier</Label><Select value={createForm.caseId} onValueChange={v => setCreateForm(f => ({ ...f, caseId: v }))}><SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger><SelectContent><SelectItem value="">Aucun</SelectItem>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Devise</Label><Select value={createForm.currencyId} onValueChange={v => setCreateForm(f => ({ ...f, currencyId: v }))}><SelectTrigger><SelectValue placeholder="XAF" /></SelectTrigger><SelectContent>{(currencies || []).map((c: CurrencyItem) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.symbol}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Échéance</Label><Input type="date" value={createForm.dueDate} onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
            <div><Label>Type de facturation</Label><Select value={createForm.billingType} onValueChange={v => setCreateForm(f => ({ ...f, billingType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="forfait">Forfait</SelectItem><SelectItem value="horaire">Horaire</SelectItem><SelectItem value="abonnement">Abonnement</SelectItem><SelectItem value="success_fee">Success fee</SelectItem><SelectItem value="provision">Provision</SelectItem></SelectContent></Select></div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-sm font-semibold">Lignes de facturation</Label><Button type="button" size="sm" variant="outline" className="text-xs h-7" onClick={addLine}><Plus className="size-3 mr-1" />Ajouter une ligne</Button></div>
              <div className="space-y-2">
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5"><Label className="text-[10px]">Description</Label><Input value={li.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" className="h-9 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">Qté</Label><Input type="number" min={1} value={li.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 1)} className="h-9 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">Prix unit.</Label><Input type="number" min={0} value={li.unitPrice} onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-9 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">Total</Label><div className="h-9 flex items-center text-xs font-medium px-2 border rounded-md bg-[#F9FAFB]">{fmtMoney(li.quantity * li.unitPrice)}</div></div>
                    <div className="col-span-1 flex justify-end"><Button type="button" variant="ghost" size="icon" className="size-9 text-[#EF4444] hover:text-[#DC2626]" onClick={() => removeLine(i)} disabled={lineItems.length <= 1}><Trash2 className="size-3.5" /></Button></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end p-3 bg-[#F9FAFB] rounded-lg"><span className="text-sm text-[#6B7280]">Sous-total :</span><span className="text-sm font-bold ml-2">{fmtMoney(subtotal)}</span></div>
            </div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button><Button onClick={handleCreate} disabled={!createForm.clientId || createMut.isPending || lineItems.every(li => !li.description.trim())}>{createMut.isPending ? <RefreshCw className="size-4 mr-1 animate-spin" /> : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle className="text-base">{invoiceDetail?.invoiceNumber || '—'}</DialogTitle>
              <Badge className={cn('text-[10px]', INVOICE_TYPE_COLORS[invoiceDetail?.type || ''] || 'bg-[#6B7280] text-white')}>{INVOICE_TYPE_LABELS[invoiceDetail?.type || ''] || invoiceDetail?.type}</Badge>
              <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[invoiceDetail?.status || ''])}>{STATUS_LABELS[invoiceDetail?.status || ''] || invoiceDetail?.status}</Badge>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-[#6B7280]">Client :</span> <span className="font-medium">{invoiceDetail?.client?.fullName || '—'}</span></div>
            {invoiceDetail?.client?.company && <div><span className="text-[#6B7280]">Société :</span> <span className="font-medium">{invoiceDetail.client.company}</span></div>}
            {invoiceDetail?.case && <div className="col-span-2"><span className="text-[#6B7280]">Dossier :</span> <span className="font-medium">{invoiceDetail.case.reference} — {invoiceDetail.case.title}</span></div>}
          </div>
          <Separator />
          {(invoiceDetail?.lineItems || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Lignes de facturation</p>
              <Table><TableHeader><TableRow><TableHead className="text-xs">Description</TableHead><TableHead className="text-xs text-right">Qté</TableHead><TableHead className="text-xs text-right">Prix unit.</TableHead><TableHead className="text-xs text-right">Total</TableHead></TableRow></TableHeader><TableBody>
                {(invoiceDetail?.lineItems || []).map((li: InvoiceLineItem) => (
                  <TableRow key={li.id}><TableCell className="text-sm">{li.description}</TableCell><TableCell className="text-sm text-right">{li.quantity}</TableCell><TableCell className="text-sm text-right">{fmtMoney(li.unitPrice, curCode)}</TableCell><TableCell className="text-sm text-right font-medium">{fmtMoney(li.total, curCode)}</TableCell></TableRow>
                ))}
              </TableBody></Table>
            </div>
          )}
          <div className="flex justify-end p-4 bg-[#F9FAFB] rounded-lg">
            <div className="text-right"><p className="text-xs text-[#6B7280]">Montant total</p><p className="text-xl font-bold text-[#111827]">{fmtMoney(total, curCode)}</p></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-[#6B7280]">Payé : {fmtMoney(paid, curCode)} / {fmtMoney(total, curCode)}</span><span className="font-semibold">{Math.round(payPercent)}%</span></div>
            <Progress value={payPercent} className="h-2" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280]">Changer le statut :</span>
            <Select value={invoiceDetail?.status || ''} onValueChange={v => { if (selectedInvoice) updateStatusMut.mutate({ id: selectedInvoice.id, status: v }) }}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="non_paye">Non payé</SelectItem><SelectItem value="partiel">Partiel</SelectItem><SelectItem value="paye">Payé</SelectItem><SelectItem value="annule">Annulé</SelectItem></SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Paiements ({(invoiceDetail?.payments || []).length})</p>
              <div className="flex gap-2">
                {(invoiceDetail?.status === 'non_paye' || invoiceDetail?.status === 'partiel') && <Button size="sm" variant="outline" className="text-xs" onClick={() => { setPayForm({ amount: remaining.toString(), method: 'virement', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' }); setShowPayForm(!showPayForm) }}><CreditCard className="size-3.5 mr-1" />Enregistrer un paiement</Button>}
                <Button size="sm" variant="outline" className="text-xs" onClick={handlePrint}><Printer className="size-3.5 mr-1" />Imprimer</Button>
              </div>
            </div>
            {showPayForm && (
              <div className="border rounded-lg p-4 bg-[#F9FAFB] space-y-3">
                <p className="text-xs font-semibold">Enregistrer un paiement</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Montant *</Label><Input type="number" min={0} step={0.01} value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
                  <div><Label>Méthode *</Label><Select value={payForm.method} onValueChange={v => setPayForm(f => ({ ...f, method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="especes">Espèces</SelectItem><SelectItem value="virement">Virement</SelectItem><SelectItem value="mobile_money">Mobile Money</SelectItem><SelectItem value="carte">Carte</SelectItem><SelectItem value="cheque">Chèque</SelectItem></SelectContent></Select></div>
                  <div><Label>Référence</Label><Input value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="Ref. transaction" /></div>
                  <div><Label>Date</Label><Input type="date" value={payForm.paidAt} onChange={e => setPayForm(f => ({ ...f, paidAt: e.target.value }))} /></div>
                </div>
                <div><Label>Notes</Label><Input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes optionnelles" /></div>
                <div className="flex gap-2"><Button size="sm" className="bg-[#059669] hover:bg-[#047857] text-white" onClick={handlePay} disabled={!payForm.amount || parseFloat(payForm.amount) <= 0 || payMut.isPending}>{payMut.isPending ? <RefreshCw className="size-3.5 mr-1 animate-spin" /> : <Banknote className="size-3.5 mr-1" />}Enregistrer</Button><Button size="sm" variant="outline" onClick={() => setShowPayForm(false)}>Annuler</Button></div>
              </div>
            )}
            {(invoiceDetail?.payments || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-4">Aucun paiement enregistré</p> : (
              <div className="space-y-2">
                {(invoiceDetail?.payments || []).map((p: Payment) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB]">
                    <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', PAYMENT_METHOD_COLORS[p.method] || 'bg-[#6B7280]')}><span className="text-white text-xs font-bold">{(PAYMENT_METHOD_LABELS[p.method] || '?')[0]}</span></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{fmtMoney(p.amount, curCode)}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{PAYMENT_METHOD_LABELS[p.method] || p.method}{p.reference ? ` • ${p.reference}` : ''} • {p.recorder?.fullName || '—'}</p>
                    </div>
                    <span className="text-xs text-[#9CA3AF] shrink-0">{fmtDate(p.paidAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {invoiceDetail?.notes && <><Separator /><div><p className="text-xs font-semibold text-[#6B7280] mb-1">Notes</p><p className="text-sm text-[#374151] whitespace-pre-wrap">{invoiceDetail.notes}</p></div></>}
        </DialogContent>
      </Dialog>
    </div>
  )
}

