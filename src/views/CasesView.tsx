'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon, SlidersHorizontal, Table2, EmptyState } from './shared-ui'
import { t } from '@/lib/i18n'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, ROLE_LABELS, BILLING_LABELS } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, uploadWithProgress } from './helpers'
import { useFormDraft, registerDirtyForm, unregisterDirtyForm } from '@/hooks/useFormDraft'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData, CaseTag, CaseWithDetails, CasesListResponse } from './types'

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
          <p className="text-sm font-medium text-jl-primary">{t('cases.aiAnalyzing')}</p>
          <p className="text-xs text-jl-muted mt-1">{t('cases.aiExamining')}</p>
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
          <p className="text-sm font-medium">{t('cases.aiAvailable')}</p>
          <p className="text-xs text-jl-muted mt-1">{t('cases.aiGetAnalysis')}</p>
        </div>
        <Button onClick={onAnalyze} className="gap-2"><Sparkles className="size-4" />{t('cases.aiRunAnalysis')}</Button>
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
          {cached && <Badge variant="outline" className="text-[9px] text-jl-muted border-jl">{t('cases.aiCached')}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {analyzedAt && <span className="text-[10px] text-jl-muted">{new Date(analyzedAt).toLocaleString('fr-FR')}</span>}
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn('size-3', loading && 'animate-spin')} />{t('cases.aiRefreshAnalysis')}
          </Button>
        </div>
      </div>

      {/* Résumé */}
      {analysis.resume && (
        <Card className="border-jl-blue/20 bg-jl-blue/[0.03]">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold text-jl-blue flex items-center gap-1.5"><FileText className="size-3.5" />{t('cases.tabSummary')}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3"><p className="text-sm text-jl-secondary leading-relaxed">{String(analysis.resume)}</p></CardContent>
        </Card>
      )}

      {/* Chronologie */}
      {analysis.chronologie && (
        <Card className="border-jl-gold/20 bg-jl-gold/[0.03]">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold text-jl-gold flex items-center gap-1.5"><History className="size-3.5" />{t('cases.tabTimeline')}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3"><ReactMarkdown>{String(analysis.chronologie)}</ReactMarkdown></CardContent>
        </Card>
      )}

      {/* Parties */}
      {analysis.parties && (
        <Card className="border-jl">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><Scale className="size-3.5" />{t('cases.subtitle')}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3"><ReactMarkdown>{String(analysis.parties)}</ReactMarkdown></CardContent>
        </Card>
      )}

      {/* Questions juridiques */}
      {questions.length > 0 && (
        <Card className="border-jl">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><Gavel className="size-3.5" />{t('cases.jurisSearch')}</CardTitle></CardHeader>
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
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><AlertTriangle className="size-3.5" />{t('cases.identifiedRisks')}</CardTitle></CardHeader>
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
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><FileWarning className="size-3.5" />{t('cases.missingDocs')}</CardTitle></CardHeader>
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
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><Clock className="size-3.5" />{t('cases.deadlines')}</CardTitle></CardHeader>
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
                    {e.urgence === 'haute' ? t('cases.urgent') : e.urgence === 'moyenne' ? t('cases.urgentMedium') : t('cases.urgentLow')}
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
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><Target className="size-3.5" />{t('cases.recommendedActions')}</CardTitle></CardHeader>
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
  const { user, pendingResourceOpen, setPendingResourceOpen, setHasUnsavedChanges } = useAppStore()
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
  const [form, setForm] = useState({ title: '', description: '', caseType: 'civil', status: 'nouveau', priority: 'normal', clientId: '', reference: '', adversary: '', jurisdiction: '', amountInDispute: '', billingType: '', nextDueDate: '', outcome: '', paymentStatus: '', isSecret: false })
  const { restoredDraft: caseRestoredDraft, isDirty: caseIsDirty, clearDraft: clearCaseDraft, getDraft: getCaseDraft } = useFormDraft('case-form', form as unknown as Record<string, unknown>, { enabled: dialogOpen })
  const caseHasDraft = caseIsDirty

  // Sync dirty state with global store
  useEffect(() => { registerDirtyForm('case-form', caseIsDirty); setHasUnsavedChanges(caseIsDirty); return () => { unregisterDirtyForm('case-form') } }, [caseIsDirty])

  // Restore draft on mount
  useEffect(() => { if (caseRestoredDraft) { const draft = getCaseDraft(); if (draft && draft.title) setForm(draft as typeof form) } }, [caseRestoredDraft])
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
  // Advanced filters & view
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Deep-linking: open a case if pendingResourceOpen is set
  useEffect(() => {
    if (pendingResourceOpen?.resourceType === 'case' && pendingResourceOpen.resourceId) {
      fetch(`/api/cases/${pendingResourceOpen.resourceId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setSelectedCase(data)
            setDetailOpen(true)
          }
        })
        .catch(() => {})
        .finally(() => setPendingResourceOpen(null))
    }
  }, [pendingResourceOpen, setPendingResourceOpen])

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
        toast.error(data.error || t('cases.aiError'))
      }
    } catch (err: any) {
      toast.error(err?.message || t('cases.aiError'))
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
      toast.success(t('cases.documentAdded'))
      qc.invalidateQueries({ queryKey: ['case-detail', selectedCase.id] })
      qc.invalidateQueries({ queryKey: ['case-timeline', selectedCase.id] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      setCaseUploadFile(null)
    } catch (err: any) { toast.error(err?.message || t('cases.uploadError')) } finally { setCaseUploading(false); setCaseUploadProgress(0) }
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
        toast.success(`${data.taskCount} ${t('cases.applyWorkflow')} (${data.templateName})`)
        qc.invalidateQueries({ queryKey: ['case-tasks', selectedCase.id] })
        qc.invalidateQueries({ queryKey: ['case-timeline', selectedCase.id] })
      } else if (data.alreadyApplied) {
        toast.info(t('cases.workflowAlreadyApplied'))
      } else {
        toast.error(data.error || t('cases.taskGenError'))
      }
    } catch (err: any) {
      toast.error(err?.message || t('cases.taskGenError'))
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
        const err = await res.json().catch(() => ({ error: t('common.error') }))
        toast.error(err.error || t('cases.taskGenError'))
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
      toast.success(t('cases.docGenerated'))
      setCaseTplId('')
    } catch (err: any) {
      toast.error(err?.message || t('cases.taskGenError'))
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
        toast.error(data.error || t('cases.jurisError'))
      }
    } catch (err: any) { toast.error(err?.message || t('cases.jurisError')) } finally { setAiJurisLoading(false) }
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
        toast.error(data.error || t('cases.summaryError'))
      }
    } catch (err: any) { toast.error(err?.message || t('cases.summaryError')) } finally { setAiSummaryLoading(false) }
  }

  const { data: casesData, isLoading } = useQuery({
    queryKey: ['cases', page, filterStatus, filterType, filterPriority, filterClient, filterSearch, filterTag, filterOutcome, filterPaymentStatus, sortBy, sortOrder],
    queryFn: () => {
      const params = new URLSearchParams()
      if (user?.tenantId) params.set('tenantId', user.tenantId)
      if (page) params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (filterStatus) params.set('status', filterStatus)
      if (filterType) params.set('caseType', filterType)
      if (filterPriority) params.set('priority', filterPriority)
      if (filterClient) params.set('clientId', filterClient)
      if (filterSearch) params.set('search', filterSearch)
      if (filterTag) params.set('tag', filterTag)
      if (filterOutcome) params.set('outcome', filterOutcome)
      if (filterPaymentStatus) params.set('paymentStatus', filterPaymentStatus)
      if (sortBy) params.set('sortBy', sortBy)
      if (sortOrder) params.set('sortOrder', sortOrder)
      return fetch(`/api/cases?${params.toString()}`).then(r => r.json())
    },
  })
  const cases = (casesData as CasesListResponse)?.cases || []
  const totalCases = (casesData as CasesListResponse)?.total || 0
  const totalPages = (casesData as CasesListResponse)?.totalPages || 1

  const { data: clients } = useQuery({
    queryKey: ['clients-mini', user?.tenantId],
    queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const { data: caseTags } = useQuery({
    queryKey: ['case-tags'],
    queryFn: () => fetch('/api/cases/tags').then(r => r.json()).then(d => Array.isArray(d) ? d : []),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); qc.invalidateQueries({ queryKey: ['case-tags'] }); toast.success(t('cases.caseCreated')); setDialogOpen(false); resetForm(); clearCaseDraft() },
    onError: () => toast.error(t('cases.createError')),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => fetch(`/api/cases/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); qc.invalidateQueries({ queryKey: ['case-detail'] }); qc.invalidateQueries({ queryKey: ['case-tags'] }); toast.success(t('cases.caseUpdated')); clearCaseDraft() },
    onError: () => toast.error(t('cases.updateError')),
  })

  const createNoteMut = useMutation({
    mutationFn: (body: { content: string }) => fetch(`/api/cases/${selectedCase!.id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: body.content, authorId: user?.id, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-detail'] }); qc.invalidateQueries({ queryKey: ['case-timeline'] }); toast.success(t('cases.noteAdded')); setInlineNote(''); setShowInlineNote(false) },
    onError: () => toast.error(t('cases.addNoteError')),
  })

  const createEventMut = useMutation({
    mutationFn: (body: { title: string; description?: string; eventType: string; startTime: string }) => fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, caseId: selectedCase?.id, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-detail'] }); qc.invalidateQueries({ queryKey: ['case-timeline'] }); toast.success(t('cases.eventAdded')); setInlineEvent({ title: '', description: '', eventType: 'autre', startTime: '' }); setShowInlineEvent(false) },
    onError: () => toast.error(t('cases.addEventError')),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-timeline'] }); qc.invalidateQueries({ queryKey: ['case-detail'] }); toast.success(t('cases.noteDeleted')); setDeletingItem(null) },
    onError: () => { toast.error(t('cases.deleteError')); setDeletingItem(null) },
  })

  // Delete event mutation
  const deleteEventMut = useMutation({
    mutationFn: (eventId: string) => fetch(`/api/events/${eventId}`, { method: 'DELETE' }).then(r => r.ok ? { ok: true } : r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-timeline'] }); qc.invalidateQueries({ queryKey: ['case-detail'] }); toast.success(t('cases.eventDeleted')); setDeletingItem(null) },
    onError: () => { toast.error(t('cases.deleteError')); setDeletingItem(null) },
  })

  const handleDeleteTimelineItem = (id: string) => {
    if (id.startsWith('note-')) deleteNoteMut.mutate(id.replace('note-', ''))
    else if (id.startsWith('event-')) deleteEventMut.mutate(id.replace('event-', ''))
  }

  const resetForm = () => { setForm({ title: '', description: '', caseType: 'civil', status: 'nouveau', priority: 'normal', clientId: '', reference: '', adversary: '', jurisdiction: '', amountInDispute: '', billingType: '', nextDueDate: '', outcome: '', paymentStatus: '', isSecret: false }); setEditing(null); setConflicts([]); setSelectedCollabs([]); setSelectedTagIds([]) }
  const openEdit = (c: CaseItem) => {
    const wc = c as CaseWithDetails
    setEditing(c)
    setForm({ title: c.title, description: c.description || '', caseType: c.caseType, status: c.status, priority: c.priority, clientId: c.clientId, reference: c.reference, adversary: c.adversary || '', jurisdiction: c.jurisdiction || '', amountInDispute: c.amountInDispute?.toString() || '', billingType: c.billingType || '', nextDueDate: wc.nextDueDate?.slice(0, 10) || '', outcome: wc.outcome || '', paymentStatus: wc.paymentStatus || '', isSecret: c.isSecret || false })
    setSelectedCollabs(c.assignments?.map(a => a.userId) || [])
    setSelectedTagIds((wc.tags || []).map((t: CaseTag) => t.id))
    setDialogOpen(true)
  }
  const handleSubmit = () => {
    if (!form.title.trim() || !form.clientId) return
    const payload = { title: form.title, description: form.description || null, caseType: form.caseType, status: form.status, priority: form.priority, clientId: form.clientId, reference: form.reference, tenantId: user?.tenantId, adversary: form.adversary || null, jurisdiction: form.jurisdiction || null, amountInDispute: form.amountInDispute ? parseFloat(form.amountInDispute) : null, billingType: form.billingType || null, isSecret: form.isSecret || false, assignments: selectedCollabs, nextDueDate: form.nextDueDate || null, outcome: form.outcome || null, paymentStatus: form.paymentStatus || null, tagIds: selectedTagIds }
    if (editing) { updateMut.mutate({ id: editing.id, ...payload }) } else { createMut.mutate(payload) }
  }

  // Timeline from server — enrich with icons client-side
  const timelineIconMap: Record<string, React.ElementType> = { event: Calendar, note: MessageSquare, doc: FileText, task: ClipboardList, invoice: Receipt, payment: Wallet, communication: MessageCircle }
  const timelineTypeLabels: Record<string, string> = { event: t('cases.timeline.event'), note: t('cases.timeline.note'), doc: t('cases.timeline.doc'), task: t('cases.timeline.task'), payment: t('cases.timeline.payment'), invoice: t('cases.timeline.invoice'), communication: t('cases.timeline.communication') }

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
      else if (isYesterday) label = t('cases.yesterday')
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
        <h2 className="text-lg font-semibold">{t('common.cases')}</h2>
        <Button onClick={() => {
          const draft = getCaseDraft()
          if (draft && draft.title) { setForm(draft as typeof form); toast.info(t('cases.draftRestored')) } else { resetForm() }
          setDialogOpen(true)
        }} size="sm"><Plus className="size-4 mr-1" />{t('cases.new')}{caseHasDraft && <span className="ml-1 size-2 rounded-full bg-amber-400 inline-block" title={t('common.draft')} />}</Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-jl-muted" /><Input placeholder={t('common.search')} value={filterSearch} onChange={e => { setFilterSearch(e.target.value); setPage(1) }} className="pl-8 h-9 text-xs" /></div>
        <div className="flex items-center gap-2">
          <Button variant={showFilters ? 'default' : 'outline'} size="sm" className="h-9 text-xs gap-1.5" onClick={() => setShowFilters(f => !f)}>
            <SlidersHorizontal className="size-3.5" />{t('common.filter')}
            {(filterStatus || filterType || filterPriority || filterClient || filterTag || filterOutcome || filterPaymentStatus) && <span className="size-2 rounded-full bg-white/40" />}
          </Button>
          <div className="flex items-center border border-jl rounded-lg overflow-hidden">
            <button className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-jl-blue text-white' : 'bg-jl-card text-jl-muted hover:text-jl-secondary')} onClick={() => setViewMode('grid')} title={t('cases.gridView')}><LayoutGrid className="size-4" /></button>
            <button className={cn('p-2 transition-colors', viewMode === 'table' ? 'bg-jl-blue text-white' : 'bg-jl-card text-jl-muted hover:text-jl-secondary')} onClick={() => setViewMode('table')} title={t('cases.tableView')}><Table2 className="size-4" /></button>
          </div>
        </div>
      </div>
      {/* Collapsible filter panel */}
      <AnimatePresence>
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="border border-jl rounded-lg bg-jl-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-jl-secondary">{t('cases.advancedFilters')}</span>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => { setFilterStatus(''); setFilterType(''); setFilterPriority(''); setFilterClient(''); setFilterTag(''); setFilterOutcome(''); setFilterPaymentStatus(''); setSortBy('createdAt'); setSortOrder('desc'); setPage(1) }}>
                <RefreshCw className="size-3" />{t('cases.resetFilters')}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label className="text-[11px] text-jl-muted">Statut</Label><Select value={filterStatus} onValueChange={v => { setFilterStatus(v === '_all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Tous" /></SelectTrigger><SelectContent><SelectItem value="_all">Tous</SelectItem><SelectItem value="nouveau">Nouveau</SelectItem><SelectItem value="ouvert">Ouvert</SelectItem><SelectItem value="en_cours">En cours</SelectItem><SelectItem value="en_attente">En attente</SelectItem><SelectItem value="clos">Clos</SelectItem></SelectContent></Select></div>
              <div><Label className="text-[11px] text-jl-muted">Type</Label><Select value={filterType} onValueChange={v => { setFilterType(v === '_all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Tous" /></SelectTrigger><SelectContent><SelectItem value="_all">Tous</SelectItem><SelectItem value="civil">Civil</SelectItem><SelectItem value="penal">Pénal</SelectItem><SelectItem value="commercial">Commercial</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="administratif">Administratif</SelectItem></SelectContent></Select></div>
              <div><Label className="text-[11px] text-jl-muted">Priorité</Label><Select value={filterPriority} onValueChange={v => { setFilterPriority(v === '_all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Tous" /></SelectTrigger><SelectContent><SelectItem value="_all">Tous</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="haute">Haute</SelectItem><SelectItem value="urgente">Urgente</SelectItem><SelectItem value="basse">Basse</SelectItem></SelectContent></Select></div>
              <div><Label className="text-[11px] text-jl-muted">Client</Label><Select value={filterClient} onValueChange={v => { setFilterClient(v === '_all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Tous" /></SelectTrigger><SelectContent><SelectItem value="_all">Tous</SelectItem>{(Array.isArray(clients) ? clients : []).map(cl => <SelectItem key={cl.id} value={cl.id}>{cl.fullName}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-[11px] text-jl-muted">Étiquette</Label><Select value={filterTag} onValueChange={v => { setFilterTag(v === '_all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Toutes" /></SelectTrigger><SelectContent><SelectItem value="_all">Toutes</SelectItem>{(Array.isArray(caseTags) ? caseTags : []).map((t: CaseTag) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-[11px] text-jl-muted">Résultat</Label><Select value={filterOutcome} onValueChange={v => { setFilterOutcome(v === '_all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Tous" /></SelectTrigger><SelectContent><SelectItem value="_all">Tous</SelectItem><SelectItem value="gagné">Gagné</SelectItem><SelectItem value="perdu">Perdu</SelectItem><SelectItem value="transaction">Transaction</SelectItem><SelectItem value="abandonné">Abandonné</SelectItem><SelectItem value="en_cours">En cours</SelectItem></SelectContent></Select></div>
              <div><Label className="text-[11px] text-jl-muted">Paiement</Label><Select value={filterPaymentStatus} onValueChange={v => { setFilterPaymentStatus(v === '_all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Tous" /></SelectTrigger><SelectContent><SelectItem value="_all">Tous</SelectItem><SelectItem value="paye">Payé</SelectItem><SelectItem value="partiel">Partiel</SelectItem><SelectItem value="non_paye">Non payé</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label className="text-[11px] text-jl-muted">Trier par</Label><Select value={sortBy} onValueChange={v => setSortBy(v)}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="createdAt">Date de création</SelectItem><SelectItem value="updatedAt">Date de mise à jour</SelectItem><SelectItem value="title">Titre</SelectItem><SelectItem value="nextDueDate">Prochaine échéance</SelectItem><SelectItem value="amountInDispute">Montant en jeu</SelectItem></SelectContent></Select></div>
              <div><Label className="text-[11px] text-jl-muted">Ordre</Label><Select value={sortOrder} onValueChange={v => setSortOrder(v)}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="desc">Décroissant</SelectItem><SelectItem value="asc">Croissant</SelectItem></SelectContent></Select></div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (!Array.isArray(cases) || cases.length === 0) ? <EmptyState icon={Briefcase} title={t('cases.noCase')} description={t('cases.createFirst')} /> :
        viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cases.map(c => {
            const wc = c as CaseWithDetails
            const visibleTags = (wc.tags || []).slice(0, 3)
            const overflowTags = (wc.tags || []).length - 3
            const isPastDue = wc.nextDueDate && isBefore(parseISO(wc.nextDueDate), new Date())
            const outcomeColorMap: Record<string, string> = { gagné: 'bg-[#D1FAE5] text-[#065F46]', perdu: 'bg-[#FEE2E2] text-[#991B1B]', transaction: 'bg-[#FEF3C7] text-[#92400E]', abandonné: 'bg-[#F3F4F6] text-[#6B7280]', en_cours: 'bg-[#E8F0F8] text-[#1E5A8A]' }
            const outcomeLabelMap: Record<string, string> = { gagné: t('cases.outcome.won'), perdu: t('cases.outcome.lost'), transaction: t('cases.outcome.settled'), abandonné: t('cases.outcome.abandoned'), en_cours: t('cases.outcome.inProgress') }
            const payColorMap: Record<string, string> = { paye: 'bg-[#D1FAE5] text-[#065F46]', partiel: 'bg-[#FEF3C7] text-[#92400E]', non_paye: 'bg-[#FEE2E2] text-[#991B1B]' }
            const payLabelMap: Record<string, string> = { paye: t('invoices.settled'), partiel: t('invoices.partial'), non_paye: t('invoices.unpaid') }
            return (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedCase(c); setDetailOpen(true); setTimelineFilter(new Set(['event', 'note', 'doc', 'task', 'payment', 'invoice', 'communication'])); setShowInlineNote(false); setShowInlineEvent(false); setTimelineSearch('') }}>
              <CardHeader className="pb-2"><div className="flex items-start justify-between"><div className="flex items-center gap-1.5"><CardTitle className="text-sm font-semibold">{c.reference}</CardTitle>{c.isSecret && <Lock className="size-3 text-[var(--accent)]" />}</div><div className="flex items-center gap-1"><Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status] || c.status}</Badge></div></div><CardDescription className="text-xs mt-1 line-clamp-2">{c.title}</CardDescription></CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <p className="text-xs text-jl-secondary"><Users className="size-3 inline mr-1" />{getClientName(c)}</p>
                {c.adversary && <p className="text-xs text-jl-secondary"><Scale className="size-3 inline mr-1" />Contre : {c.adversary}</p>}
                {c.jurisdiction && <p className="text-xs text-jl-secondary"><MapPin className="size-3 inline mr-1" />{c.jurisdiction}</p>}
                {wc.nextDueDate && <p className={cn('text-xs flex items-center gap-1', isPastDue ? 'text-[var(--danger)] font-medium' : 'text-jl-secondary')}><Calendar className="size-3" />{t('cases.nextDeadline')} : {fmtDate(wc.nextDueDate)}</p>}
                {c.amountInDispute != null && c.amountInDispute > 0 && <p className="text-xs font-medium text-jl-gold"><Banknote className="size-3 inline mr-1" />{fmtMoney(c.amountInDispute)}</p>}
                {visibleTags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {visibleTags.map((t: CaseTag) => (
                      <span key={t.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.color + '18', color: t.color }}><span className="size-1.5 rounded-full" style={{ backgroundColor: t.color }} />{t.name}</span>
                    ))}
                    {overflowTags > 0 && <span className="text-[10px] text-jl-muted">+{overflowTags}</span>}
                  </div>
                )}
                <div className="flex items-center flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[c.caseType] || c.caseType}</Badge>
                  {c.billingType && <Badge variant="secondary" className="text-[10px]">{BILLING_LABELS[c.billingType] || c.billingType}</Badge>}
                  {wc.outcome && <Badge variant="outline" className={cn('text-[10px]', outcomeColorMap[wc.outcome])}>{outcomeLabelMap[wc.outcome] || wc.outcome}</Badge>}
                  {wc.paymentStatus && <Badge variant="outline" className={cn('text-[10px]', payColorMap[wc.paymentStatus])}>{payLabelMap[wc.paymentStatus] || wc.paymentStatus}</Badge>}
                </div>
                <div className="flex items-center justify-end pt-1">
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(c)}><Edit className="size-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
        ) : (
        /* TABLE VIEW */
        <div className="border border-jl rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="sticky top-0 bg-jl-card z-10 hover:bg-jl-card">
              <TableHead className="text-xs">Réf</TableHead>
              <TableHead className="text-xs">Titre</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Client</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Priorité</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Échéance</TableHead>
              <TableHead className="text-xs hidden xl:table-cell">Tags</TableHead>
              <TableHead className="text-xs hidden md:table-cell text-right">Montant</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {cases.map(c => {
                const wc = c as CaseWithDetails
                const isPastDue = wc.nextDueDate && isBefore(parseISO(wc.nextDueDate), new Date())
                return (
                <TableRow key={c.id} className="cursor-pointer hover:bg-jl-page/50" onClick={() => { setSelectedCase(c); setDetailOpen(true); setTimelineFilter(new Set(['event', 'note', 'doc', 'task', 'payment', 'invoice', 'communication'])); setShowInlineNote(false); setShowInlineEvent(false); setTimelineSearch('') }}>
                  <TableCell className="text-xs font-mono whitespace-nowrap">{c.reference || c.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate"><div className="flex items-center gap-1.5">{c.isSecret && <Lock className="size-3 text-[var(--accent)] shrink-0" />}<span className="truncate">{c.title}</span></div></TableCell>
                  <TableCell className="text-xs hidden sm:table-cell whitespace-nowrap">{getClientName(c)}</TableCell>
                  <TableCell><Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status] || c.status}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[c.priority])}>{PRIORITY_LABELS[c.priority] || c.priority}</Badge></TableCell>
                  <TableCell className="text-xs hidden lg:table-cell whitespace-nowrap">{wc.nextDueDate ? <span className={cn(isPastDue && 'text-[var(--danger)] font-medium')}>{fmtDate(wc.nextDueDate)}</span> : '—'}</TableCell>
                  <TableCell className="hidden xl:table-cell"><div className="flex items-center gap-1 flex-wrap">{(wc.tags || []).slice(0, 2).map((t: CaseTag) => <span key={t.id} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.color + '18', color: t.color }}>{t.name}</span>)}{(wc.tags || []).length > 2 && <span className="text-[9px] text-jl-muted">+{(wc.tags || []).length - 2}</span>}</div></TableCell>
                  <TableCell className="text-xs hidden md:table-cell text-right font-medium whitespace-nowrap">{c.amountInDispute != null && c.amountInDispute > 0 ? fmtMoney(c.amountInDispute) : '—'}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(c)}><Edit className="size-3.5" /></Button></div></TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </div>
        )}

      {/* Pagination */}
      {totalCases > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-jl-muted">Affichage {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCases)} sur {totalCases} dossier{totalCases > 1 ? 's' : ''}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="size-4" /></Button>
            {(() => {
              const pages: (number | '...')[] = []
              const start = Math.max(1, page - 2)
              const end = Math.min(totalPages, page + 2)
              if (start > 1) { pages.push(1); if (start > 2) pages.push('...') }
              for (let i = start; i <= end; i++) pages.push(i)
              if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages) }
              return pages.map((p, i) => p === '...' ? <span key={`e${i}`} className="px-1 text-xs text-jl-muted">…</span> : <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="size-8 text-xs" onClick={() => setPage(p as number)}>{p}</Button>)
            })()}
            <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t('cases.editCase') : t('cases.new')}</DialogTitle></DialogHeader>
          {conflicts.length > 0 && <div className="bg-[var(--accent-light)] border border-amber-200 rounded-lg p-3 space-y-1">{conflicts.map((c, i) => <div key={i} className="flex items-start gap-2 text-xs"><AlertTriangle className="size-4 text-jl-gold shrink-0 mt-0.5" /><span className="text-jl-gold">{c.description}</span></div>)}</div>}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cases.reference')} *</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="REF-001" /></div>
              <div><Label>{t('cases.client')} *</Label><Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>{(Array.isArray(clients) ? clients : []).map(cl => <SelectItem key={cl.id} value={cl.id}>{cl.fullName}{cl.company ? ` (${cl.company})` : ''}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>{t('cases.title')} *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('common.type')}</Label><Select value={form.caseType} onValueChange={v => setForm(f => ({ ...f, caseType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="civil">Civil</SelectItem><SelectItem value="penal">Pénal</SelectItem><SelectItem value="commercial">Commercial</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="administratif">Administratif</SelectItem></SelectContent></Select></div>
              <div><Label>{t('common.status')}</Label><Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nouveau">Nouveau</SelectItem><SelectItem value="ouvert">Ouvert</SelectItem><SelectItem value="en_cours">En cours</SelectItem><SelectItem value="en_attente">En attente</SelectItem><SelectItem value="clos">Clos</SelectItem></SelectContent></Select></div>
              <div><Label>{t('cases.priority')}</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="haute">Haute</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cases.adversary')}</Label><Input value={form.adversary} onChange={e => setForm(f => ({ ...f, adversary: e.target.value }))} placeholder="Nom de la partie adverse" /></div>
              <div><Label>{t('cases.jurisdiction')}</Label><Input value={form.jurisdiction} onChange={e => setForm(f => ({ ...f, jurisdiction: e.target.value }))} placeholder="TPI de Douala" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('cases.disputeAmount')}</Label><Input type="number" value={form.amountInDispute} onChange={e => setForm(f => ({ ...f, amountInDispute: e.target.value }))} placeholder="0" /></div>
              <div><Label>{t('cases.billing')}</Label><Select value={form.billingType} onValueChange={v => setForm(f => ({ ...f, billingType: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="forfait">Forfait</SelectItem><SelectItem value="horaire">Horaire</SelectItem><SelectItem value="abonnement">Abonnement</SelectItem><SelectItem value="success_fee">Success fee</SelectItem><SelectItem value="provision">Provision</SelectItem></SelectContent></Select></div>
              <div><Label>{t('cases.nextDeadline')}</Label><Input type="date" value={form.nextDueDate} onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cases.result')}</Label><Select value={form.outcome} onValueChange={v => setForm(f => ({ ...f, outcome: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="">—</SelectItem><SelectItem value="gagné">Gagné</SelectItem><SelectItem value="perdu">Perdu</SelectItem><SelectItem value="transaction">Transaction</SelectItem><SelectItem value="abandonné">Abandonné</SelectItem><SelectItem value="en_cours">En cours</SelectItem></SelectContent></Select></div>
              <div><Label>{t('invoices.payments')}</Label><Select value={form.paymentStatus} onValueChange={v => setForm(f => ({ ...f, paymentStatus: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="">—</SelectItem><SelectItem value="paye">Payé</SelectItem><SelectItem value="partiel">Partiel</SelectItem><SelectItem value="non_paye">Non payé</SelectItem></SelectContent></Select></div>
            </div>
            {/* Tags multi-select */}
            <div>
              <Label className="text-xs mb-1.5 block">Étiquettes</Label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 border rounded-lg bg-jl-page">
                {(Array.isArray(caseTags) ? caseTags : []).map((t: CaseTag) => (
                  <button key={t.id} type="button" onClick={() => setSelectedTagIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])} className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer transition-all border', selectedTagIds.includes(t.id) ? 'shadow-sm' : 'opacity-60 hover:opacity-100')} style={selectedTagIds.includes(t.id) ? { backgroundColor: t.color + '20', borderColor: t.color + '40', color: t.color } : { borderColor: 'var(--border)' }}>
                    <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />{t.name}
                    {selectedTagIds.includes(t.id) && <X className="size-2.5" />}
                  </button>
                ))}
                {(!caseTags || caseTags.length === 0) && <span className="text-xs text-jl-muted">{t('cases.noTags')}</span>}
              </div>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setForm(f => ({ ...f, isSecret: !f.isSecret }))}>
                <div className={cn('size-5 rounded border-2 flex items-center justify-center transition-colors', form.isSecret ? 'bg-jl-blue border-jl-blue' : 'border-jl')}>{form.isSecret && <Check className="size-3 text-white" />}</div>
                <Label className="cursor-pointer text-sm flex items-center gap-1.5"><Lock className="size-3.5" />{t('cases.confidential')}</Label>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs mb-1.5 block">{t('cases.assignedLawyers')}</Label>
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
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={handleSubmit} disabled={!form.title.trim() || !form.clientId || createMut.isPending}>{editing ? t('common.save') : t('common.create')}</Button></DialogFooter>
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
            <TabsList className="w-full flex-wrap h-auto"><TabsTrigger value="resume">{t('cases.tabSummary')}</TabsTrigger><TabsTrigger value="timeline">{t('cases.tabTimeline')}</TabsTrigger><TabsTrigger value="taches">{t('cases.tabTasks')}</TabsTrigger><TabsTrigger value="events">{t('cases.addEvent')}</TabsTrigger><TabsTrigger value="equipe">{t('cases.assignedLawyers')}</TabsTrigger><TabsTrigger value="factures">{t('invoices.title')}</TabsTrigger><TabsTrigger value="notes">{t('cases.tabNotes')}</TabsTrigger><TabsTrigger value="documents">{t('cases.tabDocs')}</TabsTrigger><TabsTrigger value="workflow" className="gap-1"><ClipboardList className="size-3" />Workflow</TabsTrigger>{hasAI.data && <TabsTrigger value="ia" className="gap-1"><Brain className="size-3" />{t('cases.aiSearch')}</TabsTrigger>}</TabsList>
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
                {caseDetail?.nextDueDate && (() => {
                  const dd = caseDetail.nextDueDate
                  const days = differenceInDays(parseISO(dd), new Date())
                  return <div><span className="text-jl-secondary">Prochaine échéance :</span> <span className={cn('font-medium', days < 0 ? 'text-[var(--danger)]' : days <= 7 ? 'text-jl-gold' : '')}>{fmtDate(dd)}{days < 0 ? ` (${Math.abs(days)}j de retard)` : days <= 7 ? ` (dans ${days}j)` : ''}</span></div>
                })()}
                {caseDetail?.outcome && <div><span className="text-jl-secondary">Résultat :</span> <Badge variant="outline" className={cn('text-[10px]', { gagné: 'bg-[#D1FAE5] text-[#065F46]', perdu: 'bg-[#FEE2E2] text-[#991B1B]', transaction: 'bg-[#FEF3C7] text-[#92400E]', abandonné: 'bg-[#F3F4F6] text-[#6B7280]', en_cours: 'bg-[#E8F0F8] text-[#1E5A8A]' }[caseDetail.outcome] || '')}>{ { gagné: 'Gagné', perdu: 'Perdu', transaction: 'Transaction', abandonné: 'Abandonné', en_cours: 'En cours' }[caseDetail.outcome] || caseDetail.outcome }</Badge></div>}
                {caseDetail?.paymentStatus && <div><span className="text-jl-secondary">Paiement :</span> <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[caseDetail.paymentStatus])}>{ { paye: 'Payé', partiel: 'Partiel', non_paye: 'Non payé' }[caseDetail.paymentStatus] || caseDetail.paymentStatus }</Badge></div>}
                {caseDetail?.tags && caseDetail.tags.length > 0 && <div className="col-span-2"><span className="text-jl-secondary">Étiquettes :</span><div className="flex items-center gap-1.5 mt-1 flex-wrap">{caseDetail.tags.map((t: CaseTag) => <span key={t.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: t.color + '18', color: t.color }}><span className="size-1.5 rounded-full" style={{ backgroundColor: t.color }} />{t.name}</span>)}</div></div>}
                <div className="col-span-2"><span className="text-jl-secondary">Description :</span><p className="mt-1 text-sm text-jl-secondary whitespace-pre-wrap">{caseDetail?.description || 'Aucune description'}</p></div>
              </div>
            </TabsContent>
            <TabsContent value="timeline" className="mt-3">
              {/* Search & Sort toolbar */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-jl-muted" />
                  <Input placeholder={t('cases.timelineSearch')} value={timelineSearch} onChange={e => setTimelineSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                  {timelineSearch && <button onClick={() => setTimelineSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-jl-muted hover:text-jl-secondary"><X className="size-3" /></button>}
                </div>
                <button onClick={() => setTimelineSort(s => s === 'desc' ? 'asc' : 'desc')} className={cn('flex items-center gap-1 px-2.5 h-8 rounded-md border text-[11px] font-medium transition-colors', timelineSort === 'asc' ? 'bg-jl-blue/5 border-jl-blue/20 text-jl-blue' : 'bg-jl-card border-jl text-jl-secondary hover:bg-jl-page')}>
                  <ArrowUpDown className="size-3" />{timelineSort === 'desc' ? t('cases.recent') : t('cases.older')}
                </button>
              </div>
              {/* Filter pills */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-3 border-b border-jl">
                <span className="text-[10px] font-semibold text-jl-secondary uppercase tracking-wider mr-1">{t('common.filter')} :</span>
                {[
                  { type: 'event', label: t('cases.addEvent'), icon: Calendar, color: '#C8A45D' },
                  { type: 'note', label: t('cases.tabNotes'), icon: MessageSquare, color: '#6366F1' },
                  { type: 'doc', label: t('cases.tabDocs'), icon: FileText, color: '#059669' },
                  { type: 'task', label: t('cases.tabTasks'), icon: ClipboardList, color: '#D97706' },
                  { type: 'invoice', label: t('invoices.title'), icon: Receipt, color: '#926B2D' },
                  { type: 'payment', label: t('invoices.payments'), icon: Wallet, color: '#059669' },
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
                  <Plus className="size-3" />{t('cases.note')}
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => { setShowInlineEvent(v => !v); setShowInlineNote(false) }}>
                  <CalendarPlus className="size-3" />{t('cases.addEvent')}
                </Button>
              </div>
              {/* Inline note form */}
              <AnimatePresence>
              {showInlineNote && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="border border-[#6366F1]/30 bg-[#6366F1]/[0.03] rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="size-4 text-[#6366F1]" />
                    <span className="text-xs font-semibold text-[#6366F1]">{t('cases.addNote')}</span>
                  </div>
                  <Textarea value={inlineNote} onChange={e => setInlineNote(e.target.value)} placeholder={t('cases.notePlaceholder')} rows={2} className="text-sm mb-2 resize-none" autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowInlineNote(false); setInlineNote('') }}>{t('common.cancel')}</Button>
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
                                        title={deletingItem === item.id ? t('cases.confirmDelete') : t('common.delete')}
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
                  {t('cases.generateTasks')}
                </Button>
              </div>
              {(Array.isArray(caseTasks) && caseTasks.length === 0) ? <p className="text-sm text-jl-muted text-center py-8">{t('cases.noTasksHint')}</p> :
              <div className="space-y-2">{(Array.isArray(caseTasks) ? caseTasks : []).map((t: TaskItem) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-jl">
                  <span className={cn('size-2 rounded-full shrink-0', t.priority === 'urgente' ? 'bg-[var(--danger)]' : t.priority === 'haute' ? 'bg-[var(--accent)]' : 'bg-jl-gold')} />
                  <div className="min-w-0 flex-1"><p className={cn('text-sm font-medium', t.status === 'terminee' && 'line-through')}>{t.title}</p><div className="flex items-center gap-2">{t.dueDate && <p className="text-[10px] text-jl-muted">Échéance: {fmtDate(t.dueDate)}</p>}{t.assignedToUser && <p className="text-[10px] text-jl-blue flex items-center gap-0.5"><User className="size-2.5" />{t.assignedToUser.fullName}</p>}</div></div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', taskStatusColor(t.status))}>{taskStatusLabel(t.status)}</Badge>
                </div>
              ))}</div>}
              {/* Assign task form */}
              {Array.isArray(caseTasks) && caseTasks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-jl">
                  <p className="text-[11px] font-semibold text-jl-secondary mb-2">Assigner une tâche</p>
                  <div className="flex items-center gap-2">
                    <Select><SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Sélectionner une tâche…" /></SelectTrigger><SelectContent>{(Array.isArray(caseTasks) ? caseTasks : []).filter((t: TaskItem) => t.status !== 'terminee').map((t: TaskItem) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select>
                    <Select><SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Utilisateur…" /></SelectTrigger><SelectContent>{(Array.isArray(users) ? users : []).map((u: UserItem) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
              )}
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

