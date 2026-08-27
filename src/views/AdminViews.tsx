'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, ROLE_LABELS } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== ADMIN VIEWS ====================
export function AdminDashboardView() {
  const { data, isLoading } = useQuery<AdminDashboardData>({ queryKey: ['admin-dashboard'], queryFn: () => fetch('/api/admin/dashboard').then(r => r.json()) })
  if (isLoading) return <div className='p-6 space-y-4'><div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className='h-24 rounded-xl' />)}</div></div>
  if (!data) return <EmptyState icon={ShieldCheck} title='Erreur de chargement' />
  const months = Object.entries(data.signupsByMonth || {}).slice(-12)
  const maxMonth = Math.max(...months.map(([, v]) => v), 1)
  const maxPlan = Math.max(...(data.tenantsByPlan || []).map(p => p._count.id), 1)
  const maxRole = Math.max(...(data.usersByRole || []).map(r => r._count.id), 1)
  const kpis = [
    { label: 'Cabinets actifs', value: data.activeTenants, icon: BuildingIcon, color: 'text-jl-blue' },
    { label: 'Utilisateurs actifs', value: data.activeUsers, icon: UsersRound, color: 'text-[var(--success)]' },
    { label: 'Dossiers actifs', value: data.activeCases, icon: Briefcase, color: 'text-jl-gold' },
    { label: 'Clients', value: data.totalClients, icon: Users, color: 'text-[#7C3AED]' },
    { label: 'CA total', value: fmtMoney(data.totalRevenue), icon: TrendingUp, color: 'text-jl-blue' },
    { label: 'CA ce mois', value: fmtMoney(data.thisMonthRevenue), icon: DollarSign, color: 'text-[var(--success)]' },
  ]
  return (<div className='p-6 space-y-6'>
    <div className='flex items-center gap-2'><Crown className='size-5 text-jl-gold' /><h2 className='text-lg font-bold text-jl-primary'>Administration</h2></div>
    <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'>
      {kpis.map(k => (<Card key={k.label} className='p-4'><div className='flex items-center gap-3'><div className={cn('p-2 rounded-lg bg-jl-page', k.color)}><k.icon className='size-4' /></div><div><p className='text-xs text-jl-muted'>{k.label}</p><p className='text-lg font-bold text-jl-primary'>{k.value}</p></div></div></Card>))}
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
      <Card className='lg:col-span-2 p-4'><CardTitle className='text-sm font-semibold mb-4'>Inscriptions par mois</CardTitle>
        <div className='flex items-end gap-2 h-40'>{months.map(([m, v]) => (<div key={m} className='flex-1 flex flex-col items-center gap-1'><span className='text-[10px] text-jl-secondary'>{v}</span><div className='w-full bg-jl-gold rounded-t' style={{ height: `${Math.max((v / maxMonth) * 120, 2)}px` }} /><span className='text-[9px] text-jl-muted truncate w-full text-center'>{m}</span></div>))}</div>
      </Card>
      <Card className='p-4'><CardTitle className='text-sm font-semibold mb-3'>Cabinets récents</CardTitle>
        <div className='space-y-3'>{(data.recentTenants || []).slice(0, 5).map(t => (<div key={t.id} className='flex items-center justify-between'><div><p className='text-sm font-medium text-jl-primary'>{t.name}</p><p className='text-xs text-jl-muted'>{t._count.users} utilisateur{t._count.users > 1 ? 's' : ''} · {fmtDate(t.createdAt)}</p></div>{t.subscription?.plan && <Badge className='bg-jl-blue-light text-jl-blue text-[10px]'>{t.subscription.plan.name}</Badge>}</div>))}</div>
      </Card>
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      <Card className='p-4'><CardTitle className='text-sm font-semibold mb-4'>Distribution par plan</CardTitle>
        <div className='space-y-3'>{(data.tenantsByPlan || []).map(p => (<div key={p.plan}><div className='flex justify-between text-xs mb-1'><span className='text-jl-secondary'>{p.plan}</span><span className='text-jl-secondary'>{p._count.id}</span></div><div className='h-2 bg-jl-page rounded-full overflow-hidden'><div className='h-full bg-jl-gold rounded-full' style={{ width: `${(p._count.id / maxPlan) * 100}%` }} /></div></div>))}</div>
      </Card>
      <Card className='p-4'><CardTitle className='text-sm font-semibold mb-4'>Distribution par rôle</CardTitle>
        <div className='space-y-3'>{(data.usersByRole || []).map(r => (<div key={r.role}><div className='flex justify-between text-xs mb-1'><span className='text-jl-secondary'>{ROLE_LABELS[r.role] || r.role}</span><span className='text-jl-secondary'>{r._count.id}</span></div><div className='h-2 bg-jl-page rounded-full overflow-hidden'><div className='h-full bg-jl-blue rounded-full' style={{ width: `${(r._count.id / maxRole) * 100}%` }} /></div></div>))}</div>
      </Card>
    </div>
  </div>)
}

export function TenantRow({ t, subDaysLeft, openSubDialog, openEdit, delMut }: { t: AdminTenant; subDaysLeft: (t: AdminTenant) => number | null; openSubDialog: (t: AdminTenant) => void; openEdit: (t: AdminTenant) => void; delMut: { mutate: (id: string) => void } }) {
  const dl = subDaysLeft(t)
  return (<TableRow className='cursor-pointer hover:bg-jl-page'><TableCell><div className='flex items-center gap-2'><div className={cn('size-2 rounded-full shrink-0', t.isActive ? 'bg-[var(--success)]' : 'bg-jl-page')} /><div><span className='font-medium text-jl-primary'>{t.name}</span>{t.city && <p className='text-[10px] text-jl-muted'>{t.city}{t.country ? `, ${t.country}` : ''}</p>}</div></div></TableCell><TableCell className='hidden sm:table-cell'><div className='flex flex-col gap-1'><div className='flex items-center gap-1.5'><Badge className='bg-jl-blue-light text-jl-blue text-[10px]'>{t.subscription?.plan?.name || t.plan}</Badge>{dl !== null && <span className={cn('text-[10px] font-medium', dl <= 0 ? 'text-[var(--danger)]' : dl <= 15 ? 'text-[var(--accent)]' : 'text-[var(--success)]')}>{dl <= 0 ? 'Expiré' : dl + 'j restants'}</span>}</div>{t.subscription?.currentPeriodEnd && <p className='text-[10px] text-jl-muted'>Fin : {new Date(t.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}</p>}</div></TableCell><TableCell><div className='flex items-center gap-1.5'><Users className='size-3 text-jl-muted' /><span className='text-sm font-medium'>{t._count?.users ?? 0}</span></div></TableCell><TableCell><div className='flex items-center gap-1.5'><Briefcase className='size-3 text-jl-muted' /><span className='text-sm font-medium'>{t._count?.cases ?? 0}</span></div></TableCell><TableCell className='hidden md:table-cell text-sm text-jl-secondary'>{t._count?.clients ?? 0}</TableCell><TableCell className='hidden lg:table-cell text-sm text-jl-secondary'>{t._count?.invoices ?? 0}</TableCell><TableCell className='hidden lg:table-cell text-xs text-jl-secondary'>{fmtDate(t.createdAt)}</TableCell><TableCell><div className='flex items-center gap-0.5'><Button variant='ghost' size='icon' className='size-7 text-jl-blue hover:text-jl-blue hover:bg-jl-blue-light' onClick={() => openSubDialog(t)} title={"Gérer l'abonnement"}><CreditCard className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7' onClick={() => openEdit(t)}><Edit className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[var(--danger)]' onClick={() => delMut.mutate(t.id)}><Trash2 className='size-3.5' /></Button></div></TableCell></TableRow>)
}

export function AdminCabinsView() {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subDialogOpen, setSubDialogOpen] = useState(false)
  const [subTarget, setSubTarget] = useState<AdminTenant | null>(null)
  const [subPlanId, setSubPlanId] = useState('')
  const [subPeriod, setSubPeriod] = useState('annual')
  const [editing, setEditing] = useState<AdminTenant | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', email: '', phone: '', address: '', city: '', country: '', niu: '', plan: 'starter', maxUsers: 5, maxStorageGb: 5, isActive: true })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ tenants: AdminTenant[]; total: number }>({ queryKey: ['admin-tenants', showInactive], queryFn: () => fetch(`/api/tenants?includeInactive=${showInactive}`).then(r => r.json()) })
  const tenants = (data?.tenants || []).filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase()))
  const allTenants = data?.tenants || []
  const totalActive = allTenants.filter(t => t.isActive).length
  const totalInactive = allTenants.filter(t => !t.isActive).length
  const totalUsers = allTenants.reduce((s, t) => s + (t._count?.users ?? 0), 0)
  const totalCases = allTenants.reduce((s, t) => s + (t._count?.cases ?? 0), 0)
  const totalClients = allTenants.reduce((s, t) => s + (t._count?.clients ?? 0), 0)
  const plansMap: Record<string, number> = {}
  for (const t of allTenants) { const p = t.subscription?.plan?.name || t.plan; plansMap[p] = (plansMap[p] || 0) + 1 }
  const topByCases = [...allTenants].sort((a, b) => (b._count?.cases ?? 0) - (a._count?.cases ?? 0)).slice(0, 3)
  const saveMut = useMutation({
    mutationFn: async (f: typeof form) => {
      if (editing) { const r = await fetch(`/api/tenants/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }); if (!r.ok) throw new Error(); return r.json() }
      const r = await fetch('/api/tenants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }); if (!r.ok) throw new Error(); return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast.success(editing ? 'Cabinet modifié' : 'Cabinet créé'); setDialogOpen(false) },
    onError: () => toast.error('Erreur lors de la sauvegarde')
  })
  const delMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/tenants/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast.success('Cabinet supprimé') },
    onError: () => toast.error('Erreur lors de la suppression')
  })
  const { data: plans } = useQuery<Array<{ id: string; name: string; slug: string; priceAnnual: number; priceSemiAnnual: number; priceQuarterly: number; priceMonthly: number; maxUsers: number; maxStorageGb: number; isActive: boolean }>>({ queryKey: ['admin-plans-subs'], queryFn: () => fetch('/api/subscription-plans').then(r => r.json()) })
  const subMut = useMutation({
    mutationFn: (body: { tenantId: string; planId: string; billingPeriod: string; action: string }) =>
      fetch('/api/subscriptions/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async r => { if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || `Erreur ${r.status}`); } return r.json() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); qc.invalidateQueries({ queryKey: ['admin-plans-subs'] }); toast.success('Abonnement mis à jour'); setSubDialogOpen(false) },
    onError: (e: any) => toast.error(e.message || 'Erreur lors de la mise à jour de l\'abonnement')
  })
  const openSubDialog = (t: AdminTenant) => {
    setSubTarget(t)
    setSubPlanId(t.subscription?.plan?.id || '')
    setSubPeriod(t.subscription?.billingPeriod || 'annual')
    setSubDialogOpen(true)
  }
  const handleSubAction = (action: string) => {
    if (!subTarget || !subPlanId) return
    subMut.mutate({ tenantId: subTarget.id, planId: subPlanId, billingPeriod: subPeriod, action })
  }
  const subDaysLeft = (t: AdminTenant) => {
    if (!t.subscription?.currentPeriodEnd) return null
    const end = new Date(t.subscription.currentPeriodEnd)
    const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }
  const periodLabels: Record<string, string> = { monthly: 'Mensuel', quarterly: 'Trimestriel', semi_annual: 'Semestriel', annual: 'Annuel' }
  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '', email: '', phone: '', address: '', city: '', country: '', niu: '', plan: 'starter', maxUsers: 5, maxStorageGb: 5, isActive: true }); setDialogOpen(true) }
  const openEdit = (t: AdminTenant) => { setEditing(t); setForm({ name: t.name, slug: t.slug, email: t.email || '', phone: t.phone || '', address: t.address || '', city: t.city || '', country: t.country || '', niu: t.niu || '', plan: t.plan, maxUsers: t.maxUsers, maxStorageGb: t.maxStorageGb, isActive: t.isActive }); setDialogOpen(true) }
  const genSlug = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const kpis = [
    { label: 'Cabinets actifs', value: totalActive, icon: BuildingIcon, color: 'text-jl-blue', bg: 'bg-jl-blue-light', ring: 'ring-[#1E5A8A]/10' },
    { label: 'Cabinets inactifs', value: totalInactive, icon: Archive, color: 'text-jl-muted', bg: 'bg-jl-page', ring: 'ring-[#9CA3AF]/10' },
    { label: 'Total utilisateurs', value: totalUsers, icon: Users, color: 'text-[var(--success)]', bg: 'bg-[#D1FAE5]', ring: 'ring-[#059669]/10' },
    { label: 'Total dossiers', value: totalCases, icon: Briefcase, color: 'text-jl-gold', bg: 'bg-jl-gold-light', ring: 'ring-[#C8A45D]/10' },
    { label: 'Total clients', value: totalClients, icon: UserCircle, color: 'text-[#7C3AED]', bg: 'bg-[var(--primary-light)]', ring: 'ring-[#7C3AED]/10' },
    { label: 'Types de forfaits', value: Object.keys(plansMap).length, icon: CreditCardIcon, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent-light)]', ring: 'ring-[#D97706]/10' },
  ]
  return (<div className='p-6 space-y-6'>
    <div className='flex items-center justify-between flex-wrap gap-3'>
      <div>
        <h2 className='text-lg font-bold text-jl-primary'>Cabinets</h2>
        <p className='text-xs text-jl-muted mt-0.5'>{allTenants.length} cabinet{allTenants.length !== 1 ? 's' : ''} enregistré{allTenants.length !== 1 ? 's' : ''} au total</p>
      </div>
      <Button onClick={openCreate} className='bg-jl-blue hover:bg-jl-blue text-white'><BuildingIcon className='size-4 mr-2' />Nouveau cabinet</Button>
    </div>

    {/* KPI Cards */}
    <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'>
      {kpis.map((k, i) => (
        <Card key={i} className='relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='flex items-start justify-between mb-3'>
              <div className={cn('p-2.5 rounded-xl ring-1', k.bg, k.ring)}><k.icon className={cn('size-5', k.color)} /></div>
              <div className={cn('size-2 rounded-full mt-1', k.value > 0 ? 'bg-[var(--success)]' : 'bg-jl-page')} title={k.value > 0 ? 'Données disponibles' : 'Aucune donnée'} />
            </div>
            <p className={cn('text-2xl font-bold tracking-tight', k.color)}>{k.value.toLocaleString('fr-FR')}</p>
            <p className='text-[11px] text-jl-muted mt-1 font-medium'>{k.label}</p>
          </CardContent>
          <div className={cn('absolute bottom-0 left-0 right-0 h-0.5', k.bg.replace('bg-[', 'bg-').replace(']', ''))} style={{ background: k.color.includes('#1E5A8A') ? '#1E5A8A' : k.color.includes('#9CA3AF') ? '#9CA3AF' : k.color.includes('#059669') ? '#059669' : k.color.includes('#C8A45D') ? '#C8A45D' : k.color.includes('#7C3AED') ? '#7C3AED' : '#D97706' }} />
        </Card>
      ))}
    </div>

    {/* Plan Distribution + Top Cabinets */}
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
      <Card><CardHeader className='pb-3'><CardTitle className='text-sm font-semibold'>Répartition par forfait</CardTitle></CardHeader><CardContent className='space-y-2.5'>
        {Object.entries(plansMap).sort((a, b) => b[1] - a[1]).map(([plan, count]) => {
          const pct = allTenants.length > 0 ? Math.round((count / allTenants.length) * 100) : 0
          const planColors: Record<string, string> = { starter: 'bg-jl-page', standard: 'bg-jl-blue', premium: 'bg-jl-gold', entreprise: 'bg-[#7C3AED]', professional: 'bg-[var(--success)]', free: 'bg-jl-page' }
          return (<div key={plan} className='flex items-center gap-3'><span className='text-xs text-jl-secondary w-28 truncate'>{plan}</span><div className='flex-1 h-2.5 bg-jl-page rounded-full overflow-hidden'><div className={cn('h-full rounded-full transition-all', planColors[plan] || 'bg-jl-blue')} style={{ width: pct + '%' }} /></div><span className='text-xs font-medium text-jl-secondary w-16 text-right'>{count} ({pct}%)</span></div>)
        })}
        {Object.keys(plansMap).length === 0 && <p className='text-xs text-jl-muted text-center py-4'>Aucun cabinet</p>}
      </CardContent></Card>
      <Card><CardHeader className='pb-3'><CardTitle className='text-sm font-semibold'>Top 3 cabinets par dossiers</CardTitle></CardHeader><CardContent className='space-y-3'>
        {topByCases.map((t, i) => (<div key={t.id} className='flex items-center gap-3 p-3 rounded-lg bg-jl-page'><div className={cn('flex items-center justify-center size-8 rounded-full text-sm font-bold', i === 0 ? 'bg-jl-gold text-white' : i === 1 ? 'bg-jl-page text-white' : 'bg-jl-gold text-white')}>{i + 1}</div><div className='flex-1 min-w-0'><p className='text-sm font-medium text-jl-primary truncate'>{t.name}</p><p className='text-[10px] text-jl-muted'>{t._count?.users ?? 0} utilisateurs · {t.subscription?.plan?.name || t.plan}</p></div><div className='text-right'><p className='text-lg font-bold text-jl-blue'>{t._count?.cases ?? 0}</p><p className='text-[10px] text-jl-muted'>dossiers</p></div></div>))}
        {topByCases.length === 0 && <p className='text-xs text-jl-muted text-center py-4'>Aucun cabinet</p>}
      </CardContent></Card>
    </div>

    {/* Search + Table */}
    <div className='flex items-center gap-3 flex-wrap'>
      <div className='relative flex-1 min-w-[200px] max-w-sm'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-jl-muted' /><Input placeholder='Rechercher…' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9' /></div>
      <label className='flex items-center gap-2 text-sm text-jl-secondary cursor-pointer'><Switch checked={showInactive} onCheckedChange={setShowInactive} /><span>Voir inactifs</span></label>
    </div>
    {isLoading ? <div className='space-y-2'>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-12' />)}</div> :
    <Card><CardContent className='p-0'><div className='max-h-[480px] overflow-y-auto'><Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className='hidden sm:table-cell'>Abonnement</TableHead><TableHead>Utilisateurs</TableHead><TableHead>Dossiers</TableHead><TableHead className='hidden md:table-cell'>Clients</TableHead><TableHead className='hidden lg:table-cell'>Factures</TableHead><TableHead className='hidden lg:table-cell'>Créé le</TableHead><TableHead className='w-[100px]'>Actions</TableHead></TableRow></TableHeader><TableBody>
      {tenants.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={BuildingIcon} title='Aucun cabinet' /></TableCell></TableRow> :
      tenants.map(t => (<TenantRow key={t.id} t={t} subDaysLeft={subDaysLeft} openSubDialog={openSubDialog} openEdit={openEdit} delMut={delMut} />))}
    </TableBody></Table></div></CardContent></Card>}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'><DialogHeader><DialogTitle>{editing ? 'Modifier le cabinet' : 'Nouveau cabinet'}</DialogTitle></DialogHeader>
      <div className='space-y-3'>
        <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: genSlug(e.target.value) })} /></div>
        <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Email</Label><Input type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
        <div><Label>Adresse</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Ville</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div><div><Label>Pays</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>NIU</Label><Input value={form.niu} onChange={e => setForm({ ...form, niu: e.target.value })} /></div><div><Label>Plan</Label><Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='starter'>Starter</SelectItem><SelectItem value='standard'>Standard</SelectItem><SelectItem value='premium'>Premium</SelectItem><SelectItem value='entreprise'>Entreprise</SelectItem></SelectContent></Select></div></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Max utilisateurs</Label><Input type='number' value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: Number(e.target.value) })} /></div><div><Label>Max stockage (Go)</Label><Input type='number' value={form.maxStorageGb} onChange={e => setForm({ ...form, maxStorageGb: Number(e.target.value) })} /></div></div>
        <label className='flex items-center gap-2 cursor-pointer'><Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} /><span className='text-sm'>Actif</span></label>
      </div>
      <DialogFooter><Button variant='outline' onClick={() => setDialogOpen(false)}>Annuler</Button><Button className='bg-jl-blue hover:bg-jl-blue text-white' disabled={!form.name || saveMut.isPending} onClick={() => saveMut.mutate(form)}>{saveMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : (editing ? 'Modifier' : 'Créer')}</Button></DialogFooter>
    </DialogContent></Dialog>
    {/* Subscription Management Dialog */}
    <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}><DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'><DialogHeader><DialogTitle className='flex items-center gap-2'><CreditCard className='size-5 text-jl-blue' />Gérer l'abonnement</DialogTitle><DialogDescription>{subTarget?.name}</DialogDescription></DialogHeader>
      {subTarget && (<div className='space-y-4'>
        {/* Current subscription summary */}
        {subTarget.subscription && (<Card className='border border-jl'><CardContent className='p-3 space-y-2'>
          <div className='flex items-center justify-between'><span className='text-xs text-jl-muted'>Forfait actuel</span><Badge className='bg-jl-blue-light text-jl-blue text-xs'>{subTarget.subscription.plan.name}</Badge></div>
          <div className='flex items-center justify-between'><span className='text-xs text-jl-muted'>Statut</span><Badge className={cn('text-xs', subTarget.subscription.status === 'active' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]')}>{subTarget.subscription.status === 'active' ? 'Actif' : subTarget.subscription.status === 'expired' ? 'Expiré' : subTarget.subscription.status}</Badge></div>
          <div className='flex items-center justify-between'><span className='text-xs text-jl-muted'>Période</span><span className='text-xs font-medium text-jl-secondary'>{periodLabels[subTarget.subscription.billingPeriod] || subTarget.subscription.billingPeriod}</span></div>
          {subTarget.subscription.currentPeriodEnd && (<>
            <div className='flex items-center justify-between'><span className='text-xs text-jl-muted'>Fin le</span><span className='text-xs font-medium text-jl-secondary'>{new Date(subTarget.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}</span></div>
            <div className='flex items-center justify-between'><span className='text-xs text-jl-muted'>Jours restants</span><span className={cn('text-xs font-bold', (subDaysLeft(subTarget) ?? 0) <= 0 ? 'text-[var(--danger)]' : (subDaysLeft(subTarget) ?? 0) <= 15 ? 'text-[var(--accent)]' : 'text-[var(--success)]')}>{subDaysLeft(subTarget) !== null ? (subDaysLeft(subTarget)! <= 0 ? 'Expiré' : subDaysLeft(subTarget) + ' jours') : '—'}</span></div>
          </>)}
          {!subTarget.isActive && (<div className='mt-2 p-2 rounded-lg bg-[#FEE2E2] border border-[var(--danger)]/30'><p className='text-xs text-[#991B1B] font-medium flex items-center gap-1.5'><AlertOctagon className='size-3.5' />Ce cabinet est désactivé. Toute action réactivera le cabinet.</p></div>)}
        </CardContent></Card>)}
        {!subTarget.subscription && (<div className='p-3 rounded-lg bg-[var(--accent-light)] border border-[#FDE68A]'><p className='text-xs text-[#92400E] flex items-center gap-1.5'><AlertTriangle className='size-3.5' />Aucun abonnement actif. Sélectionnez un forfait ci-dessous.</p></div>)}

        {/* Plan selection */}
        <div className='space-y-1.5'><Label className='text-xs font-medium'>Nouveau forfait</Label><Select value={subPlanId} onValueChange={setSubPlanId}><SelectTrigger className='h-9'><SelectValue placeholder='Sélectionner un forfait…' /></SelectTrigger><SelectContent>{(plans || []).filter(p => p.isActive).map(p => (<SelectItem key={p.id} value={p.id}><div className='flex items-center justify-between gap-4 w-full'><span>{p.name}</span><span className='text-[10px] text-jl-muted'>{fmtMoney(p.priceAnnual)}/an · {p.maxUsers} users</span></div></SelectItem>))}</SelectContent></Select></div>

        {/* Billing period */}
        <div className='space-y-1.5'><Label className='text-xs font-medium'>Période de facturation</Label><div className='grid grid-cols-2 gap-2'>{Object.entries(periodLabels).map(([k, v]) => (<button key={k} type='button' onClick={() => setSubPeriod(k)} className={cn('p-2.5 rounded-lg border text-xs font-medium transition-all text-center', subPeriod === k ? 'border-jl-blue bg-jl-blue-light text-jl-blue' : 'border-jl text-jl-secondary hover:border-jl')}>{v}</button>))}</div></div>

        {/* Action buttons */}
        <div className='space-y-2 pt-2'>
          <p className='text-xs text-jl-muted font-medium'>Choisir une action :</p>
          <div className='grid grid-cols-1 gap-2'>
            <Button className='bg-[var(--success)] hover:bg-[var(--success)] text-white w-full justify-start gap-2 h-10' disabled={!subPlanId || subMut.isPending} onClick={() => handleSubAction('renew')}>{subMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}<div className='text-left'><div className='text-sm font-medium'>Renouveler</div><div className='text-[10px] opacity-80'>Prolonge la période actuelle (même forfait, durée ajoutée)</div></div></Button>
            <Button className='bg-jl-blue hover:bg-jl-blue text-white w-full justify-start gap-2 h-10' disabled={!subPlanId || subMut.isPending} onClick={() => handleSubAction('change')}>{subMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : <ArrowUpDown className='size-4' />}<div className='text-left'><div className='text-sm font-medium'>Changer de forfait</div><div className='text-[10px] opacity-80'>Nouveau forfait, nouvelle période depuis aujourd'hui</div></div></Button>
            <Button className='bg-jl-gold hover:bg-jl-gold text-white w-full justify-start gap-2 h-10' disabled={!subPlanId || subMut.isPending} onClick={() => handleSubAction('upgrade')}>{subMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : <ArrowUpRight className='size-4' />}<div className='text-left'><div className='text-sm font-medium'>Upgrader</div><div className='text-[10px] opacity-80'>Forfait supérieur, période prolongée depuis la fin actuelle</div></div></Button>
          </div>
        </div>
      </div>)}
    </DialogContent></Dialog>
  </div>)
}

export function AdminUsersView() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pwDialogOpen, setPwDialogOpen] = useState(false)
  const [pwTarget, setPwTarget] = useState<{ id: string; fullName: string } | null>(null)
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const [editing, setEditing] = useState<UserItem & { tenant?: { id: string; name: string } } | null>(null)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'lawyer', tenantId: '', password: '', isActive: true })
  const qc = useQueryClient()
  const { data: tenantsData } = useQuery<TenantItem[]>({ queryKey: ['admin-tenants-list'], queryFn: () => fetch('/api/tenants?includeInactive=true').then(r => r.json()).then(d => d.tenants || []) })
  const { data, isLoading } = useQuery<{ users: (UserItem & { tenant?: { id: string; name: string }; lastLogin?: string })[]; total: number }>({ queryKey: ['admin-users', showInactive], queryFn: () => fetch(`/api/users?includeInactive=${showInactive}&includeRootAdmin=true`).then(r => r.json()) })
  const users = (data?.users || []).filter(u => {
    if (search && !u.fullName.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter && u.role !== roleFilter) return false
    return true
  })
  const saveMut = useMutation({
    mutationFn: async (f: typeof form) => {
      const payload: Record<string, unknown> = { ...f }; if (!f.password) delete payload.password; if (!f.tenantId) delete payload.tenantId
      if (editing) { const r = await fetch(`/api/users/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(); return r.json() }
      const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(); return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success(editing ? 'Utilisateur modifié' : 'Utilisateur créé'); setDialogOpen(false) },
    onError: () => toast.error('Erreur lors de la sauvegarde')
  })
  const delMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/users/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Utilisateur supprimé') },
    onError: () => toast.error('Erreur lors de la suppression')
  })
  const toggleMut = useMutation({
    mutationFn: (u: UserItem) => fetch(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !u.isActive }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Statut modifié') },
    onError: () => toast.error('Erreur')
  })
  const adminChangePw = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      fetch(`/api/users/${userId}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminOverride: true, newPassword }) }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erreur'); return d }),
    onSuccess: () => { toast.success('Mot de passe modifié'); setPwDialogOpen(false); setPwForm({ newPassword: '', confirmPassword: '' }); setPwTarget(null) },
    onError: (e: Error) => toast.error(e.message),
  })
  const openPwDialog = (u: UserItem) => { setPwTarget({ id: u.id, fullName: u.fullName }); setPwForm({ newPassword: '', confirmPassword: '' }); setPwDialogOpen(true) }
  const openCreate = () => { setEditing(null); setForm({ fullName: '', email: '', phone: '', role: 'lawyer', tenantId: '', password: '', isActive: true }); setDialogOpen(true) }
  const openEdit = (u: UserItem & { tenant?: { id: string; name: string } }) => { setEditing(u); setForm({ fullName: u.fullName, email: u.email, phone: u.phone || '', role: u.role, tenantId: u.tenantId || '', password: '', isActive: u.isActive ?? true }); setDialogOpen(true) }
  return (<div className='p-6 space-y-4'>
    <div className='flex items-center justify-between flex-wrap gap-3'>
      <h2 className='text-lg font-bold text-jl-primary'>Utilisateurs</h2>
      <Button onClick={openCreate} className='bg-jl-blue hover:bg-jl-blue text-white'><UserPlus className='size-4 mr-2' />Nouvel utilisateur</Button>
    </div>
    <div className='flex items-center gap-3 flex-wrap'>
      <div className='relative flex-1 min-w-[200px] max-w-sm'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-jl-muted' /><Input placeholder='Rechercher…' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9' /></div>
      <Select value={roleFilter} onValueChange={v => setRoleFilter(v)}><SelectTrigger className='w-[160px] h-9'><SelectValue placeholder='Rôle' /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
      <label className='flex items-center gap-2 text-sm text-jl-secondary cursor-pointer'><Switch checked={showInactive} onCheckedChange={setShowInactive} /><span>Voir inactifs</span></label>
    </div>
    {isLoading ? <div className='space-y-2'>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-12' />)}</div> :
    <Card><Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Rôle</TableHead><TableHead>Cabinet</TableHead><TableHead>Statut</TableHead><TableHead>Dernière connexion</TableHead><TableHead className='w-[100px]'>Actions</TableHead></TableRow></TableHeader><TableBody>
      {users.length === 0 ? <TableRow><TableCell colSpan={7}><EmptyState icon={UsersRound} title='Aucun utilisateur' /></TableCell></TableRow> :
      users.map(u => (<TableRow key={u.id}><TableCell><div className='flex items-center gap-2'><Avatar className='size-7'><AvatarFallback className='bg-jl-blue text-white text-[10px]'>{initials(u.fullName)}</AvatarFallback></Avatar><span className='font-medium text-jl-primary'>{u.fullName}</span>{u.role === 'root_admin' && <Crown className='size-3.5 text-jl-gold' />}</div></TableCell><TableCell className='text-jl-secondary'>{u.email}</TableCell><TableCell><Badge className='bg-jl-page text-jl-secondary text-xs'>{ROLE_LABELS[u.role] || u.role}</Badge></TableCell><TableCell className='text-jl-secondary'>{u.tenant?.name || '—'}</TableCell><TableCell><Badge className={cn('text-xs', u.isActive ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]')}>{u.isActive ? 'Actif' : 'Inactif'}</Badge></TableCell><TableCell className='text-jl-secondary text-xs'>{fmtDateTime((u as UserItem & { lastLogin?: string }).lastLogin)}</TableCell><TableCell><div className='flex items-center gap-1'><Button variant='ghost' size='icon' className='size-7' onClick={() => openEdit(u as UserItem & { tenant?: { id: string; name: string } })}><Edit className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-jl-blue hover:text-jl-blue' onClick={() => openPwDialog(u)}><Lock className='size-3.5' /></Button>{u.role !== 'root_admin' && <><Button variant='ghost' size='icon' className={cn('size-7', u.isActive ? 'text-[#F59E0B]' : 'text-[var(--success)]')} onClick={() => toggleMut.mutate(u)}><ArrowUpDown className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[var(--danger)]' onClick={() => delMut.mutate(u.id)}><Trash2 className='size-3.5' /></Button></>}</div></TableCell></TableRow>))}
    </TableBody></Table></Card>}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'><DialogHeader><DialogTitle>{editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle></DialogHeader>
      <div className='space-y-3'>
        <div><Label>Nom complet *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
        <div><Label>Email *</Label><Input type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div><Label>Rôle</Label><Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div></div>
        <div><Label>Cabinet</Label><Select value={form.tenantId} onValueChange={v => setForm({ ...form, tenantId: v })}><SelectTrigger><SelectValue placeholder='Sélectionner…' /></SelectTrigger><SelectContent><SelectItem value=''>Aucun (root_admin)</SelectItem>{(tenantsData || []).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
        {!editing && <div><Label>Mot de passe *</Label><Input type='password' value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
        <label className='flex items-center gap-2 cursor-pointer'><Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} /><span className='text-sm'>Actif</span></label>
      </div>
      <DialogFooter><Button variant='outline' onClick={() => setDialogOpen(false)}>Annuler</Button><Button className='bg-jl-blue hover:bg-jl-blue text-white' disabled={(!form.fullName || !form.email || (!editing && !form.password)) || saveMut.isPending} onClick={() => saveMut.mutate(form)}>{saveMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : (editing ? 'Modifier' : 'Créer')}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}><DialogContent className='max-w-sm'><DialogHeader><DialogTitle>Modifier le mot de passe</DialogTitle><DialogDescription>Pour : <span className='font-semibold'>{pwTarget?.fullName}</span></DialogDescription></DialogHeader>
      <div className='space-y-3'>
        <div><Label>Nouveau mot de passe *</Label><Input type='password' value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder='Min. 6 caractères' /></div>
        <div><Label>Confirmer *</Label><Input type='password' value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder='••••••••' /></div>
        {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && <p className='text-xs text-[var(--danger)]'>Les mots de passe ne correspondent pas</p>}
      </div>
      <DialogFooter><Button variant='outline' onClick={() => setPwDialogOpen(false)}>Annuler</Button><Button className='bg-jl-blue hover:bg-jl-blue text-white' disabled={adminChangePw.isPending || !pwForm.newPassword || pwForm.newPassword.length < 6 || pwForm.newPassword !== pwForm.confirmPassword} onClick={() => pwTarget && adminChangePw.mutate({ userId: pwTarget.id, newPassword: pwForm.newPassword })}>{adminChangePw.isPending ? <RefreshCw className='size-4 animate-spin' /> : <Check className='size-4 mr-1.5' />}Modifier</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>)
}

export function AdminPlansView() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [featuresText, setFeaturesText] = useState('')
  const [form, setForm] = useState({ name: '', slug: '', description: '', priceAnnual: 0, priceSemiAnnual: 0, priceQuarterly: 0, priceMonthly: 0, currencyCode: 'XAF', maxUsers: 5, maxStorageGb: 5, hasAI: false, isActive: true, sortOrder: 0 })
  const qc = useQueryClient()
  const { data: plans, isLoading } = useQuery<any[]>({ queryKey: ['admin-plans'], queryFn: () => fetch('/api/subscription-plans').then(r => r.json()) })
  const saveMut = useMutation({
    mutationFn: async (f: any) => {
      const payload = { ...f, features: JSON.stringify(featuresText.split('\n').filter(Boolean)) }
      if (editing) { const r = await fetch(`/api/subscription-plans/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(); return r.json() }
      const r = await fetch('/api/subscription-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(); return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.success(editing ? 'Forfait modifié' : 'Forfait créé'); setDialogOpen(false) },
    onError: (e: any) => toast.error(e.message || 'Erreur')
  })
  const delMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/subscription-plans/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error('Impossible de supprimer ce forfait (abonnements actifs)'); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.success('Forfait supprimé') },
    onError: (e: Error) => toast.error(e.message)
  })
  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '', description: '', priceAnnual: 0, priceSemiAnnual: 0, priceQuarterly: 0, priceMonthly: 0, currencyCode: 'XAF', maxUsers: 5, maxStorageGb: 5, hasAI: false, isActive: true, sortOrder: 0 }); setFeaturesText(''); setDialogOpen(true) }
  const openEdit = (p: any) => { setEditing(p); setForm({ name: p.name, slug: p.slug, description: p.description || '', priceAnnual: p.priceAnnual || 0, priceSemiAnnual: p.priceSemiAnnual || 0, priceQuarterly: p.priceQuarterly || 0, priceMonthly: p.priceMonthly || 0, currencyCode: p.currencyCode || 'XAF', maxUsers: p.maxUsers || 5, maxStorageGb: p.maxStorageGb || 5, hasAI: p.hasAI || false, isActive: p.isActive ?? true, sortOrder: p.sortOrder || 0 }); try { setFeaturesText((JSON.parse(p.features || '[]') as string[]).join('\n')) } catch { setFeaturesText('') }; setDialogOpen(true) }
  const parseFeatures = (f: string) => { try { return JSON.parse(f || '[]') as string[] } catch { return [] } }
  return (<div className='p-6 space-y-4'>
    <div className='flex items-center justify-between flex-wrap gap-3'>
      <h2 className='text-lg font-bold text-jl-primary'>Abonnements</h2>
      <Button onClick={openCreate} className='bg-jl-blue hover:bg-jl-blue text-white'><CreditCardIcon className='size-4 mr-2' />Nouveau forfait</Button>
    </div>
    {isLoading ? <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-72 rounded-xl' />)}</div> :
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {(plans || []).map((p: any) => (<Card key={p.id} className={cn('p-5 flex flex-col', !p.isActive && 'opacity-60')}><div className='flex items-start justify-between mb-3'><div><h3 className='text-base font-bold text-jl-primary'>{p.name}</h3><p className='text-xs text-jl-muted mt-0.5'>{p.description || ''}</p></div><div className='flex items-center gap-1'><Button variant='ghost' size='icon' className='size-7' onClick={() => openEdit(p)}><Edit className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[var(--danger)]' onClick={() => delMut.mutate(p.id)}><Trash2 className='size-3.5' /></Button></div></div>
        <div className='mb-3'><span className='text-2xl font-bold text-jl-blue'>{fmtMoney(p.priceAnnual)}</span><span className='text-xs text-jl-muted'>/an</span></div>
        {p.priceMonthly > 0 && <p className='text-[10px] text-jl-muted mb-3'>{fmtMoney(p.priceMonthly)}/mois · {fmtMoney(p.priceQuarterly || 0)}/trimestre · {fmtMoney(p.priceSemiAnnual || 0)}/semestre</p>}
        <div className='flex-1 space-y-1.5 mb-4'>{(parseFeatures(p.features) || []).slice(0, 6).map((f: string, i: number) => (<div key={i} className='flex items-center gap-2 text-xs text-jl-secondary'><CheckCircle2 className='size-3 text-[var(--success)] shrink-0' /><span>{f}</span></div>))}</div>
        <div className='flex items-center gap-2 flex-wrap'><Badge className='bg-jl-blue-light text-jl-blue text-[10px]'>{p.maxUsers} utilisateurs</Badge><Badge className='bg-jl-page text-jl-secondary text-[10px]'>{p.maxStorageGb} Go</Badge>{p.hasAI && <Badge className='bg-jl-gold text-white text-[10px]'>IA</Badge>}<Badge className={cn('text-[10px]', p.isActive ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]')}>{p.isActive ? 'Actif' : 'Inactif'}</Badge></div>
      </Card>))}
      {(plans || []).length === 0 && <div className='col-span-full'><EmptyState icon={CreditCardIcon} title='Aucun forfait' /></div>}
    </div>}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'><DialogHeader><DialogTitle>{editing ? 'Modifier le forfait' : 'Nouveau forfait'}</DialogTitle></DialogHeader>
      <div className='space-y-3'>
        <div className='grid grid-cols-2 gap-3'><div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Prix annuel</Label><Input type='number' value={form.priceAnnual} onChange={e => setForm({ ...form, priceAnnual: Number(e.target.value) })} /></div><div><Label>Devise</Label><Input value={form.currencyCode} onChange={e => setForm({ ...form, currencyCode: e.target.value })} /></div></div>
        <div className='grid grid-cols-3 gap-3'><div><Label>Semi-annuel</Label><Input type='number' value={form.priceSemiAnnual} onChange={e => setForm({ ...form, priceSemiAnnual: Number(e.target.value) })} /></div><div><Label>Trimestriel</Label><Input type='number' value={form.priceQuarterly} onChange={e => setForm({ ...form, priceQuarterly: Number(e.target.value) })} /></div><div><Label>Mensuel</Label><Input type='number' value={form.priceMonthly} onChange={e => setForm({ ...form, priceMonthly: Number(e.target.value) })} /></div></div>
        <div className='grid grid-cols-3 gap-3'><div><Label>Max utilisateurs</Label><Input type='number' value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: Number(e.target.value) })} /></div><div><Label>Max stockage (Go)</Label><Input type='number' value={form.maxStorageGb} onChange={e => setForm({ ...form, maxStorageGb: Number(e.target.value) })} /></div><div><Label>Ordre</Label><Input type='number' value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div></div>
        <label className='flex items-center gap-2 cursor-pointer'><Switch checked={form.hasAI} onCheckedChange={v => setForm({ ...form, hasAI: v })} /><span className='text-sm'>Inclut l'IA</span></label>
        <label className='flex items-center gap-2 cursor-pointer'><Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} /><span className='text-sm'>Actif</span></label>
        <div><Label>Fonctionnalités (une par ligne)</Label><Textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={4} placeholder='Stockage illimité&#10;Support prioritaire' /></div>
      </div>
      <DialogFooter><Button variant='outline' onClick={() => setDialogOpen(false)}>Annuler</Button><Button className='bg-jl-blue hover:bg-jl-blue text-white' disabled={!form.name || saveMut.isPending} onClick={() => saveMut.mutate(form)}>{saveMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : (editing ? 'Modifier' : 'Créer')}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>)
}

