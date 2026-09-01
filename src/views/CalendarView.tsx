'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import { useFormDraft, registerDirtyForm, unregisterDirtyForm } from '@/hooks/useFormDraft'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== CALENDAR VIEW ====================
export function CalendarView() {
  const { user, setHasUnsavedChanges } = useAppStore()
  const qc = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', eventType: 'rdv', criticality: 'normale', caseId: '', assignments: '' as string, location: '' })
  const [generateTasks, setGenerateTasks] = useState(false)
  const { isDirty: eventIsDirty, clearDraft: clearEventDraft } = useFormDraft('event-form', form as unknown as Record<string, unknown>, { enabled: dialogOpen })
  const eventHasDraft = eventIsDirty
  useEffect(() => { registerDirtyForm('event-form', eventIsDirty); setHasUnsavedChanges(eventIsDirty); return () => { unregisterDirtyForm('event-form') } }, [eventIsDirty, setHasUnsavedChanges])
  const monthStr = format(currentMonth, 'yyyy-MM')

  // Fetch connected calendars (sync status)
  const { data: syncConnections } = useQuery({
    queryKey: ['calendar-sync', user?.tenantId],
    queryFn: () => fetch(`/api/calendar/sync?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: !!user?.tenantId,
  })
  const googleConnected = (Array.isArray(syncConnections) ? syncConnections : []).some((c: { provider: string }) => c.provider === 'google')
  const outlookConnected = (Array.isArray(syncConnections) ? syncConnections : []).some((c: { provider: string }) => c.provider === 'outlook')

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', user?.tenantId, monthStr],
    queryFn: () => fetch(`/api/events?tenantId=${user?.tenantId}&month=${monthStr}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const { data: tenantCases } = useQuery({
    queryKey: ['cases-mini-cal', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const { data: tenantUsers } = useQuery({
    queryKey: ['users-cal', user?.tenantId],
    queryFn: () => fetch(`/api/users?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : d.users || []),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['events'] }); toast.success(t('calendar.eventCreated')); setDialogOpen(false)
      clearEventDraft()
      if (generateTasks && data?.id) {
        fetch('/api/workflow/generate-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: data.id, tenantId: user?.tenantId }) }).then(r => r.json()).then(res => {
          if (res.createdCount > 0) toast.success(`${res.createdCount} ${t('calendar.tasksGenerated')}`)
          else toast(t('calendar.noNewTasks'))
          qc.invalidateQueries({ queryKey: ['tasks'] })
        }).catch(() => {})
      }
      resetForm()
    },
    onError: () => toast.error(t('calendar.createError')),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success(t('calendar.eventUpdated')); setDialogOpen(false); resetForm() },
    onError: () => toast.error(t('common.error')),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/events/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success(t('calendar.eventDeleted')); setDialogOpen(false); resetForm() },
    onError: () => toast.error(t('common.error')),
  })

  const resetForm = () => { setForm({ title: '', description: '', startTime: '', endTime: '', eventType: 'rdv', criticality: 'normale', caseId: '', assignments: '', location: '' }); setEditing(null); setGenerateTasks(false) }
  const openCreate = (day?: Date) => {
    const draft = (typeof window !== 'undefined') ? (() => { try { const s = localStorage.getItem('jurislink_draft_event-form'); return s ? JSON.parse(s) : null } catch { return null } })() : null
    if (draft && draft.title) { setForm(draft); toast.info(t('common.draftRestored')) } else { resetForm() }
    if (day) {
      const start = day.getHours() === 0 ? '09:00' : format(day, 'HH:mm')
      setForm(f => ({ ...f, startTime: `${format(day, 'yyyy-MM-dd')}T${start}`, endTime: `${format(day, 'yyyy-MM-dd')}T${String(parseInt(start) + 1).padStart(2, '0')}:00` }))
    }
    setDialogOpen(true)
  }
  const openEdit = (e: EventItem) => {
    setEditing(e)
    setForm({
      title: e.title, description: e.description || '',
      startTime: e.startTime?.slice(0, 16) || '',
      endTime: e.endTime?.slice(0, 16) || '',
      eventType: e.eventType || 'rdv', criticality: e.criticality || 'normale',
      caseId: e.caseId || '',
      assignments: (e.assignments || []).map((a: EventAssignment) => a.userId).join(','),
      location: e.location || '',
    })
    setDialogOpen(true)
  }
  const handleSubmit = () => {
    if (!form.title.trim() || !form.startTime) return
    const assignments = form.assignments ? form.assignments.split(',').filter(Boolean) : []
    const payload = { title: form.title, description: form.description || null, startTime: form.startTime, endTime: form.endTime || null, eventType: form.eventType, criticality: form.criticality, caseId: form.caseId || null, assignments, location: form.location || null }
    if (editing) { updateMut.mutate({ id: editing.id, ...payload }) } else { createMut.mutate(payload) }
  }

  const CRIT_EVENT_COLORS: Record<string, string> = {
    normale: 'bg-jl-gold', importante: 'bg-[#F59E0B]', urgente: 'bg-[var(--danger)]',
  }

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const weekDays = t('calendar.weekDays').split(',')
  const getEventsForDay = (day: Date) => (Array.isArray(events) ? events : []).filter((e: EventItem) => { try { return isSameDay(parseISO(e.startTime), day) } catch { return false } })

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t('calendar.title')}</h2>
          {googleConnected && <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">{t('calendar.googleConnected')}</Badge>}
          {outlookConnected && <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0">{t('calendar.outlookConnected')}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => { const a = document.createElement('a'); a.href = `/api/calendar/ical?tenantId=${user?.tenantId}`; a.download = 'calendrier.ics'; a.click() }}><Download className="size-3.5 mr-1" />{t('calendar.exportIcal')}</Button>
          </TooltipTrigger><TooltipContent><p className="text-xs">{t('calendar.exportIcalTooltip')}</p></TooltipContent></Tooltip></TooltipProvider>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="size-4" /></Button>
          <span className="text-sm font-medium min-w-[140px] text-center">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="size-4" /></Button>
          <Button size="sm" className="bg-jl-blue hover:bg-jl-blue ml-2" onClick={() => openCreate()}><CalendarPlus className="size-4 mr-1" />{t('calendar.newEvent')}</Button>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> : (
        <Card><CardContent className="p-2">
          <div className="grid grid-cols-7 gap-px bg-jl-page rounded-lg overflow-hidden">
            {weekDays.map(d => <div key={d} className="bg-jl-card p-2 text-center text-xs font-medium text-jl-secondary">{d}</div>)}
            {days.map(day => {
              const dayEvents = getEventsForDay(day)
              return (
                <div key={day.toISOString()} className={cn('bg-jl-card p-1 min-h-[80px] md:min-h-[100px] border border-jl cursor-pointer', !isSameMonth(day, currentMonth) && 'opacity-40', isToday(day) && 'bg-jl-blue-light ring-1 ring-[#1E5A8A]')} onClick={() => openCreate(day)}>
                  <p className={cn('text-xs mb-1', isToday(day) ? 'font-bold text-jl-gold' : 'text-jl-secondary')}>{format(day, 'd')}</p>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} onClick={ev => { ev.stopPropagation(); openEdit(e) }} className={cn('text-[10px] px-1 py-0.5 rounded truncate text-white flex items-center gap-1', CRIT_EVENT_COLORS[e.criticality] || CRIT_EVENT_COLORS.normale)} title={e.title}>
                        {e.externalEventId && <span title={t('calendar.synced')}><ExternalLink className="size-2.5 shrink-0 opacity-80" /></span>}
                        {e.title}
                        {(e.assignments || []).length > 0 && <span className="ml-auto shrink-0">{(e.assignments || []).slice(0, 2).map((a: EventAssignment) => <span key={a.userId} className="inline-block size-3 rounded-full bg-jl-card/30 ml-0.5" title={a.user?.fullName || ''}><span className="text-[6px] leading-3 block text-center">{a.user?.fullName?.[0] || ''}</span></span>)}</span>}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <p className="text-[10px] text-jl-muted pl-1">+{dayEvents.length - 3}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t('calendar.editEvent') : t('calendar.newEvent')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('calendar.titleField')} *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('calendar.titleField')} /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div><Label className="flex items-center gap-1.5"><MapPin className="size-3.5" />{t('calendar.location')}</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder={t('calendar.locationPlaceholder')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('calendar.start')} *</Label><Input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
              <div><Label>{t('calendar.end')}</Label><Input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.type')}</Label><Select value={form.eventType} onValueChange={v => setForm(f => ({ ...f, eventType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="audience">{eventTypeLabel('audience')}</SelectItem><SelectItem value="echeance">{eventTypeLabel('echeance')}</SelectItem><SelectItem value="rdv">{eventTypeLabel('rdv')}</SelectItem><SelectItem value="reunion">{eventTypeLabel('reunion')}</SelectItem><SelectItem value="autre">{eventTypeLabel('autre')}</SelectItem></SelectContent></Select></div>
              <div><Label>{t('calendar.criticality')}</Label><Select value={form.criticality} onValueChange={v => setForm(f => ({ ...f, criticality: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normale">{t('calendar.critNormal')}</SelectItem><SelectItem value="importante">{t('calendar.critImportant')}</SelectItem><SelectItem value="urgente">{t('calendar.critUrgent')}</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>{t('calendar.linkedCase')}</Label><Select value={form.caseId} onValueChange={v => setForm(f => ({ ...f, caseId: v }))}><SelectTrigger><SelectValue placeholder={t('common.noData')} /></SelectTrigger><SelectContent>{(Array.isArray(tenantCases) ? tenantCases : []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t('calendar.assignedTo')}</Label><div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">{(Array.isArray(tenantUsers) ? tenantUsers : []).map((u: UserItem) => {
              const ids = form.assignments.split(',').filter(Boolean)
              const checked = ids.includes(u.id)
              return <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5"><Checkbox checked={checked} onCheckedChange={v => { const arr = ids.filter(x => x !== u.id); if (v) arr.push(u.id); setForm(f => ({ ...f, assignments: arr.join(',') })) }} className="size-3.5" /><span>{u.fullName}</span></label>
            })}</div></div>
            {!editing && <div className="flex items-center gap-2 pt-1"><Checkbox checked={generateTasks} onCheckedChange={v => setGenerateTasks(!!v)} className="size-3.5" /><Label className="text-xs cursor-pointer" onClick={() => setGenerateTasks(!generateTasks)}>{t('calendar.autoGenTasks')}</Label></div>}
            {editing && <div className="pt-1"><Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={async () => {
              try {
                const res = await fetch('/api/workflow/generate-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: editing.id, tenantId: user?.tenantId }) }).then(r => r.json())
                if (res.createdCount > 0) toast.success(`${res.createdCount} ${t('calendar.tasksGenerated')}`)
                else toast(t('calendar.noNewTasks'))
                qc.invalidateQueries({ queryKey: ['tasks'] })
              } catch { toast.error(t('common.error')) }
            }}><ZapIcon className="size-3.5 mr-1" />{t('calendar.genTasks')}</Button></div>}
          </div>
          <DialogFooter>
            {editing && <Button variant="outline" className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 mr-auto" onClick={() => deleteMut.mutate(editing.id)}><Trash2 className="size-3.5 mr-1" />{t('common.delete')}</Button>}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.startTime || createMut.isPending || updateMut.isPending}>{editing ? t('common.save') : t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

