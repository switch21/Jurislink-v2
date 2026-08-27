'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, uploadWithProgress } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== DOCUMENTS VIEW ====================
export function DocumentsView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [caseFilter, setCaseFilter] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ caseId: '', folder: 'Général', tags: '', documentType: 'autre', description: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // GED advanced states
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null)
  const [versionsDoc, setVersionsDoc] = useState<Doc | null>(null)
  const [versionUploadOpen, setVersionUploadOpen] = useState(false)
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionNote, setVersionNote] = useState('')
  const [versionUploading, setVersionUploading] = useState(false)
  const [versionProgress, setVersionProgress] = useState(0)
  const versionFileRef = useRef<HTMLInputElement>(null)

  const { data: cases } = useQuery({
    queryKey: ['cases-mini-docs', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()),
  })

  const { data: docsData, isLoading } = useQuery({
    queryKey: ['documents', user?.tenantId, caseFilter, search, selectedTag, selectedFolder],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (caseFilter !== 'all') p.set('caseId', caseFilter)
      if (search) p.set('search', search)
      if (selectedTag) p.set('tag', selectedTag)
      if (selectedFolder) p.set('folder', selectedFolder)
      return fetch(`/api/documents?${p}`).then(r => r.json())
    },
  })

  const documents: Doc[] = (docsData as any)?.documents || []
  const allTags: string[] = (docsData as any)?.tags || []
  const allFolders: string[] = (docsData as any)?.folders || []

  const { data: versions } = useQuery({
    queryKey: ['doc-versions', versionsDoc?.id],
    queryFn: () => fetch(`/api/documents/${versionsDoc!.id}/versions`).then(r => r.json()),
    enabled: !!versionsDoc?.id,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/documents/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Document supprimé') },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true); setUploadProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('tenantId', user?.tenantId || '')
      if (uploadForm.caseId) fd.append('caseId', uploadForm.caseId)
      fd.append('folder', uploadForm.folder)
      fd.append('tags', uploadForm.tags)
      fd.append('documentType', uploadForm.documentType)
      if (uploadForm.description) fd.append('description', uploadForm.description)
      await uploadWithProgress('/api/documents', fd, setUploadProgress)
      toast.success('Document ajouté')
      qc.invalidateQueries({ queryKey: ['documents'] })
      setUploadOpen(false); setSelectedFile(null); setUploadForm({ caseId: '', folder: 'Général', tags: '', documentType: 'autre', description: '' })
    } catch (err: any) { toast.error(err?.message || 'Erreur lors du téléchargement') } finally { setUploading(false); setUploadProgress(0) }
  }

  const handleUploadVersion = async () => {
    if (!versionFile || !versionsDoc) return
    setVersionUploading(true); setVersionProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', versionFile)
      if (versionNote) fd.append('changeNote', versionNote)
      await uploadWithProgress(`/api/documents/${versionsDoc.id}/versions`, fd, setVersionProgress)
      toast.success(`Version ${versionsDoc.version + 1} créée`)
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['doc-versions'] })
      setVersionUploadOpen(false); setVersionFile(null); setVersionNote('')
    } catch (err: any) { toast.error(err?.message || 'Erreur lors du téléchargement') } finally { setVersionUploading(false); setVersionProgress(0) }
  }

  const folders = ['Général', 'Procédure', 'Contrats', 'Pièces client', 'Correspondances', 'Décisions', 'Factures', 'Archives']
  const docTypes = [{ value: 'contrat', label: 'Contrat' }, { value: 'conclusion', label: 'Conclusion' }, { value: 'assignation', label: 'Assignation' }, { value: 'jugement', label: 'Jugement' }, { value: 'correspondance', label: 'Correspondance' }, { value: 'autre', label: 'Autre' }]

  const docTypeIcon = (mimeType?: string | null, docType?: string | null) => {
    if (mimeType?.includes('pdf') || docType === 'jugement') return <FileText className="size-5 text-red-500" />
    if (mimeType?.includes('image')) return <FileImage className="size-5 text-emerald-500" />
    if (mimeType?.includes('word') || docType === 'conclusion' || docType === 'assignation') return <FileText className="size-5 text-blue-500" />
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return <FileSpreadsheet className="size-5 text-green-600" />
    return <FileText className="size-5 text-jl-muted" />
  }

  const isPdf = (mimeType?: string | null) => mimeType?.includes('pdf')
  const isImage = (mimeType?: string | null) => mimeType?.includes('image')

  // Group by folder for list view
  const grouped = useMemo(() => {
    const groups: Record<string, Doc[]> = {}
    for (const d of documents) {
      const folder = d.folder || 'Sans dossier'
      if (!groups[folder]) groups[folder] = []
      groups[folder].push(d)
    }
    return groups
  }, [documents])

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-xs text-jl-secondary">{documents.length} document{documents.length > 1 ? 's' : ''} {caseFilter !== 'all' ? '• filtré par dossier' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="size-4 mr-1.5" />Ajouter un document</Button>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-jl-muted" />
          <Input placeholder="Rechercher un document..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-jl-muted hover:text-jl-secondary"><X className="size-4" /></button>}
        </div>
        <Select value={caseFilter} onValueChange={setCaseFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs"><SelectValue placeholder="Filtrer par dossier" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tous les dossiers</SelectItem>{(cases || []).map(c => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-1 items-center">
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" className="size-9" onClick={() => setViewMode('list')}><List className="size-4" /></Button></TooltipTrigger><TooltipContent>Liste</TooltipContent></Tooltip></TooltipProvider>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" className="size-9" onClick={() => setViewMode('grid')}><LayoutGrid className="size-4" /></Button></TooltipTrigger><TooltipContent>Grille</TooltipContent></Tooltip></TooltipProvider>
        </div>
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setSelectedTag(null)} className={cn('text-[10px] px-2.5 py-1 rounded-full transition-colors', !selectedTag ? 'bg-jl-blue text-white' : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}>Tous</button>
          {allTags.map(t => (
            <button key={t} onClick={() => setSelectedTag(selectedTag === t ? null : t)} className={cn('text-[10px] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1', selectedTag === t ? 'bg-jl-gold text-white' : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}><Tag className="size-2.5" />{t}</button>
          ))}
        </div>
      )}

      {/* Folder pills */}
      {allFolders.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setSelectedFolder(null)} className={cn('text-[10px] px-2.5 py-1 rounded-full transition-colors', !selectedFolder ? 'bg-jl-blue text-white' : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}>Tous les répertoires</button>
          {allFolders.map(f => (
            <button key={f} onClick={() => setSelectedFolder(selectedFolder === f ? null : f)} className={cn('text-[10px] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1', selectedFolder === f ? 'bg-[#926B2D] text-white' : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}><Folder className="size-2.5" />{f}</button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><Skeleton className="h-40 rounded-lg" /><Skeleton className="h-40 rounded-lg" /><Skeleton className="h-40 rounded-lg" /></div> :
        documents.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-16 text-center"><FileText className="size-12 mx-auto text-jl-muted mb-3" /><p className="text-sm font-medium text-jl-secondary">{search ? 'Aucun résultat' : 'Aucun document'}</p><p className="text-xs text-jl-muted mt-1">{search ? 'Essayez d\'autres termes de recherche' : 'Ajoutez votre premier document'}</p>{search && <button onClick={() => setSearch('')} className="text-xs text-jl-blue hover:underline mt-2">Effacer la recherche</button>}</CardContent></Card>
        ) :
        viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map(d => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <Card className="group hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col" onClick={() => isPdf(d.mimeType) || isImage(d.mimeType) ? setPreviewDoc(d) : null}>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    {/* File type icon area */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-lg bg-jl-page border border-jl">{docTypeIcon(d.mimeType, d.documentType)}</div>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setPreviewDoc(d) }}><Eye className="size-3.5 mr-2" />Aperçu</DropdownMenuItem>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setVersionsDoc(d) }}><History className="size-3.5 mr-2" />Historique (v{d.version})</DropdownMenuItem>
                        <DropdownMenuItem asChild><a href={`/api/documents/${d.id}/download`} onClick={e => e.stopPropagation()}><Download className="size-3.5 mr-2" />Télécharger</a></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={e => { e.stopPropagation(); deleteMut.mutate(d.id) }}><Trash2 className="size-3.5 mr-2" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent></DropdownMenu>
                    </div>
                    {/* File info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" title={d.fileName}>{d.fileName}</p>
                      <p className="text-[10px] text-jl-muted mt-0.5">{fmtFileSize(d.fileSize)} • v{d.version}</p>
                      {d.case && <p className="text-[10px] text-jl-blue mt-1 truncate">{d.case.reference} — {d.case.title}</p>}
                    </div>
                    {/* Tags & folder */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.folder && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-jl"><Folder className="size-2 mr-0.5" />{d.folder}</Badge>}
                      {d.tags && d.tags.split(',').slice(0, 2).map((t, i) => <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 border-jl"><Tag className="size-2 mr-0.5" />{t.trim()}</Badge>)}
                    </div>
                  </CardContent>
                  <CardFooter className="px-4 py-2.5 border-t border-jl text-[10px] text-jl-muted">
                    {fmtDate(d.createdAt)}
                    {(d as any)._count?.versions > 0 && <span className="ml-auto flex items-center gap-0.5 text-jl-blue"><History className="size-3" />{(d as any)._count.versions} v</span>}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List View - grouped by folder */
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {Object.entries(grouped).map(([folder, items]) => (
              <Card key={folder}>
                <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 text-jl-secondary"><Folder className="size-4 text-jl-gold" />{folder}<Badge variant="secondary" className="text-[10px] bg-jl-page text-jl-secondary">{items.length}</Badge></CardTitle></CardHeader>
                <CardContent className="p-2 pt-0 space-y-0.5">
                  {items.map(d => (
                    <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-jl-page group cursor-pointer" onClick={() => isPdf(d.mimeType) || isImage(d.mimeType) ? setPreviewDoc(d) : null}>
                      <div className="shrink-0 p-1.5 rounded bg-jl-page">{docTypeIcon(d.mimeType, d.documentType)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><p className="text-sm font-medium truncate" title={d.fileName}>{d.fileName}</p>{d.version > 1 && <Badge variant="outline" className="text-[9px] px-1 py-0 text-jl-blue border-jl-blue/30 shrink-0">v{d.version}</Badge>}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-jl-muted">{fmtFileSize(d.fileSize)}</span>
                          {d.tags && d.tags.split(',').map((t, i) => <Badge key={i} variant="outline" className="text-[9px] px-1 py-0 border-jl text-jl-secondary"><Tag className="size-2 mr-0.5" />{t.trim()}</Badge>)}
                        </div>
                      </div>
                      {d.case && <span className="text-[10px] text-jl-blue truncate max-w-[150px] hidden lg:block" title={d.case.reference}>{d.case.reference}</span>}
                      <span className="text-[10px] text-jl-muted shrink-0 hidden sm:block w-20 text-right">{fmtDate(d.createdAt)}</span>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7" onClick={e => { e.stopPropagation(); setPreviewDoc(d) }} disabled={!isPdf(d.mimeType) && !isImage(d.mimeType)}><Eye className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Aperçu</TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7" onClick={e => { e.stopPropagation(); setVersionsDoc(d) }}><History className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Versions</TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><a href={`/api/documents/${d.id}/download`} onClick={e => e.stopPropagation()} className="inline-flex"><Button variant="ghost" size="icon" className="size-7"><Download className="size-3.5" /></Button></a></TooltipTrigger><TooltipContent>Télécharger</TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7 text-[var(--danger)] hover:text-[var(--danger)]" onClick={e => { e.stopPropagation(); deleteMut.mutate(d.id) }}><Trash2 className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Supprimer</TooltipContent></Tooltip></TooltipProvider>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={o => { setUploadOpen(o); if (!o) { setSelectedFile(null); setUploadForm({ caseId: '', folder: 'Général', tags: '', documentType: 'autre', description: '' }); setUploadProgress(0) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajouter un document</DialogTitle><DialogDescription>Téléversez un fichier et associez-le à un dossier juridique</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-jl rounded-lg p-6 text-center cursor-pointer hover:border-jl-blue transition-colors" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip,.ppt,.pptx" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              {selectedFile ? <><FileUp className="size-8 mx-auto text-jl-blue mb-2" /><p className="text-sm font-medium truncate">{selectedFile.name}</p><p className="text-xs text-jl-muted">{fmtFileSize(selectedFile.size)}</p></> : <><Upload className="size-8 mx-auto text-jl-muted mb-2" /><p className="text-sm font-medium">Cliquez pour sélectionner un fichier</p><p className="text-xs text-jl-muted">PDF, DOC, XLS, JPG, PNG, et plus</p></>}
            </div>
            {uploading && <div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-jl-secondary">Téléchargement...</span><span className="font-medium">{uploadProgress}%</span></div><Progress value={uploadProgress} className="h-1.5" /></div>}
            <div><Label className="text-xs">Dossier lié</Label><Select value={uploadForm.caseId} onValueChange={v => setUploadForm(f => ({ ...f, caseId: v }))}><SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Aucun" /></SelectTrigger><SelectContent>{(cases || []).map(c => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Répertoire</Label><Select value={uploadForm.folder} onValueChange={v => setUploadForm(f => ({ ...f, folder: v }))}><SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger><SelectContent>{folders.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Type de document</Label><Select value={uploadForm.documentType} onValueChange={v => setUploadForm(f => ({ ...f, documentType: v }))}><SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger><SelectContent>{docTypes.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label className="text-xs">Tags (séparés par des virgules)</Label><Input value={uploadForm.tags} onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))} placeholder="contrat, urgent, v1" className="h-9 mt-1" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du document..." className="mt-1 min-h-[60px] text-sm" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setUploadOpen(false)}>Annuler</Button><Button onClick={handleUpload} disabled={!selectedFile || uploading}><Upload className="size-4 mr-1" />{uploading ? 'Téléchargement...' : 'Téléverser'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF/Image Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0"><DialogTitle className="text-sm truncate">{previewDoc?.fileName}</DialogTitle><DialogDescription className="text-xs">{previewDoc ? `${fmtFileSize(previewDoc.fileSize)} • Version ${previewDoc.version}` : ''}</DialogDescription></DialogHeader>
          <div className="flex-1 min-h-0">
            {previewDoc && isPdf(previewDoc.mimeType) && (
              <iframe src={`/api/documents/${previewDoc.id}/download`} className="w-full h-full border-0" title="Aperçu PDF" />
            )}
            {previewDoc && isImage(previewDoc.mimeType) && (
              <div className="flex items-center justify-center h-full bg-jl-page p-4"><img src={`/api/documents/${previewDoc.id}/download`} alt={previewDoc.fileName} className="max-w-full max-h-full object-contain rounded" /></div>
            )}
          </div>
          <DialogFooter className="px-4 py-3 border-t shrink-0 gap-2">
            <a href={`/api/documents/${previewDoc?.id}/download`} download><Button size="sm" variant="outline"><Download className="size-4 mr-1" />Télécharger</Button></a>
            <Button size="sm" variant="outline" onClick={() => { if (previewDoc) { setVersionsDoc(previewDoc); setPreviewDoc(null) } }}><History className="size-4 mr-1" />Historique des versions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions History Dialog */}
      <Dialog open={!!versionsDoc} onOpenChange={() => { setVersionsDoc(null); setVersionUploadOpen(false) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="size-5" />Historique des versions</DialogTitle>
            <DialogDescription className="text-xs truncate">{versionsDoc?.fileName} — Version actuelle : v{versionsDoc?.version}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {/* Current version */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-jl-blue/5 border border-jl-blue/20">
              <div className="p-1.5 rounded bg-jl-blue text-white"><FileCheck className="size-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Version {versionsDoc?.version} <Badge className="ml-1 text-[9px] bg-jl-blue">Actuelle</Badge></p>
                <p className="text-[10px] text-jl-secondary">{versionsDoc ? fmtFileSize(versionsDoc.fileSize) : ''} • {versionsDoc ? fmtDate(versionsDoc.updatedAt || versionsDoc.createdAt) : ''}</p>
              </div>
              <a href={`/api/documents/${versionsDoc?.id}/download`} className="shrink-0"><Button variant="ghost" size="icon" className="size-7"><Download className="size-3.5" /></Button></a>
            </div>
            {/* Previous versions */}
            {versions && (versions as any[]).length > 0 ? (versions as any[]).map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-jl hover:bg-jl-page">
                <div className="p-1.5 rounded bg-jl-page"><FileText className="size-4 text-jl-muted" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Version {v.version}</p>
                  <p className="text-[10px] text-jl-secondary">{fmtFileSize(v.fileSize)} • {fmtDate(v.createdAt)}</p>
                  {v.changeNote && <p className="text-[10px] text-jl-secondary mt-0.5 italic">{v.changeNote}</p>}
                  {v.uploadedBy && <p className="text-[10px] text-jl-muted">par {v.uploadedBy.fullName}</p>}
                </div>
                <a href={`/api/documents/${selectedDoc!.id}/versions/${v.id}/download`} className="shrink-0"><Button variant="ghost" size="icon" className="size-7"><Download className="size-3.5" /></Button></a>
              </div>
            )) : (
              <p className="text-xs text-jl-muted text-center py-6">Aucune version précédente</p>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {versionUploadOpen ? (
              <div className="space-y-2 p-3 border rounded-lg bg-jl-page">
                <div className="border-2 border-dashed border-jl rounded-lg p-4 text-center cursor-pointer hover:border-jl-gold transition-colors" onClick={() => versionFileRef.current?.click()}>
                  <input ref={versionFileRef} type="file" className="hidden" onChange={e => setVersionFile(e.target.files?.[0] || null)} />
                  {versionFile ? <p className="text-sm font-medium">{versionFile.name}</p> : <p className="text-xs text-jl-secondary">Sélectionner le fichier de la nouvelle version</p>}
                </div>
                {versionUploading && <div className="space-y-1"><div className="flex justify-between text-xs"><span>Envoi...</span><span>{versionProgress}%</span></div><Progress value={versionProgress} className="h-1.5" /></div>}
                <Input value={versionNote} onChange={e => setVersionNote(e.target.value)} placeholder="Note de modification (optionnel)" className="h-8 text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setVersionUploadOpen(false); setVersionFile(null); setVersionNote('') }}>Annuler</Button>
                  <Button size="sm" className="flex-1" onClick={handleUploadVersion} disabled={!versionFile || versionUploading}><Upload className="size-3.5 mr-1" />Créer v{versionsDoc ? versionsDoc.version + 1 : '?'}</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full" onClick={() => setVersionUploadOpen(true)}><Upload className="size-4 mr-1" />Téléverser une nouvelle version</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

