'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState, t , statusLabel, priorityLabel, typeLabel, eventTypeLabel, roleLabel, billingLabel, invoiceTypeLabel, invoiceStatusLabel, paymentMethodLabel, commTypeLabel, commStatusLabel, riskLabel, outcomeLabel, payStatusLabel, timelineTypeLabel, ROLE_OPTIONS } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'

const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string }> = {
  contrat: { label: t('templates.cat.contrat'), color: 'bg-jl-blue text-white' },
  conclusion: { label: t('templates.cat.conclusion'), color: 'bg-jl-gold text-white' },
  correspondance: { label: t('templates.cat.correspondance'), color: 'bg-[var(--success)] text-white' },
  assignation: { label: t('templates.cat.assignation'), color: 'bg-[var(--danger)] text-white' },
  autre: { label: t('templates.cat.autre'), color: 'bg-jl-secondary text-white' },
  general: { label: t('templates.cat.general'), color: 'bg-jl-page text-white' },
}

const AUTO_VARS = ['case_reference', 'case_title', 'client_name', 'client_company', 'client_email', 'client_phone', 'adversary', 'jurisdiction', 'amount', 'date', 'tenant_name'] as const

// ==================== TEMPLATES VIEW ====================
export function TemplatesView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const ti = t
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [showGenerate, setShowGenerate] = useState<string | null>(null)
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [catFilter, setCatFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [form, setForm] = useState({ name: '', category: 'general', description: '', content: '', variables: '', isActive: true })
  const [genVars, setGenVars] = useState<Record<string, string>>({})
  const [genCaseId, setGenCaseId] = useState('')
  const [genClientId, setGenClientId] = useState('')
  const [generating, setGenerating] = useState(false)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['doc-templates', user?.tenantId, catFilter],
    queryFn: () => {
      const p = new URLSearchParams({ tenantId: user?.tenantId || "" })
      if (catFilter !== 'all') p.set('category', catFilter)
      return fetch(`/api/document-templates?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
    enabled: !!user?.tenantId,
  })

  const { data: cases } = useQuery({
    queryKey: ['cases-tpl', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: showGenerate !== null,
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-tpl', user?.tenantId],
    queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: showGenerate !== null,
  })

  // Fetch selected case detail for auto-populated variables
  const { data: selectedCase } = useQuery({
    queryKey: ['case-detail-tpl', genCaseId],
    queryFn: () => fetch(`/api/cases/${genCaseId}`).then(r => r.json()),
    enabled: !!genCaseId && showGenerate !== null,
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/document-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success(t('templates.created')); setShowCreate(false); resetForm(); qc.invalidateQueries({ queryKey: ['doc-templates'] }) },
    onError: () => toast.error(t('templates.createError')),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => fetch(`/api/document-templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success(t('templates.updated')); setEditId(null); resetForm(); qc.invalidateQueries({ queryKey: ['doc-templates'] }) },
    onError: () => toast.error(t('templates.updateError')),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch('/api/document-templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { toast.success(t('templates.deleted')); qc.invalidateQueries({ queryKey: ['doc-templates'] }) },
    onError: () => toast.error(t('templates.deleteError')),
  })

  const resetForm = () => setForm({ name: '', category: 'general', description: '', content: '', variables: '', isActive: true })

  const openEdit = (t: DocTemplate) => {
    let vars = ''
    try { vars = t.variables ? JSON.parse(t.variables).join(', ') : '' } catch { vars = t.variables || '' }
    setForm({ name: t.name, category: t.category, description: t.description || '', content: t.content, variables: vars, isActive: t.isActive })
    setEditId(t.id)
  }

  const openGenerate = (t: DocTemplate) => {
    setShowGenerate(t.id)
    setGenCaseId('')
    setGenClientId('')
    setShowFullPreview(false)
    const vars: Record<string, string> = {}
    try { (t.variables ? JSON.parse(t.variables) : []).forEach((v: string) => { vars[v] = '' }) } catch {}
    setGenVars(vars)
  }

  const handleSave = () => {
    const vars = form.variables ? form.variables.split(',').map(v => v.trim()).filter(Boolean) : []
    const body = { ...form, variables: JSON.stringify(vars), tenantId: user?.tenantId }
    if (editId) updateMut.mutate({ id: editId, body })
    else createMut.mutate(body)
  }

  // Compute auto-populated values from case data
  const autoPopulated = useMemo(() => {
    if (!selectedCase) return {} as Record<string, string>
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    const amountStr = selectedCase.amountInDispute
      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: selectedCase.currency?.code || 'XAF', maximumFractionDigits: 0 }).format(selectedCase.amountInDispute)
      : ''
    return {
      case_reference: selectedCase.reference || '',
      case_title: selectedCase.title || '',
      client_name: selectedCase.client?.fullName || '',
      client_company: selectedCase.client?.company || '',
      client_email: selectedCase.client?.email || '',
      client_phone: selectedCase.client?.phone || '',
      adversary: selectedCase.adversary || '',
      jurisdiction: selectedCase.jurisdiction || '',
      amount: amountStr,
      date: dateStr,
      tenant_name: selectedCase.tenant?.name || '',
    }
  }, [selectedCase])

  const isAutoVar = (varName: string) => (AUTO_VARS as readonly string[]).includes(varName)

  const previewTemplate = templates?.find((t: DocTemplate) => t.id === showPreview)
  const generateTemplate = templates?.find((t: DocTemplate) => t.id === showGenerate)

  // Build final preview with auto-populated + manual variables (manual overrides auto)
  const generatePreview = useMemo(() => {
    if (!generateTemplate) return ''
    const merged = { ...autoPopulated, ...genVars }
    let result = generateTemplate.content
    for (const [key, val] of Object.entries(merged)) {
      result = result.replaceAll(`{{${key}}}`, val || `{{${key}}}`)
    }
    return result
  }, [generateTemplate, genVars, autoPopulated])

  const getVarCount = (t: DocTemplate) => {
    try { return t.variables ? JSON.parse(t.variables).length : 0 } catch { return 0 }
  }

  const highlightVars = (text: string) => {
    const parts = text.split(/({{[^}]+}})/g)
    return parts.map((p, i) => /{{[^}]+}}/.test(p) ? <span key={i} className="bg-jl-gold/20 text-jl-gold font-semibold px-0.5 rounded">{p}</span> : p)
  }

  // Format preview text: **bold** → <strong>
  const formatPreviewText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) => /^\*\*[^*]+\*\*$/.test(p) ? <strong key={i} className="font-semibold">{p.replace(/^\*\*/, '').replace(/\*\*$/, '')}</strong> : p)
  }

  // Generate PDF
  const handleGeneratePdf = async () => {
    if (!generateTemplate || !genCaseId) {
      toast.error(t('templates.selectCaseRequired'))
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/document-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: generateTemplate.id,
          caseId: genCaseId,
          variables: genVars,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: t('templates.generateError') }))
        toast.error(err.error || t('templates.generateError'))
        return
      }
      // Trigger download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";]+)"?/)
      a.download = match?.[1] || `${generateTemplate.name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(t('templates.documentGenerated'))
      setShowGenerate(null)
    } catch (err: any) {
      toast.error(err?.message || t('templates.generateError'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">{t('templates.titleFull')}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}><BookOpen className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { fetch('/api/document-templates/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: user?.tenantId }) }).then(r => r.json()).then(d => { if (d.created > 0) { toast.success(t('templates.legalModelsAdded').replace('{n}', String(d.created))); qc.invalidateQueries({ queryKey: ['doc-templates'] }) } else { toast.info(t('templates.legalModelsPresent')) } }).catch(() => toast.error('Erreur lors de l\'ajout')) }}><Sparkles className="size-4 mr-1" />{t('templates.legalModels')}</Button>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true) }}><Plus className="size-4 mr-1" />{t('templates.new')}</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'contrat', 'conclusion', 'correspondance', 'assignation', 'autre', 'general'].map(cat => (
          <Button key={cat} variant={catFilter === cat ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setCatFilter(cat)}>
            {cat === 'all' ? t('common.all') : TEMPLATE_CATEGORIES[cat]?.label || cat}
          </Button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (templates || []).length === 0 ? <EmptyState icon={FileCode2} title={t('templates.noTemplate')} description={t('templates.createFirst')} /> :
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(templates || []).map((t: DocTemplate) => {
              const cat = TEMPLATE_CATEGORIES[t.category]
              return (
                <Card key={t.id} className={!t.isActive ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => setShowPreview(t.id)}><Eye className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openGenerate(t)}><Sparkles className="size-3.5" /></Button>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}><Edit className="size-3.5 mr-2" />{ti('common.edit')}</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="size-3.5 mr-2" />{ti('common.delete')}</DropdownMenuItem>
                        </DropdownMenuContent></DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {cat && <Badge className={cn('text-[10px]', cat.color)}>{cat.label}</Badge>}
                      {getVarCount(t) > 0 && <Badge variant="outline" className="text-[10px]"><Hash className="size-2.5 mr-0.5" />{getVarCount(t)} {ti('templates.variables')}</Badge>}
                      <Badge variant="outline" className={cn('text-[10px]', t.isActive ? 'text-[var(--success)]' : 'text-jl-muted')}>{t.isActive ? ti('common.active') : ti('common.inactive')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {t.description && <p className="text-xs text-jl-secondary line-clamp-2">{t.description}</p>}
                    <p className="text-[10px] text-jl-muted">{ti('templates.modifiedAgo')} {relativeTime(t.updatedAt)}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
            <Table><TableHeader><TableRow>
              <TableHead>{t('templates.name')}</TableHead><TableHead className="hidden md:table-cell">{t('templates.category')}</TableHead><TableHead className="hidden lg:table-cell">{t('templates.variablesLabel')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="hidden md:table-cell">{t('common.modified')}</TableHead><TableHead className="w-[100px]">{t('common.actions')}</TableHead>
            </TableRow></TableHeader><TableBody>
              {(templates || []).map((t: DocTemplate) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-medium">{t.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{TEMPLATE_CATEGORIES[t.category] && <Badge className={cn('text-[10px]', TEMPLATE_CATEGORIES[t.category].color)}>{TEMPLATE_CATEGORIES[t.category].label}</Badge>}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-jl-secondary">{getVarCount(t)}</TableCell>
                  <TableCell><Badge variant="outline" className={cn('text-[10px]', t.isActive ? 'text-[var(--success)]' : 'text-jl-muted')}>{t.isActive ? ti('common.active') : ti('common.inactive')}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-jl-muted">{fmtDate(t.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(t)}><Edit className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="size-3.5 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div></CardContent></Card>
        )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={v => { if (!v) { setShowCreate(false); setEditId(null); resetForm() } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? t('templates.editModel') : t('templates.new')}</DialogTitle><DialogDescription>{t('templates.fillFields')}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">{t('templates.name')}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('templates.namePlaceholder')} className="h-9 text-sm" /></div>
              <div className="space-y-2"><Label className="text-xs">{t('templates.category')}</Label><Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TEMPLATE_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">{t('templates.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('templates.descriptionPlaceholder')} className="text-sm min-h-[60px]" /></div>
            <div className="space-y-2"><Label className="text-xs">{t('templates.contentLabel')} <span className="text-jl-muted">{t('templates.useVars')}</span></Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder={t('templates.contentPlaceholder')} className="text-sm font-mono min-h-[200px]" /></div>
            <div className="space-y-2"><Label className="text-xs">{t('templates.variablesLabel')} <span className="text-jl-muted">{t('templates.separateVars')}</span></Label><Input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} placeholder="nom, date, montant" className="h-9 text-sm" /></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v as boolean }))} /><Label className="text-xs">{t('templates.activeTemplate')}</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditId(null); resetForm() }}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.content || createMut.isPending || updateMut.isPending}>{editId ? t('common.update') : t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('templates.previewLabel')} : {previewTemplate?.name}</DialogTitle></DialogHeader>
          <div className="bg-jl-card rounded-lg border border-jl p-6 text-sm leading-relaxed whitespace-pre-wrap">{previewTemplate ? highlightVars(previewTemplate.content) : ''}</div>
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={!!showGenerate} onOpenChange={() => { if (!generating) setShowGenerate(null); setShowFullPreview(false) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('templates.generateFrom')} : {generateTemplate?.name}</DialogTitle><DialogDescription>{t('templates.fillVariables')}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{t('common.case')} <span className="text-jl-muted">{t('templates.caseForAuto')}</span></Label>
              <Select value={genCaseId} onValueChange={v => { setGenCaseId(v); setShowFullPreview(false) }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('templates.selectCase')} /></SelectTrigger>
                <SelectContent>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {Object.keys(genVars).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-xs font-semibold">{t('templates.variablesLabel')}</Label>
                  {genCaseId && (
                    <div className="flex items-center gap-3 ml-auto">
                      <span className="flex items-center gap-1 text-[10px] text-jl-muted"><span className="size-2 rounded-full bg-jl-blue" />{t('templates.autoFilled')}</span>
                      <span className="flex items-center gap-1 text-[10px] text-jl-muted"><span className="size-2 rounded-full bg-jl-gold" />{t('templates.manual')}</span>
                    </div>
                  )}
                </div>
                {Object.entries(genVars).map(([key, val]) => {
                  const isAuto = isAutoVar(key) && !!genCaseId
                  const autoVal = isAuto ? (autoPopulated[key] || '') : ''
                  const displayVal = val || autoVal
                  return (
                    <div key={key} className={cn('space-y-1 rounded-lg border p-2.5', isAuto && autoVal ? 'border-jl-blue/20 bg-jl-blue/[0.03]' : 'border-jl')}>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium">{'{{'}{key}{'}}'}</Label>
                        {isAuto && autoVal && <Badge variant="outline" className="text-[9px] text-jl-blue border-jl-blue/30 ml-auto"><Sparkles className="size-2 mr-0.5" />{t('templates.auto')}</Badge>}
                      </div>
                      {isAuto && autoVal ? (
                        <p className="text-sm text-jl-secondary pl-0.5">{autoVal || <span className="text-jl-muted italic">{t('common.notAvailable')}</span>}</p>
                      ) : (
                        <Input value={val} onChange={e => setGenVars(g => ({ ...g, [key]: e.target.value }))} placeholder={t('templates.valueFor').replace('{key}', key)} className="h-8 text-sm" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{t('templates.previewLabel')}</Label>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowFullPreview(v => !v)}>
                  <Eye className="size-3" />{showFullPreview ? t('templates.hide') : t('templates.previewBtn')}
                </Button>
              </div>
              {showFullPreview ? (
                <div className="bg-jl-card rounded-lg border border-jl p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {formatPreviewText(generatePreview)}
                </div>
              ) : (
                <div className="bg-jl-card rounded-lg border border-jl p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {highlightVars(generatePreview)}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(generatePreview); toast.success(t('common.copied')) }}><Copy className="size-4 mr-1" />{t('common.copy')}</Button>
            <Button onClick={handleGeneratePdf} disabled={!genCaseId || generating}>
              {generating ? <><Loader2 className="size-4 mr-1 animate-spin" />{t('templates.generating')}</> : <><FileDown className="size-4 mr-1" />{t('templates.generate')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
