'use client'
import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, CASE_STATUS_LABELS, INVOICE_STATUS_LABELS } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, uploadWithProgress } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
import { usePortalSocket } from '@/hooks/usePortalSocket'

// ==================== PORTAL NAV ITEMS ====================
const PORTAL_NAV_ITEMS: { view: PortalViewName; label: string; icon: React.ElementType }[] = [
  { view: 'portal-dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { view: 'portal-cases', label: 'Mes dossiers', icon: Briefcase },
  { view: 'portal-invoices', label: 'Mes factures', icon: Receipt },
  { view: 'portal-documents', label: 'Documents', icon: FileText },
  { view: 'portal-messages', label: 'Messagerie', icon: MessageSquare },
  { view: 'portal-notifications', label: 'Notifications', icon: Bell },
  { view: 'portal-profile', label: 'Mon profil', icon: User },
]

// ==================== PORTAL SIDEBAR ====================
export function PortalSidebar() {
  const { portalUser, portalCurrentView, setPortalView, sidebarOpen, setSidebarOpen, portalUnreadCount } = useAppStore()
  const tenantName = portalUser?.tenant?.name || 'JurisLink'
  const clientName = portalUser?.client?.fullName || ''
  const navContent = (
    <nav className='space-y-1 mx-3'>
      {PORTAL_NAV_ITEMS.map(item => {
        const Icon = item.icon
        const active = portalCurrentView === item.view
        const badge = item.view === 'portal-notifications' && portalUnreadCount > 0 ? portalUnreadCount : null
        return (
          <button key={item.view} onClick={() => { setPortalView(item.view); setSidebarOpen(false) }}
            className={cn('w-full flex items-center h-11 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              active ? 'bg-jl-blue-light text-jl-blue border-l-[3px] border-jl-gold' : 'text-jl-secondary hover:bg-jl-page border-l-[3px] border-transparent')}>
            <Icon className='size-5 shrink-0 mr-3' /><span className='whitespace-nowrap'>{item.label}</span>
            {badge && <span className='ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--danger)] text-white text-[10px] flex items-center justify-center font-bold leading-none'>{badge > 9 ? '9+' : badge}</span>}
          </button>
        )
      })}
    </nav>
  )
  return (<>
    <aside className='hidden lg:flex fixed top-0 left-0 z-40 h-full bg-jl-card flex-col w-[260px] border-r border-jl overflow-hidden'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-jl shrink-0'>
        <img src="/icon.png" alt="JurisLink" className='size-8 rounded-lg shrink-0 object-cover' />
        <div className='min-w-0'><span className='text-lg font-bold tracking-tight whitespace-nowrap'><span className='text-jl-blue'>Juris</span><span className='text-jl-gold'>Link</span></span><p className='text-[10px] text-jl-muted'>{tenantName} · Espace client</p></div>
      </div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
      <div className='p-4 border-t border-jl shrink-0'>
        <div className='flex items-center gap-3'>
          <Avatar className='size-8 shrink-0'><AvatarFallback className='bg-jl-gold text-white text-xs'>{initials(clientName) || 'C'}</AvatarFallback></Avatar>
          <div className='min-w-0'><p className='text-sm font-medium truncate text-jl-primary'>{clientName}</p><p className='text-xs text-jl-muted truncate'>Client</p></div>
        </div>
      </div>
    </aside>
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side='left' className='w-[280px] p-0 bg-jl-card border-jl'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-jl shrink-0'>
        <img src="/icon.png" alt="JurisLink" className='size-8 rounded-lg shrink-0 object-cover' />
        <div className='min-w-0'><span className='text-sm font-bold tracking-tight'><span className='text-jl-blue'>Juris</span><span className='text-jl-gold'>Link</span></span></div>
        <Button variant='ghost' size='icon' className='ml-auto text-jl-secondary' onClick={() => setSidebarOpen(false)}><X className='size-5' /></Button>
      </div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
    </SheetContent></Sheet>
  </>)
}

// ==================== PORTAL HEADER ====================
export function PortalHeader() {
  const { portalUser, portalLogout, setSidebarOpen, portalUnreadCount, setPortalView } = useAppStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const clientName = portalUser?.client?.fullName || ''
  return (
    <header className='sticky top-0 z-30 bg-jl-card border-b border-jl h-16 flex items-center px-4 lg:px-6 shrink-0'>
      <Button variant='ghost' size='icon' className='lg:hidden mr-3 text-jl-secondary' onClick={() => setSidebarOpen(true)}><Menu className='size-5' /></Button>
      <div className='flex-1 min-w-0'>
        <h1 className='text-lg font-bold text-jl-primary truncate'>Espace Client</h1>
        <p className='text-xs text-jl-muted truncate -mt-0.5'>{portalUser?.tenant?.name}</p>
      </div>
      <div className='flex items-center gap-2'>
        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant='ghost' size='icon' className='relative text-jl-secondary hover:text-jl-primary' onClick={() => setPortalView('portal-notifications')} aria-label={`Notifications${portalUnreadCount ? ` (${portalUnreadCount} non lues)` : ''}`}><Bell className={cn('size-5', portalUnreadCount > 0 && 'text-jl-blue')} />{portalUnreadCount > 0 && <span className='absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[10px] flex items-center justify-center font-bold leading-none'>{portalUnreadCount > 9 ? '9+' : portalUnreadCount}</span>}</Button></TooltipTrigger><TooltipContent>Notifications {portalUnreadCount > 0 && `(${portalUnreadCount})`}</TooltipContent></Tooltip></TooltipProvider>
        <div className='relative'>
          <Button variant='ghost' className='flex items-center gap-2 h-9 px-2' onClick={() => setDropdownOpen(!dropdownOpen)}>
            <Avatar className='size-7'><AvatarFallback className='bg-jl-gold text-white text-[10px]'>{initials(clientName) || 'C'}</AvatarFallback></Avatar>
            <ChevronDown className={cn('size-3.5 text-jl-muted transition-transform', dropdownOpen && 'rotate-180')} />
          </Button>
          {dropdownOpen && (<>
            <div className='fixed inset-0 z-40' onClick={() => setDropdownOpen(false)} />
            <div className='absolute right-0 top-full mt-1 z-50 w-48 bg-jl-card rounded-lg shadow-lg border border-jl py-1'>
              <button onClick={() => { setDropdownOpen(false); useAppStore.getState().setPortalView('portal-profile') }} className='w-full flex items-center gap-2 px-3 py-2 text-sm text-jl-secondary hover:bg-jl-page'><User className='size-4' />Mon profil</button>
              <div className='border-t border-jl my-1' />
              <button onClick={() => { setDropdownOpen(false); portalLogout() }} className='w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10'><LogOut className='size-4' />Se déconnecter</button>
            </div>
          </>)}
        </div>
      </div>
    </header>
  )
}

// ==================== PORTAL DASHBOARD VIEW ====================
export function PortalDashboardView() {
  const { portalUser } = useAppStore()
  const { data: dash, isLoading } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: () => fetch('/api/portal/dashboard').then(r => r.json()),
  })
  const clientName = portalUser?.client?.fullName || ''
  const currencyCode = portalUser?.tenant?.currencyCode || 'XAF'
  if (isLoading) return <div className='p-6 space-y-4'>{[1,2,3,4].map(i=><Skeleton key={i} className='h-28 rounded-xl' />)}</div>
  if (!dash) return <EmptyState icon={LayoutDashboard} title='Erreur de chargement' />
  const kpis = [
    { label: 'Dossiers actifs', value: dash.activeCasesCount ?? 0, icon: Briefcase, color: 'text-jl-blue', bg: 'bg-jl-blue-light' },
    { label: 'Factures en attente', value: dash.overdueInvoicesCount ?? 0, icon: AlertTriangle, color: dash.overdueInvoicesCount > 0 ? 'text-[var(--danger)]' : 'text-[#065F46]', bg: dash.overdueInvoicesCount > 0 ? 'bg-[#FEE2E2]' : 'bg-[#D1FAE5]' },
    { label: 'Montant total', value: fmtMoney(dash.totalInvoicesAmount ?? 0, currencyCode, true), icon: DollarSign, color: 'text-jl-blue', bg: 'bg-jl-blue-light' },
    { label: 'Reste à payer', value: fmtMoney(dash.totalRemaining ?? 0, currencyCode, true), icon: Wallet, color: dash.totalRemaining > 0 ? 'text-[#92400E]' : 'text-[#065F46]', bg: dash.totalRemaining > 0 ? 'bg-[var(--accent-light)]' : 'bg-[#D1FAE5]' },
  ]
  return (
    <div className='p-4 lg:p-6 space-y-6'>
      <div>
        <h2 className='text-xl font-bold text-jl-primary'>Bonjour, {clientName.split(' ')[0]} 👋</h2>
        <p className='text-sm text-jl-secondary mt-0.5'>Voici un aperçu de votre espace</p>
      </div>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {kpis.map((kpi, i) => <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className='rounded-xl border border-jl hover:shadow-sm transition-shadow'>
            <CardContent className='p-4'><div className='flex items-center gap-3'><div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', kpi.bg)}><kpi.icon className={cn('size-5', kpi.color)} /></div><div className='min-w-0'><p className='text-xs text-jl-muted font-medium'>{kpi.label}</p><p className='text-lg font-bold text-jl-primary truncate'>{typeof kpi.value === 'number' ? kpi.value : kpi.value}</p></div></div></CardContent>
          </Card>
        </motion.div>)}
      </div>
      <div className='grid lg:grid-cols-2 gap-6'>
        <Card className='rounded-xl border border-jl'>
          <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold text-jl-primary'>Dossiers récents</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            {dash.recentCases?.length === 0 && <p className='text-sm text-jl-muted'>Aucun dossier</p>}
            {dash.recentCases?.map(c => (
              <button key={c.id} onClick={() => { useAppStore.getState().setPortalSelectedCaseId(c.id); useAppStore.getState().setPortalView('portal-case-detail') }} className='w-full flex items-center gap-3 p-3 rounded-lg hover:bg-jl-page transition-colors text-left'>
                <div className='size-9 rounded-lg bg-jl-blue-light flex items-center justify-center shrink-0'><Briefcase className='size-4 text-jl-blue' /></div>
                <div className='flex-1 min-w-0'><p className='text-sm font-medium text-jl-primary truncate'>{c.title}</p>{c.reference && <p className='text-xs text-jl-muted'>{c.reference}</p>}</div>
                <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600')}>{c.status}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className='rounded-xl border border-jl'>
          <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold text-jl-primary'>Factures récentes</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            {dash.recentInvoices?.length === 0 && <p className='text-sm text-jl-muted'>Aucune facture</p>}
            {dash.recentInvoices?.map(inv => (
              <div key={inv.id} className='flex items-center gap-3 p-3 rounded-lg bg-jl-page'>
                <div className='size-9 rounded-lg bg-jl-gold-light flex items-center justify-center shrink-0'><Receipt className='size-4 text-jl-gold' /></div>
                <div className='flex-1 min-w-0'><p className='text-sm font-medium text-jl-primary truncate'>{inv.invoiceNumber || '—'}</p><p className='text-xs text-jl-muted'>{inv.case?.reference || '—'}</p></div>
                <div className='text-right shrink-0'><p className='text-sm font-bold text-jl-primary'>{fmtMoney(inv.amount, inv.currency?.code || 'XAF', true)}</p><Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600')}>{inv.status}</Badge></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {dash.recentCommunications?.length > 0 && (
        <Card className='rounded-xl border border-jl'>
          <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold text-jl-primary'>Dernières communications</CardTitle></CardHeader>
          <CardContent className='space-y-2'>
            {dash.recentCommunications.map(comm => (
              <div key={comm.id} className='flex items-start gap-3 p-3 rounded-lg hover:bg-jl-page transition-colors'>
                <div className='size-8 rounded-full bg-jl-blue-light flex items-center justify-center shrink-0 mt-0.5'><MessageSquare className='size-3.5 text-jl-blue' /></div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm text-jl-primary'><span className='font-medium'>{comm.sentBy?.fullName || 'Vous'}</span>{comm.case && <span className='text-jl-muted'> · {comm.case.reference}</span>}</p>
                  <p className='text-xs text-jl-secondary mt-0.5 line-clamp-2'>{comm.subject || comm.content.slice(0, 120)}</p>
                  <p className='text-[10px] text-jl-muted mt-1'>{fmtDateTime(comm.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== PORTAL CASES VIEW ====================
export function PortalCasesView() {
  const { setPortalView, setPortalSelectedCaseId } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { data: cases, isLoading } = useQuery({
    queryKey: ['portal-cases'],
    queryFn: () => fetch('/api/portal/cases').then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })
  if (isLoading) return <div className='p-6 space-y-3'>{[1,2,3].map(i=><Skeleton key={i} className='h-32 rounded-xl' />)}</div>
  const filtered = (Array.isArray(cases) ? cases : []).filter((c: PortalCaseItem) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !(c.reference || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const statusPills = ['all', 'nouveau', 'ouvert', 'en_cours', 'en_attente', 'clos']
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div><h2 className='text-xl font-bold text-jl-primary'>Mes dossiers</h2><p className='text-sm text-jl-secondary'>{filtered.length} dossier{filtered.length > 1 ? 's' : ''}</p></div>
        <div className='relative w-full sm:w-64'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-jl-muted' /><Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9 rounded-lg border-jl' /></div>
      </div>
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {statusPills.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
            statusFilter === s ? 'bg-jl-blue text-white' : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}>
            {s === 'all' ? t('common.all') : invoiceStatusLabel(s)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon={Briefcase} title='Aucun dossier' description={search ? 'Aucun résultat pour cette recherche' : 'Vous n\'avez pas encore de dossiers'} /> : (
        <div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-3'>
          {filtered.map((c: PortalCaseItem, i: number) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className='rounded-xl border border-jl hover:shadow-sm hover:border-jl-gold/30 transition-all cursor-pointer h-full' onClick={() => { setPortalSelectedCaseId(c.id); setPortalView('portal-case-detail') }}>
                <CardContent className='p-4'>
                  <div className='flex items-start justify-between gap-2 mb-2'>
                    {c.reference && <Badge className='text-[10px] px-2 py-0.5 rounded-full bg-jl-page text-jl-secondary border-0'>{c.reference}</Badge>}
                    <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0 shrink-0', STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600')}>{c.status}</Badge>
                  </div>
                  <h3 className='text-sm font-semibold text-jl-primary line-clamp-2 mb-2'>{c.title}</h3>
                  <div className='flex items-center gap-3 text-[10px] text-jl-muted'>
                    {c.caseType && <span className='px-1.5 py-0.5 bg-jl-page rounded'>{c.caseType}</span>}
                    <span className='flex items-center gap-1'><FileText className='size-3' />{c._count?.documents || 0}</span>
                    <span className='flex items-center gap-1'><Calendar className='size-3' />{c._count?.events || 0}</span>
                  </div>
                  <p className='text-[10px] text-jl-muted mt-2'>{fmtDate(c.updatedAt)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== PORTAL DOCUMENT UPLOAD CONSTANTS ====================
const PORTAL_FOLDER_OPTIONS = ['Général', 'Procédure', 'Contrats', 'Pièces client', 'Correspondances', 'Décisions', 'Factures', 'Archives']
const PORTAL_DOC_TYPE_OPTIONS = [
  { value: 'contrat', label: 'Contrat' },
  { value: 'conclusion', label: 'Conclusion' },
  { value: 'assignation', label: 'Assignation' },
  { value: 'jugement', label: 'Jugement' },
  { value: 'correspondance', label: 'Correspondance' },
  { value: 'autre', label: 'Autre' },
]
const PORTAL_ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar', 'txt', 'csv', 'odt', 'ods']
const PORTAL_MAX_SIZE = 10 * 1024 * 1024 // 10MB

const DOC_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  en_attente: { label: 'En attente de validation', className: 'bg-[#FEF3C7] text-[#92400E]' },
  valide: { label: 'Validé', className: 'bg-[#D1FAE5] text-[#065F46]' },
  actif: { label: 'Actif', className: 'bg-jl-page text-jl-secondary' },
  rejete: { label: 'Rejeté', className: 'bg-[#FEE2E2] text-[#991B1B]' },
  archive: { label: 'Archivé', className: 'bg-[#F3F4F6] text-[#6B7280]' },
}

// ==================== PORTAL DOCUMENT UPLOAD DIALOG ====================
function PortalUploadDialog({ open, onOpenChange, prefillCaseId, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void; prefillCaseId?: string | null; onSuccess: () => void
}) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [form, setForm] = useState({ caseId: prefillCaseId || '', folder: '', documentType: '', description: '' })
  const [dragOver, setDragOver] = useState(false)

  // Fetch user's cases for the case selector
  const { data: cases } = useQuery({
    queryKey: ['portal-cases-upload'],
    queryFn: () => fetch('/api/portal/cases').then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: open,
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFile(null); setUploading(false); setProgress(0)
      setForm({ caseId: prefillCaseId || '', folder: '', documentType: '', description: '' })
    }
  }, [open, prefillCaseId])

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !PORTAL_ALLOWED_EXTENSIONS.includes(ext)) {
      return `Type de fichier non autorisé. Formats acceptés : ${PORTAL_ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`
    }
    if (file.size > PORTAL_MAX_SIZE) {
      return `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 10 Mo.`
    }
    return null
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) { setSelectedFile(null); return }
    const error = validateFile(file)
    if (error) { toast.error(error); return }
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Veuillez sélectionner un fichier'); return }
    if (!form.caseId) { toast.error('Veuillez sélectionner un dossier'); return }
    setUploading(true); setProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('caseId', form.caseId)
      if (form.folder) fd.append('folder', form.folder)
      if (form.documentType) fd.append('documentType', form.documentType)
      if (form.description) fd.append('description', form.description)
      await uploadWithProgress('/api/portal/documents', fd, setProgress, true)
      toast.success('Document téléversé avec succès')
      onOpenChange(false)
      onSuccess()
    } catch (err: any) { toast.error(err?.message || 'Erreur lors du téléversement') } finally { setUploading(false); setProgress(0) }
  }

  const docIcon = (mimeType?: string | null) => {
    if (mimeType?.includes('pdf')) return <FileText className='size-5 text-[var(--danger)]' />
    if (mimeType?.includes('image')) return <FileImage className='size-5 text-[var(--success)]' />
    if (mimeType?.includes('word') || mimeType?.includes('document')) return <FileText className='size-5 text-jl-blue' />
    return <FileText className='size-5 text-jl-blue' />
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!uploading) onOpenChange(v) }}>
      <DialogContent className='max-w-md'>
        <DialogHeader><DialogTitle className='text-base'>Téléverser un document</DialogTitle><DialogDescription>Déposez un fichier ou sélectionnez-le depuis votre appareil</DialogDescription></DialogHeader>
        <div className='space-y-4'>
          {/* Drag and drop zone */}
          <div
            className={cn('relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
              dragOver ? 'border-jl-blue bg-jl-blue-light/30' : selectedFile ? 'border-[var(--success)] bg-[#D1FAE5]/30' : 'border-jl hover:border-jl-blue/50 hover:bg-jl-page')}
            onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
            onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]) }}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type='file' accept={PORTAL_ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')} className='hidden' onChange={e => { if (e.target.files?.length) handleFileSelect(e.target.files[0]); e.target.value = '' }} />
            {selectedFile ? (
              <div className='flex items-center gap-3 text-left'>
                <div className='p-2 rounded-lg bg-white/80 shrink-0'>{docIcon(selectedFile.type)}</div>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-medium text-jl-primary truncate'>{selectedFile.name}</p>
                  <p className='text-[10px] text-jl-muted'>{fmtFileSize(selectedFile.size)}</p>
                </div>
                {!uploading && <button onClick={e => { e.stopPropagation(); setSelectedFile(null) }} className='p-1 rounded hover:bg-white/80 text-jl-muted hover:text-[var(--danger)]'><X className='size-4' /></button>}
              </div>
            ) : (
              <div className='space-y-2'>
                <FileUp className='size-8 mx-auto text-jl-muted' />
                <p className='text-sm text-jl-secondary'>Glissez-déposez un fichier ici</p>
                <p className='text-[10px] text-jl-muted'>ou cliquez pour sélectionner · Max 10 Mo</p>
                <p className='text-[10px] text-jl-muted'>PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, ZIP, RAR, TXT, CSV, ODT, ODS</p>
              </div>
            )}
          </div>

          {/* Case selector (required) */}
          <div>
            <Label className='text-xs'>Dossier <span className='text-[var(--danger)]'>*</span></Label>
            <Select value={form.caseId} onValueChange={v => setForm(f => ({ ...f, caseId: v }))} disabled={!!prefillCaseId}>
              <SelectTrigger className='mt-1 h-9 rounded-lg text-sm'><SelectValue placeholder='Sélectionner un dossier' /></SelectTrigger>
              <SelectContent>{(Array.isArray(cases) ? cases : []).map((c: PortalCaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference ? `${c.reference} — ${c.title}` : c.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Folder selector (optional) */}
          <div>
            <Label className='text-xs'>Répertoire</Label>
            <Select value={form.folder} onValueChange={v => setForm(f => ({ ...f, folder: v }))}>
              <SelectTrigger className='mt-1 h-9 rounded-lg text-sm'><SelectValue placeholder='Aucun' /></SelectTrigger>
              <SelectContent>{PORTAL_FOLDER_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Document type (optional) */}
          <div>
            <Label className='text-xs'>Type de document</Label>
            <Select value={form.documentType} onValueChange={v => setForm(f => ({ ...f, documentType: v }))}>
              <SelectTrigger className='mt-1 h-9 rounded-lg text-sm'><SelectValue placeholder='Aucun' /></SelectTrigger>
              <SelectContent>{PORTAL_DOC_TYPE_OPTIONS.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className='text-xs'>Description</Label>
            <Textarea placeholder='Description optionnelle...' value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className='mt-1 min-h-[60px] text-sm rounded-lg resize-none' />
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between text-xs'><span className='text-jl-secondary'>Téléversement en cours...</span><span className='font-medium text-jl-primary'>{progress}%</span></div>
              <Progress value={progress} className='h-2' />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={uploading}>{t('common.cancel')}</Button>
          <Button onClick={handleUpload} disabled={uploading || !selectedFile || !form.caseId} className='bg-jl-blue hover:bg-jl-blue'>
            {uploading ? <><Loader2 className='size-4 mr-1.5 animate-spin' />{progress < 100 ? 'Téléversement...' : 'Finalisation...'}</> : <><Upload className='size-4 mr-1.5' />Téléverser</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== PORTAL CASE DETAIL VIEW ====================
export function PortalCaseDetailView() {
  const { portalSelectedCaseId, setPortalView } = useAppStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('resume')
  const [docUploadOpen, setDocUploadOpen] = useState(false)
  const { data: caseDetail, isLoading } = useQuery({
    queryKey: ['portal-case-detail', portalSelectedCaseId],
    queryFn: () => fetch(`/api/portal/cases/${portalSelectedCaseId}`).then(r => { if (!r.ok) throw new Error('Not found'); return r.json() }),
    enabled: !!portalSelectedCaseId,
  })
  const { data: timeline } = useQuery({
    queryKey: ['portal-case-timeline', portalSelectedCaseId],
    queryFn: () => fetch(`/api/portal/cases/${portalSelectedCaseId}/timeline`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: !!portalSelectedCaseId && tab === 'timeline',
  })
  if (isLoading) return <div className='p-6 space-y-4'><Skeleton className='h-40 rounded-xl' /><Skeleton className='h-60 rounded-xl' /></div>
  if (!caseDetail) return <EmptyState icon={Briefcase} title='Dossier non trouvé' />
  const timelineColors: Record<string, string> = { event: 'border-l-[#1E5A8A]', note: 'border-l-[#059669]', document: 'border-l-[#C8A45D]', task: 'border-l-[#8B5CF6]', invoice: 'border-l-[#DC2626]' }
  const timelineIcons: Record<string, React.ElementType> = { event: Calendar, note: FileText, document: FileDown, task: ClipboardList, invoice: Receipt }
  const fmtDuration = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}` : `${m}min` }
  const tabs = [
    { id: 'resume', label: 'Résumé' }, { id: 'timeline', label: 'Chronologie' }, { id: 'documents', label: 'Documents' }, { id: 'invoices', label: 'Factures' }, { id: 'time', label: 'Temps' },
  ]
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <button onClick={() => setPortalView('portal-cases')} className='flex items-center gap-1.5 text-sm text-jl-secondary hover:text-jl-blue transition-colors'><ArrowLeft className='size-4' />Retour aux dossiers</button>
      <Card className='rounded-xl border border-jl'>
        <CardContent className='p-5'>
          <div className='flex flex-wrap items-start gap-3 mb-3'>
            {caseDetail.reference && <Badge className='text-xs px-2.5 py-1 rounded-full bg-jl-page text-jl-secondary border-0'>{caseDetail.reference}</Badge>}
            <Badge className={cn('text-xs px-2.5 py-1 rounded-full border-0', STATUS_COLORS[caseDetail.status] || 'bg-gray-100 text-gray-600')}>{caseDetail.status}</Badge>
            {caseDetail.caseType && <Badge variant='outline' className='text-xs'>{caseDetail.caseType}</Badge>}
            {caseDetail.priority && caseDetail.priority !== 'normal' && <Badge className={cn('text-xs px-2.5 py-1 rounded-full border-0', caseDetail.priority === 'urgent' ? 'bg-[#FEE2E2] text-[#991B1B]' : caseDetail.priority === 'haute' ? 'bg-[var(--accent-light)] text-[#92400E]' : 'bg-jl-page text-jl-secondary')}>{caseDetail.priority}</Badge>}
          </div>
          <h2 className='text-lg font-bold text-jl-primary'>{caseDetail.title}</h2>
          {caseDetail.description && <p className='text-sm text-jl-secondary mt-1 whitespace-pre-wrap'>{caseDetail.description}</p>}
          <div className='flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs text-jl-secondary'>
            {caseDetail.jurisdiction && <span className='flex items-center gap-1'><MapPin className='size-3' />{caseDetail.jurisdiction}</span>}
            {caseDetail.adversary && <span className='flex items-center gap-1'><Users className='size-3' />{caseDetail.adversary}</span>}
            {caseDetail.amountInDispute != null && caseDetail.amountInDispute > 0 && <span className='flex items-center gap-1'><DollarSign className='size-3' />{fmtMoney(caseDetail.amountInDispute, 'XAF', true)}</span>}
          </div>
          {caseDetail.assignments && caseDetail.assignments.length > 0 && (
            <div className='flex items-center gap-2 mt-4 pt-4 border-t border-jl'>
              <span className='text-xs text-jl-muted'>Avocat(s) :</span>
              {caseDetail.assignments.map(a => (
                <div key={a.id} className='flex items-center gap-1.5'>
                  <Avatar className='size-6'><AvatarFallback className='bg-jl-blue text-white text-[9px]'>{initials(a.user?.fullName || '?')}</AvatarFallback></Avatar>
                  <span className='text-xs font-medium text-jl-primary'>{a.user?.fullName}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className='flex gap-1 overflow-x-auto border-b border-jl'>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
            tab === t.id ? 'border-jl-blue text-jl-blue' : 'border-transparent text-jl-muted hover:text-jl-secondary')}>{t.label}</button>
        ))}
      </div>
      {tab === 'resume' && (
        <div className='space-y-4'>
          {caseDetail.notes && caseDetail.notes.length > 0 && (
            <Card className='rounded-xl border border-jl'><CardHeader className='pb-2'><CardTitle className='text-sm font-semibold'>Notes</CardTitle></CardHeader><CardContent className='space-y-3'>
              {caseDetail.notes.map(n => (<div key={n.id} className='p-3 rounded-lg bg-jl-page'><p className='text-sm text-jl-primary whitespace-pre-wrap'>{n.content}</p><p className='text-[10px] text-jl-muted mt-1'>{n.author?.fullName || ''} · {fmtDateTime(n.createdAt)}</p></div>))}
            </CardContent></Card>
          )}
          {caseDetail.tasks && caseDetail.tasks.length > 0 && (
            <Card className='rounded-xl border border-jl'><CardHeader className='pb-2'><CardTitle className='text-sm font-semibold'>Tâches</CardTitle></CardHeader><CardContent className='space-y-2'>
              {caseDetail.tasks.map(t => (<div key={t.id} className='flex items-center gap-3 p-2 rounded-lg hover:bg-jl-page'><Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[t.status === 'en_cours' ? 'en_cours' : t.status === 'terminee' ? 'clos' : t.status === 'a_faire' ? 'nouveau' : 'en_attente'] || 'bg-gray-100 text-gray-600')}>{t.status}</Badge><span className='text-sm text-jl-primary'>{t.title}</span>{t.dueDate && <span className='text-[10px] text-jl-muted ml-auto'>{fmtDate(t.dueDate)}</span>}</div>))}
            </CardContent></Card>
          )}
          {!caseDetail.notes?.length && !caseDetail.tasks?.length && <EmptyState icon={BookOpen} title='Aucune note ni tâche' description={"Votre avocat n'a pas encore ajouté de notes à ce dossier"} />}
        </div>
      )}
      {tab === 'timeline' && (
        <div className='space-y-2'>
          {(!timeline || timeline.length === 0) && <EmptyState icon={History} title='Aucune activité' />}
          {timeline?.map((entry: PortalTimelineEntry) => {
            const Icon = timelineIcons[entry.type] || Circle
            return (
              <div key={entry.id + entry.type} className={cn('pl-4 py-3 border-l-4 rounded-r-lg', timelineColors[entry.type] || 'border-l-gray-300')}>
                <div className='flex items-start gap-3'>
                  <Icon className='size-4 mt-0.5 text-jl-secondary shrink-0' />
                  <div className='flex-1 min-w-0'><p className='text-sm font-medium text-jl-primary'>{entry.title}</p>{entry.description && <p className='text-xs text-jl-secondary mt-0.5'>{entry.description}</p>}<p className='text-[10px] text-jl-muted mt-1'>{entry.author || ''} · {fmtDateTime(entry.date)}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {tab === 'documents' && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <p className='text-sm text-jl-secondary'>{(caseDetail.documents?.length || 0)} document{(caseDetail.documents?.length || 0) > 1 ? 's' : ''}</p>
            <Button size='sm' variant='outline' className='text-jl-blue border-jl-blue/30 hover:bg-jl-blue-light' onClick={() => setDocUploadOpen(true)}><Plus className='size-3.5 mr-1.5' />Ajouter un document</Button>
          </div>
          {(!caseDetail.documents || caseDetail.documents.length === 0) && <EmptyState icon={FileText} title='Aucun document' description='Ajoutez un document à ce dossier' />}
          {caseDetail.documents?.map(doc => {
            const docStatus = doc.status || (doc.uploadedByPortalId ? 'en_attente' : null)
            const badgeInfo = docStatus ? (DOC_STATUS_BADGE[docStatus] || null) : null
            return (
              <div key={doc.id} className='flex items-center gap-3 p-3 rounded-lg bg-jl-card border border-jl hover:shadow-sm transition-shadow'>
                <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', doc.mimeType?.includes('pdf') ? 'bg-[#FEE2E2]' : doc.mimeType?.includes('image') ? 'bg-[#D1FAE5]' : 'bg-jl-blue-light')}>
                  {doc.mimeType?.includes('pdf') ? <FileText className='size-4 text-[var(--danger)]' /> : doc.mimeType?.includes('image') ? <FileImage className='size-4 text-[var(--success)]' /> : <FileText className='size-4 text-jl-blue' />}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <p className='text-sm font-medium text-jl-primary truncate'>{doc.fileName}</p>
                    {badgeInfo && <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0 shrink-0', badgeInfo.className)}>{badgeInfo.label}</Badge>}
                  </div>
                  <p className='text-[10px] text-jl-muted'>{fmtFileSize(doc.fileSize)} · v{doc.version} · {fmtDate(doc.createdAt)}{doc.uploadedBy && ` · ${doc.uploadedBy.fullName}`}</p>
                </div>
                <a href={`/api/portal/documents/${doc.id}/download`} target='_blank' rel='noopener noreferrer' className='p-2 rounded-lg hover:bg-jl-blue-light text-jl-secondary hover:text-jl-blue transition-colors'><Download className='size-4' /></a>
              </div>
            )
          })}
          <PortalUploadDialog open={docUploadOpen} onOpenChange={setDocUploadOpen} prefillCaseId={portalSelectedCaseId} onSuccess={() => { qc.invalidateQueries({ queryKey: ['portal-case-detail', portalSelectedCaseId] }) }} />
        </div>
      )}
      {tab === 'invoices' && (
        <div className='space-y-2'>
          {(!caseDetail.invoices || caseDetail.invoices.length === 0) && <EmptyState icon={Receipt} title='Aucune facture' />}
          {caseDetail.invoices?.map(inv => (
            <div key={inv.id} className='flex items-center gap-3 p-3 rounded-lg bg-jl-card border border-jl'>
              <div className='size-9 rounded-lg bg-jl-gold-light flex items-center justify-center shrink-0'><Receipt className='size-4 text-jl-gold' /></div>
              <div className='flex-1 min-w-0'><p className='text-sm font-medium text-jl-primary'>{inv.invoiceNumber || '—'}</p><p className='text-[10px] text-jl-muted'>{fmtDate(inv.issuedAt)} · Échéance: {fmtDate(inv.dueDate)}</p></div>
              <div className='text-right shrink-0'><p className='text-sm font-bold text-jl-primary'>{fmtMoney(inv.amount, 'XAF', true)}</p><Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600')}>{inv.status}</Badge></div>
            </div>
          ))}
        </div>
      )}
      {tab === 'time' && (
        <div className='space-y-2'>
          {(!caseDetail.timeEntries || caseDetail.timeEntries.length === 0) && <EmptyState icon={Timer} title='Aucun temps enregistré' />}
          {caseDetail.timeEntries?.map(te => (
            <div key={te.id} className='flex items-center gap-3 p-3 rounded-lg bg-jl-card border border-jl'>
              <div className='size-9 rounded-lg bg-jl-blue-light flex items-center justify-center shrink-0'><Clock className='size-4 text-jl-blue' /></div>
              <div className='flex-1 min-w-0'><p className='text-sm text-jl-primary'>{te.description || 'Temps travaillé'}</p><p className='text-[10px] text-jl-muted'>{te.user?.fullName || ''} · {fmtDate(te.startTime)}</p></div>
              <div className='text-right shrink-0'><p className='text-sm font-semibold text-jl-primary'>{fmtDuration(te.duration)}</p>{te.totalAmount != null && te.totalAmount > 0 && <p className='text-[10px] text-jl-muted'>{fmtMoney(te.totalAmount, 'XAF', true)}</p>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== PORTAL INVOICES VIEW ====================
export function PortalInvoicesView() {
  const { portalUser } = useAppStore()
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState<PortalInvoiceItem | null>(null)
  const currencyCode = portalUser?.tenant?.currencyCode || 'XAF'
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['portal-invoices', statusFilter],
    queryFn: () => fetch(`/api/portal/invoices${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })
  const { data: invoiceDetail } = useQuery({
    queryKey: ['portal-invoice-detail', selectedInvoice?.id],
    queryFn: () => fetch(`/api/portal/invoices/${selectedInvoice!.id}`).then(r => r.json()),
    enabled: !!selectedInvoice,
  })
  if (isLoading) return <div className='p-6 space-y-3'>{[1,2,3].map(i=><Skeleton key={i} className='h-24 rounded-xl' />)}</div>
  const filtered = Array.isArray(invoices) ? invoices : []
  const totalAmount = filtered.reduce((s: number, inv: PortalInvoiceItem) => s + inv.amount, 0)
  const statusPills = ['all', 'non_paye', 'partiel', 'paye']
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div><h2 className='text-xl font-bold text-jl-primary'>Mes factures</h2><p className='text-sm text-jl-secondary'>{filtered.length} facture{filtered.length > 1 ? 's' : ''} · Total: {fmtMoney(totalAmount, currencyCode, true)}</p></div>
      </div>
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {statusPills.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
            statusFilter === s ? 'bg-jl-blue text-white' : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}>
            {s === 'all' ? 'Toutes' : INVOICE_statusLabel(s)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon={Receipt} title='Aucune facture' /> : (
        <div className='space-y-2'>
          {(filtered as PortalInvoiceItem[]).map(inv => {
            const remaining = inv.amount - inv.paidAmount
            const progress = inv.amount > 0 ? Math.min(100, (inv.paidAmount / inv.amount) * 100) : 0
            return (
              <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className='rounded-xl border border-jl hover:shadow-sm cursor-pointer transition-all' onClick={() => setSelectedInvoice(inv)}>
                  <CardContent className='p-4'>
                    <div className='flex items-center gap-4'>
                      <div className='size-10 rounded-lg bg-jl-gold-light flex items-center justify-center shrink-0'><Receipt className='size-5 text-jl-gold' /></div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'><p className='text-sm font-semibold text-jl-primary'>{inv.invoiceNumber || '—'}</p><Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600')}>{inv.status}</Badge></div>
                        <p className='text-xs text-jl-muted'>{inv.case?.reference ? `Dossier ${inv.case.reference}` : '—'} · Échéance: {fmtDate(inv.dueDate)}</p>
                        <div className='mt-2 h-1.5 bg-jl-page rounded-full overflow-hidden'><div className='h-full bg-[var(--success)] rounded-full transition-all' style={{ width: `${progress}%` }} /></div>
                      </div>
                      <div className='text-right shrink-0'>
                        <p className='text-sm font-bold text-jl-primary'>{fmtMoney(inv.amount, inv.currency?.code || currencyCode)}</p>
                        <p className='text-[10px] text-jl-muted'>Payé: {fmtMoney(inv.paidAmount, inv.currency?.code || currencyCode, true)}</p>
                        {remaining > 0 && <p className='text-[10px] text-[var(--danger)] font-medium'>Reste: {fmtMoney(remaining, inv.currency?.code || currencyCode, true)}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className='max-w-2xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader><DialogTitle className='text-base'>Facture {invoiceDetail?.invoiceNumber || selectedInvoice?.invoiceNumber || ''}</DialogTitle><DialogDescription>Détails de la facture</DialogDescription></DialogHeader>
          {invoiceDetail && (<div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div><span className='text-jl-muted'>Statut</span><Badge className={cn('ml-2 text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[invoiceDetail.status] || 'bg-gray-100 text-gray-600')}>{invoiceDetail.status}</Badge></div>
              <div><span className='text-jl-muted'>Date :</span> <span className='text-jl-primary ml-1'>{fmtDate(invoiceDetail.issuedAt)}</span></div>
              <div><span className='text-jl-muted'>Échéance :</span> <span className='text-jl-primary ml-1'>{fmtDate(invoiceDetail.dueDate)}</span></div>
              <div><span className='text-jl-muted'>Montant :</span> <span className='font-bold text-jl-primary ml-1'>{fmtMoney(invoiceDetail.amount, invoiceDetail.currency?.code || currencyCode)}</span></div>
            </div>
            {invoiceDetail.lineItems && invoiceDetail.lineItems.length > 0 && (
              <Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead className='text-right'>Qté</TableHead><TableHead className='text-right'>P.U. HT</TableHead><TableHead className='text-right'>Total</TableHead></TableRow></TableHeader><TableBody>
                {invoiceDetail.lineItems.map(li => <TableRow key={li.id}><TableCell className='text-sm'>{li.description}</TableCell><TableCell className='text-right text-sm'>{li.quantity}</TableCell><TableCell className='text-right text-sm'>{fmtMoney(li.unitPrice, invoiceDetail.currency?.code || currencyCode)}</TableCell><TableCell className='text-right text-sm font-medium'>{fmtMoney(li.total, invoiceDetail.currency?.code || currencyCode)}</TableCell></TableRow>)}
              </TableBody></Table>
            )}
            {invoiceDetail.payments && invoiceDetail.payments.length > 0 && (
              <div><h4 className='text-sm font-semibold mb-2'>Paiements</h4><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead className='text-right'>Montant</TableHead><TableHead>Enregistré par</TableHead></TableRow></TableHeader><TableBody>
                {invoiceDetail.payments.map(p => <TableRow key={p.id}><TableCell className='text-sm'>{fmtDate(p.paidAt)}</TableCell><TableCell className='text-sm'>{p.method}</TableCell><TableCell className='text-right text-sm font-medium'>{fmtMoney(p.amount, currencyCode)}</TableCell><TableCell className='text-sm'>{p.recorder?.fullName || '—'}</TableCell></TableRow>)}
              </TableBody></Table></div>
            )}
            <div className='flex gap-2 pt-2'><a href={`/api/invoices/${invoiceDetail.id}/pdf`} target='_blank' rel='noopener noreferrer'><Button size='sm' className='bg-jl-blue hover:bg-jl-blue'><Printer className='size-4 mr-1.5' />Télécharger PDF</Button></a></div>
          </div>)}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== PORTAL DOCUMENTS VIEW ====================
export function PortalDocumentsView() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: docs, isLoading } = useQuery({
    queryKey: ['portal-documents', search, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams()
      if (search) p.set('search', search)
      return fetch(`/api/portal/documents?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
  })

  const handleUploadSuccess = () => { qc.invalidateQueries({ queryKey: ['portal-documents'] }) }

  if (isLoading) return <div className='p-6 space-y-3'>{[1,2,3].map(i=><Skeleton key={i} className='h-16 rounded-xl' />)}</div>

  const allDocs = Array.isArray(docs) ? docs as PortalDocItem[] : []
  const filtered = statusFilter === 'all' ? allDocs : allDocs.filter(d => {
    if (statusFilter === 'en_attente') return d.status === 'en_attente'
    if (statusFilter === 'rejete') return d.status === 'rejete'
    return true
  })

  const docIcon = (mimeType?: string | null) => {
    if (mimeType?.includes('pdf')) return <FileText className='size-5 text-[var(--danger)]' />
    if (mimeType?.includes('image')) return <FileImage className='size-5 text-[var(--success)]' />
    if (mimeType?.includes('word') || mimeType?.includes('document')) return <FileText className='size-5 text-jl-blue' />
    return <FileText className='size-5 text-jl-blue' />
  }

  const statusBadge = (doc: PortalDocItem) => {
    if (!doc.uploadedByPortalId && !doc.status) return null
    const s = doc.status || 'actif'
    const info = DOC_STATUS_BADGE[s] || DOC_STATUS_BADGE.actif
    return <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0 shrink-0', info.className)}>{info.label}</Badge>
  }

  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div><h2 className='text-xl font-bold text-jl-primary'>Documents</h2><p className='text-sm text-jl-secondary'>{filtered.length} document{filtered.length > 1 ? 's' : ''}</p></div>
        <div className='flex items-center gap-2'>
          <div className='relative w-full sm:w-64'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-jl-muted' /><Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9 rounded-lg border-jl' /></div>
          <Button size='sm' className='bg-jl-blue hover:bg-jl-blue shrink-0' onClick={() => setUploadOpen(true)}><Upload className='size-4 mr-1.5' />Téléverser un document</Button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {['all', 'en_attente', 'rejete'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
            statusFilter === s ? 'bg-jl-blue text-white' : 'bg-jl-page text-jl-secondary hover:bg-jl-page')}>
            {s === 'all' ? t('common.all') : s === 'en_attente' ? 'En attente' : 'Rejetés'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? <EmptyState icon={FileText} title='Aucun document' description={search ? 'Aucun résultat' : 'Aucun document disponible'} /> : (
        <div className='space-y-2'>
          {filtered.map(doc => (
            <motion.div key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className='flex items-center gap-3 p-3 rounded-lg bg-jl-card border border-jl hover:shadow-sm transition-shadow'>
                <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', doc.mimeType?.includes('pdf') ? 'bg-[#FEE2E2]' : doc.mimeType?.includes('image') ? 'bg-[#D1FAE5]' : 'bg-jl-blue-light')}>
                  {docIcon(doc.mimeType)}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <p className='text-sm font-medium text-jl-primary truncate'>{doc.fileName}</p>
                    {statusBadge(doc)}
                  </div>
                  <p className='text-[10px] text-jl-muted mt-0.5'>{fmtFileSize(doc.fileSize)} · v{doc.version}{doc.documentType && <span> · {PORTAL_DOC_TYPE_OPTIONS.find(dt => dt.value === doc.documentType)?.label || doc.documentType}</span>}{doc.case && <span> · {doc.case.reference} — {doc.case.title}</span>}{doc.uploadedBy && <span> · {doc.uploadedBy.fullName}</span>}</p>
                </div>
                <span className='text-[10px] text-jl-muted shrink-0 hidden sm:block'>{fmtDate(doc.createdAt)}</span>
                <a href={`/api/portal/documents/${doc.id}/download`} target='_blank' rel='noopener noreferrer' className='p-2 rounded-lg hover:bg-jl-blue-light text-jl-secondary hover:text-jl-blue transition-colors shrink-0'><Download className='size-4' /></a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <PortalUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSuccess={handleUploadSuccess} />
    </div>
  )
}

// ==================== PORTAL MESSAGES VIEW ====================
export function PortalMessagesView() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data: communications, isLoading } = useQuery({
    queryKey: ['portal-communications'],
    queryFn: () => fetch('/api/portal/communications').then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })
  const { data: cases } = useQuery({
    queryKey: ['portal-cases-mini'],
    queryFn: () => fetch('/api/portal/cases').then(r => r.json()).then(d => (Array.isArray(d) ? d : []).map((c: PortalCaseItem) => ({ id: c.id, reference: c.reference, title: c.title }))),
  })
  const sendMessage = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/portal/communications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subject || null, content: message, caseId: selectedCaseId || null }) })
      if (!res.ok) throw new Error(t('common.error'))
      return res.json()
    },
    onSuccess: () => { setMessage(''); setSubject(''); setSelectedCaseId(''); queryClient.invalidateQueries({ queryKey: ['portal-communications'] }) },
  })
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [communications])
  if (isLoading) return <div className='p-6'><Skeleton className='h-96 rounded-xl' /></div>
  const comms = (Array.isArray(communications) ? [...communications].reverse() : []) as PortalCommunication[]
  return (
    <div className='flex flex-col h-[calc(100vh-8rem)]'>
      <div className='px-4 lg:px-6 pb-3'><h2 className='text-xl font-bold text-jl-primary'>Messagerie</h2><p className='text-sm text-jl-secondary'>Échangez avec votre cabinet</p></div>
      <div className='flex-1 overflow-y-auto px-4 lg:px-6 space-y-3 custom-scrollbar'>
        {comms.length === 0 && <EmptyState icon={MessageSquare} title='Aucun message' description='Envoyez votre premier message à votre cabinet' />}
        {comms.map(comm => {
          const isMe = !comm.sentBy
          return (
            <div key={comm.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5', isMe ? 'bg-jl-blue text-white rounded-br-md' : 'bg-jl-page text-jl-primary rounded-bl-md')}>
                {!isMe && comm.sentBy && <p className='text-xs font-semibold text-jl-gold mb-0.5'>{comm.sentBy.fullName}</p>}
                {comm.subject && <p className='text-xs font-semibold mb-1 opacity-80'>{comm.subject}</p>}
                <p className='text-sm whitespace-pre-wrap'>{comm.content}</p>
                <div className='flex items-center gap-2 mt-1'><p className='text-[10px] opacity-60'>{fmtDateTime(comm.createdAt)}</p>{comm.case && <span className='text-[10px] opacity-60'>· {comm.case.reference}</span>}{comm.type === 'portal_message' && <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-jl-card/20'>vous</span>}</div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className='border-t border-jl p-3 space-y-2 bg-jl-card'>
        <div className='flex gap-2'><Input placeholder='Sujet (optionnel)' value={subject} onChange={e => setSubject(e.target.value)} className='h-8 text-sm rounded-lg border-jl' />
          {cases && cases.length > 0 && <Select value={selectedCaseId} onValueChange={setSelectedCaseId}><SelectTrigger className='w-40 h-8 text-sm rounded-lg'><SelectValue placeholder='Dossier...' /></SelectTrigger><SelectContent>{cases.map((c: { id: string; reference: string | null; title: string }) => <SelectItem key={c.id} value={c.id}>{c.reference || c.title}</SelectItem>)}</SelectContent></Select>}
        </div>
        <div className='flex gap-2'>
          <Textarea placeholder='Votre message...' value={message} onChange={e => setMessage(e.target.value)} className='min-h-[60px] text-sm rounded-lg border-jl resize-none' onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (message.trim()) { sendMessage.mutate(); } } }} />
          <Button onClick={() => message.trim() && sendMessage.mutate()} disabled={!message.trim() || sending} className='self-end bg-jl-blue hover:bg-jl-blue text-white h-10 w-10 p-0 rounded-lg shrink-0'>{sending ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}</Button>
        </div>
      </div>
    </div>
  )
}

// ==================== PORTAL PROFILE VIEW ====================
export function PortalProfileView() {
  const { portalUser } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phone: '', address: '', city: '', country: '' })
  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal-profile'],
    queryFn: () => fetch('/api/portal/profile').then(r => r.json()),
  })
  const updateProfile = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/portal/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(t('common.error'))
      return res.json()
    },
    onSuccess: () => { setEditing(false); toast.success('Profil mis à jour') },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })
  const editForm = editing ? form : (profile ? { phone: profile.phone || '', address: profile.address || '', city: profile.city || '', country: profile.country || '' } : form)
  const handleEdit = () => { if (profile) setForm({ phone: profile.phone || '', address: profile.address || '', city: profile.city || '', country: profile.country || '' }); setEditing(true) }
  if (isLoading) return <div className='p-6'><Skeleton className='h-64 rounded-xl' /></div>
  if (!profile) return <EmptyState icon={User} title='Erreur de chargement' />
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <h2 className='text-xl font-bold text-jl-primary'>Mon profil</h2>
      <div className='grid md:grid-cols-2 gap-4'>
        <Card className='rounded-xl border border-jl'>
          <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold flex items-center gap-2'><User className='size-4 text-jl-blue' />Mes informations</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            {editing ? (
              <div className='space-y-3'>
                <div><Label className='text-xs'>Téléphone</Label><Input value={editForm.phone} onChange={e => setForm({ ...editForm, phone: e.target.value })} className='h-9 mt-1 rounded-lg' /></div>
                <div><Label className='text-xs'>Adresse</Label><Input value={editForm.address} onChange={e => setForm({ ...editForm, address: e.target.value })} className='h-9 mt-1 rounded-lg' /></div>
                <div className='grid grid-cols-2 gap-2'><div><Label className='text-xs'>Ville</Label><Input value={editForm.city} onChange={e => setForm({ ...editForm, city: e.target.value })} className='h-9 mt-1 rounded-lg' /></div><div><Label className='text-xs'>Pays</Label><Input value={editForm.country} onChange={e => setForm({ ...editForm, country: e.target.value })} className='h-9 mt-1 rounded-lg' /></div></div>
                <div className='flex gap-2 pt-1'><Button size='sm' onClick={() => updateProfile.mutate(editForm)} disabled={updateProfile.isPending} className='bg-jl-blue hover:bg-jl-blue'>{updateProfile.isPending ? <Loader2 className='size-4 animate-spin' /> : t('common.save')}</Button><Button size='sm' variant='outline' onClick={() => setEditing(false)}>{t('common.cancel')}</Button></div>
              </div>
            ) : (
              <>
                <InfoRow label='Nom complet' value={profile.fullName} />
                <InfoRow label='Société' value={profile.company} />
                <InfoRow label='Email' value={profile.email} />
                <InfoRow label='Téléphone' value={profile.phone} />
                <InfoRow label='NIU' value={profile.niu} />
                <InfoRow label='Adresse' value={[profile.address, profile.city, profile.country].filter(Boolean).join(', ')} />
                <Button size='sm' variant='outline' onClick={handleEdit} className='mt-2'><Edit className='size-3.5 mr-1.5' />Modifier</Button>
              </>
            )}
          </CardContent>
        </Card>
        <div className='space-y-4'>
          <Card className='rounded-xl border border-jl'>
            <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold flex items-center gap-2'><Building2 className='size-4 text-jl-gold' />Mon cabinet</CardTitle></CardHeader>
            <CardContent className='space-y-2'>
              <InfoRow label='Nom' value={profile.tenant?.name} />
              <InfoRow label='Email' value={profile.tenant?.email} />
              <InfoRow label='Téléphone' value={profile.tenant?.phone} />
              <InfoRow label='Adresse' value={[profile.tenant?.address, profile.tenant?.city, profile.tenant?.country].filter(Boolean).join(', ')} />
              <InfoRow label='NIU' value={profile.tenant?.niu} />
            </CardContent>
          </Card>
          {profile.responsibleLawyer && (
            <Card className='rounded-xl border border-jl'>
              <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold flex items-center gap-2'><ShieldUser className='size-4 text-[var(--success)]' />Mon avocat</CardTitle></CardHeader>
              <CardContent className='space-y-2'>
                <InfoRow label='Nom' value={profile.responsibleLawyer.fullName} />
                <InfoRow label='Email' value={profile.responsibleLawyer.email} />
                <InfoRow label='Téléphone' value={profile.responsibleLawyer.phone} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return <div className='flex items-start gap-2'><span className='text-xs text-jl-muted w-20 shrink-0 pt-0.5'>{label}</span><span className='text-sm text-jl-primary'>{value}</span></div>
}

// ==================== PORTAL NOTIFICATIONS VIEW ====================
interface PortalNotifItem {
  id: string
  title: string
  message: string
  category: string
  read: boolean
  resourceType?: string | null
  resourceId?: string | null
  createdAt: string
}

export function PortalNotificationsView() {
  const { portalUnreadCount, setPortalUnreadCount } = useAppStore()
  const { data: notifications, isLoading, refetch } = useQuery<PortalNotifItem[]>({
    queryKey: ['portal-notifications'],
    queryFn: () => fetch('/api/portal/notifications').then(r => r.json()),
  })
  const markReadMutation = useMutation({
    mutationFn: (payload: { id?: string; all?: boolean }) =>
      fetch('/api/portal/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()),
    onSuccess: () => refetch(),
  })
  const handleMarkAllRead = () => {
    markReadMutation.mutate({ all: true }, {
      onSuccess: () => { setPortalUnreadCount(0); toast.success('Tout marqué comme lu') },
    })
  }
  const handleMarkOneRead = (notif: PortalNotifItem) => {
    if (notif.read) return
    markReadMutation.mutate({ id: notif.id }, {
      onSuccess: (data) => {
        if (data.updated > 0) {
          const next = Math.max(0, portalUnreadCount - 1)
          setPortalUnreadCount(next)
        }
      },
    })
  }
  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'facture': return Receipt
      case 'document': return FileText
      case 'message': return MessageSquare
      case 'dossier': return Briefcase
      default: return Bell
    }
  }
  if (isLoading) return <div className='p-6 space-y-3'>{[1,2,3].map(i => <Skeleton key={i} className='h-20 rounded-xl' />)}</div>
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <div className='flex items-center justify-between'>
        <div><h2 className='text-xl font-bold text-jl-primary'>Notifications</h2><p className='text-sm text-jl-secondary'>{portalUnreadCount > 0 ? `${portalUnreadCount} non lue${portalUnreadCount > 1 ? 's' : ''}` : 'Tout est lu'}</p></div>
        {portalUnreadCount > 0 && <Button variant='outline' size='sm' className='text-jl-blue border-jl-blue/30 hover:bg-jl-blue-light' onClick={handleMarkAllRead} disabled={markReadMutation.isPending}><CheckCheck className='size-4 mr-2' />Tout marquer comme lu</Button>}
      </div>
      {(!notifications || notifications.length === 0) && <EmptyState icon={Bell} title='Aucune notification' description={"Vous n'avez pas encore de notifications"} />}
      <ScrollArea className='max-h-[calc(100vh-16rem)]'>
        <div className='space-y-2'>
          {notifications?.map(n => {
            const Icon = categoryIcon(n.category)
            return (
              <Card key={n.id} className={cn('rounded-xl border transition-colors cursor-pointer hover:shadow-sm', n.read ? 'border-jl bg-jl-card' : 'border-jl-blue/20 bg-jl-blue-light/30')} onClick={() => handleMarkOneRead(n)}>
                <CardContent className='flex items-start gap-3 p-4'>
                  <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', n.read ? 'bg-jl-page' : 'bg-jl-blue-light')}><Icon className={cn('size-4', n.read ? 'text-jl-muted' : 'text-jl-blue')} /></div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'><p className={cn('text-sm font-medium truncate', n.read ? 'text-jl-secondary' : 'text-jl-primary')}>{n.title}</p>{!n.read && <span className='size-2 rounded-full bg-jl-blue shrink-0' />}</div>
                    <p className='text-xs text-jl-secondary mt-0.5 line-clamp-2'>{n.message}</p>
                    <p className='text-[10px] text-jl-muted mt-1'>{relativeTime(n.createdAt)}</p>
                  </div>
                  {n.category && <Badge className='text-[10px] px-2 py-0.5 rounded-full border-0 bg-jl-page text-jl-muted shrink-0'>{n.category}</Badge>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ==================== PORTAL ROUTER ====================
export function PortalRouter() {
  const { portalCurrentView } = useAppStore()
  usePortalSocket()
  switch (portalCurrentView) {
    case 'portal-dashboard': return <PortalDashboardView />
    case 'portal-cases': return <PortalCasesView />
    case 'portal-case-detail': return <PortalCaseDetailView />
    case 'portal-invoices': return <PortalInvoicesView />
    case 'portal-documents': return <PortalDocumentsView />
    case 'portal-messages': return <PortalMessagesView />
    case 'portal-notifications': return <PortalNotificationsView />
    case 'portal-profile': return <PortalProfileView />
    default: return <PortalDashboardView />
  }
}
