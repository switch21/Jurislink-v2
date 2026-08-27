'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== TEMPLATES VIEW ====================
export function TemplatesView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [showGenerate, setShowGenerate] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [form, setForm] = useState({ name: '', category: 'general', description: '', content: '', variables: '', isActive: true })
  const [genVars, setGenVars] = useState<Record<string, string>>({})
  const [genCaseId, setGenCaseId] = useState('')
  const [genClientId, setGenClientId] = useState('')

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

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/document-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Modèle créé'); setShowCreate(false); resetForm(); qc.invalidateQueries({ queryKey: ['doc-templates'] }) },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => fetch(`/api/document-templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Modèle mis à jour'); setEditId(null); resetForm(); qc.invalidateQueries({ queryKey: ['doc-templates'] }) },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch('/api/document-templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { toast.success('Modèle supprimé'); qc.invalidateQueries({ queryKey: ['doc-templates'] }) },
    onError: () => toast.error('Erreur lors de la suppression'),
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

  const previewTemplate = templates?.find((t: DocTemplate) => t.id === showPreview)
  const generateTemplate = templates?.find((t: DocTemplate) => t.id === showGenerate)

  const generatePreview = useMemo(() => {
    if (!generateTemplate) return ''
    let result = generateTemplate.content
    for (const [key, val] of Object.entries(genVars)) {
      result = result.replaceAll(`{{${key}}}`, val || `{{${key}}}`)
    }
    return result
  }, [generateTemplate, genVars])

  const getVarCount = (t: DocTemplate) => {
    try { return t.variables ? JSON.parse(t.variables).length : 0 } catch { return 0 }
  }

  const highlightVars = (text: string) => {
    const parts = text.split(/({{[^}]+}})/g)
    return parts.map((p, i) => /{{[^}]+}}/.test(p) ? <span key={i} className="bg-jl-gold/20 text-jl-gold font-semibold px-0.5 rounded">{p}</span> : p)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Modèles de Documents</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}><BookOpen className="size-4" /></Button>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true) }}><Plus className="size-4 mr-1" />Nouveau modèle</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'contrat', 'conclusion', 'correspondance', 'assignation', 'general'].map(cat => (
          <Button key={cat} variant={catFilter === cat ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setCatFilter(cat)}>
            {cat === 'all' ? 'Tous' : TEMPLATE_CATEGORIES[cat]?.label || cat}
          </Button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (templates || []).length === 0 ? <EmptyState icon={FileCode2} title="Aucun modèle" description="Créez votre premier modèle de document" /> :
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
                          <DropdownMenuItem onClick={() => openEdit(t)}><Edit className="size-3.5 mr-2" />Modifier</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="size-3.5 mr-2" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent></DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {cat && <Badge className={cn('text-[10px]', cat.color)}>{cat.label}</Badge>}
                      {getVarCount(t) > 0 && <Badge variant="outline" className="text-[10px]"><Hash className="size-2.5 mr-0.5" />{getVarCount(t)} variables</Badge>}
                      <Badge variant="outline" className={cn('text-[10px]', t.isActive ? 'text-[var(--success)]' : 'text-jl-muted')}>{t.isActive ? 'Actif' : 'Inactif'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {t.description && <p className="text-xs text-jl-secondary line-clamp-2">{t.description}</p>}
                    <p className="text-[10px] text-jl-muted">Modifié {relativeTime(t.updatedAt)}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
            <Table><TableHeader><TableRow>
              <TableHead>Nom</TableHead><TableHead className="hidden md:table-cell">Catégorie</TableHead><TableHead className="hidden lg:table-cell">Variables</TableHead><TableHead>Statut</TableHead><TableHead className="hidden md:table-cell">Modifié</TableHead><TableHead className="w-[100px]">Actions</TableHead>
            </TableRow></TableHeader><TableBody>
              {(templates || []).map((t: DocTemplate) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-medium">{t.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{TEMPLATE_CATEGORIES[t.category] && <Badge className={cn('text-[10px]', TEMPLATE_CATEGORIES[t.category].color)}>{TEMPLATE_CATEGORIES[t.category].label}</Badge>}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-jl-secondary">{getVarCount(t)}</TableCell>
                  <TableCell><Badge variant="outline" className={cn('text-[10px]', t.isActive ? 'text-[var(--success)]' : 'text-jl-muted')}>{t.isActive ? 'Actif' : 'Inactif'}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>{editId ? 'Modifier le modèle' : 'Nouveau modèle'}</DialogTitle><DialogDescription>Remplissez les champs ci-dessous</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Nom</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom du modèle" className="h-9 text-sm" /></div>
              <div className="space-y-2"><Label className="text-xs">Catégorie</Label><Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TEMPLATE_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optionnel)" className="text-sm min-h-[60px]" /></div>
            <div className="space-y-2"><Label className="text-xs">Contenu <span className="text-jl-muted">(utilisez {'{{variable}}'} pour les variables)</span></Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Contenu du modèle..." className="text-sm font-mono min-h-[200px]" /></div>
            <div className="space-y-2"><Label className="text-xs">Variables <span className="text-jl-muted">(séparées par des virgules)</span></Label><Input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} placeholder="nom, date, montant" className="h-9 text-sm" /></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v as boolean }))} /><Label className="text-xs">Modèle actif</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditId(null); resetForm() }}>Annuler</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.content || createMut.isPending || updateMut.isPending}>{editId ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Aperçu : {previewTemplate?.name}</DialogTitle></DialogHeader>
          <div className="bg-jl-card rounded-lg border border-jl p-6 text-sm leading-relaxed whitespace-pre-wrap">{previewTemplate ? highlightVars(previewTemplate.content) : ''}</div>
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={!!showGenerate} onOpenChange={() => setShowGenerate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Générer depuis : {generateTemplate?.name}</DialogTitle><DialogDescription>Remplissez les variables pour générer le document</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Dossier</Label><Select value={genCaseId} onValueChange={setGenCaseId}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner un dossier" /></SelectTrigger><SelectContent>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label className="text-xs">Client</Label><Select value={genClientId} onValueChange={setGenClientId}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger><SelectContent>{(clients || []).map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {Object.keys(genVars).length > 0 && <div className="space-y-3">{Object.entries(genVars).map(([key, val]) => (
              <div key={key} className="space-y-1"><Label className="text-xs font-medium">{'{{'}{key}{'}}'}</Label><Input value={val} onChange={e => setGenVars(g => ({ ...g, [key]: e.target.value }))} placeholder={`Valeur pour ${key}`} className="h-9 text-sm" /></div>
            ))}</div>}
            <div className="space-y-2"><Label className="text-xs font-semibold">Aperçu généré</Label><div className="bg-jl-card rounded-lg border border-jl p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">{highlightVars(generatePreview)}</div></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(null)}>Fermer</Button>
            <Button onClick={() => { navigator.clipboard.writeText(generatePreview); toast.success('Copié dans le presse-papiers') }}><Copy className="size-4 mr-1" />Copier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

