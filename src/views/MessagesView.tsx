'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== MESSAGES VIEW ====================
export function MessagesView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: contacts } = useQuery({
    queryKey: ['users-contacts', user?.tenantId],
    queryFn: () => fetch(`/api/users?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : d.users || []),
  })

  const { data: messages } = useQuery({
    queryKey: ['messages', user?.id, selectedContact],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (user?.id) p.set('userId', user.id)
      if (selectedContact) p.set('contactId', selectedContact)
      return fetch(`/api/messages?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
    refetchInterval: 5000,
  })

  const sendMut = useMutation({
    mutationFn: (content: string) => fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, tenantId: user?.tenantId, senderId: user?.id, receiverId: selectedContact }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setNewMessage('') },
    onError: () => toast.error("Erreur d'envoi"),
  })

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const contactList = (Array.isArray(contacts) ? contacts : []).filter((c: UserItem) => c.id !== user?.id)
  const chatMessages = selectedContact ? (Array.isArray(messages) ? messages : []) as Message[] : []

  const handleSend = () => {
    if (!newMessage.trim() || !selectedContact) return
    sendMut.mutate(newMessage.trim())
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Messages</h2>
      <Card className="overflow-hidden"><div className="flex h-[500px]">
        <div className="w-64 border-r flex-shrink-0 overflow-y-auto hidden sm:block">
          {contactList.length === 0 ? <p className="text-xs text-jl-muted p-4 text-center">Aucun contact</p> :
            contactList.map((c: UserItem) => (
              <button key={c.id} className={cn('w-full flex items-center gap-2 p-3 hover:bg-jl-page text-left transition-colors', selectedContact === c.id && 'bg-jl-blue-light')} onClick={() => setSelectedContact(c.id)}>
                <Avatar className="size-8"><AvatarFallback className="text-[10px] bg-jl-page">{initials(c.fullName)}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.fullName}</p><p className="text-[10px] text-jl-muted">{ROLE_LABELS[c.role] || c.role}</p></div>
              </button>
            ))}
        </div>
        <div className="flex-1 flex flex-col">
          {!selectedContact ? <div className="flex-1 flex items-center justify-center"><EmptyState icon={MessageSquare} title="Sélectionnez une conversation" description="Choisissez un contact pour commencer" /></div> : (
            <>
              <div className="p-3 border-b"><p className="text-sm font-semibold">{(contacts || []).find((c: UserItem) => c.id === selectedContact)?.fullName || ''}</p></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && <p className="text-xs text-jl-muted text-center py-8">Aucun message</p>}
                {chatMessages.map((m: Message) => {
                  const isMine = m.senderId === user?.id
                  return (
                    <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-xl px-3 py-2', isMine ? 'bg-jl-blue text-white' : 'bg-jl-page text-jl-primary')}>
                        <p className="text-sm">{m.content}</p>
                        <p className={cn('text-[10px] mt-1', isMine ? 'text-[#E8F0F8]' : 'text-jl-muted')}>{fmtDateTime(m.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Écrire un message..." className="text-sm" onKeyDown={e => e.key === 'Enter' && handleSend()} />
                <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sendMut.isPending}><Send className="size-4" /></Button>
              </div>
            </>
          )}
        </div>
      </div></Card>
    </div>
  )
}

