'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, PRIORITY_COLORS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP, COMM_TYPE_COLORS, COMM_STATUS_COLORS, QUICK_TEMPLATES } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, commTypeLabel, commStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== COMMUNICATIONS VIEW ====================
export function CommunicationsView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [showCompose, setShowCompose] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [form, setForm] = useState({ type: 'email', clientId: '', subject: '', content: '', recipientEmail: '', recipientPhone: '' })

  const { data: comms, isLoading } = useQuery({
    queryKey: ['communications', user?.tenantId, typeFilter, statusFilter, clientFilter],
    queryFn: () => {
      const p = new URLSearchParams({ tenantId: user?.tenantId || "" })
      if (typeFilter !== 'all') p.set('type', typeFilter)
      if (statusFilter !== 'all') p.set('status', statusFilter)
      if (clientFilter !== 'all') p.set('clientId', clientFilter)
      return fetch(`/api/communications?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
    enabled: !!user?.tenantId,
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-comm', user?.tenantId],
    queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: showCompose,
  })

  const summary = useMemo(() => {
    const all = (comms || []) as Communication[]
    return {
      totalEmails: all.filter(c => c.type === 'email').length,
      totalSms: all.filter(c => c.type === 'sms').length,
      successRate: all.length > 0 ? Math.round((all.filter(c => c.status === 'sent').length / all.length) * 100) : 0,
    }
  }, [comms])

  const sendMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/communications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Communication envoyée'); setShowCompose(false); resetForm(); qc.invalidateQueries({ queryKey: ['communications'] }) },
    onError: () => toast.error("Erreur lors de l'envoi"),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/communications/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { toast.success('Communication supprimée'); qc.invalidateQueries({ queryKey: ['communications'] }) },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const resetForm = () => setForm({ type: 'email', clientId: '', subject: '', content: '', recipientEmail: '', recipientPhone: '' })

  const handleClientSelect = (clientId: string) => {
    const client = (clients || []).find((c: Client) => c.id === clientId)
    setForm(f => ({
      ...f, clientId,
      recipientEmail: client?.email || '',
      recipientPhone: client?.phone || '',
    }))
  }

  const handleSend = () => {
    if (form.type === 'email' && !form.recipientEmail) { toast.error('Veuillez renseigner l\'email du destinataire'); return }
    if (form.type === 'sms' && !form.recipientPhone) { toast.error('Veuillez renseigner le téléphone du destinataire'); return }
    if (!form.content) { toast.error('Veuillez saisir un message'); return }
    sendMut.mutate({
      tenantId: user?.tenantId, sentById: user?.id,
      clientId: form.clientId || undefined,
      type: form.type, subject: form.subject || undefined,
      content: form.content,
      recipientEmail: form.recipientEmail || undefined,
      recipientPhone: form.recipientPhone || undefined,
    })
  }

  const typeIcon = (type: string) => {
    if (type === 'email') return <Mail className="size-3.5" />
    if (type === 'sms') return <MessageCircle className="size-3.5" />
    return <Phone className="size-3.5" />
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Communications</h2>
        <Button size="sm" onClick={() => { resetForm(); setShowCompose(true) }}><SendHorizontal className="size-4 mr-1" />Nouveau message</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="size-10 rounded-lg bg-jl-blue/10 flex items-center justify-center"><Mail className="size-5 text-jl-blue" /></div><div><p className="text-xs text-jl-secondary">Emails envoyés</p><p className="text-lg font-bold text-jl-blue">{summary.totalEmails}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="size-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center"><MessageCircle className="size-5 text-[var(--success)]" /></div><div><p className="text-xs text-jl-secondary">SMS envoyés</p><p className="text-lg font-bold text-[var(--success)]">{summary.totalSms}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="size-10 rounded-lg bg-jl-gold/10 flex items-center justify-center"><MailCheck className="size-5 text-jl-gold" /></div><div><p className="text-xs text-jl-secondary">Taux d'envoi réussi</p><p className="text-lg font-bold text-jl-gold">{summary.successRate}%</p></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tous les types</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="sent">Envoyé</SelectItem><SelectItem value="pending">En attente</SelectItem><SelectItem value="failed">Échoué</SelectItem></SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Tous les clients" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tous les clients</SelectItem>{(clients || []).map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (comms || []).length === 0 ? <EmptyState icon={SendHorizontal} title="Aucune communication" description="Envoyez votre premier email ou SMS" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Destinataire</TableHead><TableHead className="hidden md:table-cell">Sujet</TableHead><TableHead>Statut</TableHead><TableHead className="hidden lg:table-cell">Envoyé par</TableHead><TableHead className="w-[50px]"></TableHead>
          </TableRow></TableHeader><TableBody>
            {(comms || []).map((c: Communication) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs text-jl-secondary">{fmtDateTime(c.sentAt || c.createdAt)}</TableCell>
                <TableCell><Badge className={cn('text-[10px]', COMM_TYPE_COLORS[c.type])}><span className="flex items-center gap-1">{typeIcon(c.type)}{commTypeLabel(c.type)}</span></Badge></TableCell>
                <TableCell className="text-sm">{c.client?.fullName || c.recipientEmail || c.recipientPhone || '—'}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-jl-secondary truncate max-w-[200px]">{c.subject || c.content.slice(0, 50)}</TableCell>
                <TableCell><Badge className={cn('text-[10px]', COMM_STATUS_COLORS[c.status])}>{commStatusLabel(c.status)}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-jl-muted">{c.sentBy?.fullName || '—'}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="size-7" onClick={() => deleteMut.mutate(c.id)}><Trash2 className="size-3.5 text-red-500" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div></CardContent></Card>}

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={v => { if (!v) { setShowCompose(false); resetForm() } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle communication</DialogTitle><DialogDescription>Composez et envoyez un message</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['email', 'sms', 'whatsapp'] as const).map(t => (
                <Button key={t} variant={form.type === t ? 'default' : 'outline'} size="sm" className="flex-1 h-9 text-xs" onClick={() => setForm(f => ({ ...f, type: t }))}>
                  {t === 'email' && <Mail className="size-3.5 mr-1" />}{t === 'sms' && <MessageCircle className="size-3.5 mr-1" />}{t === 'whatsapp' && <Phone className="size-3.5 mr-1" />}
                  {commTypeLabel(t)}
                </Button>
              ))}
            </div>
            <div className="space-y-2"><Label className="text-xs">Client</Label><Select value={form.clientId} onValueChange={handleClientSelect}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger><SelectContent>{(clients || []).map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent></Select></div>
            {form.type === 'email' && <div className="space-y-2"><Label className="text-xs">Email destinataire</Label><Input value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))} placeholder="email@exemple.com" className="h-9 text-sm" /></div>}
            {(form.type === 'sms' || form.type === 'whatsapp') && <div className="space-y-2"><Label className="text-xs">Téléphone destinataire</Label><Input value={form.recipientPhone} onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))} placeholder="+237 6XX XXX XXX" className="h-9 text-sm" /></div>}
            {form.type === 'email' && <div className="space-y-2"><Label className="text-xs">Sujet</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Sujet du message" className="h-9 text-sm" /></div>}
            <div className="space-y-2"><Label className="text-xs">Message</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Votre message..." className="text-sm min-h-[120px]" /></div>
            <div className="space-y-2"><Label className="text-xs">Modèle rapide</Label><Select onValueChange={v => { const t = QUICK_TEMPLATES.find(qt => qt.label === v); if (t) setForm(f => ({ ...f, content: t.content })) }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Choisir un modèle..." /></SelectTrigger><SelectContent>{QUICK_TEMPLATES.map(qt => <SelectItem key={qt.label} value={qt.label}>{qt.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCompose(false); resetForm() }}>Annuler</Button>
            <Button onClick={handleSend} disabled={sendMut.isPending}><SendHorizontal className="size-4 mr-1" />Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

