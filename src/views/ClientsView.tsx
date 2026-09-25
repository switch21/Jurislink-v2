'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, ShieldX, KeyRound, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState, t   , statusLabel, priorityLabel, typeLabel, eventTypeLabel, roleLabel, billingLabel, invoiceTypeLabel, invoiceStatusLabel, paymentMethodLabel, commTypeLabel, commStatusLabel, riskLabel, outcomeLabel, payStatusLabel, timelineTypeLabel, ROLE_OPTIONS } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, RISK_COLORS } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import { useFormDraft, registerDirtyForm, unregisterDirtyForm } from '@/hooks/useFormDraft'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'

interface PortalAccount {
  id: string
  email: string
  isActive: boolean
  clientId: string
  tenantId: string
  createdAt: string
  client?: { id: string; fullName: string; company?: string; email?: string }
  generatedPassword?: string
}

// ==================== CLIENTS VIEW ====================
export function ClientsView() {
  const { user, setCurrentView, setHasUnsavedChanges } = useAppStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [form, setForm] = useState({ fullName: '', company: '', email: '', phone: '', address: '', city: '', country: 'Cameroun', notes: '', clientType: 'particulier', niu: '', riskLevel: 'faible', source: '', isActive: true })
  const { restoredDraft: clientRestoredDraft, isDirty: clientIsDirty, clearDraft: clearClientDraft, getDraft: getClientDraft } = useFormDraft('client-form', form as unknown as Record<string, unknown>, { enabled: dialogOpen })
  const clientHasDraft = clientIsDirty

  // Portal state
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [resetPwOpen, setResetPwOpen] = useState(false)
  const [resetPwResult, setResetPwResult] = useState<string>('')
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateClientId, setDeactivateClientId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Sync dirty state with global store
  useEffect(() => { registerDirtyForm('client-form', clientIsDirty); setHasUnsavedChanges(clientIsDirty); return () => { unregisterDirtyForm('client-form') } }, [clientIsDirty])

  // Restore draft on mount
  useEffect(() => { if (clientRestoredDraft) { const draft = getClientDraft(); if (draft && draft.fullName) setForm(draft as typeof form) } }, [clientRestoredDraft])

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', user?.tenantId, search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (search) p.set('search', search)
      return fetch(`/api/clients?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
  })

  const { data: clientDetail } = useQuery({
    queryKey: ['client-detail', selectedClient?.id],
    queryFn: () => fetch(`/api/clients/${selectedClient!.id}?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!selectedClient?.id && detailOpen,
  })

  // Fetch portal accounts
  const { data: portalAccounts } = useQuery({
    queryKey: ['client-portals', user?.tenantId],
    queryFn: () => fetch(`/api/clients/portal?tenantId=${user?.tenantId}`).then(r => r.json()) as Promise<PortalAccount[]>,
    enabled: !!user?.tenantId,
  })

  // Map clientId -> portal account for quick lookup
  const portalMap = useMemo(() => {
    const map = new Map<string, PortalAccount>()
    if (portalAccounts && Array.isArray(portalAccounts)) {
      for (const p of portalAccounts) {
        map.set(p.clientId, p)
      }
    }
    return map
  }, [portalAccounts])

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success(t('clients.created')); setDialogOpen(false); resetForm(); clearClientDraft() },
    onError: () => toast.error(t('clients.errorCreate')),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => fetch(`/api/clients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success(t('clients.updated')); setDialogOpen(false); resetForm(); clearClientDraft() },
    onError: () => toast.error(t('clients.errorUpdate')),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/clients/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success(t('clients.deleted')) },
    onError: () => toast.error(t('clients.errorDelete')),
  })

  // Activate portal mutation
  const activatePortalMut = useMutation({
    mutationFn: ({ clientId }: { clientId: string }) =>
      fetch('/api/clients/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, tenantId: user?.tenantId }),
      }).then(r => { if (!r.ok) return r.json().then(d => Promise.reject(d)); return r.json() }),
    onSuccess: (data: PortalAccount & { generatedPassword?: string }) => {
      qc.invalidateQueries({ queryKey: ['client-portals'] })
      setCredentials({ email: data.email, password: data.generatedPassword || '' })
      setCredentialsOpen(true)
      toast.success(t('clients.portalActivatedSuccess'))
    },
    onError: (err: { error?: string }) => {
      toast.error(err?.error || t('clients.portalErrorActivate'))
    },
  })

  // Reset password mutation
  const resetPwMut = useMutation({
    mutationFn: ({ clientId }: { clientId: string }) =>
      fetch('/api/clients/portal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, resetPassword: true }),
      }).then(r => { if (!r.ok) return r.json().then(d => Promise.reject(d)); return r.json() }),
    onSuccess: (data: { success: boolean; generatedPassword?: string }) => {
      qc.invalidateQueries({ queryKey: ['client-portals'] })
      setResetPwResult(data.generatedPassword || '')
      setResetPwOpen(true)
      toast.success(t('clients.portalResetPwSuccess'))
    },
    onError: (err: { error?: string }) => {
      toast.error(err?.error || t('clients.portalErrorResetPw'))
    },
  })

  // Deactivate portal mutation
  const deactivatePortalMut = useMutation({
    mutationFn: ({ clientId }: { clientId: string }) =>
      fetch(`/api/clients/portal?clientId=${clientId}`, { method: 'DELETE' })
        .then(r => { if (!r.ok) return r.json().then(d => Promise.reject(d)); return r.json() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-portals'] })
      toast.success(t('clients.portalDeactivatedSuccess'))
    },
    onError: (err: { error?: string }) => {
      toast.error(err?.error || t('clients.portalErrorDeactivate'))
    },
  })

  const resetForm = () => { setForm({ fullName: '', company: '', email: '', phone: '', address: '', city: '', country: 'Cameroun', notes: '', clientType: 'particulier', niu: '', riskLevel: 'faible', source: '', isActive: true }); setEditing(null) }
  const openEdit = (c: Client) => { setEditing(c); setForm({ fullName: c.fullName, company: c.company || '', email: c.email || '', phone: c.phone || '', address: c.address || '', city: c.city || '', country: c.country || 'Cameroun', notes: c.notes || '', clientType: c.clientType || 'particulier', niu: c.niu || '', riskLevel: c.riskLevel || 'faible', source: c.source || '', isActive: c.isActive }); setDialogOpen(true) }
  const handleSubmit = () => {
    if (!form.fullName.trim()) return
    const payload = { ...form, company: form.company || null, email: form.email || null, phone: form.phone || null, address: form.address || null, city: form.city || null, niu: form.niu || null, notes: form.notes || null, source: form.source || null }
    if (editing) { updateMut.mutate({ id: editing.id, ...payload }) } else { createMut.mutate(payload) }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const selectedClientPortal = selectedClient ? portalMap.get(selectedClient.id) : null

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('clients.title')}</h2>
        <Button onClick={() => {
          const draft = getClientDraft()
          if (draft && draft.fullName) { setForm(draft as typeof form); toast.info(t('common.draftRestored')) } else { resetForm() }
          setDialogOpen(true)
        }} size="sm"><Plus className="size-4 mr-1" />{t('clients.newClient')}{clientHasDraft && <span className="ml-1 size-2 rounded-full bg-amber-400 inline-block" title={t('common.draftSaved')} />}</Button>
      </div>

      <div className="relative max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-jl-muted" /><Input placeholder={t('clients.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" /></div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (Array.isArray(clients) && clients.length === 0) ? <EmptyState icon={Users} title={t('clients.noClient')} description={t('clients.addFirst')} /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('common.clientType')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('common.city')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('common.riskLevel')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('nav.cases')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('clients.portal')}</TableHead>
            <TableHead className="w-28">{t('common.actions')}</TableHead>
          </TableRow></TableHeader><TableBody>
            {(Array.isArray(clients) ? clients : []).map((c: Client, i: number) => {
              const portal = portalMap.get(c.id)
              return (
                <TableRow key={c.id} className={cn(i % 2 === 1 && 'bg-jl-page', 'cursor-pointer')} onClick={() => { setSelectedClient(c); setDetailOpen(true) }}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7"><AvatarFallback className="text-[10px] bg-jl-page">{initials(c.fullName)}</AvatarFallback></Avatar>
                      <div><p className="text-sm font-medium">{c.fullName}</p>{c.company && <p className="text-[10px] text-jl-muted">{c.company}</p>}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{c.clientType === 'entreprise' ? t('common.entreprise') : t('common.particulier')}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-jl-secondary">{c.city || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className={cn('text-[10px]', RISK_COLORS[c.riskLevel || 'faible'])}>{riskLabel(c.riskLevel)}</Badge></TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-jl-secondary">{c._count?.cases || 0}</TableCell>
                  {/* Portal status column */}
                  <TableCell className="hidden md:table-cell" onClick={e => e.stopPropagation()}>
                    {portal ? (
                      <Badge className={cn('text-[10px] cursor-default', portal.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-100')}>
                        <ShieldCheck className="size-3 mr-0.5" />
                        {portal.isActive ? t('clients.portalActivated') : t('clients.portalInactive')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-gray-400 cursor-default">{t('clients.portalDisabled')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(c)}><Edit className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="size-7 text-[var(--danger)] hover:text-[var(--danger)]" onClick={() => deleteMut.mutate(c.id)}><Trash2 className="size-3.5" /></Button>
                      {/* Portal action button */}
                      {portal ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7" title={t('clients.portal')}><Globe className="size-3.5 text-emerald-600" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => resetPwMut.mutate({ clientId: c.id })} disabled={resetPwMut.isPending}>
                              <KeyRound className="size-3.5 mr-2" />
                              {t('clients.portalResetPw')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => { setDeactivateClientId(c.id); setDeactivateOpen(true) }}>
                              <ShieldX className="size-3.5 mr-2" />
                              {t('clients.portalDeactivate')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button variant="ghost" size="icon" className="size-7" title={t('clients.portalActivate')} onClick={() => activatePortalMut.mutate({ clientId: c.id })} disabled={activatePortalMut.isPending}>
                          {activatePortalMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Globe className="size-3.5 text-jl-muted" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody></Table>
        </div></CardContent></Card>}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t('clients.editClient') : t('clients.newClient')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('common.fullName')} *</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></div>
            <div><Label>{t('common.company')}</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.email')}</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>{t('common.phone')}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div><Label>{t('common.address')}</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.city')}</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>{t('common.country')}</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.clientType')}</Label><Select value={form.clientType} onValueChange={v => setForm(f => ({ ...f, clientType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="particulier">{t('common.particulier')}</SelectItem><SelectItem value="entreprise">{t('common.entreprise')}</SelectItem></SelectContent></Select></div>
              <div><Label>{t('common.niu')}</Label><Input value={form.niu} onChange={e => setForm(f => ({ ...f, niu: e.target.value }))} placeholder={t('clients.niuPlaceholder')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.riskLevel')}</Label><Select value={form.riskLevel} onValueChange={v => setForm(f => ({ ...f, riskLevel: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="faible">{riskLabel('faible')}</SelectItem><SelectItem value="moyen">{riskLabel('moyen')}</SelectItem><SelectItem value="eleve">{riskLabel('eleve')}</SelectItem></SelectContent></Select></div>
              <div><Label>{t('common.source')}</Label><Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="bouche_a_oreille">{t('clients.sourceWordOfMouth')}</SelectItem><SelectItem value="internet">{t('clients.sourceInternet')}</SelectItem><SelectItem value="recommandation">{t('clients.sourceReferral')}</SelectItem><SelectItem value="autre">{t('clients.sourceOther')}</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>{t('common.notes')}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={handleSubmit} disabled={!form.fullName.trim() || createMut.isPending || updateMut.isPending}>{editing ? t('common.save') : t('common.create')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="size-10"><AvatarFallback className="bg-jl-blue text-white text-sm">{initials(selectedClient?.fullName || '')}</AvatarFallback></Avatar>
              <div><div>{selectedClient?.fullName}{selectedClient?.company && <span className="text-jl-secondary font-normal"> — {selectedClient.company}</span>}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">{selectedClient?.clientType === 'entreprise' ? t('common.entreprise') : t('common.particulier')}</Badge>
                <Badge variant="outline" className={cn('text-[10px]', RISK_COLORS[selectedClient?.riskLevel || 'faible'])}>{riskLabel(selectedClient?.riskLevel)}</Badge>
                {/* Portal status in detail view */}
                {selectedClientPortal ? (
                  <Badge className={cn('text-[10px]', selectedClientPortal.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-100')}>
                    <Globe className="size-3 mr-0.5" />
                    {selectedClientPortal.isActive ? t('clients.portalStatusActive') : t('clients.portalStatusInactive')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-gray-400">{t('clients.portalStatusDisabled')}</Badge>
                )}
              </div></div>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-xs text-jl-secondary px-1 py-2">
            {selectedClient?.email && <div className="flex items-center gap-1.5"><Mail className="size-3" />{selectedClient.email}</div>}
            {selectedClient?.phone && <div className="flex items-center gap-1.5"><Phone className="size-3" />{selectedClient.phone}</div>}
            {selectedClient?.address && <div className="flex items-center gap-1.5"><MapPin className="size-3" />{selectedClient.address}</div>}
            {selectedClient?.city && <div className="flex items-center gap-1.5"><MapPin className="size-3" />{selectedClient.city}{selectedClient?.country ? `, ${selectedClient.country}` : ''}</div>}
            {selectedClient?.niu && <div className="flex items-center gap-1.5"><Building2 className="size-3" />{t('common.niu')}: {selectedClient.niu}</div>}
          </div>
          {/* Portal quick actions in detail */}
          {selectedClient && (
            <div className="px-1 pb-2 flex items-center gap-2">
              {selectedClientPortal ? (
                <>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => resetPwMut.mutate({ clientId: selectedClient.id })} disabled={resetPwMut.isPending}>
                    <KeyRound className="size-3 mr-1" />
                    {resetPwMut.isPending ? '...' : t('clients.portalResetPw')}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 text-[var(--danger)] hover:text-[var(--danger)] border-[var(--danger)]/30" onClick={() => { setDeactivateClientId(selectedClient.id); setDeactivateOpen(true) }}>
                    <ShieldX className="size-3 mr-1" />
                    {t('clients.portalDeactivate')}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="text-xs h-7 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => activatePortalMut.mutate({ clientId: selectedClient.id })} disabled={activatePortalMut.isPending}>
                  {activatePortalMut.isPending ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Globe className="size-3 mr-1" />}
                  {t('clients.portalActivate')}
                </Button>
              )}
            </div>
          )}
          <Tabs defaultValue="dossiers" className="flex-1 overflow-hidden">
            <TabsList className="w-full"><TabsTrigger value="dossiers">{t('nav.cases')} ({(clientDetail?.cases || []).length})</TabsTrigger><TabsTrigger value="factures">{t('common.invoice')} ({(clientDetail?.invoices || []).length})</TabsTrigger><TabsTrigger value="notes">{t('common.notes')}</TabsTrigger></TabsList>
            <TabsContent value="dossiers" className="mt-3 overflow-y-auto max-h-[45vh]">
              {(clientDetail?.cases || []).length === 0 ? <p className="text-sm text-jl-muted text-center py-8">{t('common.noCase')}</p> :
              <div className="space-y-2">{(clientDetail?.cases || []).map((c: CaseItem) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl hover:bg-jl-page cursor-pointer" onClick={() => { setDetailOpen(false); setCurrentView('cases') }}>
                  <Briefcase className="size-4 text-jl-gold shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{c.reference} — {c.title}</p><p className="text-[10px] text-jl-muted">{typeLabel(c.caseType)} • {t('common.createdOn')} {fmtDate(c.createdAt)}</p></div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[c.status])}>{statusLabel(c.status)}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="factures" className="mt-3 overflow-y-auto max-h-[45vh]">
              {(clientDetail?.invoices || []).length === 0 ? <p className="text-sm text-jl-muted text-center py-8">{t('common.noInvoice')}</p> :
              <div className="space-y-2">{(clientDetail?.invoices || []).map((inv: Invoice) => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl hover:bg-jl-page cursor-pointer" onClick={() => { setDetailOpen(false); setCurrentView('invoices') }}>
                  <Receipt className="size-4 text-jl-gold shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{inv.id.slice(0,8)}{inv.case?.reference ? ` — ${inv.case.reference}` : ''}</p><p className="text-[10px] text-jl-muted">{fmtDate(inv.createdAt)}</p></div>
                  <span className="text-sm font-semibold shrink-0">{fmtMoney(inv.amount, inv.currency?.code || 'XAF')}</span>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[inv.status])}>{statusLabel(inv.status)}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="notes" className="mt-3 overflow-y-auto max-h-[45vh]">
              <div className="p-4 border rounded-lg bg-jl-page">
                <p className="text-sm text-jl-secondary whitespace-pre-wrap">{selectedClient?.notes || clientDetail?.notes || t('common.noNote')}</p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Credentials dialog (shown after activating portal) */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              {t('clients.portalCredentialsTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('clients.portalCredentialsDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-jl-secondary">{t('clients.portalLoginEmail')}</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={credentials?.email || ''} className="font-mono text-sm bg-jl-page" />
                <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => credentials?.email && copyToClipboard(credentials.email)}>
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-jl-secondary">{t('clients.portalPassword')}</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={credentials?.password || ''} className="font-mono text-sm bg-jl-page" />
                <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => credentials?.password && copyToClipboard(credentials.password)}>
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{t('clients.portalPwWarning')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentialsOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password result dialog */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-jl-blue" />
              {t('clients.portalResetPwTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('clients.portalResetPwDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-jl-secondary">{t('clients.portalNewPassword')}</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={resetPwResult} className="font-mono text-sm bg-jl-page" />
                <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => resetPwResult && copyToClipboard(resetPwResult)}>
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{t('clients.portalPwWarning')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetPwOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate portal confirm dialog */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.portalDeactivateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clients.portalDeactivateDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--danger)] hover:bg-[var(--danger)] text-white"
              onClick={() => {
                if (deactivateClientId) {
                  deactivatePortalMut.mutate({ clientId: deactivateClientId })
                }
                setDeactivateOpen(false)
                setDeactivateClientId('')
              }}
            >
              {t('clients.portalDeactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
