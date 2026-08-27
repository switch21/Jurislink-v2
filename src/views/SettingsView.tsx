'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== SETTINGS VIEW ====================
export function SettingsView() {
  const { user, logout, hasPermission } = useAppStore()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'root_admin' || user?.role === 'firm_admin' || user?.role === 'associate'
  const canManagePerms = hasPermission('setting', 'manage_permissions')
  const [profileForm, setProfileForm] = useState({ fullName: user?.fullName || '', email: user?.email || '', phone: user?.phone || '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPwForm, setShowPwForm] = useState(false)
  const [newUser, setNewUser] = useState({ fullName: '', email: '', role: 'lawyer', password: '' })
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '' })
  const [showNewUser, setShowNewUser] = useState(false)
  const [showNewCurrency, setShowNewCurrency] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profil'|'cabinet'|'equipe'|'permissions'|'abonnement'|'devises'>('profil')

  const { data: tenantData } = useQuery({
    queryKey: ['tenant', user?.tenantId],
    queryFn: () => fetch(`/api/tenants/${user?.tenantId}`).then(r => r.json()),
    enabled: !!user?.tenantId,
  })
  const tenantInfo: TenantItem | null = tenantData || null

  const { data: usersList } = useQuery({
    queryKey: ['settings-users', user?.tenantId],
    queryFn: () => fetch(`/api/users?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : d.users || []),
    enabled: isAdmin,
  })

  const { data: currencies } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => fetch('/api/currencies').then(r => r.json()),
    enabled: isAdmin,
  })

  // RBAC data
  const { data: permData, isLoading: permLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => fetch('/api/permissions').then(r => r.json()),
    enabled: isAdmin,
  })

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [localMatrix, setLocalMatrix] = useState<Record<string, boolean>>({})

  const savePermissions = useMutation({
    mutationFn: (body: { roleId: string; permissions: Record<string, boolean> }) =>
      fetch('/api/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Permissions mises à jour'); setLocalMatrix({}); qc.invalidateQueries({ queryKey: ['permissions'] }) },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  // Subscription data
  const { data: subData } = useQuery({
    queryKey: ['subscription', user?.tenantId],
    queryFn: () => fetch(`/api/subscriptions?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!user?.tenantId,
  })

  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => fetch('/api/subscription-plans').then(r => r.json()),
    enabled: isAdmin,
  })

  const [billingPeriod, setBillingPeriod] = useState<'monthly'|'quarterly'|'semi_annual'|'annual'>('annual')
  const periodLabels: Record<string, string> = { monthly: 'Mensuel', quarterly: 'Trimestriel', semi_annual: 'Semestriel', annual: 'Annuel' }
  const periodPriceKey: Record<string, string> = { monthly: 'priceMonthly', quarterly: 'priceQuarterly', semi_annual: 'priceSemiAnnual', annual: 'priceAnnual' }

  const changeSubscription = useMutation({
    mutationFn: (body: { tenantId: string; planId: string; billingPeriod: string }) =>
      fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Abonnement mis à jour'); qc.invalidateQueries({ queryKey: ['subscription'] }) },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const updateTenant = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch(`/api/tenants/${user?.tenantId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Cabinet mis à jour'); qc.invalidateQueries({ queryKey: ['tenant'] }) },
    onError: () => toast.error('Erreur lors de la mise à jour du cabinet'),
  })

  const uploadLogo = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const fd = new FormData()
      fd.append('logo', file)
      fd.append('tenantId', user!.tenantId!)
      return fetch('/api/tenants/logo', { method: 'POST', body: fd }).then(r => r.json())
    },
    onSuccess: () => { toast.success('Logo mis à jour'); qc.invalidateQueries({ queryKey: ['tenant'] }) },
    onError: () => toast.error('Erreur lors de l\'upload du logo'),
  })

  const [cabinetForm, setCabinetForm] = useState({ name: '', email: '', phone: '', address: '', city: '', country: '', niu: '', language: 'fr', timezone: 'Africa/Douala', currencyCode: 'XAF' })

  const updateProfile = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch(`/api/users/${user?.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.fullName || data.email) {
        const updated = { ...user!, fullName: data.fullName || user!.fullName, email: data.email || user!.email, phone: data.phone || user!.phone }
        if (typeof window !== 'undefined') localStorage.setItem('jurislink_user', JSON.stringify(updated))
        useAppStore.setState({ user: updated })
      }
      toast.success('Profil mis à jour'); qc.invalidateQueries({ queryKey: ['tenant'] })
    },
    onError: () => toast.error('Erreur'),
  })

  const changePassword = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      fetch(`/api/users/${user?.id}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erreur'); return d }),
    onSuccess: () => { toast.success('Mot de passe modifié avec succès'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setShowPwForm(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const createUserMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Utilisateur créé'); qc.invalidateQueries({ queryKey: ['settings-users'] }); setShowNewUser(false); setNewUser({ fullName: '', email: '', role: 'lawyer', password: '' }) },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const createCurrencyMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/currencies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Devise ajoutée'); qc.invalidateQueries({ queryKey: ['currencies'] }); setShowNewCurrency(false); setNewCurrency({ code: '', name: '', symbol: '' }) },
    onError: () => toast.error('Erreur'),
  })

  // Build permission matrix for selected role
  const selectedRolePerms = useMemo(() => {
    if (!permData || !selectedRoleId) return {}
    return permData.matrix?.[selectedRoleId] || {}
  }, [permData, selectedRoleId])

  const resources = useMemo(() => {
    if (!permData?.permissions) return []
    const map = new Map<string, string[]>()
    for (const p of permData.permissions) { if (!map.has(p.resource)) map.set(p.resource, []) }
    return Array.from(map.keys())
  }, [permData])

  const actions = ['view', 'create', 'edit', 'delete', 'export', 'manage_permissions']
  const actionLabels: Record<string, string> = { view: 'Voir', create: 'Créer', edit: 'Modifier', delete: 'Supprimer', export: 'Exporter', manage_permissions: 'Gérer perms' }
  const resourceLabels: Record<string, string> = { case: 'Dossiers', client: 'Clients', document: 'Documents', invoice: 'Factures', task: 'Tâches', event: 'Événements', audit: 'Audit', user: 'Utilisateurs', report: 'Rapports', setting: 'Paramètres', message: 'Messages', notification: 'Notifications' }

  // Count changed permissions
  const changedCount = useMemo(() => {
    if (!selectedRoleId || Object.keys(localMatrix).length === 0) return 0
    return Object.entries(localMatrix).filter(([id, val]) => val !== !!selectedRolePerms[id]).length
  }, [localMatrix, selectedRolePerms, selectedRoleId])

  // Get role permission count
  const getRolePermCount = (roleId: string) => {
    const m = permData?.matrix?.[roleId] || {}
    return Object.values(m).filter(Boolean).length
  }

  // Bulk toggle
  const grantAll = () => { if (!permData) return; const m: Record<string, boolean> = {}; for (const p of permData.permissions) { m[p.id] = true }; setLocalMatrix(m) }
  const revokeAll = () => { if (!permData) return; const m: Record<string, boolean> = {}; for (const p of permData.permissions) { m[p.id] = false }; setLocalMatrix(m) }

  // Get plan price for selected period
  const getPlanPrice = (p: Record<string, unknown>) => {
    const key = periodPriceKey[billingPeriod]
    return (p[key] as number) || (p.priceAnnual as number) || 0
  }

  // Current user count
  const currentUserCount = (usersList || []).length
  const maxUsers = tenantInfo?.maxUsers || 3
  const usagePercent = Math.min((currentUserCount / maxUsers) * 100, 100)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold">Paramètres</h2><p className="text-xs text-[#6B7280] mt-0.5">Gérez votre profil, votre équipe et vos abonnements</p></div>
      </div>

      <Tabs value={settingsTab} onValueChange={(v: string) => setSettingsTab(v as typeof settingsTab)}>
        <TabsList className="bg-[#F3F4F6] flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="profil" className="data-[state=active]:bg-white data-[state=active]:text-[#1E5A8A] data-[state=active]:shadow-sm text-xs">Mon profil</TabsTrigger>
          {user?.tenantId && <TabsTrigger value="cabinet" className="data-[state=active]:bg-white data-[state=active]:text-[#1E5A8A] data-[state=active]:shadow-sm text-xs">Mon cabinet</TabsTrigger>}
          {isAdmin && <TabsTrigger value="equipe" className="data-[state=active]:bg-white data-[state=active]:text-[#1E5A8A] data-[state=active]:shadow-sm text-xs">Équipe</TabsTrigger>}
          {canManagePerms && <TabsTrigger value="permissions" className="data-[state=active]:bg-white data-[state=active]:text-[#1E5A8A] data-[state=active]:shadow-sm text-xs">Permissions RBAC</TabsTrigger>}
          {isAdmin && <TabsTrigger value="abonnement" className="data-[state=active]:bg-white data-[state=active]:text-[#1E5A8A] data-[state=active]:shadow-sm text-xs">Abonnement</TabsTrigger>}
          {isAdmin && <TabsTrigger value="devises" className="data-[state=active]:bg-white data-[state=active]:text-[#1E5A8A] data-[state=active]:shadow-sm text-xs">Devises</TabsTrigger>}
        </TabsList>

        {/* PROFIL */}
        <TabsContent value="profil">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-sm font-semibold">Informations personnelles</CardTitle></CardHeader><CardContent className="space-y-3">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="size-14"><AvatarFallback className="bg-[#1E5A8A] text-white text-lg">{user?.fullName ? initials(user.fullName) : 'U'}</AvatarFallback></Avatar>
                <div><p className="font-semibold">{user?.fullName}</p><p className="text-xs text-[#6B7280]">{user?.email}</p><Badge variant="outline" className="mt-1 text-[10px]">{ROLE_LABELS[user?.role || ''] || user?.role}</Badge></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Nom complet</Label><Input value={profileForm.fullName} onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Adresse e-mail</Label><Input value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} className="h-10" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Téléphone</Label><Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} className="h-10" /></div>
              <Button size="sm" className="bg-[#1E5A8A] hover:bg-[#164070]" onClick={() => updateProfile.mutate(profileForm)} disabled={updateProfile.isPending}>{updateProfile.isPending ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <Check className="size-3.5 mr-1.5" />}Enregistrer</Button>
              <Separator className="my-4" />
              <div>
                <button onClick={() => setShowPwForm(!showPwForm)} className="flex items-center gap-2 text-sm font-semibold text-[#374151] hover:text-[#1E5A8A] transition-colors">
                  <Lock className="size-4" />
                  Changer mon mot de passe
                  <ChevronDown className={cn('size-3.5 transition-transform', showPwForm && 'rotate-180')} />
                </button>
                {showPwForm && <div className="mt-3 space-y-3 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <div className="space-y-1.5"><Label className="text-xs">Mot de passe actuel</Label><Input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="••••••••" className="h-10" autoComplete="current-password" /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Nouveau mot de passe</Label><Input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min. 6 caractères" className="h-10" autoComplete="new-password" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Confirmer le mot de passe</Label><Input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="••••••••" className="h-10" autoComplete="new-password" /></div>
                  </div>
                  {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && <p className="text-xs text-[#DC2626]">Les mots de passe ne correspondent pas</p>}
                  <Button size="sm" className="bg-[#1E5A8A] hover:bg-[#164070]" disabled={changePassword.isPending || !pwForm.currentPassword || pwForm.newPassword.length < 6 || pwForm.newPassword !== pwForm.confirmPassword} onClick={() => changePassword.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })}>
                    {changePassword.isPending ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <Check className="size-3.5 mr-1.5" />}
                    Modifier le mot de passe
                  </Button>
                </div>}
              </div>
            </CardContent></Card>
            {tenantInfo && <Card><CardHeader><CardTitle className="text-sm font-semibold">Mon cabinet</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg"><div className="size-10 rounded-lg bg-[#E8F0F8] flex items-center justify-center"><Building2 className="size-5 text-[#1E5A8A]" /></div><div><p className="font-semibold text-sm">{tenantInfo.name}</p><p className="text-[10px] text-[#6B7280]">{tenantInfo._count?.cases || 0} dossiers · {tenantInfo._count?.clients || 0} clients</p></div></div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-[#6B7280]">Email</span><span className="font-medium truncate ml-2">{tenantInfo.email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Téléphone</span><span className="font-medium">{tenantInfo.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Adresse</span><span className="font-medium truncate ml-2">{tenantInfo.address || '—'}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Pays</span><span className="font-medium">{tenantInfo.country || '—'}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Plan</span><Badge variant="outline" className="text-[10px]">{tenantInfo.plan}</Badge></div>
              </div>
            </CardContent></Card>}
          </div>
        </TabsContent>

        {/* CABINET */}
        <TabsContent value="cabinet">
          {tenantInfo && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-sm font-semibold">Informations du cabinet</CardTitle></CardHeader><CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Nom du cabinet</Label><Input value={cabinetForm.name || tenantInfo.name} onChange={e => setCabinetForm(f => ({ ...f, name: e.target.value }))} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={cabinetForm.email || tenantInfo.email || ''} onChange={e => setCabinetForm(f => ({ ...f, email: e.target.value }))} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Téléphone</Label><Input value={cabinetForm.phone || tenantInfo.phone || ''} onChange={e => setCabinetForm(f => ({ ...f, phone: e.target.value }))} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">NIU</Label><Input value={cabinetForm.niu || tenantInfo.niu || ''} onChange={e => setCabinetForm(f => ({ ...f, niu: e.target.value }))} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Adresse</Label><Input value={cabinetForm.address || tenantInfo.address || ''} onChange={e => setCabinetForm(f => ({ ...f, address: e.target.value }))} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Ville</Label><Input value={cabinetForm.city || tenantInfo.city || ''} onChange={e => setCabinetForm(f => ({ ...f, city: e.target.value }))} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Pays</Label><Input value={cabinetForm.country || tenantInfo.country || ''} onChange={e => setCabinetForm(f => ({ ...f, country: e.target.value }))} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Devise</Label><Input value={cabinetForm.currencyCode || tenantInfo.currencyCode || 'XAF'} onChange={e => setCabinetForm(f => ({ ...f, currencyCode: e.target.value }))} className="h-10" /></div>
              </div>
              <Button size="sm" className="bg-[#1E5A8A] hover:bg-[#164070]" disabled={updateTenant.isPending} onClick={() => {
                const clean: Record<string, string> = {}
                for (const [k, v] of Object.entries(cabinetForm)) {
                  if (v) clean[k] = v
                }
                updateTenant.mutate(clean)
              }}>
                {updateTenant.isPending ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <Check className="size-3.5 mr-1.5" />}
                Enregistrer les modifications
              </Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm font-semibold">Logo du cabinet</CardTitle></CardHeader><CardContent className="space-y-4">
              <div className="flex items-center justify-center p-6 border-2 border-dashed border-[#D1D5DB] rounded-xl">
                {tenantInfo.logoUrl ? (
                  <img src={tenantInfo.logoUrl} alt="Logo" className="max-h-32 max-w-full object-contain" />
                ) : (
                  <div className="text-center"><Building2 className="size-12 mx-auto text-[#D1D5DB] mb-2" /><p className="text-xs text-[#9CA3AF]">Aucun logo</p></div>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 cursor-pointer rounded-lg border border-[#D1D5DB] p-3 hover:bg-[#F9FAFB] transition-colors">
                <Upload className="size-4 text-[#6B7280]" />
                <span className="text-sm text-[#374151]">Choisir un logo</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) uploadLogo.mutate({ file })
                }} />
              </label>
              <p className="text-[10px] text-[#9CA3AF] text-center">PNG, JPEG, WebP ou SVG — max 2 Mo — 400×400px</p>
              {tenantInfo.logoUrl && <Button variant="outline" size="sm" className="w-full text-xs text-[#DC2626]" onClick={() => updateTenant.mutate({ logoUrl: null })}>Supprimer le logo</Button>}
            </CardContent></Card>
          </div>}
        </TabsContent>

        {/* EQUIPE */}
        {isAdmin && <TabsContent value="equipe">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-3"><div><CardTitle className="text-sm font-semibold">Membres de l'équipe</CardTitle><CardDescription className="text-xs text-[#6B7280]">{currentUserCount} sur {maxUsers} utilisateurs</CardDescription></div><Button size="sm" className="bg-[#1E5A8A] hover:bg-[#164070]" onClick={() => setShowNewUser(true)}><Plus className="size-3.5 mr-1" />Ajouter</Button></CardHeader>
          <CardContent>
            <div className="mb-4"><div className="flex items-center justify-between text-xs mb-1"><span className="text-[#6B7280]">Utilisation</span><span className={cn('font-medium', usagePercent >= 90 ? 'text-[#DC2626]' : 'text-[#374151]')}>{currentUserCount}/{maxUsers}</span></div><div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all', usagePercent >= 90 ? 'bg-[#DC2626]' : usagePercent >= 70 ? 'bg-[#C8A45D]' : 'bg-[#1E5A8A]')} style={{ width: usagePercent + '%' }} /></div></div>
            {showNewUser && <div className="border border-[#E5E7EB] rounded-lg p-4 mb-4 space-y-3 bg-[#F9FAFB]"><p className="text-xs font-semibold text-[#111827]">Nouvel utilisateur</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-1.5"><Label className="text-xs">Nom complet</Label><Input value={newUser.fullName} onChange={e => setNewUser(u => ({ ...u, fullName: e.target.value }))} placeholder="Jean Dupont" /></div><div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} placeholder="jean@jurislink.com" /></div><div className="space-y-1.5"><Label className="text-xs">Rôle</Label><Select value={newUser.role} onValueChange={v => setNewUser(u => ({ ...u, role: v }))}><SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{(permData?.roles || []).filter((r: { isSystem: boolean }) => r.isSystem).map((r: { id: string; name: string; label: string }) => <SelectItem key={r.id} value={r.name}>{r.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label className="text-xs">Mot de passe</Label><Input type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} placeholder="••••••••" /></div></div><div className="flex gap-2 pt-1"><Button size="sm" className="bg-[#1E5A8A] hover:bg-[#164070]" onClick={() => createUserMut.mutate({ ...newUser, tenantId: user?.tenantId })} disabled={!newUser.fullName || !newUser.email || !newUser.password}>Créer l'utilisateur</Button><Button size="sm" variant="outline" onClick={() => setShowNewUser(false)}>Annuler</Button></div></div>}
            <div className="max-h-96 overflow-y-auto rounded-lg border border-[#E5E7EB]">
              <Table><TableHeader><TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]"><TableHead className="text-xs">Membre</TableHead><TableHead className="text-xs hidden sm:table-cell">Rôle</TableHead><TableHead className="text-xs hidden md:table-cell">Statut</TableHead><TableHead className="text-xs text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
                {(usersList || []).map((u: UserItem) => (
                  <TableRow key={u.id}><TableCell><div className="flex items-center gap-2.5"><Avatar className="size-8"><AvatarFallback className={cn('text-[10px]', u.isActive ? 'bg-[#1E5A8A] text-white' : 'bg-[#F3F4F6] text-[#6B7280]')}>{initials(u.fullName)}</AvatarFallback></Avatar><div><p className="text-sm font-medium">{u.fullName}</p><p className="text-[11px] text-[#9CA3AF]">{u.email}</p></div></div></TableCell><TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-[10px]">{ROLE_LABELS[u.role] || u.role}</Badge></TableCell><TableCell className="hidden md:table-cell"><div className="flex items-center gap-1.5"><div className={cn('size-1.5 rounded-full', u.isActive ? 'bg-[#059669]' : 'bg-[#9CA3AF]')} /><span className="text-xs">{u.isActive ? 'Actif' : 'Inactif'}</span></div></TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" className="size-7 text-[#9CA3AF] hover:text-[#374151]"><MoreHorizontal className="size-3.5" /></Button></TableCell></TableRow>
                ))}
                {(!usersList || usersList.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs text-[#9CA3AF]">Aucun membre dans l'équipe</TableCell></TableRow>}
              </TableBody></Table>
            </div>
          </CardContent></Card>
        </TabsContent>}

        {/* PERMISSIONS RBAC */}
        {canManagePerms && <TabsContent value="permissions">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Sélectionnez un rôle</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {(permData?.roles || []).map((r: { id: string; name: string; label: string; isSystem: boolean; _count?: { users: number } }) => {
                  const count = getRolePermCount(r.id)
                  const totalPerms = (permData?.permissions || []).length
                  const isActive = selectedRoleId === r.id
                  return (
                    <button key={r.id} onClick={() => { setSelectedRoleId(r.id); setLocalMatrix({}) }}
                      className={cn('border rounded-lg p-3 text-left transition-all', isActive ? 'border-[#1E5A8A] bg-[#E8F0F8] shadow-sm' : 'border-[#E5E7EB] hover:border-[#C8A45D] bg-white')}>
                      <div className="flex items-center gap-2"><p className="text-sm font-semibold truncate">{r.label}</p>{r.isSystem && <Lock className="size-3 text-[#9CA3AF] shrink-0" />}</div>
                      <div className="flex items-center gap-2 mt-1.5"><Badge variant="outline" className="text-[9px] px-1.5 py-0">{count}/{totalPerms}</Badge><span className="text-[10px] text-[#9CA3AF]">{r._count?.users || 0} user{(r._count?.users || 0) !== 1 ? 's' : ''}</span></div>
                      <div className="mt-2 h-1 bg-[#F3F4F6] rounded-full overflow-hidden"><div className="h-full bg-[#1E5A8A] rounded-full" style={{ width: (count / totalPerms) * 100 + '%' }} /></div>
                    </button>
                  )
                })}
              </div>
            </div>
            {selectedRoleId && !permLoading && <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div><CardTitle className="text-sm font-semibold">Matrice de permissions</CardTitle><CardDescription className="text-xs text-[#6B7280]">{(permData?.roles || []).find((r: { id: string; label: string }) => r.id === selectedRoleId)?.label || ''} — Cochez les actions autorisées</CardDescription></div>
                <div className="flex gap-1.5"><Button size="sm" variant="outline" className="text-[10px] h-7" onClick={grantAll}><CheckCircle2 className="size-3 mr-1" />Tout accorder</Button><Button size="sm" variant="outline" className="text-[10px] h-7" onClick={revokeAll}><X className="size-3 mr-1" />Tout révoquer</Button></div>
              </CardHeader>
              <CardContent>
                <div className="border border-[#E5E7EB] rounded-lg overflow-x-auto">
                  <Table><TableHeader><TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]"><TableHead className="text-xs font-semibold w-32">Ressource</TableHead>{actions.map(a => <TableHead key={a} className="text-[10px] text-center font-medium min-w-[60px]">{actionLabels[a]}</TableHead>)}</TableRow></TableHeader><TableBody>
                    {resources.map((res, ri) => (
                      <TableRow key={res} className={ri % 2 === 1 ? 'bg-[#FAFAFA]' : ''}>
                        <TableCell className="text-xs font-medium whitespace-nowrap"><div className="flex items-center gap-1.5"><FolderOpen className="size-3.5 text-[#9CA3AF]" />{resourceLabels[res] || res}</div></TableCell>
                        {actions.map(act => {
                          const permId = (permData?.permissions || []).find((p: { resource: string; action: string; id: string }) => p.resource === res && p.action === act)?.id
                          const checked = permId ? (localMatrix[permId] ?? !!selectedRolePerms[permId]) : false
                          return <TableCell key={act} className="text-center p-1"><Checkbox checked={checked} onCheckedChange={(v) => { if (permId) setLocalMatrix(m => ({ ...m, [permId]: !!v })) }} className="size-3.5" /></TableCell>
                        })}
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
                {changedCount > 0 && <p className="text-xs text-[#C8A45D] font-medium mt-3">{changedCount} modification{changedCount > 1 ? 's' : ''} non enregistrée{changedCount > 1 ? 's' : ''}</p>}
                <div className="flex gap-2 mt-3"><Button size="sm" className="bg-[#1E5A8A] hover:bg-[#164070]" onClick={() => savePermissions.mutate({ roleId: selectedRoleId, permissions: localMatrix })} disabled={savePermissions.isPending || changedCount === 0}>{savePermissions.isPending ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <Save className="size-3.5 mr-1.5" />}Enregistrer ({changedCount})</Button><Button size="sm" variant="outline" onClick={() => setLocalMatrix({})}>Réinitialiser</Button></div>
              </CardContent>
            </Card>}
            {permLoading && <Card><CardContent className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></CardContent></Card>}
            {!selectedRoleId && !permLoading && <Card><CardContent className="flex flex-col items-center py-12 text-[#9CA3AF]"><Shield className="size-10 mb-3 opacity-30" /><p className="text-sm">Sélectionnez un rôle ci-dessus pour configurer ses permissions</p></CardContent></Card>}
          </div>
        </TabsContent>}

        {/* ABONNEMENT */}
        {isAdmin && <TabsContent value="abonnement">
          <div className="space-y-4">
            {subData?.plan && <Card className="border-[#1E5A8A]/20 bg-gradient-to-r from-[#E8F0F8] to-white"><CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-[#1E5A8A] flex items-center justify-center"><Banknote className="size-6 text-white" /></div>
                  <div><p className="font-bold">{subData.plan.name}</p><p className="text-xs text-[#6B7280] mt-0.5">{subData.plan.description || 'Plan actuel'}</p><div className="flex items-center gap-2 mt-1.5"><Badge className="bg-[#059669] text-white text-[10px]">Actif</Badge><span className="text-[11px] text-[#6B7280]">Expire le {subData.currentPeriodEnd ? fmtDate(subData.currentPeriodEnd) : '—'}</span></div></div>
                </div>
                <div className="text-center px-4"><p className="text-lg font-bold text-[#1E5A8A]">{subData.plan.priceAnnual?.toLocaleString('fr-FR')}</p><p className="text-[10px] text-[#6B7280]">{subData.plan.currencyCode}/an</p></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#E5E7EB]">
                <div className="bg-white/80 rounded-lg p-2.5"><p className="text-[10px] text-[#6B7280]">Utilisateurs</p><p className="font-semibold text-sm mt-0.5">{currentUserCount}<span className="text-[#9CA3AF] font-normal">/{subData.plan.maxUsers >= 999 ? '∞' : subData.plan.maxUsers}</span></p></div>
                <div className="bg-white/80 rounded-lg p-2.5"><p className="text-[10px] text-[#6B7280]">Stockage</p><p className="font-semibold text-sm mt-0.5">{tenantInfo?.maxStorageGb || 5} Go</p></div>
                <div className="bg-white/80 rounded-lg p-2.5"><p className="text-[10px] text-[#6B7280]">Période</p><p className="font-semibold text-sm mt-0.5">{periodLabels[subData.billingPeriod] || subData.billingPeriod}</p></div>
                <div className="bg-white/80 rounded-lg p-2.5"><p className="text-[10px] text-[#6B7280]">IA</p><p className="font-semibold text-sm mt-0.5">{subData.plan.hasAI ? '✓ Incluse' : '✗ Non incluse'}</p></div>
              </div>
            </CardContent></Card>}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-[#6B7280]">Période de facturation :</span>
              {(['monthly', 'quarterly', 'semi_annual', 'annual'] as const).map(p => (
                <Button key={p} size="sm" variant={billingPeriod === p ? 'default' : 'outline'} onClick={() => setBillingPeriod(p)} className={cn('text-xs h-7', billingPeriod === p && 'bg-[#1E5A8A] hover:bg-[#164070]')}>{periodLabels[p]}</Button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(plans || []).map((p: { id: string; name: string; slug: string; priceAnnual: number; priceSemiAnnual: number; priceQuarterly: number; priceMonthly: number; currencyCode: string; maxUsers: number; maxStorageGb: number; hasAI: boolean; features: string; description: string | null }) => {
                const price = getPlanPrice(p)
                const isCurrent = subData?.plan?.slug === p.slug
                const features: string[] = p.features ? JSON.parse(p.features) : []
                const isPopular = p.slug === 'premium'
                return (
                  <Card key={p.id} className={cn('relative transition-all', isCurrent ? 'border-2 border-[#1E5A8A] shadow-md' : isPopular ? 'border-2 border-[#C8A45D] shadow-sm' : 'border border-[#E5E7EB] hover:border-[#C8A45D]/50')}>
                    {isPopular && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2"><Badge className="bg-[#C8A45D] text-white text-[10px] px-2.5">Populaire</Badge></div>}
                    <CardHeader className="text-center pb-2 pt-5">
                      <CardTitle className="text-sm font-bold">{p.name}</CardTitle>
                      {p.description && <CardDescription className="text-[10px] mt-0.5">{p.description}</CardDescription>}
                      <div className="mt-3"><span className="text-2xl font-bold text-[#1E5A8A]">{price.toLocaleString('fr-FR')}</span><span className="text-xs text-[#6B7280] ml-1">{p.currencyCode}/{periodLabels[billingPeriod].toLowerCase()}</span></div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        {features.map((f, i) => (<div key={i} className="flex items-center gap-2 text-xs"><Check className="size-3.5 text-[#059669] shrink-0" /><span>{f}</span></div>))}
                        <div className="flex items-center gap-2 text-xs"><span className={p.hasAI ? 'text-[#059669]' : 'text-[#9CA3AF]'}>{p.hasAI ? <Check className="size-3.5" /> : <Minus className="size-3.5" />}</span><span>Intelligence artificielle</span></div>
                      </div>
                      <div className="pt-2 border-t border-[#E5E7EB]">
                        {isCurrent ? <Button className="w-full" variant="outline" disabled><Check className="size-3.5 mr-1.5" />Plan actuel</Button> :
                          <Button className={cn('w-full', isPopular ? 'bg-[#C8A45D] hover:bg-[#926B2D] text-white' : 'bg-[#1E5A8A] hover:bg-[#164070]')}
                            onClick={() => { if (user?.tenantId) changeSubscription.mutate({ tenantId: user.tenantId, planId: p.id, billingPeriod }) }}
                            disabled={changeSubscription.isPending}>
                            {changeSubscription.isPending ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <ArrowUpRight className="size-3.5 mr-1.5" />}{isPopular ? 'Passer à ce plan' : 'Choisir'}
                          </Button>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>}

        {/* DEVISES */}
        {isAdmin && <TabsContent value="devises"><Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm font-semibold">Devises disponibles</CardTitle><Button size="sm" variant="outline" onClick={() => setShowNewCurrency(true)}><Plus className="size-3.5 mr-1" />Ajouter</Button></CardHeader><CardContent>
          {showNewCurrency && <div className="border border-[#E5E7EB] rounded-lg p-4 mb-4 space-y-3 bg-[#F9FAFB]"><p className="text-xs font-semibold text-[#111827]">Nouvelle devise</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="space-y-1.5"><Label className="text-xs">Code</Label><Input value={newCurrency.code} onChange={e => setNewCurrency(c => ({ ...c, code: e.target.value }))} placeholder="XAF" /></div><div className="space-y-1.5"><Label className="text-xs">Nom</Label><Input value={newCurrency.name} onChange={e => setNewCurrency(c => ({ ...c, name: e.target.value }))} placeholder="Franc CFA" /></div><div className="space-y-1.5"><Label className="text-xs">Symbole</Label><Input value={newCurrency.symbol} onChange={e => setNewCurrency(c => ({ ...c, symbol: e.target.value }))} placeholder="FCFA" /></div></div><div className="flex gap-2"><Button size="sm" className="bg-[#1E5A8A] hover:bg-[#164070]" onClick={() => createCurrencyMut.mutate(newCurrency)} disabled={!newCurrency.code || !newCurrency.name}>Ajouter</Button><Button size="sm" variant="outline" onClick={() => setShowNewCurrency(false)}>Annuler</Button></div></div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(currencies || []).map((c: CurrencyItem) => (
              <div key={c.id} className="border border-[#E5E7EB] rounded-lg p-3 bg-white"><div className="flex items-center justify-between"><span className="font-semibold text-sm">{c.code}</span><Badge variant="outline" className="text-[10px]">{c.symbol}</Badge></div><p className="text-xs text-[#6B7280] mt-0.5">{c.name}</p></div>
            ))}
          </div>
        </CardContent></Card></TabsContent>}
      </Tabs>

      <div className="pt-4 border-t border-[#E5E7EB]"><Button variant="ghost" className="text-[#DC2626] hover:text-[#DC2626] hover:bg-[#FEF2F2] text-xs" onClick={logout}><LogOut className="size-3.5 mr-1.5" />Se déconnecter</Button></div>
    </div>
  )
}

