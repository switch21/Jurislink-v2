'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel, priorityLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== TASKS VIEW ====================
export function TasksView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TaskItem | null>(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal', dueDate: '', caseId: '' })

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', user?.tenantId, statusFilter, priorityFilter],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (statusFilter !== 'all') p.set('status', statusFilter)
      if (priorityFilter !== 'all') p.set('priority', priorityFilter)
      return fetch(`/api/tasks?${p}`).then(r => r.json()).then(d => Array.isArray(d?.tasks) ? d.tasks : Array.isArray(d) ? d : [])
    },
  })

  const { data: users } = useQuery({
    queryKey: ['users', user?.tenantId],
    queryFn: () => fetch(`/api/users?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : d.users || []),
  })

  const { data: cases } = useQuery({
    queryKey: ['cases-mini', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Tâche créée'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Tâche mise à jour') },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/tasks/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Tâche supprimée') },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const resetForm = () => { setForm({ title: '', description: '', priority: 'normal', dueDate: '', caseId: '' }); setEditing(null) }
  const openEdit = (t: TaskItem) => { setEditing(t); setForm({ title: t.title, description: t.description || '', priority: t.priority, dueDate: t.dueDate?.slice(0, 10) || '', caseId: t.caseId || '' }); setDialogOpen(true) }
  const handleSubmit = () => {
    if (!form.title.trim()) return
    if (editing) { updateMut.mutate({ id: editing.id, title: form.title, description: form.description || null, priority: form.priority, dueDate: form.dueDate || null, caseId: form.caseId || null }) }
    else { createMut.mutate({ title: form.title, description: form.description || null, priority: form.priority, dueDate: form.dueDate || null, caseId: form.caseId || null }) }
  }

  const toggleStatus = (t: TaskItem) => {
    const isDone = t.status === 'terminee' || t.status === 'done'
    const newStatus = isDone ? 'a_faire' : 'terminee'
    updateMut.mutate({ id: t.id, status: newStatus })
  }

  const tasks: TaskItem[] = tasksData || []

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Tâches</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm"><Plus className="size-4 mr-1" />Nouvelle tâche</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="a_faire">À faire</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="terminee">Terminée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Priorité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les priorités</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        tasks.length === 0 ? <EmptyState icon={ClipboardList} title="Aucune tâche" description="Créez votre première tâche" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Titre</TableHead>
            <TableHead className="hidden md:table-cell">Priorité</TableHead>
            <TableHead className="hidden sm:table-cell">Statut</TableHead>
            <TableHead className="hidden lg:table-cell">Assigné à</TableHead>
            <TableHead className="hidden lg:table-cell">Échéance</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {tasks.map(t => {
              const isDone = t.status === 'terminee' || t.status === 'done'
              return <TableRow key={t.id} className={cn(isDone && 'opacity-60')}>
                <TableCell><span className={cn('size-2.5 rounded-full inline-block', t.priority === 'urgente' ? 'bg-[var(--danger)]' : t.priority === 'haute' ? 'bg-[var(--accent)]' : 'bg-jl-gold')} /></TableCell>
                <TableCell className="font-medium"><span className={cn(isDone && 'line-through')}>{t.title}</span>{t.case?.reference && <p className="text-[10px] text-jl-muted">{t.case.reference}</p>}</TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[t.priority])}>{priorityLabel(t.priority)}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell">
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"><Badge variant="outline" className={cn('text-[10px] border-0 p-0', taskStatusColor(t.status))}>{taskStatusLabel(t.status)}</Badge><ChevronDown className="size-3" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => { if (t.status !== 'a_faire') updateMut.mutate({ id: t.id, status: 'a_faire' }) }}><CircleDot className="size-3 mr-2" />À faire</DropdownMenuItem><DropdownMenuItem onClick={() => { if (t.status !== 'en_cours') updateMut.mutate({ id: t.id, status: 'en_cours' }) }}><Timer className="size-3 mr-2" />En cours</DropdownMenuItem><DropdownMenuItem onClick={() => { if (t.status !== 'terminee') updateMut.mutate({ id: t.id, status: 'terminee' }) }}><CheckCircle2 className="size-3 mr-2" />Terminée</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </TableCell>
                <TableCell className="hidden lg:table-cell"><div className="flex items-center gap-1.5">{t.assignedToUser ? <><Avatar className="size-5"><AvatarFallback className="text-[8px] bg-jl-blue text-white">{initials(t.assignedToUser.fullName)}</AvatarFallback></Avatar><span className="text-xs text-jl-secondary">{t.assignedToUser.fullName}</span></> : <span className="text-xs text-jl-muted">—</span>}</div></TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-jl-secondary">{fmtDate(t.dueDate)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(t)}><Edit className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="size-7 text-[var(--danger)] hover:text-[var(--danger)]" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
              })}
          </TableBody></Table>
        </div></CardContent></Card>}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de la tâche" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priorité</Label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="basse">Basse</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="haute">Haute</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div>
              <div><Label>Échéance</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Dossier</Label><Select value={form.caseId} onValueChange={v => setForm(f => ({ ...f, caseId: v }))}><SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger><SelectContent>{(cases || []).map(c => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSubmit} disabled={!form.title.trim() || createMut.isPending || updateMut.isPending}>{editing ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

