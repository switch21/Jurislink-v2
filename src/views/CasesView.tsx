'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, ROLE_LABELS, BILLING_LABELS } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, uploadWithProgress } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
import ReactMarkdown from 'react-markdown'

// ==================== AI ANALYSIS PANEL ====================
interface AIAnalysisPanelProps {
  analysis: Record<string, unknown> | null
  loading: boolean
  cached: boolean
  analyzedAt: string | null
  onAnalyze: () => void
  onRefresh: () => void
}

function AIAnalysisPanel({ analysis, loading, cached, analyzedAt, onAnalyze, onRefresh }: AIAnalysisPanelProps) {
  const riskColorMap: Record<string, string> = { 'élevé': 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400', 'moyen': 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400', 'faible': 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' }
  const riskDotMap: Record<string, string> = { 'élevé': 'bg-red-500', 'moyen': 'bg-orange-500', 'faible': 'bg-green-500' }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <Brain className="size-12 text-jl-blue animate-pulse" />
          <div className="absolute -inset-4 rounded-full bg-jl-blue/10 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-jl-primary">Analyse en cours…</p>
          <p className="text-xs text-jl-muted mt-1">L'IA examine le dossier et prépare l'analyse</p>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => <div key={i} className="size-1.5 rounded-full bg-jl-blue animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="size-16 rounded-2xl bg-jl-blue/10 flex items-center justify-center">
          <Brain className="size-8 text-jl-blue" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Analyse IA disponible</p>
          <p className="text-xs text-jl-muted mt-1">Obtenez une analyse intelligente de ce dossier</p>
        </div>
        <Button onClick={onAnalyze} className="gap-2"><Sparkles className="size-4" />Analyser ce dossier</Button>
      </div>
    )
  }

  const risques = (analysis.risques as Array<{ niveau?: string; description?: string; categorie?: string }>) || []
  const questions = (analysis.questions_juridiques as string[]) || []
  const pieces = (analysis.pieces_manquantes as string[]) || []
  const echeances = (analysis.echeances as Array<{ date?: string; description?: string; urgence?: string }>) || []
  const actions = (analysis.actions_recommandees as Array<{ priorite?: number; action?: string; raison?: string }>) || []

  return (
    <div className="space-y-4">
      {/* Header with timestamp */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-jl-blue" />
          <span className="text-xs font-medium">Analyse IA</span>
          {cached && <Badge variant="outline" className="text-[9px] text-jl-muted border-jl">En cache</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {analyzedAt && <span className="text-[10px] text-jl-muted">{new Date(analyzedAt).toLocaleString('fr-FR')}</span>}
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn('size-3', loading && 'animate-spin')} />Actualiser
          </Button>
        </div>
      </div>

      {/* Résumé */}
      {analysis.resume && (
        <Card className="border-jl-blue/20 bg-jl-blue/[0.03]">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold text-jl-blue flex items-center gap-1.5"><FileText className="size-3.5" />Résumé</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3"><p className="text-sm text-jl-secondary leading-relaxed">{String(analysis.resume)}</p></CardContent>
        </Card>
      )}

      {/* Chronologie */}
      {analysis.chronologie && (
        <Card className="border-jl-gold/20 bg-jl-gold/[0.03]">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold text-jl-gold flex items-center gap-1.5"><History className="size-3.5" />Chronologie</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3"><ReactMarkdown>{String(analysis.chronologie)}</ReactMarkdown></CardContent>
        </Card>
      )}

      {/* Parties */}
      {analysis.parties && (
        <Card className="border-jl">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><Scale className="size-3.5" />Parties</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3"><ReactMarkdown>{String(analysis.parties)}</ReactMarkdown></CardContent>
        </Card>
      )}

      {/* Questions juridiques */}
      {questions.length > 0 && (
        <Card className="border-jl">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><Gavel className="size-3.5" />Questions juridiques</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3 space-y-1.5">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="size-5 rounded-full bg-jl-blue/10 text-jl-blue text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-jl-secondary">{q}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risques */}
      {risques.length > 0 && (
        <Card className="border-jl">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><AlertTriangle className="size-3.5" />Risques identifiés</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {risques.map((r, i) => {
              const niv = r.niveau?.toLowerCase() || 'moyen'
              const colorClass = riskColorMap[niv] || riskColorMap['moyen']
              const dotClass = riskDotMap[niv] || riskDotMap['moyen']
              return (
                <div key={i} className={cn('rounded-lg border p-2.5', colorClass)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('size-2 rounded-full', dotClass)} />
                    <span className="text-xs font-semibold capitalize">{r.niveau || 'moyen'}</span>
                    {r.categorie && <Badge variant="outline" className="text-[9px] ml-auto opacity-70">{r.categorie}</Badge>}
                  </div>
                  <p className="text-sm">{r.description}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Pièces manquantes */}
      {pieces.length > 0 && (
        <Card className="border-jl">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><FileWarning className="size-3.5" />Pièces manquantes</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1">{pieces.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-jl-secondary">
                <AlertCircle className="size-3.5 text-jl-gold shrink-0" /><span>{p}</span>
              </div>
            ))}</div>
          </CardContent>
        </Card>
      )}

      {/* Échéances */}
      {echeances.length > 0 && (
        <Card className="border-jl">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><Clock className="size-3.5" />Échéances</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {echeances.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-sm border border-jl rounded-lg p-2">
                <Calendar className="size-3.5 text-jl-blue shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.description}</p>
                  {e.date && <p className="text-[10px] text-jl-muted">{e.date}</p>}
                </div>
                {e.urgence && (
                  <Badge variant={e.urgence === 'haute' ? 'destructive' : 'outline'} className="text-[9px] shrink-0">
                    {e.urgence === 'haute' ? 'Urgent' : e.urgence === 'moyenne' ? 'Moyen' : 'Bas'}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions recommandées */}
      {actions.length > 0 && (
        <Card className="border-jl">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><Target className="size-3.5" />Actions recommandées</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {actions.sort((a, b) => (a.priorite || 99) - (b.priorite || 99)).map((a, i) => (
              <div key={i} className="flex items-start gap-3 border border-jl rounded-lg p-2.5">
                <span className="size-6 rounded-full bg-jl-blue/10 text-jl-blue text-[10px] font-bold flex items-center justify-center shrink-0">{a.priorite || i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.action}</p>
                  {a.raison && <p className="text-xs text-jl-muted mt-0.5">{a.raison}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== CASES VIEW ====================
export function CasesView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editing, setEditing] = useState<CaseItem | null>(null)
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null)
  const [conflicts, setConflicts] = useState<ConflictResult[]>([])
  const [form, setForm] = useState({ title: '', description: '', caseType: 'civil', status: 'nouveau', priority: 'normal', clientId: '', reference: '', adversary: '', jurisdiction: '', amountInDispute: '', billingType: '', nextDueDate: '', isSecret: false })
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([])
  const [timelineFilter, setTimelineFilter] = useState<Set<string>>(new Set(['event', 'note', 'doc', 'task', 'payment', 'invoice', 'communication']))
  const [showInlineNote, setShowInlineNote] = useState(false)
  const [showInlineEvent, setShowInlineEvent] = useState(false)
  const [inlineNote, setInlineNote] = useState('')
  const [inlineEvent, setInlineEvent] = useState({ title: '', description: '', eventType: 'autre', startTime: '' })
  const [timelineSearch, setTimelineSearch] = useState('')
  const [timelineSort, setTimelineSort] = useState<'desc' | 'asc'>('desc')
  const [deletingItem, setDeletingItem] = useState<string | null>(null)
  const [casePreviewDoc, setCasePreviewDoc] = useState<Doc | null>(null)
  const [caseUploadFile, setCaseUploadFile] = useState<File | null>(null)
  const [caseUploading, setCaseUploading] = useState(false)
  const [caseUploadProgress, setCaseUploadProgress] = useState(0)
  const caseFileRef = useRef<HTMLInputElement>(null)
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, unknown> | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiCached, setAiCached] = useState(false)
  const [aiAnalyzedAt, setAiAnalyzedAt] = useState<string | null>(null)
  const [generatingWorkflow, setGeneratingWorkflow] = useState(false)
  const [aiJurisQuery, setAiJurisQuery] = useState('')
  const [aiJurisLoading, setAiJurisLoading] = useState(false)
  const [aiJurisResult, setAiJurisResult] = useState<string | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [aiSummaryResult, setAiSummaryResult] = useState<string | null>(null)
  const [genTemplateDialog, setGenTemplateDialog] = useState(false)
  const [genTemplateId, setGenTemplateId] = useState('')
  const [genTemplateLoading, setGenTemplateLoading] = useState(false)
  const [caseTplId, setCaseTplId] = useState('')
  const [caseTplGenerating, setCaseTplGenerating] = useState(false)

  // Check subscription for AI access
  const hasAI = useQuery({
    queryKey: ['subscription-ai', user?.tenantId],
    queryFn: () => fetch(`/api/subscriptions?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => d.plan?.hasAI ?? false),
    enabled: !!user?.tenantId,
    staleTime: 5 * 60 * 1000,
  })

  const handleAnalyzeCase = async (refresh = false) => {
    if (!selectedCase || !user?.tenantId) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/analyze-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: user.tenantId, caseId: selectedCase.id, refresh }),
      })
      const data = await res.json()
      if (data.analysis) {
        setAiAnalysis(data.analysis)
        setAiCached(!!data.cached)
        setAiAnalyzedAt(data.analyzedAt)
      } else {
        toast.error(data.error || 'Erreur lors de l\'analyse IA')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'analyse IA')
    } finally {
      setAiLoading(false)
    }
  }

  const handleCaseDocUpload = async () => {
    if (!caseUploadFile || !selectedCase) return
    setCaseUploading(true); setCaseUploadProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', caseUploadFile)
      fd.append('tenantId', user?.tenantId || '')
      fd.append('caseId', selectedCase.id)
      fd.append('folder', 'Général')
      fd.append('documentType', 'autre')
      await uploadWithProgress('/api/documents', fd, setCaseUploadProgress)
      toast.success('Document ajouté au dossier')
      qc.invalidateQueries({ queryKey: ['case-detail', selectedCase.id] })
      qc.invalidateQueries({ queryKey: ['case-timeline', selectedCase.id] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      setCaseUploadFile(null)
    } catch (err: any) { toast.error(err?.message || 'Erreur lors du téléchargement du document') } finally { setCaseUploading(false); setCaseUploadProgress(0) }
  }

  const handleGenerateWorkflow = async () => {
    if (!selectedCase) return
    setGeneratingWorkflow(true)
    try {
      const res = await fetch(`/api/cases/${selectedCase.id}/generate-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.created) {
        toast.success(`${data.taskCount} tâches créées (${data.templateName})`)
        qc.invalidateQueries({ queryKey: ['case-tasks', selectedCase.id] })
        qc.invalidateQueries({ queryKey: ['case-timeline', selectedCase.id] })
      } else if (data.alreadyApplied) {
        toast.info('Le workflow a déjà été appliqué à ce dossier')
      } else {
        toast.error(data.error || 'Erreur lors de la génération')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la génération des tâches')
    } finally {
      setGeneratingWorkflow(false)
    }
  }

  // Generate PDF from template in case detail
  const handleCaseTplGenerate = async () => {
    if (!selectedCase || !caseTplId) return
    setCaseTplGenerating(true)
    try {
      const res = await fetch('/api/document-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: caseTplId, caseId: selectedCase.id, variables: {} }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }))
        toast.error(err.error || 'Erreur lors de la génération')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";]+)"?/)
      a.download = match?.[1] || 'document.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Document généré avec succès')
      setCaseTplId('')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la génération')
    } finally {
      setCaseTplGenerating(false)
    }
  }

  const handleJurisprudence = async () => {
    if (!selectedCase || !aiJurisQuery.trim()) return
    setAiJurisLoading(true)
    setAiJurisResult(null)
    try {
      const res = await fetch('/api/ai/analyze-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: selectedCase.id, type: 'jurisprudence', query: aiJurisQuery }),
      })
      const data = await res.json()
      if (data.result) {
        setAiJurisResult(data.result)
        qc.invalidateQueries({ queryKey: ['case-timeline', selectedCase.id] })
      } else {
        toast.error(data.error || 'Erreur lors de la recherche')
      }
    } catch (err: any) { toast.error(err?.message || 'Erreur lors de la recherche') } finally { setAiJurisLoading(false) }
  }

  const handleSummary = async () => {
    if (!selectedCase) return
    setAiSummaryLoading(true)
    setAiSummaryResult(null)
    try {
      const res = await fetch('/api/ai/analyze-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: selectedCase.id, type: 'summary' }),
      })
      const data = await res.json()
      if (data.result) {
        setAiSummaryResult(data.result)
      } else {
        toast.error(data.error || 'Erreur lors du résumé')
      }
    } catch (err: any) { toast.error(err?.message || 'Erreur lors du résumé') } finally { setAiSummaryLoading(false) }
  }

  const { data: cases, isLoading } = useQuery({
    queryKey: ['cases', user?.tenantId, statusFilter, typeFilter, priorityFilter, search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (statusFilter !== 'all') p.set('status', statusFilter)
      if (typeFilter !== 'all') p.set('type', typeFilter)
      if (priorityFilter !== 'all') p.set('priority', priorityFilter)
      if (search) p.set('search', search)
      return fetch(`/api/cases?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-mini', user?.tenantId],
    queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const { data: users } = useQuery({
    queryKey: ['users-cases', user?.tenantId],
    queryFn: () => fetch(`/api/users?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : d.users || []),
  })

  const { data: caseDetail } = useQuery({
    queryKey: ['case-detail', selectedCase?.id],
    queryFn: () => fetch(`/api/cases/${selectedCase!.id}`).then(r => r.json()),
    enabled: !!selectedCase?.id && detailOpen,
  })

  const { data: caseTasks } = useQuery({
    queryKey: ['case-tasks', selectedCase?.id],
    queryFn: () => fetch(`/api/tasks?caseId=${selectedCase!.id}&tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : Array.isArray(d?.tasks) ? d.tasks : []),
    enabled: !!selectedCase?.id && detailOpen,
  })

  // Templates for case detail document generation
  const { data: caseTemplates } = useQuery({
    queryKey: ['case-tpl-gen', user?.tenantId],
    queryFn: () => fetch(`/api/document-templates?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: !!selectedCase?.id && detailOpen,
  })

  const { data: caseInvoices } = useQuery({
    queryKey: ['case-invoices', selectedCase?.id],
    queryFn: () => fetch(`/api/invoices?caseId=${selectedCase!.id}&tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: !!selectedCase?.id && detailOpen,
  })

  const createMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (body.adversary && body.clientId) {
        try {
          const conflictRes = await fetch('/api/conflicts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: user?.tenantId, clientId: body.clientId, adversary: body.adversary }) }).then(r => r.json())
          if (conflictRes.conflicts?.length > 0) setConflicts(conflictRes.conflicts)
        } catch { /* ignore */ }
      }
      return fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); toast.success('Dossier créé'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => fetch(`/api/cases/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); qc.invalidateQueries({ queryKey: ['case-detail'] }); toast.success('Dossier mis à jour') },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const createNoteMut = useMutation({
    mutationFn: (body: { content: string }) => fetch(`/api/cases/${selectedCase!.id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: body.content, authorId: user?.id, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-detail'] }); qc.invalidateQueries({ queryKey: ['case-timeline'] }); toast.success('Note ajoutée'); setInlineNote(''); setShowInlineNote(false) },
    onError: () => toast.error('Erreur lors de l\'ajout de la note'),
  })

  const createEventMut = useMutation({
    mutationFn: (body: { title: string; description?: string; eventType: string; startTime: string }) => fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, caseId: selectedCase?.id, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-detail'] }); qc.invalidateQueries({ queryKey: ['case-timeline'] }); toast.success('Événement ajouté'); setInlineEvent({ title: '', description: '', eventType: 'autre', startTime: '' }); setShowInlineEvent(false) },
    onError: () => toast.error('Erreur lors de l\'ajout de l\'événement'),
  })

  // Unified timeline query from server
  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['case-timeline', selectedCase?.id, timelineSearch],
    queryFn: () => fetch(`/api/cases/${selectedCase!.id}/timeline?tenantId=${user?.tenantId}&search=${encodeURIComponent(timelineSearch)}`).then(r => r.json()).then(d => d || {}),
    enabled: !!selectedCase?.id && detailOpen,
  })

  // Delete note mutation
  const deleteNoteMut = useMutation({
    mutationFn: (noteId: string) => fetch(`/api/cases/${selectedCase!.id}/notes/${noteId}`, { method: 'DELETE' }).then(r => r.ok ? { ok: true } : r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-timeline'] }); qc.invalidateQueries({ queryKey: ['case-detail'] }); toast.success('Note supprimée'); setDeletingItem(null) },
    onError: () => { toast.error('Erreur lors de la suppression'); setDeletingItem(null) },
  })

  // Delete event mutation
  const deleteEventMut = useMutation({
    mutationFn: (eventId: string) => fetch(`/api/events/${eventId}`, { method: 'DELETE' }).then(r => r.ok ? { ok: true } : r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-timeline'] }); qc.invalidateQueries({ queryKey: ['case-detail'] }); toast.success('Événement supprimé'); setDeletingItem(null) },
    onError: () => { toast.error('Erreur lors de la suppression'); setDeletingItem(null) },
  })

  const handleDeleteTimelineItem = (id: string) => {
    if (id.startsWith('note-')) deleteNoteMut.mutate(id.replace('note-', ''))
    else if (id.startsWith('event-')) deleteEventMut.mutate(id.replace('event-', ''))
  }

  const resetForm = () => { setForm({ title: '', description: '', caseType: 'civil', status: 'nouveau', priority: 'normal', clientId: '', reference: '', adversary: '', jurisdiction: '', amountInDispute: '', billingType: '', nextDueDate: '', isSecret: false }); setEditing(null); setConflicts([]); setSelectedCollabs([]) }
  const openEdit = (c: CaseItem) => {
    setEditing(c)
    setForm({ title: c.title, description: c.description || '', caseType: c.caseType, status: c.status, priority: c.priority, clientId: c.clientId, reference: c.reference, adversary: c.adversary || '', jurisdiction: c.jurisdiction || '', amountInDispute: c.amountInDispute?.toString() || '', billingType: c.billingType || '', nextDueDate: '', isSecret: c.isSecret || false })
    setSelectedCollabs(c.assignments?.map(a => a.userId) || [])
    setDialogOpen(true)
  }
  const handleSubmit = () => {
    if (!form.title.trim() || !form.clientId) return
    const payload = { title: form.title, description: form.description || null, caseType: form.caseType, status: form.status, priority: form.priority, clientId: form.clientId, reference: form.reference, tenantId: user?.tenantId, adversary: form.adversary || null, jurisdiction: form.jurisdiction || null, amountInDispute: form.amountInDispute ? parseFloat(form.amountInDispute) : null, billingType: form.billingType || null, isSecret: form.isSecret || false, assignments: selectedCollabs }
    if (editing) { updateMut.mutate({ id: editing.id, ...payload }) } else { createMut.mutate(payload) }
  }

  // Timeline from server — enrich with icons client-side
  const timelineIconMap: Record<string, React.ElementType> = { event: Calendar, note: MessageSquare, doc: FileText, task: ClipboardList, invoice: Receipt, payment: Wallet, communication: MessageCircle }
  const timelineTypeLabels: Record<string, string> = { event: 'Événement', note: 'Note', doc: 'Document', task: 'Tâche', payment: 'Paiement', invoice: 'Facture', communication: 'Communication' }

  const timeline = useMemo(() => {
    if (!timelineData?.items) return []
    const searchLower = timelineSearch.toLowerCase()
    let items = timelineData.items.filter(item => timelineFilter.has(item.type))
    if (searchLower) {
      items = items.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        (item.author && item.author.toLowerCase().includes(searchLower))
      )
    }
    // Sort
    items = [...items].sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
      return timelineSort === 'asc' ? -diff : diff
    })
    return items
  }, [timelineData, timelineFilter, timelineSearch, timelineSort])

  const timelineCounts = timelineData?.counts || {} as Record<string, number>

  // Group timeline by date
  const timelineGrouped = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: typeof timeline }> = []
    let currentKey = ''
    for (const item of timeline) {
      const d = new Date(item.date)
      const today = new Date()
      const key = format(d, 'yyyy-MM-dd')
      const isToday = isSameDay(d, today)
      const yesterday = addDays(today, -1)
      const isYesterday = isSameDay(d, yesterday)
      let label = ''
      if (isToday) label = "Aujourd'hui"
      else if (isYesterday) label = 'Hier'
      else label = format(d, 'EEEE d MMMM yyyy', { locale: fr })
      if (key !== currentKey) {
        groups.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [item] })
        currentKey = key
      } else {
        groups[groups.length - 1].items.push(item)
      }
    }
    return groups
  }, [timeline])

  const toggleTimelineFilter = (type: string) => {
    setTimelineFilter(prev => {
      const next = new Set(prev)
      if (next.has(type)) { if (next.size > 1) next.delete(type) }
      else next.add(type)
      return next
    })
  }

  const getClientName = (c: CaseItem) => c.client ? c.client.fullName : '—'

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Dossiers</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm"><Plus className="size-4 mr-1" />Nouveau dossier</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-jl-muted" /><Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="nouveau">Nouveau</SelectItem><SelectItem value="ouvert">Ouvert</SelectItem><SelectItem value="en_cours">En cours</SelectItem><SelectItem value="en_attente">En attente</SelectItem><SelectItem value="clos">Clos</SelectItem></SelectContent></Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="civil">Civil</SelectItem><SelectItem value="penal">Pénal</SelectItem><SelectItem value="commercial">Commercial</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="administratif">Administratif</SelectItem></SelectContent></Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Priorité" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="haute">Haute</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (Array.isArray(cases) && cases.length === 0) ? <EmptyState icon={Briefcase} title="Aucun dossier" description="Créez votre premier dossier" /> :
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {(Array.isArray(cases) ? cases : []).map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedCase(c); setDetailOpen(true); setTimelineFilter(new Set(['event', 'note', 'doc', 'task', 'payment', 'invoice', 'communication'])); setShowInlineNote(false); setShowInlineEvent(false); setTimelineSearch('') }}>
              <CardHeader className="pb-2"><div className="flex items-start justify-between"><div className="flex items-center gap-1.5"><CardTitle className="text-sm font-semibold">{c.reference}</CardTitle>{c.isSecret && <Lock className="size-3 text-[var(--accent)]" />}</div><div className="flex items-center gap-1"><Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status] || c.status}</Badge></div></div><CardDescription className="text-xs mt-1 line-clamp-2">{c.title}</CardDescription></CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <p className="text-xs text-jl-secondary"><Users className="size-3 inline mr-1" />{getClientName(c)}</p>
                {c.adversary && <p className="text-xs text-jl-secondary"><Scale className="size-3 inline mr-1" />Contre : {c.adversary}</p>}
                {c.jurisdiction && <p className="text-xs text-jl-secondary"><MapPin className="size-3 inline mr-1" />{c.jurisdiction}</p>}
                {c.amountInDispute != null && c.amountInDispute > 0 && <p className="text-xs font-medium text-jl-gold"><Banknote className="size-3 inline mr-1" />{fmtMoney(c.amountInDispute)}</p>}
                {c.billingType && <Badge variant="secondary" className="text-[10px]">{BILLING_LABELS[c.billingType] || c.billingType}</Badge>}
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[c.caseType] || c.caseType}</Badge>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(c)}><Edit className="size-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier le dossier' : 'Nouveau dossier'}</DialogTitle></DialogHeader>
          {conflicts.length > 0 && <div className="bg-[var(--accent-light)] border border-amber-200 rounded-lg p-3 space-y-1">{conflicts.map((c, i) => <div key={i} className="flex items-start gap-2 text-xs"><AlertTriangle className="size-4 text-jl-gold shrink-0 mt-0.5" /><span className="text-jl-gold">{c.description}</span></div>)}</div>}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Référence *</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="REF-001" /></div>
              <div><Label>Client *</Label><Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{(Array.isArray(clients) ? clients : []).map(cl => <SelectItem key={cl.id} value={cl.id}>{cl.fullName}{cl.company ? ` (${cl.company})` : ''}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Type</Label><Select value={form.caseType} onValueChange={v => setForm(f => ({ ...f, caseType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="civil">Civil</SelectItem><SelectItem value="penal">Pénal</SelectItem><SelectItem value="commercial">Commercial</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="administratif">Administratif</SelectItem></SelectContent></Select></div>
              <div><Label>Statut</Label><Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nouveau">Nouveau</SelectItem><SelectItem value="ouvert">Ouvert</SelectItem><SelectItem value="en_cours">En cours</SelectItem><SelectItem value="en_attente">En attente</SelectItem><SelectItem value="clos">Clos</SelectItem></SelectContent></Select></div>
              <div><Label>Priorité</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="haute">Haute</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Partie adverse</Label><Input value={form.adversary} onChange={e => setForm(f => ({ ...f, adversary: e.target.value }))} placeholder="Nom de la partie adverse" /></div>
              <div><Label>Juridiction</Label><Input value={form.jurisdiction} onChange={e => setForm(f => ({ ...f, jurisdiction: e.target.value }))} placeholder="TPI de Douala" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Montant en jeu</Label><Input type="number" value={form.amountInDispute} onChange={e => setForm(f => ({ ...f, amountInDispute: e.target.value }))} placeholder="0" /></div>
              <div><Label>Facturation</Label><Select value={form.billingType} onValueChange={v => setForm(f => ({ ...f, billingType: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="forfait">Forfait</SelectItem><SelectItem value="horaire">Horaire</SelectItem><SelectItem value="abonnement">Abonnement</SelectItem><SelectItem value="success_fee">Success fee</SelectItem><SelectItem value="provision">Provision</SelectItem></SelectContent></Select></div>
              <div><Label>Prochaine échéance</Label><Input type="date" value={form.nextDueDate} onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setForm(f => ({ ...f, isSecret: !f.isSecret }))}>
                <div className={cn('size-5 rounded border-2 flex items-center justify-center transition-colors', form.isSecret ? 'bg-jl-blue border-jl-blue' : 'border-jl')}>{form.isSecret && <Check className="size-3 text-white" />}</div>
                <Label className="cursor-pointer text-sm flex items-center gap-1.5"><Lock className="size-3.5" />Dossier confidentiel</Label>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs mb-1.5 block">Collaborateurs du dossier</Label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 border rounded-lg bg-jl-page">
                {Array.isArray(users) && users.map(u => (
                  <label key={u.id} className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors', selectedCollabs.includes(u.id) ? 'bg-jl-blue text-white' : 'bg-jl-card border border-jl hover:bg-jl-blue-light')}>
                    <input type="checkbox" className="hidden" checked={selectedCollabs.includes(u.id)} onChange={e => { if (e.target.checked) setSelectedCollabs(prev => [...prev, u.id]); else setSelectedCollabs(prev => prev.filter(id => id !== u.id)) }} />
                    <Avatar className="size-4 mr-1"><AvatarFallback className="text-[7px] bg-jl-blue-light text-jl-secondary">{initials(u.fullName)}</AvatarFallback></Avatar>
                    <span className="truncate max-w-[100px]">{u.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSubmit} disabled={!form.title.trim() || !form.clientId || createMut.isPending}>{editing ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{selectedCase?.reference} — {selectedCase?.title}</DialogTitle>
            {(caseDetail?.assignments || []).length > 0 && (
              <div className="flex items-center gap-1 mt-1">{caseDetail.assignments.slice(0, 6).map((a: CaseAssignment) => (<TooltipProvider key={a.userId}><Tooltip><TooltipTrigger asChild><Avatar className="size-6 -ml-1 first:ml-0 border-2 border-white"><AvatarFallback className="text-[8px] bg-jl-blue text-white">{a.user?.fullName ? initials(a.user.fullName) : 'U'}</AvatarFallback></Avatar></TooltipTrigger><TooltipContent>{a.user?.fullName || ''}</TooltipContent></Tooltip></TooltipProvider>))}{caseDetail.assignments.length > 6 && <span className="text-[10px] text-jl-muted ml-1">+{caseDetail.assignments.length - 6}</span>}</div>
            )}
          </DialogHeader>
          <Tabs defaultValue="resume" className="flex-1 overflow-hidden">
            <TabsList className="w-full flex-wrap h-auto"><TabsTrigger value="resume">Résumé</TabsTrigger><TabsTrigger value="timeline">Chronologie</TabsTrigger><TabsTrigger value="taches">Tâches</TabsTrigger><TabsTrigger value="events">Événements</TabsTrigger><TabsTrigger value="equipe">Équipe</TabsTrigger><TabsTrigger value="factures">Factures</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger><TabsTrigger value="documents">Documents</TabsTrigger><TabsTrigger value="workflow" className="gap-1"><ClipboardList className="size-3" />Workflow</TabsTrigger>{hasAI.data && <TabsTrigger value="ia" className="gap-1"><Brain className="size-3" />Analyse IA</TabsTrigger>}</TabsList>
            <TabsContent value="resume" className="mt-4 space-y-3 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-jl-secondary">Client :</span> <span className="font-medium">{caseDetail?.client ? caseDetail.client.fullName : '—'}</span></div>
                <div><span className="text-jl-secondary">Type :</span> <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[caseDetail?.caseType || ''] || caseDetail?.caseType}</Badge></div>
                <div><span className="text-jl-secondary">Statut :</span> <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[caseDetail?.status || ''])}>{STATUS_LABELS[caseDetail?.status || ''] || caseDetail?.status}</Badge></div>
                <div><span className="text-jl-secondary">Priorité :</span> <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[caseDetail?.priority || ''])}>{PRIORITY_LABELS[caseDetail?.priority || ''] || caseDetail?.priority}</Badge></div>
                {caseDetail?.adversary && <div className="col-span-2"><span className="text-jl-secondary">Partie adverse :</span> <span className="font-medium">{caseDetail.adversary}</span></div>}
                {caseDetail?.jurisdiction && <div className="col-span-2"><span className="text-jl-secondary">Juridiction :</span> <span className="font-medium">{caseDetail.jurisdiction}</span></div>}
                {caseDetail?.amountInDispute != null && <div><span className="text-jl-secondary">Montant en jeu :</span> <span className="font-medium">{fmtMoney(caseDetail.amountInDispute)}</span></div>}
                {caseDetail?.billingType && <div><span className="text-jl-secondary">Facturation :</span> <Badge variant="secondary" className="text-[10px]">{BILLING_LABELS[caseDetail.billingType] || caseDetail.billingType}</Badge></div>}
                <div className="col-span-2"><span className="text-jl-secondary">Description :</span><p className="mt-1 text-sm text-jl-secondary whitespace-pre-wrap">{caseDetail?.description || 'Aucune description'}</p></div>
              </div>
            </TabsContent>
            <TabsContent value="timeline" className="mt-3">
              {/* Search & Sort toolbar */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-jl-muted" />
                  <Input placeholder="Rechercher dans la timeline…" value={timelineSearch} onChange={e => setTimelineSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                  {timelineSearch && <button onClick={() => setTimelineSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-jl-muted hover:text-jl-secondary"><X className="size-3" /></button>}
                </div>
                <button onClick={() => setTimelineSort(s => s === 'desc' ? 'asc' : 'desc')} className={cn('flex items-center gap-1 px-2.5 h-8 rounded-md border text-[11px] font-medium transition-colors', timelineSort === 'asc' ? 'bg-jl-blue/5 border-jl-blue/20 text-jl-blue' : 'bg-jl-card border-jl text-jl-secondary hover:bg-jl-page')}>
                  <ArrowUpDown className="size-3" />{timelineSort === 'desc' ? 'Récent' : 'Ancien'}
                </button>
              </div>
              {/* Filter pills */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-3 border-b border-jl">
                <span className="text-[10px] font-semibold text-jl-secondary uppercase tracking-wider mr-1">Filtrer :</span>
                {[
                  { type: 'event', label: 'Événements', icon: Calendar, color: '#C8A45D' },
                  { type: 'note', label: 'Notes', icon: MessageSquare, color: '#6366F1' },
                  { type: 'doc', label: 'Documents', icon: FileText, color: '#059669' },
                  { type: 'task', label: 'Tâches', icon: ClipboardList, color: '#D97706' },
                  { type: 'invoice', label: 'Factures', icon: Receipt, color: '#926B2D' },
                  { type: 'payment', label: 'Paiements', icon: Wallet, color: '#059669' },
                  { type: 'communication', label: 'Comms', icon: MessageCircle, color: '#0891B2' },
                ].map(f => {
                  const active = timelineFilter.has(f.type)
                  const FI = f.icon
                  const count = timelineCounts[f.type] || 0
                  return (
                    <button key={f.type} onClick={() => toggleTimelineFilter(f.type)} className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border', active ? 'border-current/20 shadow-sm' : 'border-jl bg-jl-page text-jl-muted hover:bg-jl-page')} style={active ? { backgroundColor: f.color + '12', color: f.color, borderColor: f.color + '30' } : undefined}>
                      <FI className="size-3" />
                      <span>{f.label}</span>
                      <span className={cn('text-[9px] ml-0.5', active ? 'opacity-70' : 'text-jl-muted')}>{count}</span>
                    </button>
                  )
                })}
              </div>
              {/* Inline creation */}
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => { setShowInlineNote(v => !v); setShowInlineEvent(false) }}>
                  <Plus className="size-3" />Note
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => { setShowInlineEvent(v => !v); setShowInlineNote(false) }}>
                  <CalendarPlus className="size-3" />Événement
                </Button>
              </div>
              {/* Inline note form */}
              <AnimatePresence>
              {showInlineNote && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="border border-[#6366F1]/30 bg-[#6366F1]/[0.03] rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="size-4 text-[#6366F1]" />
                    <span className="text-xs font-semibold text-[#6366F1]">Nouvelle note</span>
                  </div>
                  <Textarea value={inlineNote} onChange={e => setInlineNote(e.target.value)} placeholder="Écrivez votre note…" rows={2} className="text-sm mb-2 resize-none" autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowInlineNote(false); setInlineNote('') }}>Annuler</Button>
                    <Button size="sm" className="text-xs h-7 bg-[#6366F1] hover:bg-[#6366F1]/90" disabled={!inlineNote.trim() || createNoteMut.isPending} onClick={() => createNoteMut.mutate({ content: inlineNote })}>{createNoteMut.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Ajouter'}</Button>
                  </div>
                </div>
                </motion.div>
              )}
              </AnimatePresence>
              {/* Inline event form */}
              <AnimatePresence>
              {showInlineEvent && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="border border-jl-gold/30 bg-jl-gold/[0.03] rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="size-4 text-jl-gold" />
                    <span className="text-xs font-semibold text-jl-gold">Nouvel événement</span>
                  </div>
                  <div className="space-y-2">
                    <Input value={inlineEvent.title} onChange={e => setInlineEvent(f => ({ ...f, title: e.target.value }))} placeholder="Titre de l'événement" className="text-sm h-8" autoFocus />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={inlineEvent.eventType} onValueChange={v => setInlineEvent(f => ({ ...f, eventType: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="audience">Audience</SelectItem><SelectItem value="rdv">Rendez-vous</SelectItem><SelectItem value="echeance">Échéance</SelectItem><SelectItem value="depot">Dépôt</SelectItem><SelectItem value="autre">Autre</SelectItem></SelectContent>
                      </Select>
                      <Input type="datetime-local" value={inlineEvent.startTime} onChange={e => setInlineEvent(f => ({ ...f, startTime: e.target.value }))} className="text-xs h-8" />
                    </div>
                    <Textarea value={inlineEvent.description} onChange={e => setInlineEvent(f => ({ ...f, description: e.target.value }))} placeholder="Description (optionnel)" rows={1} className="text-sm resize-none" />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowInlineEvent(false); setInlineEvent({ title: '', description: '', eventType: 'autre', startTime: '' }) }}>Annuler</Button>
                    <Button size="sm" className="text-xs h-7 bg-[#926B2D] hover:bg-[#926B2D]/90" disabled={!inlineEvent.title.trim() || !inlineEvent.startTime || createEventMut.isPending} onClick={() => createEventMut.mutate({ title: inlineEvent.title, description: inlineEvent.description || undefined, eventType: inlineEvent.eventType, startTime: inlineEvent.startTime })}>{createEventMut.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Ajouter'}</Button>
                  </div>
                </div>
                </motion.div>
              )}
              </AnimatePresence>
              {/* Timeline content */}
              <ScrollArea className="max-h-[45vh]">
                {timelineLoading ? (
                  <div className="space-y-4 py-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="space-y-3">
                        <div className="flex items-center gap-2"><Skeleton className="size-3 rounded-full" /><Skeleton className="h-3 w-36" /><div className="flex-1 h-px bg-jl-page" /></div>
                        <div className="pl-8 space-y-3">
                          <Skeleton className="h-16 w-full rounded-lg" />
                          <Skeleton className="h-16 w-3/4 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : timelineGrouped.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-jl-muted">
                    <div className="size-16 rounded-2xl bg-jl-page flex items-center justify-center mb-4">
                      {timelineSearch ? <SearchX className="size-7 opacity-40" /> : <Activity className="size-7 opacity-40" />}
                    </div>
                    <p className="text-sm font-medium mb-1">{timelineSearch ? `Aucun r\u00E9sultat pour \u00AB ${timelineSearch} \u00BB` : 'Aucune activit\u00E9'}</p>
                    <p className="text-xs">{timelineSearch ? 'Essayez un autre terme' : timelineFilter.size < 7 ? 'Ajustez les filtres ou ajoutez une note' : 'Ajoutez une note ou un \u00E9v\u00E9nement pour commencer'}</p>
                    {timelineSearch && <button onClick={() => setTimelineSearch('')} className="text-xs text-jl-blue hover:underline mt-2">Effacer la recherche</button>}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {timelineGrouped.map(group => (
                      <div key={group.key}>
                        {/* Date header */}
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="size-2.5 rounded-full bg-jl-blue ring-4 ring-[#1E5A8A]/10" />
                          <span className="text-[11px] font-bold text-jl-secondary tracking-wide">{group.label}</span>
                          <div className="flex-1 h-px bg-gradient-to-r from-[#E5E7EB] to-transparent" />
                          <span className="text-[10px] text-jl-muted tabular-nums">{group.items.length} élément{group.items.length > 1 ? 's' : ''}</span>
                        </div>
                        {/* Timeline items */}
                        <div className="relative pl-9">
                          {/* Vertical line */}
                          <div className="absolute left-[10px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[#D1D5DB] via-[#E5E7EB] to-transparent rounded-full" />
                          {group.items.map((item, idx) => {
                            const Icon = timelineIconMap[item.type] || Activity
                            const isTaskDone = item.type === 'task' && item.status === 'terminee'
                            const isDeletable = item.type === 'note' || item.type === 'event'
                            const isDeleting = deletingItem === item.id
                            const isCritical = item.metadata?.criticality === 'urgente'
                            const isOverdue = item.type === 'invoice' && item.status === 'non_paye'
                            return (
                              <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: idx * 0.04 }} className="relative pb-4 last:pb-0 group/item">
                                {/* Timeline dot */}
                                <div className="absolute -left-9 top-2 flex items-center justify-center">
                                  <div className={cn('size-[22px] rounded-full bg-jl-card border-2 flex items-center justify-center transition-all group-hover/item:scale-110 group-hover/item:shadow-md', isCritical && 'ring-2 ring-[#EF4444]/30')} style={{ borderColor: item.color }}>
                                    <Icon className="size-2.5" style={{ color: item.color }} />
                                  </div>
                                </div>
                                {/* Content card */}
                                <div className={cn(
                                  'rounded-lg border p-3 transition-all ml-1 group-hover/item:shadow-sm group-hover/item:border-jl cursor-default',
                                  isTaskDone && 'opacity-60',
                                  isDeleting && 'opacity-40 pointer-events-none',
                                  isCritical && 'border-[#EF4444]/20 bg-[var(--danger)]/[0.02]',
                                  isOverdue && 'border-[#EF4444]/15 bg-[var(--danger)]/[0.01]',
                                )} style={{ borderColor: isCritical || isOverdue ? undefined : item.color + '20' }}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className={cn('text-sm font-medium', isTaskDone && 'line-through')}>{item.title}</p>
                                        {item.amount != null && (
                                          <span className={cn('text-xs font-bold', item.type === 'payment' ? 'text-[var(--success)]' : item.status === 'non_paye' ? 'text-[var(--danger)]' : 'text-jl-secondary')}>
                                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: item.currency || 'XAF', minimumFractionDigits: 0 }).format(item.amount)}
                                          </span>
                                        )}
                                        {isCritical && <Badge variant="outline" className="text-[9px] border-[#EF4444]/40 text-[var(--danger)] animate-pulse">Urgent</Badge>}
                                        {isOverdue && <Badge variant="outline" className="text-[9px] border-[#EF4444]/40 text-[var(--danger)]">Impayé</Badge>}
                                      </div>
                                      {item.author && <p className="text-[10px] text-jl-muted mt-0.5 flex items-center gap-1"><UserCircle className="size-3" />{item.author}</p>}
                                      <p className="text-xs text-jl-secondary mt-1 leading-relaxed line-clamp-3">{item.description}</p>
                                      {/* Comm type & recipient details */}
                                      {item.type === 'communication' && item.metadata?.commType && (
                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-jl-blue">
                                          {item.metadata.commType === 'email' ? <Mail className="size-3" /> : item.metadata.commType === 'sms' ? <MessageSquare className="size-3" /> : item.metadata.commType === 'whatsapp' ? <MessageCircle className="size-3" /> : <Send className="size-3" />}
                                          <span>{item.metadata.recipientEmail || item.metadata.recipientPhone || ''}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      <span className="text-[10px] text-jl-muted">{relativeTime(item.date)}</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: item.color + '15', color: item.color }}>{timelineTypeLabels[item.type] || item.type}</span>
                                    </div>
                                  </div>
                                  {/* Footer: full time + delete action */}
                                  <div className="flex items-center justify-between mt-1.5">
                                    <p className="text-[9px] text-jl-muted opacity-0 group-hover/item:opacity-100 transition-opacity">{fmtDateTime(item.date)}</p>
                                    {isDeletable && (
                                      <button
                                        className={cn(
                                          'opacity-0 group-hover/item:opacity-100 transition-all p-1 rounded-md hover:bg-[#FEE2E2] text-jl-muted hover:text-[var(--danger)]',
                                          isDeleting && 'opacity-100 animate-pulse'
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (deletingItem === item.id) {
                                            handleDeleteTimelineItem(item.id)
                                          } else {
                                            setDeletingItem(item.id)
                                            setTimeout(() => setDeletingItem(null), 3000)
                                          }
                                        }}
                                        title={deletingItem === item.id ? 'Cliquez pour confirmer la suppression' : 'Supprimer'}
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="notes" className="mt-4 space-y-3 overflow-y-auto max-h-[50vh]">
              {(caseDetail?.notes || []).length === 0 ? <p className="text-sm text-jl-muted text-center py-8">Aucune note</p> :
                (caseDetail?.notes || []).map(n => (
                  <div key={n.id} className="border rounded-lg p-3"><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium">{n.author?.fullName || '—'}</span><span className="text-[10px] text-jl-muted">{fmtDateTime(n.createdAt)}</span></div><p className="text-sm text-jl-secondary whitespace-pre-wrap">{n.content}</p></div>
                ))}
            </TabsContent>
            <TabsContent value="documents" className="mt-4 overflow-y-auto max-h-[50vh]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-jl-secondary">{(caseDetail?.documents || []).length} document{(caseDetail?.documents || []).length > 1 ? 's' : ''}</span>
                <div className="flex items-center gap-2">
                  {caseUploading && <div className="flex items-center gap-2"><Progress value={caseUploadProgress} className="w-20 h-1.5" /><span className="text-[10px] text-jl-muted">{caseUploadProgress}%</span></div>}
                  <input ref={caseFileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setCaseUploadFile(f); handleCaseDocUpload() } }} />
                  <Button size="sm" variant="outline" disabled={caseUploading} onClick={() => caseFileRef.current?.click()}><Upload className="size-3.5 mr-1" />Ajouter</Button>
                </div>
              </div>
              {/* Generate from template */}
              {(caseTemplates || []).length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg border border-jl bg-jl-page">
                  <FileCode2 className="size-4 text-jl-gold shrink-0" />
                  <Select value={caseTplId} onValueChange={setCaseTplId}>
                    <SelectTrigger className="h-8 text-xs flex-1 min-w-0"><SelectValue placeholder="Générer depuis modèle..." /></SelectTrigger>
                    <SelectContent>{(caseTemplates || []).map((t: DocTemplate) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" disabled={!caseTplId || caseTplGenerating} onClick={handleCaseTplGenerate} className="shrink-0">
                    {caseTplGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5 mr-1" />}Générer
                  </Button>
                </div>
              )}
              {(() => {
                const docs = caseDetail?.documents || []
                if (docs.length === 0) return <p className="text-sm text-jl-muted text-center py-8">Aucun document</p>
                return (
                  <div className="space-y-1.5">
                    {docs.map((d: Doc) => (
                      <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-jl-page border border-jl group">
                        <div className="shrink-0 p-1.5 rounded bg-jl-page">
                          {d.mimeType?.includes('pdf') ? <FileText className="size-4 text-red-500" /> : d.mimeType?.includes('image') ? <FileImage className="size-4 text-emerald-500" /> : <FileText className="size-4 text-jl-muted" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate cursor-pointer hover:text-jl-blue" onClick={() => { if (d.mimeType?.includes('pdf') || d.mimeType?.includes('image')) setCasePreviewDoc(d) }}>{d.fileName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-jl-muted">{fmtFileSize(d.fileSize)}</span>
                            {d.version > 1 && <Badge variant="outline" className="text-[9px] px-1 py-0 text-jl-blue border-jl-blue/30">v{d.version}</Badge>}
                            {d.tags && d.tags.split(',').slice(0, 2).map((t: string, i: number) => <Badge key={i} variant="outline" className="text-[9px] px-1 py-0 border-jl text-jl-secondary"><Tag className="size-2 mr-0.5" />{t.trim()}</Badge>)}
                          </div>
                        </div>
                        <a href={`/api/documents/${d.id}/download`} onClick={e => e.stopPropagation()} className="shrink-0 text-xs text-jl-blue hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download className="size-3" />Télécharger
                        </a>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </TabsContent>
            <TabsContent value="taches" className="mt-4 overflow-y-auto max-h-[50vh]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-jl-secondary">{(Array.isArray(caseTasks) ? caseTasks : []).length} tâche{(Array.isArray(caseTasks) ? caseTasks : []).length > 1 ? 's' : ''}</span>
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleGenerateWorkflow} disabled={generatingWorkflow}>
                  {generatingWorkflow ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  Générer les tâches
                </Button>
              </div>
              {(Array.isArray(caseTasks) && caseTasks.length === 0) ? <p className="text-sm text-jl-muted text-center py-8">Aucune tâche — cliquez sur « Générer les tâches » pour créer les tâches recommandées</p> :
              <div className="space-y-2">{(Array.isArray(caseTasks) ? caseTasks : []).map((t: TaskItem) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl">
                  <span className={cn('size-2 rounded-full shrink-0', t.priority === 'urgente' ? 'bg-[var(--danger)]' : t.priority === 'haute' ? 'bg-[var(--accent)]' : 'bg-jl-gold')} />
                  <div className="min-w-0 flex-1"><p className={cn('text-sm font-medium', t.status === 'terminee' && 'line-through')}>{t.title}</p>{t.dueDate && <p className="text-[10px] text-jl-muted">Échéance: {fmtDate(t.dueDate)}</p>}</div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', taskStatusColor(t.status))}>{taskStatusLabel(t.status)}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="events" className="mt-4 overflow-y-auto max-h-[50vh]">
              {(caseDetail?.events || []).length === 0 ? <p className="text-sm text-jl-muted text-center py-8">Aucun événement</p> :
              <div className="space-y-2">{(caseDetail?.events || []).map((e: EventItem) => (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl">
                  <Calendar className="size-4 text-jl-gold shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{e.title}</p><p className="text-[10px] text-jl-muted">{fmtDateTime(e.startTime)}{e.description ? ` • ${e.description}` : ''}</p></div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{EVENT_TYPE_LABELS[e.eventType] || e.eventType}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="equipe" className="mt-4 overflow-y-auto max-h-[50vh]">
              {(caseDetail?.assignments || []).length === 0 ? <p className="text-sm text-jl-muted text-center py-8">Aucun membre assigné</p> :
              <div className="space-y-2">{(caseDetail?.assignments || []).map((a: CaseAssignment) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl">
                  <Avatar className="size-8"><AvatarFallback className="text-[10px] bg-jl-blue text-white">{a.user?.fullName ? initials(a.user.fullName) : 'U'}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{a.user?.fullName || '—'}</p><p className="text-[10px] text-jl-muted">{ROLE_LABELS[a.user?.role || ''] || a.user?.role || ''}</p></div>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="ia" className="mt-4 overflow-y-auto max-h-[50vh]">
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-4 pr-2">
                  <AIAnalysisPanel analysis={aiAnalysis} loading={aiLoading} cached={aiCached} analyzedAt={aiAnalyzedAt} onAnalyze={() => handleAnalyzeCase(false)} onRefresh={() => handleAnalyzeCase(true)} />
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><Gavel className="size-4 text-jl-gold" /><span className="text-xs font-semibold">Recherche de jurisprudence</span></div>
                    <div className="flex gap-2">
                      <Input placeholder="Ex: clause de non-concurrence OHADA..." value={aiJurisQuery} onChange={e => setAiJurisQuery(e.target.value)} className="h-8 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && handleJurisprudence()} />
                      <Button size="sm" className="h-8 text-xs gap-1" disabled={aiJurisLoading || !aiJurisQuery.trim()} onClick={handleJurisprudence}>{aiJurisLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}Rechercher</Button>
                    </div>
                    {aiJurisLoading && <div className="flex items-center gap-2 text-xs text-jl-muted py-2"><Loader2 className="size-3 animate-spin" />Recherche en cours…</div>}
                    {aiJurisResult && <Card className="border-jl"><CardContent className="p-3 text-sm text-jl-secondary whitespace-pre-wrap leading-relaxed">{aiJurisResult}</CardContent></Card>}
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="size-4 text-jl-blue" /><span className="text-xs font-semibold">Résumé des documents</span></div><Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={aiSummaryLoading} onClick={handleSummary}>{aiSummaryLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}Résumer</Button></div>
                    {aiSummaryLoading && <div className="flex items-center gap-2 text-xs text-jl-muted py-2"><Loader2 className="size-3 animate-spin" />Analyse des documents en cours…</div>}
                    {aiSummaryResult && <Card className="border-jl-blue/20 bg-jl-blue/[0.03]"><CardContent className="p-3 text-sm text-jl-secondary whitespace-pre-wrap leading-relaxed">{aiSummaryResult}</CardContent></Card>}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="workflow" className="mt-4 overflow-y-auto max-h-[50vh]">
              {/* Progress indicator */}
              {(Array.isArray(caseTasks) && caseTasks.length > 0) && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-jl-secondary">Progression des tâches</span>
                    <span className="text-xs font-semibold">{caseTasks.filter((t: TaskItem) => t.status === 'terminee').length}/{caseTasks.length}</span>
                  </div>
                  <Progress value={caseTasks.length > 0 ? (caseTasks.filter((t: TaskItem) => t.status === 'terminee').length / caseTasks.length) * 100 : 0} className="h-2" />
                </div>
              )}
            </TabsContent>
            <TabsContent value="factures" className="mt-4 overflow-y-auto max-h-[50vh]">
              {(caseInvoices || []).length === 0 ? <p className="text-sm text-jl-muted text-center py-8">Aucune facture</p> :
              <div className="space-y-2">{(caseInvoices || []).map((inv: Invoice) => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl">
                  <Receipt className="size-4 text-jl-gold shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{inv.id.slice(0,8)}</p><p className="text-[10px] text-jl-muted">{fmtDate(inv.createdAt)}{inv.dueDate ? ` • Échéance: ${fmtDate(inv.dueDate)}` : ''}</p></div>
                  <span className="text-sm font-semibold shrink-0">{fmtMoney(inv.amount, inv.currency?.code || 'XAF')}</span>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[inv.status])}>{STATUS_LABELS[inv.status] || inv.status}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Case Document Preview */}
      <Dialog open={!!casePreviewDoc} onOpenChange={() => setCasePreviewDoc(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0"><DialogTitle className="text-sm truncate">{casePreviewDoc?.fileName}</DialogTitle><DialogDescription className="text-xs">{casePreviewDoc ? fmtFileSize(casePreviewDoc.fileSize) : ''}</DialogDescription></DialogHeader>
          <div className="flex-1 min-h-0">
            {casePreviewDoc && casePreviewDoc.mimeType?.includes('pdf') && (
              <iframe src={`/api/documents/${casePreviewDoc.id}/download`} className="w-full h-full border-0" title="Aperçu PDF" />
            )}
            {casePreviewDoc && casePreviewDoc.mimeType?.includes('image') && (
              <div className="flex items-center justify-center h-full bg-jl-page p-4"><img src={`/api/documents/${casePreviewDoc.id}/download`} alt={casePreviewDoc.fileName} className="max-w-full max-h-full object-contain rounded" /></div>
            )}
          </div>
          <DialogFooter className="px-4 py-3 border-t shrink-0">
            <a href={`/api/documents/${casePreviewDoc?.id}/download`} download><Button size="sm" variant="outline"><Download className="size-4 mr-1" />Télécharger</Button></a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

