'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , EmptyState } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== AUDIT LOGS VIEW ====================
export function AuditLogsView() {
  const { user } = useAppStore()
  const [resourceType, setResourceType] = useState('all')
  const isAdmin = user?.role === 'root_admin' || user?.role === 'firm_admin' || user?.role === 'associate'

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', user?.tenantId, resourceType],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (resourceType !== 'all') p.set('resourceType', resourceType)
      return fetch(`/api/audit-logs?${p}`).then(r => r.json())
    },
    enabled: isAdmin,
  })

  if (!isAdmin) return <div className="p-6"><EmptyState icon={Shield} title="Accès restreint" description="Cette section est réservée aux administrateurs" /></div>

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Journal d'audit</h2>
      <Select value={resourceType} onValueChange={setResourceType}>
        <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Type de ressource" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="Case">Dossier</SelectItem><SelectItem value="Client">Client</SelectItem><SelectItem value="User">Utilisateur</SelectItem><SelectItem value="Invoice">Facture</SelectItem><SelectItem value="Document">Document</SelectItem><SelectItem value="Task">Tâche</SelectItem></SelectContent>
      </Select>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (logs || []).length === 0 ? <EmptyState icon={Shield} title="Aucune entrée" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="hidden md:table-cell">Ressource</TableHead>
            <TableHead className="hidden lg:table-cell">IP</TableHead>
          </TableRow></TableHeader><TableBody>
            {(logs || []).map((log: AuditLogItem) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-[#6B7280]">{fmtDateTime(log.timestamp)}</TableCell>
                <TableCell className="text-sm">{log.user?.fullName || 'Système'}</TableCell>
                <TableCell className="text-sm font-medium">{log.action}</TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{log.resourceType || '—'}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-[#9CA3AF]">{log.ipAddress || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div></CardContent></Card>}
    </div>
  )
}

