'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== CLIENTS VIEW ====================
export function ClientsView() {
  const { user, setCurrentView } = useAppStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [form, setForm] = useState({ fullName: '', company: '', email: '', phone: '', address: '', city: '', country: 'Cameroun', notes: '', clientType: 'particulier', niu: '', riskLevel: 'faible', source: '', isActive: true })

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', user?.tenantId, search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (search) p.set('search', search)
      return fetch(`/api/clients?${p}`).then(r => r.json())
    },
  })

  const { data: clientDetail } = useQuery({
    queryKey: ['client-detail', selectedClient?.id],
    queryFn: () => fetch(`/api/clients/${selectedClient!.id}?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!selectedClient?.id && detailOpen,
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client créé'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => fetch(`/api/clients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client mis à jour'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/clients/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client supprimé') },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const resetForm = () => { setForm({ fullName: '', company: '', email: '', phone: '', address: '', city: '', country: 'Cameroun', notes: '', clientType: 'particulier', niu: '', riskLevel: 'faible', source: '', isActive: true }); setEditing(null) }
  const openEdit = (c: Client) => { setEditing(c); setForm({ fullName: c.fullName, company: c.company || '', email: c.email || '', phone: c.phone || '', address: c.address || '', city: c.city || '', country: c.country || 'Cameroun', notes: c.notes || '', clientType: c.clientType || 'particulier', niu: c.niu || '', riskLevel: c.riskLevel || 'faible', source: c.source || '', isActive: c.isActive }); setDialogOpen(true) }
  const handleSubmit = () => {
    if (!form.fullName.trim()) return
    const payload = { ...form, company: form.company || null, email: form.email || null, phone: form.phone || null, address: form.address || null, city: form.city || null, niu: form.niu || null, notes: form.notes || null, source: form.source || null }
    if (editing) { updateMut.mutate({ id: editing.id, ...payload }) } else { createMut.mutate(payload) }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Clients</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm"><Plus className="size-4 mr-1" />Nouveau client</Button>
      </div>

      <div className="relative max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-jl-muted" /><Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" /></div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (clients || []).length === 0 ? <EmptyState icon={Users} title="Aucun client" description="Ajoutez votre premier client" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Nom</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden lg:table-cell">Ville</TableHead>
            <TableHead className="hidden md:table-cell">Risque</TableHead>
            <TableHead className="hidden sm:table-cell">Dossiers</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {(clients || []).map((c: Client, i: number) => (
              <TableRow key={c.id} className={cn(i % 2 === 1 && 'bg-jl-page', 'cursor-pointer')} onClick={() => { setSelectedClient(c); setDetailOpen(true) }}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7"><AvatarFallback className="text-[10px] bg-jl-page">{initials(c.fullName)}</AvatarFallback></Avatar>
                    <div><p className="text-sm font-medium">{c.fullName}</p>{c.company && <p className="text-[10px] text-jl-muted">{c.company}</p>}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{c.clientType === 'entreprise' ? 'Entreprise' : 'Particulier'}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-jl-secondary">{c.city || '—'}</TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline" className={cn('text-[10px]', RISK_COLORS[c.riskLevel || 'faible'])}>{c.riskLevel === 'eleve' ? 'Élevé' : c.riskLevel === 'moyen' ? 'Moyen' : 'Faible'}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-jl-secondary">{c._count?.cases || 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(c)}><Edit className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="size-7 text-[var(--danger)] hover:text-[var(--danger)]" onClick={() => deleteMut.mutate(c.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div></CardContent></Card>}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier le client' : 'Nouveau client'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom complet *</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></div>
            <div><Label>Société</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div><Label>Adresse</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>Pays</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.clientType} onValueChange={v => setForm(f => ({ ...f, clientType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="particulier">Particulier</SelectItem><SelectItem value="entreprise">Entreprise</SelectItem></SelectContent></Select></div>
              <div><Label>NIU</Label><Input value={form.niu} onChange={e => setForm(f => ({ ...f, niu: e.target.value }))} placeholder="Numéro d'Identification Unique" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Niveau de risque</Label><Select value={form.riskLevel} onValueChange={v => setForm(f => ({ ...f, riskLevel: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="faible">Faible</SelectItem><SelectItem value="moyen">Moyen</SelectItem><SelectItem value="eleve">Élevé</SelectItem></SelectContent></Select></div>
              <div><Label>Source</Label><Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="bouche_a_oreille">Bouche à oreille</SelectItem><SelectItem value="internet">Internet</SelectItem><SelectItem value="recommandation">Recommandation</SelectItem><SelectItem value="autre">Autre</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSubmit} disabled={!form.fullName.trim() || createMut.isPending || updateMut.isPending}>{editing ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="size-10"><AvatarFallback className="bg-jl-blue text-white text-sm">{initials(selectedClient?.fullName || '')}</AvatarFallback></Avatar>
              <div><div>{selectedClient?.fullName}{selectedClient?.company && <span className="text-jl-secondary font-normal"> — {selectedClient.company}</span>}</div>
              <div className="flex items-center gap-2 mt-1"><Badge variant="outline" className="text-[10px]">{selectedClient?.clientType === 'entreprise' ? 'Entreprise' : 'Particulier'}</Badge><Badge variant="outline" className={cn('text-[10px]', RISK_COLORS[selectedClient?.riskLevel || 'faible'])}>{selectedClient?.riskLevel === 'eleve' ? 'Élevé' : selectedClient?.riskLevel === 'moyen' ? 'Moyen' : 'Faible'}</Badge></div></div>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-xs text-jl-secondary px-1 py-2">
            {selectedClient?.email && <div className="flex items-center gap-1.5"><Mail className="size-3" />{selectedClient.email}</div>}
            {selectedClient?.phone && <div className="flex items-center gap-1.5"><Phone className="size-3" />{selectedClient.phone}</div>}
            {selectedClient?.address && <div className="flex items-center gap-1.5"><MapPin className="size-3" />{selectedClient.address}</div>}
            {selectedClient?.city && <div className="flex items-center gap-1.5"><MapPin className="size-3" />{selectedClient.city}{selectedClient?.country ? `, ${selectedClient.country}` : ''}</div>}
            {selectedClient?.niu && <div className="flex items-center gap-1.5"><Building2 className="size-3" />NIU: {selectedClient.niu}</div>}
          </div>
          <Tabs defaultValue="dossiers" className="flex-1 overflow-hidden">
            <TabsList className="w-full"><TabsTrigger value="dossiers">Dossiers ({(clientDetail?.cases || []).length})</TabsTrigger><TabsTrigger value="factures">Factures ({(clientDetail?.invoices || []).length})</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>
            <TabsContent value="dossiers" className="mt-3 overflow-y-auto max-h-[45vh]">
              {(clientDetail?.cases || []).length === 0 ? <p className="text-sm text-jl-muted text-center py-8">Aucun dossier</p> :
              <div className="space-y-2">{(clientDetail?.cases || []).map((c: CaseItem) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl hover:bg-jl-page cursor-pointer" onClick={() => { setDetailOpen(false); setCurrentView('cases') }}>
                  <Briefcase className="size-4 text-jl-gold shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{c.reference} — {c.title}</p><p className="text-[10px] text-jl-muted">{TYPE_LABELS[c.caseType] || c.caseType} • Créé le {fmtDate(c.createdAt)}</p></div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status] || c.status}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="factures" className="mt-3 overflow-y-auto max-h-[45vh]">
              {(clientDetail?.invoices || []).length === 0 ? <p className="text-sm text-jl-muted text-center py-8">Aucune facture</p> :
              <div className="space-y-2">{(clientDetail?.invoices || []).map((inv: Invoice) => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl hover:bg-jl-page cursor-pointer" onClick={() => { setDetailOpen(false); setCurrentView('invoices') }}>
                  <Receipt className="size-4 text-jl-gold shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{inv.id.slice(0,8)}{inv.case?.reference ? ` — ${inv.case.reference}` : ''}</p><p className="text-[10px] text-jl-muted">{fmtDate(inv.createdAt)}</p></div>
                  <span className="text-sm font-semibold shrink-0">{fmtMoney(inv.amount, inv.currency?.code || 'XAF')}</span>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[inv.status])}>{STATUS_LABELS[inv.status] || inv.status}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="notes" className="mt-3 overflow-y-auto max-h-[45vh]">
              <div className="p-4 border rounded-lg bg-jl-page">
                <p className="text-sm text-jl-secondary whitespace-pre-wrap">{selectedClient?.notes || clientDetail?.notes || 'Aucune note'}</p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

