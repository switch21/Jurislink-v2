'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// AnimatePresence removed to save memory
// Charts replaced with lightweight CSS visualizations to reduce memory
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { useTheme } from 'next-themes'
import { useAppStore, type ViewName, type UserInfo } from '@/store/appStore'
import { cn } from '@/lib/utils'

// ==================== shadcn/ui imports ====================
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
// Toaster moved to layout.tsx

// ==================== lucide icons ====================
import {
  LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3,
  Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight,
  ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download,
  Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail,
  Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity,
  Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon,
  ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel,
  UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save,
  Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, Zap as ZapIcon,
  FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen,
  Crown, UsersRound, Building as BuildingIcon, CreditCard as CreditCardIcon, ShieldCheck, UserPlus, ArrowUpDown
} from 'lucide-react'

// ==================== Types ====================
interface Client {
  id: string; fullName: string; company?: string | null;
  clientType?: string; niu?: string | null; email?: string | null;
  phone?: string | null; address?: string | null; city?: string | null; country?: string | null;
  notes?: string | null; riskLevel?: string; source?: string | null;
  status?: string; responsibleLawyerId?: string | null;
  isActive: boolean; tenantId: string; createdAt: string; _count?: { cases: number; invoices: number };
}
interface CaseItem {
  id: string; reference: string; title: string; description?: string | null; caseType: string;
  status: string; priority: string; isSecret: boolean;
  createdAt: string; tenantId: string; clientId: string;
  adversary?: string | null; jurisdiction?: string | null; amountInDispute?: number | null;
  billingType?: string | null;
  client?: Client; assignments?: CaseAssignment[]; notes?: CaseNote[]; documents?: Doc[]; events?: EventItem[];
}
interface CaseAssignment { id: string; userId: string; caseId: string; user?: UserItem }
interface CaseNote { id: string; content: string; createdAt: string; authorId?: string | null; author?: UserItem }
interface Doc {
  id: string; fileName: string; fileSize: number; filePath: string;
  version: number; folder?: string | null; tags?: string | null;
  documentType?: string | null; mimeType?: string | null;
  createdAt: string; tenantId: string; caseId?: string | null;
  case?: CaseItem;
}
interface EventItem {
  id: string; title: string; description?: string | null; startTime: string; endTime?: string | null;
  eventType: string; criticality: string; createdAt: string;
  tenantId: string; caseId?: string | null; case?: CaseItem; assignments?: EventAssignment[];
}
interface EventAssignment { id: string; userId: string; eventId: string; user?: UserItem }
interface InvoiceLineItem { id: string; description: string; quantity: number; unitPrice: number; total: number; sortOrder: number; invoiceId: string }
interface Payment {
  id: string; amount: number; method: string; reference?: string | null; status: string; paidAt: string; notes?: string | null; createdAt: string;
  tenantId: string; invoiceId: string; recordedBy?: string | null; recorder?: UserItem;
  invoice?: { id: string; invoiceNumber?: string | null; client?: { fullName: string } };
}
interface Invoice {
  id: string; invoiceNumber?: string | null; type: string; amount: number; paidAmount: number; status: string; dueDate?: string | null;
  notes?: string | null; billingType?: string | null; createdAt: string; issuedAt?: string | null;
  tenantId: string; clientId: string; client?: Client; caseId?: string | null; case?: CaseItem;
  currencyId?: string | null; currency?: CurrencyItem;
  lineItems?: InvoiceLineItem[]; payments?: Payment[];
}
interface Message {
  id: string; content: string; createdAt: string; tenantId: string;
  senderId: string; receiverId: string; sender?: UserItem; receiver?: UserItem;
}
interface Notification {
  id: string; title: string; message: string; category: string; read: boolean;
  resourceType?: string | null; resourceId?: string | null; createdAt: string;
}
interface AuditLogItem {
  id: string; action: string; resourceType?: string | null; resourceId?: string | null;
  metadata?: string | null; ipAddress?: string | null; userAgent?: string | null;
  timestamp: string; tenantId: string; userId?: string | null; user?: UserItem;
}
interface UserItem {
  id: string; email: string; fullName: string; role: string; tenantId?: string | null;
  phone?: string | null; avatarUrl?: string | null; preferredLanguage?: string; isActive?: boolean;
}
interface TenantItem {
  id: string; name: string; slug: string; plan: string; maxUsers: number; maxStorageGb: number;
  isActive: boolean; createdAt: string; phone?: string | null; email?: string | null; address?: string | null; city?: string | null; country?: string | null; niu?: string | null; logoUrl?: string | null;
  _count?: { users: number; clients: number; cases: number; invoices?: number; documents?: number; events?: number; tasks?: number; payments?: number; notifications?: number; auditLogs?: number };
}
interface AdminDashboardData {
  totalTenants: number; activeTenants: number; inactiveTenants: number;
  totalUsers: number; activeUsers: number; inactiveUsers: number;
  totalCases: number; activeCases: number; totalClients: number;
  totalInvoices: number; totalPayments: number; totalRevenue: number; thisMonthRevenue: number;
  tenantsByPlan: Array<{ plan: string; _count: { id: number } }>;
  usersByRole: Array<{ role: string; _count: { id: number } }>;
  recentTenants: Array<TenantItem & { _count: { users: number; cases: number }; subscription: { plan: { name: string } } | null }>;
  signupsByMonth: Record<string, number>;
  plans: Array<{ id: string; name: string; slug: string; priceAnnual: number; maxUsers: number; hasAI: boolean; isActive: boolean }>;
}
interface AdminTenant extends TenantItem {
  _count: { users: number; clients: number; cases: number; invoices: number; documents: number };
  subscription?: { id: string; status: string; billingPeriod: string; plan: { id: string; name: string; slug: string } } | null;
}
interface TaskItem {
  id: string; title: string; description?: string | null; status: string; priority: string;
  dueDate?: string | null; createdAt: string;
  tenantId: string; caseId?: string | null; eventId?: string | null;
  case?: { id: string; reference: string; title: string } | null;
  event?: { id: string; title: string } | null;
  assignedToUser?: { id: string; fullName: string } | null;
}
interface DashboardStats {
  totalCases: number; activeCases: number; totalClients: number; upcomingEvents: number;
  unpaidInvoices: number; totalRevenue: number; paidInvoices: number;
  casesByStatus: Record<string, number>; casesByType: Record<string, number>;
  recentActivity: AuditLogItem[]; upcomingEventsList: EventItem[];
  urgencies: Array<{ id: string; reference: string; title: string; clientName: string; nextDueDate: string; daysRemaining: number }>;
  overdueInvoices: Array<{ id: string; clientName: string; amount: number; currencyCode: string; daysOverdue: number }>;
  urgentTasks: Array<{ id: string; title: string; priority: string; status: string; dueDate: string | null; caseReference: string | null }>;
  upcomingEventsEnhanced: Array<{ id: string; title: string; startTime: string; eventType: string; criticality: string; caseReference: string | null; assignments: Array<{ userId: string; userName: string }> }>;
  myTasks: Array<{ id: string; title: string; priority: string; status: string; dueDate: string | null; caseReference: string | null }>;
  activityCounts?: { dossiersOuverts?: number; dossiersCloses?: number; nouveauxClients?: number; audiences?: number; facturesEmises?: number };
}
interface ConflictResult {
  type: string; case: { id: string; reference: string; title: string; clientName: string }; description: string;
}
interface CurrencyItem { id: string; code: string; name: string; symbol: string }
interface TimeEntry {
  id: string; description: string; startTime: string; endTime?: string | null; duration: number;
  isBillable: boolean; hourlyRate?: number | null; totalAmount?: number | null;
  createdAt: string; tenantId: string; userId: string; caseId?: string | null;
  user?: { id: string; fullName: string };
  case?: { id: string; reference: string; title: string } | null;
}
interface DocTemplate {
  id: string; name: string; category: string; description?: string | null;
  content: string; variables?: string | null; isActive: boolean;
  createdAt: string; updatedAt: string; tenantId: string;
}
interface Communication {
  id: string; type: string; subject?: string | null; content: string; status: string;
  recipientEmail?: string | null; recipientPhone?: string | null; sentAt?: string | null;
  createdAt: string; tenantId: string; caseId?: string | null; clientId?: string | null; sentById?: string | null;
  case?: { id: string; reference: string; title: string } | null;
  client?: { id: string; fullName: string; email?: string | null; phone?: string | null } | null;
  sentBy?: { id: string; fullName: string } | null;
}
interface TimeSummary {
  totalEntries: number; totalSeconds: number; totalBillableSeconds: number;
  totalAmount: number; avgDailyHours: number;
  byCase: Array<{ caseId: string; caseReference: string; caseTitle: string; totalSeconds: number; totalAmount: number }>;
}


// ==================== Query Client ====================
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } })

// ==================== Constants ====================
const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-[#E8F0F8] text-[#1E5A8A]',
  ouvert: 'bg-[#E8F0F8] text-[#1E5A8A]',
  en_cours: 'bg-[#F5F0E3] text-[#926B2D]',
  en_attente: 'bg-[#FEF3C7] text-[#92400E]',
  clos: 'bg-[#D1FAE5] text-[#065F46]',
  archive: 'bg-[#F3F4F6] text-[#6B7280]',
  non_paye: 'bg-[#FEE2E2] text-[#991B1B]',
  partiel: 'bg-[#FEF3C7] text-[#92400E]',
  paye: 'bg-[#D1FAE5] text-[#065F46]',
  annule: 'bg-[#F3F4F6] text-[#6B7280]',
  a_faire: 'bg-[#E8F0F8] text-[#1E5A8A]',
  en_cours_t: 'bg-[#F5F0E3] text-[#926B2D]',
  terminee: 'bg-[#D1FAE5] text-[#065F46]',
  annulee: 'bg-[#F3F4F6] text-[#6B7280]',
  todo: 'bg-[#E8F0F8] text-[#1E5A8A]',
  in_progress: 'bg-[#F5F0E3] text-[#926B2D]',
  done: 'bg-[#D1FAE5] text-[#065F46]',
}
const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau', ouvert: 'Ouvert', en_cours: 'En cours', en_attente: 'En attente',
  clos: 'Clos', archive: 'Archivé', non_paye: 'Non payé', partiel: 'Partiel',
  paye: 'Payé', annule: 'Annulé',
  a_faire: 'À faire', en_cours_t: 'En cours', terminee: 'Terminée', annulee: 'Annulée',
  todo: 'À faire', in_progress: 'En cours', done: 'Terminée',
}
const PRIORITY_COLORS: Record<string, string> = {
  basse: 'bg-[#F3F4F6] text-[#6B7280]',
  normal: 'bg-[#F3F4F6] text-[#374151]',
  haute: 'bg-[#FEF3C7] text-[#92400E]',
  urgente: 'bg-[#FEE2E2] text-[#991B1B]',
}
const PRIORITY_LABELS: Record<string, string> = { basse: 'Basse', normal: 'Normal', haute: 'Haute', urgente: 'Urgente' }
const TYPE_LABELS: Record<string, string> = { civil: 'Civil', penal: 'Pénal', commercial: 'Commercial', social: 'Social', administratif: 'Administratif' }
const EVENT_TYPE_LABELS: Record<string, string> = { audience: 'Audience', rdv: 'Rendez-vous', echeance: 'Échéance', depot: 'Dépôt', autre: 'Autre' }
const CRIT_COLORS: Record<string, string> = {
  basse: 'bg-[#D1D5DB]', normal: 'bg-[#C8A45D]', haute: 'bg-[#F59E0B]', urgente: 'bg-[#EF4444]',
}
const ROLE_LABELS: Record<string, string> = {
  root_admin: 'Admin Racine', associate: 'Associé', firm_admin: 'Admin Cabinet',
  lawyer: 'Avocat', jurist: 'Juriste', assistant: 'Assistant', accountant: 'Comptable', client: 'Client', secretary: 'Secrétaire', collaborator: 'Collaborateur',
}
const RISK_COLORS: Record<string, string> = {
  faible: 'bg-[#D1FAE5] text-[#065F46]',
  moyen: 'bg-[#F5F0E3] text-[#926B2D]',
  eleve: 'bg-[#FEE2E2] text-[#991B1B]',
}
const BILLING_LABELS: Record<string, string> = { forfait: 'Forfait', horaire: 'Horaire', abonnement: 'Abonnement', success_fee: 'Success fee', provision: 'Provision' }
const INVOICE_TYPE_LABELS: Record<string, string> = { devis: 'Devis', facture: 'Facture', avoir: 'Avoir', recu: 'Reçu' }
const INVOICE_TYPE_COLORS: Record<string, string> = { devis: 'bg-[#2563EB] text-white', facture: 'bg-[#1E5A8A] text-white', avoir: 'bg-[#DC2626] text-white', recu: 'bg-[#059669] text-white' }
const PAYMENT_METHOD_LABELS: Record<string, string> = { especes: 'Espèces', virement: 'Virement', mobile_money: 'Mobile Money', carte: 'Carte', cheque: 'Chèque' }
const PAYMENT_METHOD_COLORS: Record<string, string> = { especes: 'bg-[#059669]', virement: 'bg-[#1E5A8A]', mobile_money: 'bg-[#C8A45D]', carte: 'bg-[#7C3AED]', cheque: 'bg-[#6B7280]' }
const CHART_COLORS = ['#1E5A8A', '#C8A45D', '#059669', '#DC2626', '#6B7280', '#F59E0B']
const CHART_COLORS_DARK = ['#4A8FCA', '#E0C87A', '#34D399', '#FB7185', '#9CA3AF', '#FBBF24']

const NAV_ITEMS: { view: ViewName; label: string; icon: React.ElementType; adminOnly?: boolean; permission?: { resource: string; action: string } }[] = [
  { view: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { view: 'cases', label: 'Dossiers', icon: Briefcase, permission: { resource: 'case', action: 'view' } },
  { view: 'clients', label: 'Clients', icon: Users, permission: { resource: 'client', action: 'view' } },
  { view: 'tasks', label: 'Tâches', icon: ClipboardList, permission: { resource: 'task', action: 'view' } },
  { view: 'documents', label: 'Documents', icon: FileText, permission: { resource: 'document', action: 'view' } },
  { view: 'calendar', label: 'Calendrier', icon: Calendar, permission: { resource: 'event', action: 'view' } },
  { view: 'invoices', label: 'Factures', icon: Receipt, permission: { resource: 'invoice', action: 'view' } },
  { view: 'finances', label: 'Finances', icon: TrendingUp, permission: { resource: 'invoice', action: 'view' } },
  { view: 'time-tracking', label: 'Temps', icon: Timer, permission: { resource: 'task', action: 'view' } },
  { view: 'communications', label: 'Communications', icon: SendHorizontal, permission: { resource: 'message', action: 'view' } },
  { view: 'templates', label: 'Modèles', icon: FileCode2, permission: { resource: 'document', action: 'view' } },
  { view: 'messages', label: 'Messages', icon: MessageSquare, permission: { resource: 'message', action: 'view' } },
  { view: 'reports', label: 'Rapports', icon: BarChart3, permission: { resource: 'report', action: 'view' } },
  { view: 'notifications', label: 'Notifications', icon: Bell, permission: { resource: 'notification', action: 'view' } },
  { view: 'audit-logs', label: "Journal d'audit", icon: Shield, adminOnly: true, permission: { resource: 'audit', action: 'view' } },
  { view: 'settings', label: 'Paramètres', icon: Settings },
]

const ADMIN_NAV_ITEMS: { view: ViewName; label: string; icon: React.ElementType }[] = [
  { view: 'admin-dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { view: 'admin-cabinets', label: 'Cabinets', icon: BuildingIcon },
  { view: 'admin-users', label: 'Utilisateurs', icon: UsersRound },
  { view: 'admin-plans', label: 'Abonnements', icon: CreditCardIcon },
  { view: 'settings', label: 'Paramètres', icon: Settings },
]

// ==================== Helpers ====================
function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: fr }) } catch { return '—' }
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd/MM/yyyy HH:mm', { locale: fr }) } catch { return '—' }
}
function fmtMoney(amount: number, code: string = 'XAF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code, minimumFractionDigits: 0 }).format(amount)
}
function fmtFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / 1048576).toFixed(1) + ' Mo'
}
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }
const TASK_STATUS_MAP: Record<string, string> = { todo: 'a_faire', in_progress: 'en_cours', done: 'terminee', en_cours: 'en_cours', a_faire: 'a_faire', terminee: 'terminee' }
function taskStatusColor(s: string) { const mapped = TASK_STATUS_MAP[s] || s; return STATUS_COLORS[mapped === 'en_cours' ? 'en_cours_t' : mapped] || STATUS_COLORS[s] || '' }
function taskStatusLabel(s: string) { const mapped = TASK_STATUS_MAP[s] || s; return STATUS_LABELS[mapped === 'en_cours' ? 'en_cours_t' : mapped] || s }
function relativeTime(d: string | null | undefined): string {
  if (!d) return ''
  try {
    const now = Date.now()
    const then = parseISO(d).getTime()
    const diffMin = Math.floor((now - then) / 60000)
    if (diffMin < 1) return "à l'instant"
    if (diffMin < 60) return `il y a ${diffMin}min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `il y a ${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD === 1) return 'hier'
    if (diffD < 7) return `il y a ${diffD}j`
    return fmtDate(d)
  } catch { return '' }
}
function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// ==================== Theme Toggle ====================
function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        <Sun className="size-5 rotate-0 scale-100 transition-all" />
        <Moon className="absolute size-5 rotate-90 scale-0 transition-all" />
        <span className="sr-only">Basculer le thème</span>
      </Button>
    </TooltipTrigger><TooltipContent>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</TooltipContent></Tooltip></TooltipProvider>
  )
}

// ==================== Empty State ====================
function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="size-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4">
        <Icon className="size-7 text-[#9CA3AF]" />
      </div>
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      {description && <p className="text-sm text-[#9CA3AF] mt-1.5 text-center max-w-sm">{description}</p>}
    </div>
  )
}

// ==================== Login Page ====================
function LoginPage() {
  const { login } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Veuillez entrer votre email'); return }
    if (!password) { toast.error('Veuillez entrer votre mot de passe'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur de connexion'); return }
      login(data); toast.success(`Bienvenue, ${data.fullName} !`)
    } catch { toast.error('Erreur de connexion au serveur') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
      <div className="w-full max-w-md">
        <Card className="rounded-2xl shadow-sm border border-[#E5E7EB] bg-white">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <img src="/splash.png" alt="JurisLink" className="h-16 w-auto object-contain" />
            </div>
            <CardDescription className="text-sm mt-1 text-[#6B7280]">Le système d'exploitation de votre cabinet</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" type="email" placeholder="email@jurislink.com" value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-lg border-[#E5E7EB] bg-white" /></div>
              <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><div className="relative"><Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-lg border-[#E5E7EB] bg-white pr-10" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors" tabIndex={-1}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
              <Button type="submit" className="w-full h-11 bg-[#1E5A8A] hover:bg-[#164070] text-white rounded-lg font-medium" disabled={loading}>{loading ? <RefreshCw className="size-4 animate-spin" /> : 'Se connecter'}</Button>
            </form>
          </CardContent>
          <CardFooter className="flex-col gap-2 pb-8"><Separator className="mb-2" /><p className="text-xs text-[#9CA3AF]">Connectez-vous avec votre email</p></CardFooter>
        </Card>
        <p className="text-center text-xs text-[#9CA3AF] mt-6">© 2025 JurisLink — Tous droits réservés</p>
      </div>
    </div>
  )
}

// ==================== Sidebar ====================
function Sidebar() {
  const { currentView, setCurrentView, user, sidebarOpen, setSidebarOpen } = useAppStore()
  const isAdmin = user?.role === 'firm_admin' || user?.role === 'root_admin' || user?.role === 'associate'
  const hasPermission = useAppStore(s => s.hasPermission)
  const navContent = (
    <nav className="space-y-1 mx-3">
      {NAV_ITEMS.filter(item => {
        if (item.adminOnly && !isAdmin) return false
        if (item.permission && !hasPermission(item.permission.resource, item.permission.action)) return false
        return true
      }).map(item => {
        const Icon = item.icon; const active = currentView === item.view
        return (
          <button key={item.view} onClick={() => { setCurrentView(item.view); setSidebarOpen(false) }}
            className={cn('w-full flex items-center h-11 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              active ? 'bg-[#E8F0F8] text-[#1E5A8A] border-l-[3px] border-[#C8A45D]' : 'text-[#374151] hover:bg-[#F9FAFB] border-l-[3px] border-transparent')}>
            <Icon className="size-5 shrink-0 mr-3" /><span className="whitespace-nowrap">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
  return (<>
    <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full bg-white flex-col w-[260px] border-r border-[#E5E7EB] overflow-hidden">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#E5E7EB] shrink-0">
        <img src="/icon.png" alt="JurisLink" className="size-8 rounded-lg shrink-0 object-cover" />
        <span className="text-lg font-bold tracking-tight whitespace-nowrap"><span className="text-[#1E5A8A]">Juris</span><span className="text-[#C8A45D]">Link</span></span>
      </div>
      <ScrollArea className="flex-1 min-h-0 py-4 custom-scrollbar">{navContent}</ScrollArea>
      <div className="p-4 border-t border-[#E5E7EB] shrink-0"><div className="flex items-center gap-3"><Avatar className="size-8 shrink-0"><AvatarFallback className="bg-[#1E5A8A] text-white text-xs">{user?.fullName ? initials(user.fullName) : 'U'}</AvatarFallback></Avatar><div className="min-w-0"><p className="text-sm font-medium truncate text-[#111827]">{user?.fullName}</p><p className="text-xs text-[#9CA3AF] truncate">{ROLE_LABELS[user?.role || ''] || user?.role}</p></div></div></div>
    </aside>
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side="left" className="w-[280px] p-0 bg-white border-[#E5E7EB]">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#E5E7EB] shrink-0"><img src="/icon.png" alt="JurisLink" className="size-8 rounded-lg shrink-0 object-cover" /><span className="text-lg font-bold tracking-tight whitespace-nowrap"><span className="text-[#1E5A8A]">Juris</span><span className="text-[#C8A45D]">Link</span></span><Button variant="ghost" size="icon" className="ml-auto text-[#6B7280] hover:text-[#111827]" onClick={() => setSidebarOpen(false)}><X className="size-5" /></Button></div>
      <ScrollArea className="flex-1 min-h-0 py-4 custom-scrollbar">{navContent}</ScrollArea>
    </SheetContent></Sheet>
  </>)
}

// ==================== Admin Sidebar ====================
function AdminSidebar() {
  const { currentView, setCurrentView, user, sidebarOpen, setSidebarOpen } = useAppStore()
  const navContent = (
    <nav className='space-y-1 mx-3'>
      {ADMIN_NAV_ITEMS.map(item => {
        const Icon = item.icon; const active = currentView === item.view
        return (
          <button key={item.view} onClick={() => { setCurrentView(item.view); setSidebarOpen(false) }}
            className={cn('w-full flex items-center h-11 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              active ? 'bg-[#C8A45D]/10 text-[#926B2D] border-l-[3px] border-[#C8A45D]' : 'text-[#374151] hover:bg-[#F9FAFB] border-l-[3px] border-transparent')}>
            <Icon className='size-5 shrink-0 mr-3' /><span className='whitespace-nowrap'>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
  return (<>
    <aside className='hidden lg:flex fixed top-0 left-0 z-40 h-full bg-white flex-col w-[260px] border-r border-[#E5E7EB] overflow-hidden'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-[#E5E7EB] shrink-0'>
        <img src='/icon.png' alt='JurisLink' className='size-8 rounded-lg shrink-0 object-cover' />
        <div className='flex-1 min-w-0'><span className='text-lg font-bold tracking-tight whitespace-nowrap'><span className='text-[#1E5A8A]'>Juris</span><span className='text-[#C8A45D]'>Link</span></span><div className='flex items-center gap-1'><Badge className='bg-[#C8A45D] text-white text-[9px] px-1.5 py-0'><Crown className='size-2.5 mr-0.5' />Admin</Badge></div></div>
      </div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
      <div className='p-4 border-t border-[#E5E7EB] shrink-0'>
        <div className='flex items-center gap-3'>
          <Avatar className='size-8 shrink-0'><AvatarFallback className='bg-[#C8A45D] text-white text-xs'>{user?.fullName ? initials(user.fullName) : 'A'}</AvatarFallback></Avatar>
          <div className='min-w-0'><p className='text-sm font-medium truncate text-[#111827]'>{user?.fullName}</p><p className='text-xs text-[#9CA3AF] truncate'>Admin Racine</p></div>
        </div>
      </div>
    </aside>
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side='left' className='w-[280px] p-0 bg-white border-[#E5E7EB]'>
      <div className='flex items-center gap-3 px-4 h-16 border-b border-[#E5E7EB] shrink-0'>
        <img src='/icon.png' alt='JurisLink' className='size-8 rounded-lg shrink-0 object-cover' />
        <span className='text-lg font-bold tracking-tight whitespace-nowrap'><span className='text-[#1E5A8A]'>Juris</span><span className='text-[#C8A45D]'>Link</span></span>
        <Button variant='ghost' size='icon' className='ml-auto text-[#6B7280] hover:text-[#111827]' onClick={() => setSidebarOpen(false)}><X className='size-5' /></Button>
      </div>
      <ScrollArea className='flex-1 min-h-0 py-4 custom-scrollbar'>{navContent}</ScrollArea>
    </SheetContent></Sheet>
  </>)
}

// ==================== Admin Header ====================
function AdminHeader() {
  const { user, logout, sidebarOpen, setSidebarOpen } = useAppStore()
  return (
    <header className='sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 md:px-6 h-14 flex items-center gap-4 shrink-0'>
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className='lg:hidden text-[#6B7280] hover:text-[#111827]'><Menu className='size-5' /></button>
      <div className='flex items-center gap-2'><Crown className='size-5 text-[#C8A45D]' /><h1 className='text-sm font-semibold text-[#111827]'>Administration</h1></div>
      <div className='ml-auto flex items-center gap-3'>
        <div className='hidden sm:flex items-center gap-2'>
          <Avatar className='size-7'><AvatarFallback className='bg-[#C8A45D] text-white text-[10px]'>{user?.fullName ? initials(user.fullName) : 'A'}</AvatarFallback></Avatar>
          <span className='text-sm font-medium text-[#111827]'>{user?.fullName}</span>
        </div>
        <Button variant='ghost' size='icon' className='text-[#6B7280] hover:text-[#DC2626]' onClick={logout}><LogOut className='size-4' /></Button>
      </div>
    </header>
  )
}

// ==================== Header ====================
function Header() {
  const { currentView, user, logout, setCurrentView } = useAppStore()
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<{_type: string; _label: string; _sub: string; _view: ViewName; _id: string}[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const viewLabel = NAV_ITEMS.find(n => n.view === currentView)?.label || ADMIN_NAV_ITEMS.find(n => n.view === currentView)?.label || 'JurisLink'

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !user?.tenantId) return
    try {
      const res = await fetch(`/api/search?tenantId=${user.tenantId}&q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      const results: { _type: string; _label: string; _sub: string; _view: ViewName; _id: string }[] = []
      const items = data.results || data || []
      for (const item of items) {
        const viewMap: Record<string, ViewName> = { case: 'cases', client: 'clients', task: 'tasks', document: 'documents', event: 'calendar', invoice: 'invoices' }
        results.push({ _type: item._type || 'autre', _label: item._label || item.title || item.fullName || item.fileName || '', _sub: item._sub || item.reference || item.email || '', _view: viewMap[item._type] || 'dashboard', _id: item.id })
      }
      setSearchResults(results.slice(0, 15))
    } catch {
      try {
        const base = `tenantId=${user.tenantId}&search=${encodeURIComponent(q.trim())}`
        const [casesRes, clientsRes] = await Promise.all([
          fetch(`/api/cases?${base}`).then(r => r.json()).catch(() => []),
          fetch(`/api/clients?${base}`).then(r => r.json()).catch(() => []),
        ])
        const results: { _type: string; _label: string; _sub: string; _view: ViewName; _id: string }[] = []
        for (const c of (casesRes.cases || casesRes || [])) results.push({ _type: 'case', _label: c.reference, _sub: c.title, _view: 'cases', _id: c.id })
        for (const c of (clientsRes.clients || clientsRes || [])) results.push({ _type: 'client', _label: c.fullName, _sub: c.company || c.email || '', _view: 'clients', _id: c.id })
        setSearchResults(results.slice(0, 10))
      } catch { /* ignore */ }
    }
  }, [user])

  const handleSearchChange = (val: string) => { setSearch(val); setSearchOpen(true); if (searchTimerRef.current) clearTimeout(searchTimerRef.current); searchTimerRef.current = setTimeout(() => doSearch(val), 300) }

  const { data: notifs } = useQuery({ queryKey: ['notifications', user?.tenantId], queryFn: () => fetch(`/api/notifications?tenantId=${user!.tenantId}`).then(r => r.json()), enabled: !!user?.tenantId, refetchInterval: 30000 })
  const unreadCount = (Array.isArray(notifs) ? notifs : []).filter((n: Notification) => !n.read).length
  const msgCount = 0

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB]">
      <div className="flex items-center gap-4 h-16 px-4 lg:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => useAppStore.getState().toggleSidebar()}><Menu className="size-5" /></Button>
        <h1 className="text-lg font-semibold text-[#111827] hidden sm:block">{viewLabel}</h1>
        <div className="relative flex-1 max-w-md ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
          <Input placeholder="Rechercher dossiers, clients, factures, tâches..." className="pl-9 h-9 bg-[#F3F4F6] border-transparent rounded-lg" value={search} onChange={e => handleSearchChange(e.target.value)} onFocus={() => search && setSearchOpen(true)} />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-lg border border-[#E5E7EB] shadow-lg z-50 max-h-80 overflow-y-auto">
              {(() => {
                const categories: Record<string, { icon: React.ElementType; color: string; label: string }> = {
                  case: { icon: Briefcase, color: 'text-[#926B2D]', label: 'Dossiers' },
                  client: { icon: Users, color: 'text-[#059669]', label: 'Clients' },
                  task: { icon: ClipboardList, color: 'text-[#1E5A8A]', label: 'Tâches' },
                  document: { icon: FileText, color: 'text-[#6B7280]', label: 'Documents' },
                  event: { icon: Calendar, color: 'text-[#C8A45D]', label: 'Événements' },
                  invoice: { icon: Receipt, color: 'text-[#DC2626]', label: 'Factures' },
                }
                const grouped: Record<string, typeof searchResults> = {}
                for (const r of searchResults) {
                  const cat = r._type
                  if (!grouped[cat]) grouped[cat] = []
                  grouped[cat].push(r)
                }
                return Object.entries(grouped).map(([cat, items]) => {
                  const meta = categories[cat] || { icon: FileText, color: 'text-[#6B7280]', label: cat }
                  const CatIcon = meta.icon
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F9FAFB] sticky top-0"><CatIcon className={cn('size-3.5', meta.color)} /><span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{meta.label}</span><Badge variant="secondary" className="text-[9px] ml-auto">{items.length}</Badge></div>
                      {items.map((r, i) => (
                        <button key={`${r._id}-${i}`} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F9FAFB] text-left" onMouseDown={e => { e.preventDefault(); setSearchOpen(false); setCurrentView(r._view); setSearch('') }}>
                          <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{r._label}</p><p className="text-xs text-[#9CA3AF] truncate">{r._sub}</p></div>
                        </button>
                      ))}
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="relative size-9" onClick={() => { setCurrentView('messages') }}><MessageSquare className="size-5" />{msgCount ? <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-[#1E5A8A] text-white text-[10px] flex items-center justify-center font-bold">{msgCount > 9 ? '9+' : msgCount}</span> : null}</Button></TooltipTrigger><TooltipContent>Messages</TooltipContent></Tooltip></TooltipProvider>
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative size-9"><Bell className="size-5" />{unreadCount ? <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto"><DropdownMenuLabel>Notifications ({unreadCount})</DropdownMenuLabel><DropdownMenuSeparator />{(notifs?.notifications || []).slice(0, 8).map((n: Notification) => (<DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer" onClick={() => { const vmap: Record<string, ViewName> = { dossier: 'cases', echeance: 'calendar', facture: 'invoices', document: 'documents', tache: 'tasks', message: 'messages' }; setCurrentView(vmap[n.category] || 'dashboard'); setNotifOpen(false) }}><p className={cn('text-sm font-medium', !n.read && 'text-[#111827]')}>{n.title}</p><p className="text-xs text-[#9CA3AF] line-clamp-2">{n.message}</p></DropdownMenuItem>))}</DropdownMenuContent></DropdownMenu>
          <ThemeToggle />
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><LogOut className="size-5 text-[#6B7280]" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={logout} className="text-[#DC2626] cursor-pointer"><LogOut className="size-4 mr-2" />Déconnexion</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </div>
    </header>
  )
}

// ==================== Dashboard ====================
function DashboardView() {
  const { user, setCurrentView } = useAppStore()
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard', user?.tenantId],
    queryFn: () => fetch(`/api/dashboard?tenantId=${user!.tenantId}&userId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.tenantId, refetchInterval: 60000
  })
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const hour = new Date().getHours()
  const minute = new Date().getMinutes()

  if (isLoading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-6" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>
  if (!stats) return null

  const finData = stats.financial
  const urgencyCount = (stats.urgencies?.length || 0) + (stats.overdueInvoices?.length || 0)
  const myTaskCount = stats.myTasks?.length || 0
  const totalPending = (stats.overdueInvoices || []).reduce((s, i) => s + i.amount, 0)

  const statusChartData = Object.entries(stats.casesByStatus || {}).map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value })).filter(d => d.value > 0)
  const typeChartData = Object.entries(stats.casesByType || {}).map(([name, value]) => ({ name: TYPE_LABELS[name] || name, value })).filter(d => d.value > 0)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome + Aujourd'hui section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div><h2 className="text-xl font-bold text-[#111827]">{greeting}, {user?.fullName?.split(' ').slice(-1)}</h2><p className="text-sm text-[#6B7280]">{format(now, 'EEEE d MMMM yyyy', { locale: fr })} — {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</p></div>
              <div className="flex gap-2"><Button size="sm" onClick={() => setCurrentView('cases')} className="hidden sm:flex"><Plus className="size-4 mr-1" />Nouveau dossier</Button><Button size="sm" variant="outline" onClick={() => setCurrentView('invoices')} className="hidden sm:flex"><Receipt className="size-4 mr-1" />Nouvelle facture</Button></div>
            </div>
            <Separator className="mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={cn('rounded-xl p-4 border-l-4', urgencyCount > 0 ? 'border-l-[#EF4444] bg-[#FEF2F2]' : 'border-l-[#059669] bg-[#ECFDF5]')}>
                <p className="text-xs font-medium text-[#6B7280] mb-1">Aujourd'hui</p>
                <p className="text-2xl font-bold text-[#111827]">{urgencyCount > 0 ? <><span className="text-[#DC2626]">{urgencyCount}</span> <span className="text-sm font-normal">urgence{urgencyCount > 1 ? 's' : ''}</span></> : <><CheckCircle2 className="size-6 text-[#059669] inline" /> <span className="text-sm font-normal text-[#059669]">Tout va bien</span></>}</p>
              </div>
              <div className="rounded-xl p-4 border-l-4 border-l-[#C8A45D] bg-[#FEF3C7]">
                <p className="text-xs font-medium text-[#6B7280] mb-1">Actions à faire</p>
                <p className="text-2xl font-bold text-[#111827]">{myTaskCount} <span className="text-sm font-normal text-[#6B7280]">tâche{myTaskCount > 1 ? 's' : ''}</span></p>
              </div>
              <div className="rounded-xl p-4 border-l-4 border-l-[#1E5A8A] bg-[#E8F0F8]">
                <p className="text-xs font-medium text-[#6B7280] mb-1">Dossiers actifs</p>
                <p className="text-2xl font-bold text-[#111827]">{stats.activeCases}</p>
              </div>
              <div className="rounded-xl p-4 border-l-4 border-l-[#D97706] bg-[#FEF3C7]">
                <p className="text-xs font-medium text-[#6B7280] mb-1">Honoraires en attente</p>
                <p className="text-2xl font-bold text-[#D97706]">{fmtMoney(totalPending, 'XAF')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* My Tasks quick panel */}
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="size-4 text-[#C8A45D]" />Mes tâches en cours</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="space-y-2 max-h-48 overflow-y-auto">{(stats.myTasks || []).length === 0 ? <p className="text-xs text-[#9CA3AF] py-4 text-center">Aucune tâche en cours</p> : (stats.myTasks || []).map(t => (<div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer" onClick={() => setCurrentView('tasks')}><span className={cn('size-2 rounded-full shrink-0', t.priority === 'urgente' ? 'bg-[#EF4444]' : t.priority === 'haute' ? 'bg-[#D97706]' : 'bg-[#C8A45D]')} /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{t.title}</p><p className="text-xs text-[#9CA3AF]">{t.caseReference ? `${t.caseReference} — ` : ''}{t.dueDate ? `Échéance: ${fmtDate(t.dueDate)}` : ''}</p></div></div>))}</div></CardContent></Card>
      </div>

      {/* Urgencies + Upcoming Events */}
      {(urgencyCount > 0 || (stats.urgentTasks?.length || 0) > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Urgencies */}
          <Card className="border-l-4 border-l-[#DC2626]"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#DC2626]"><AlertOctagon className="size-4" />Urgences</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.urgencies?.map(u => (<div key={u.id} className="flex items-start gap-3 p-2 rounded-lg bg-[#FEF2F2] cursor-pointer hover:bg-[#FEE2E2]" onClick={() => setCurrentView('cases')}><div className="mt-0.5"><Gavel className="size-4 text-[#EF4444]" /></div><div className="min-w-0"><p className="text-sm font-medium">{u.reference} — {u.title}</p><p className="text-xs text-[#6B7280]">{u.clientName} • <span className="font-semibold text-[#DC2626]">{u.daysRemaining <= 0 ? 'Aujourd\'hui !' : `Dans ${u.daysRemaining} jour${u.daysRemaining > 1 ? 's' : ''}`}</span></p></div></div>))}
            {stats.overdueInvoices?.map(inv => (<div key={inv.id} className="flex items-start gap-3 p-2 rounded-lg bg-[#FEF3C7] cursor-pointer hover:bg-[#FDE68A]" onClick={() => setCurrentView('invoices')}><div className="mt-0.5"><AlertTriangle className="size-4 text-[#D97706]" /></div><div className="min-w-0"><p className="text-sm font-medium">{inv.clientName}</p><p className="text-xs text-[#6B7280]">{fmtMoney(inv.amount, inv.currencyCode)} • <span className="font-semibold text-[#D97706]">{inv.daysOverdue}j de retard</span></p></div></div>))}
            {stats.urgentTasks?.slice(0, 3).map(t => (<div key={t.id} className="flex items-start gap-3 p-2 rounded-lg bg-[#FEF3C7] cursor-pointer hover:bg-[#FDE68A]" onClick={() => setCurrentView('tasks')}><div className="mt-0.5"><Timer className="size-4 text-[#C8A45D]" /></div><div className="min-w-0"><p className="text-sm font-medium">{t.title}</p><p className="text-xs text-[#6B7280]">{t.assigneeName ? `→ ${t.assigneeName}` : ''} {t.caseReference ? `• ${t.caseReference}` : ''}</p></div></div>))}
          </div></CardContent></Card>
          {/* Upcoming Events */}
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="size-4 text-[#C8A45D]" />Prochains événements (7j)</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="space-y-2 max-h-64 overflow-y-auto">{(stats.upcomingEventsEnhanced || []).length === 0 ? <p className="text-xs text-[#9CA3AF] py-4 text-center">Aucun événement à venir</p> : (stats.upcomingEventsEnhanced || []).map(e => (<div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer" onClick={() => setCurrentView('calendar')}><span className={cn('w-1 h-8 rounded-full shrink-0', CRIT_COLORS[e.criticality] || CRIT_COLORS.normal)} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{e.title}</p><p className="text-xs text-[#6B7280]">{fmtDateTime(e.startTime)}{e.caseReference ? ` • ${e.caseReference}` : ''}</p><p className="text-xs text-[#9CA3AF] mt-0.5">{e.assignments.map(a => a.userName).join(', ')}</p></div><Badge variant="outline" className="text-[10px] shrink-0">{EVENT_TYPE_LABELS[e.eventType] || e.eventType}</Badge></div>))}</div></CardContent></Card>
        </div>
      )}

      {/* Activité du cabinet - Financial comparison + Counts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {finData && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="size-4 text-[#059669]" />Activité du cabinet</CardTitle></CardHeader>
          <CardContent>
            {stats.activityCounts && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {stats.activityCounts.dossiersOuverts != null && <div className="rounded-xl p-3 border-l-4 border-l-[#1E5A8A] bg-[#E8F0F8]"><p className="text-[10px] text-[#6B7280]">Dossiers ouverts</p><p className="text-lg font-bold text-[#1E5A8A]">{stats.activityCounts.dossiersOuverts}</p></div>}
                {stats.activityCounts.dossiersCloses != null && <div className="rounded-xl p-3 border-l-4 border-l-[#059669] bg-[#ECFDF5]"><p className="text-[10px] text-[#6B7280]">Dossiers clos</p><p className="text-lg font-bold text-[#059669]">{stats.activityCounts.dossiersCloses}</p></div>}
                {stats.activityCounts.nouveauxClients != null && <div className="rounded-xl p-3 border-l-4 border-l-[#C8A45D] bg-[#FEF3C7]"><p className="text-[10px] text-[#6B7280]">Nouveaux clients</p><p className="text-lg font-bold text-[#926B2D]">{stats.activityCounts.nouveauxClients}</p></div>}
                {stats.activityCounts.audiences != null && <div className="rounded-xl p-3 border-l-4 border-l-[#D97706] bg-[#FEF3C7]"><p className="text-[10px] text-[#6B7280]">Audiences</p><p className="text-lg font-bold text-[#D97706]">{stats.activityCounts.audiences}</p></div>}
                {stats.activityCounts.facturesEmises != null && <div className="rounded-xl p-3 border-l-4 border-l-[#DC2626] bg-[#FEF2F2]"><p className="text-[10px] text-[#6B7280]">Factures émises</p><p className="text-lg font-bold text-[#DC2626]">{stats.activityCounts.facturesEmises}</p></div>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4 border-l-4 border-l-[#059669] bg-[#ECFDF5]">
                <p className="text-xs text-[#6B7280] mb-1">CA ce mois</p>
                <p className="text-lg font-bold">{fmtMoney(finData.revenueThisMonth || 0)}</p>
                {finData.revenueLastMonth > 0 && <p className={cn("text-xs mt-1", (finData.revenueThisMonth || 0) >= finData.revenueLastMonth ? "text-[#059669]" : "text-[#DC2626]")}>{(finData.revenueThisMonth || 0) >= finData.revenueLastMonth ? "↑" : "↓"} vs mois dernier ({fmtMoney(finData.revenueLastMonth)})</p>}
              </div>
              <div className="rounded-xl p-4 border-l-4 border-l-[#059669] bg-[#ECFDF5]">
                <p className="text-xs text-[#6B7280] mb-1">Encaissé</p>
                <p className="text-lg font-bold">{fmtMoney(finData.collectedThisMonth || 0)}</p>
                {finData.collectedLastMonth > 0 && <p className={cn("text-xs mt-1", (finData.collectedThisMonth || 0) >= finData.collectedLastMonth ? "text-[#059669]" : "text-[#DC2626]")}>{(finData.collectedThisMonth || 0) >= finData.collectedLastMonth ? "↑" : "↓"} vs mois dernier</p>}
              </div>
              <div className="rounded-xl p-4 border-l-4 border-l-[#DC2626] bg-[#FEF2F2]">
                <p className="text-xs text-[#6B7280] mb-1">À recouvrer</p>
                <p className="text-lg font-bold text-[#DC2626]">{fmtMoney(finData.toRecover || 0)}</p>
              </div>
              <div className="rounded-xl p-4 border-l-4 border-l-[#C8A45D] bg-[#FEF3C7]">
                <p className="text-xs text-[#6B7280] mb-1">Impayés</p>
                <p className="text-lg font-bold text-[#926B2D]">{finData.overdueInvoicesCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Activité récente */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="size-4 text-[#1E5A8A]" />Activité récente</CardTitle></CardHeader>
          <CardContent><div className="space-y-3 max-h-80 overflow-y-auto">
            {(stats.recentActivity || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune activité récente</p> :
            (stats.recentActivity || []).map((a: AuditLogItem) => {
              const resIcon: Record<string, React.ElementType> = { Case: Briefcase, Client: Users, Invoice: Receipt, Document: FileText, Task: ClipboardList, Event: Calendar, User: UserCircle }
              const ResIcon = resIcon[a.resourceType || ''] || FileText
              const resBadge: Record<string, string> = { Case: 'Dossier', Client: 'Client', Invoice: 'Facture', Document: 'Document', Task: 'Tâche', Event: 'Événement', User: 'Utilisateur' }
              return (
                <div key={a.id} className="flex items-start gap-3">
                  <Avatar className="size-7 mt-0.5"><AvatarFallback className="text-[9px] bg-[#F3F4F6] text-[#374151]">{a.user?.fullName ? initials(a.user.fullName) : 'S'}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><span className="font-medium">{a.user?.fullName || 'Système'}</span> <span className="text-[#6B7280]">{a.action.toLowerCase()}</span></p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.resourceType && <Badge variant="outline" className="text-[9px] px-1.5 py-0"><ResIcon className="size-2.5 mr-0.5" />{resBadge[a.resourceType] || a.resourceType}</Badge>}
                      <span className="text-[10px] text-[#9CA3AF]">{relativeTime(a.timestamp)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Dossiers par statut</CardTitle></CardHeader><CardContent><div className="space-y-2 pt-2">{statusChartData.map((d, i) => <div key={d.name} className="flex items-center gap-3"><span className="text-xs text-[#6B7280] w-24 truncate">{d.name}</span><div className="flex-1 h-6 bg-[#F3F4F6] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (d.value / Math.max(...statusChartData.map(x => x.value), 1)) * 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /></div><span className="text-xs font-semibold w-6 text-right">{d.value}</span></div>)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Dossiers par type</CardTitle></CardHeader><CardContent><div className="space-y-2 pt-2">{typeChartData.map((d, i) => <div key={d.name} className="flex items-center gap-3"><div className="size-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-xs flex-1">{d.name}</span><span className="text-xs font-semibold">{d.value}</span></div>)}</div></CardContent></Card>
      </div>
    </div>
  )
}

// ==================== TASKS VIEW ====================
function TasksView() {
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
      return fetch(`/api/tasks?${p}`).then(r => r.json()).then(d => d.tasks || d)
    },
  })

  const { data: users } = useQuery({
    queryKey: ['users', user?.tenantId],
    queryFn: () => fetch(`/api/users?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : d.users || []),
  })

  const { data: cases } = useQuery({
    queryKey: ['cases-mini', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()),
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
                <TableCell><span className={cn('size-2.5 rounded-full inline-block', t.priority === 'urgente' ? 'bg-[#EF4444]' : t.priority === 'haute' ? 'bg-[#D97706]' : 'bg-[#C8A45D]')} /></TableCell>
                <TableCell className="font-medium"><span className={cn(isDone && 'line-through')}>{t.title}</span>{t.case?.reference && <p className="text-[10px] text-[#9CA3AF]">{t.case.reference}</p>}</TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[t.priority])}>{PRIORITY_LABELS[t.priority] || t.priority}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell">
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="text-[10px] h-7 gap-1"><Badge variant="outline" className={cn('text-[10px] border-0 p-0', taskStatusColor(t.status))}>{taskStatusLabel(t.status)}</Badge><ChevronDown className="size-3" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => { if (t.status !== 'a_faire') updateMut.mutate({ id: t.id, status: 'a_faire' }) }}><CircleDot className="size-3 mr-2" />À faire</DropdownMenuItem><DropdownMenuItem onClick={() => { if (t.status !== 'en_cours') updateMut.mutate({ id: t.id, status: 'en_cours' }) }}><Timer className="size-3 mr-2" />En cours</DropdownMenuItem><DropdownMenuItem onClick={() => { if (t.status !== 'terminee') updateMut.mutate({ id: t.id, status: 'terminee' }) }}><CheckCircle2 className="size-3 mr-2" />Terminée</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </TableCell>
                <TableCell className="hidden lg:table-cell"><div className="flex items-center gap-1.5">{t.assignedToUser ? <><Avatar className="size-5"><AvatarFallback className="text-[8px] bg-[#1E5A8A] text-white">{initials(t.assignedToUser.fullName)}</AvatarFallback></Avatar><span className="text-xs text-[#6B7280]">{t.assignedToUser.fullName}</span></> : <span className="text-xs text-[#9CA3AF]">—</span>}</div></TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-[#6B7280]">{fmtDate(t.dueDate)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(t)}><Edit className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="size-7 text-[#EF4444] hover:text-[#DC2626]" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="size-3.5" /></Button>
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

// ==================== CASES VIEW ====================
function CasesView() {
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
  const [form, setForm] = useState({ title: '', description: '', caseType: 'civil', status: 'nouveau', priority: 'normal', clientId: '', reference: '', adversary: '', jurisdiction: '', amountInDispute: '', billingType: '', nextDueDate: '' })

  const { data: cases, isLoading } = useQuery({
    queryKey: ['cases', user?.tenantId, statusFilter, typeFilter, priorityFilter, search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (statusFilter !== 'all') p.set('status', statusFilter)
      if (typeFilter !== 'all') p.set('type', typeFilter)
      if (priorityFilter !== 'all') p.set('priority', priorityFilter)
      if (search) p.set('search', search)
      return fetch(`/api/cases?${p}`).then(r => r.json())
    },
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-mini', user?.tenantId],
    queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()),
  })

  const { data: caseDetail } = useQuery({
    queryKey: ['case-detail', selectedCase?.id],
    queryFn: () => fetch(`/api/cases/${selectedCase!.id}`).then(r => r.json()),
    enabled: !!selectedCase?.id && detailOpen,
  })

  const { data: caseTasks } = useQuery({
    queryKey: ['case-tasks', selectedCase?.id],
    queryFn: () => fetch(`/api/tasks?caseId=${selectedCase!.id}&tenantId=${user?.tenantId}`).then(r => r.json()).then(d => d.tasks || d || []),
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

  const resetForm = () => { setForm({ title: '', description: '', caseType: 'civil', status: 'nouveau', priority: 'normal', clientId: '', reference: '', adversary: '', jurisdiction: '', amountInDispute: '', billingType: '', nextDueDate: '' }); setEditing(null); setConflicts([]) }
  const openEdit = (c: CaseItem) => {
    setEditing(c)
    setForm({ title: c.title, description: c.description || '', caseType: c.caseType, status: c.status, priority: c.priority, clientId: c.clientId, reference: c.reference, adversary: c.adversary || '', jurisdiction: c.jurisdiction || '', amountInDispute: c.amountInDispute?.toString() || '', billingType: c.billingType || '', nextDueDate: '' })
    setDialogOpen(true)
  }
  const handleSubmit = () => {
    if (!form.title.trim() || !form.clientId) return
    const payload = { title: form.title, description: form.description || null, caseType: form.caseType, status: form.status, priority: form.priority, clientId: form.clientId, reference: form.reference, tenantId: user?.tenantId, adversary: form.adversary || null, jurisdiction: form.jurisdiction || null, amountInDispute: form.amountInDispute ? parseFloat(form.amountInDispute) : null, billingType: form.billingType || null }
    if (editing) { updateMut.mutate({ id: editing.id, ...payload }) } else { createMut.mutate(payload) }
  }

  const timeline = useMemo(() => {
    if (!caseDetail) return []
    const items: Array<{ date: string; type: 'event' | 'note' | 'doc' | 'task'; icon: React.ElementType; title: string; description: string }> = []
    for (const e of (caseDetail.events || [])) { items.push({ date: e.startTime, type: 'event', icon: Calendar, title: e.title, description: e.description || '' }) }
    for (const n of (caseDetail.notes || [])) { items.push({ date: n.createdAt, type: 'note', icon: FileText, title: 'Note', description: n.content }) }
    for (const d of (caseDetail.documents || [])) { items.push({ date: d.createdAt, type: 'doc', icon: FileCheck, title: d.fileName, description: `${d.mimeType || 'fichier'} • ${fmtFileSize(d.fileSize)}` }) }
    for (const t of (caseTasks || [])) { items.push({ date: t.createdAt, type: 'task', icon: ClipboardList, title: `Tâche: ${t.title}`, description: `${taskStatusLabel(t.status)} • ${PRIORITY_LABELS[t.priority] || t.priority}` }) }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [caseDetail, caseTasks])

  const getClientName = (c: CaseItem) => c.client ? c.client.fullName : '—'

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Dossiers</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm"><Plus className="size-4 mr-1" />Nouveau dossier</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" /><Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="nouveau">Nouveau</SelectItem><SelectItem value="ouvert">Ouvert</SelectItem><SelectItem value="en_cours">En cours</SelectItem><SelectItem value="en_attente">En attente</SelectItem><SelectItem value="clos">Clos</SelectItem></SelectContent></Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="civil">Civil</SelectItem><SelectItem value="penal">Pénal</SelectItem><SelectItem value="commercial">Commercial</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="administratif">Administratif</SelectItem></SelectContent></Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Priorité" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="haute">Haute</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (cases || []).length === 0 ? <EmptyState icon={Briefcase} title="Aucun dossier" description="Créez votre premier dossier" /> :
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {(cases || []).map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedCase(c); setDetailOpen(true) }}>
              <CardHeader className="pb-2"><div className="flex items-start justify-between"><CardTitle className="text-sm font-semibold">{c.reference}</CardTitle><Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status] || c.status}</Badge></div><CardDescription className="text-xs mt-1 line-clamp-2">{c.title}</CardDescription></CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <p className="text-xs text-[#6B7280]"><Users className="size-3 inline mr-1" />{getClientName(c)}</p>
                {c.adversary && <p className="text-xs text-[#6B7280]"><Scale className="size-3 inline mr-1" />Contre : {c.adversary}</p>}
                {c.jurisdiction && <p className="text-xs text-[#6B7280]"><MapPin className="size-3 inline mr-1" />{c.jurisdiction}</p>}
                {c.amountInDispute != null && c.amountInDispute > 0 && <p className="text-xs font-medium text-[#926B2D]"><Banknote className="size-3 inline mr-1" />{fmtMoney(c.amountInDispute)}</p>}
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
          {conflicts.length > 0 && <div className="bg-[#FEF3C7] border border-amber-200 rounded-lg p-3 space-y-1">{conflicts.map((c, i) => <div key={i} className="flex items-start gap-2 text-xs"><AlertTriangle className="size-4 text-[#C8A45D] shrink-0 mt-0.5" /><span className="text-[#926B2D]">{c.description}</span></div>)}</div>}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Référence *</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="REF-001" /></div>
              <div><Label>Client *</Label><Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{(clients || []).map(cl => <SelectItem key={cl.id} value={cl.id}>{cl.fullName}{cl.company ? ` (${cl.company})` : ''}</SelectItem>)}</SelectContent></Select></div>
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
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSubmit} disabled={!form.title.trim() || !form.clientId || createMut.isPending}>{editing ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{selectedCase?.reference} — {selectedCase?.title}</DialogTitle>
            {(caseDetail?.assignments || []).length > 0 && (
              <div className="flex items-center gap-1 mt-1">{caseDetail.assignments.slice(0, 6).map((a: CaseAssignment) => (<TooltipProvider key={a.userId}><Tooltip><TooltipTrigger asChild><Avatar className="size-6 -ml-1 first:ml-0 border-2 border-white"><AvatarFallback className="text-[8px] bg-[#1E5A8A] text-white">{a.user?.fullName ? initials(a.user.fullName) : 'U'}</AvatarFallback></Avatar></TooltipTrigger><TooltipContent>{a.user?.fullName || ''}</TooltipContent></Tooltip></TooltipProvider>))}{caseDetail.assignments.length > 6 && <span className="text-[10px] text-[#9CA3AF] ml-1">+{caseDetail.assignments.length - 6}</span>}</div>
            )}
          </DialogHeader>
          <Tabs defaultValue="resume" className="flex-1 overflow-hidden">
            <TabsList className="w-full flex-wrap h-auto"><TabsTrigger value="resume">Résumé</TabsTrigger><TabsTrigger value="timeline">Chronologie</TabsTrigger><TabsTrigger value="taches">Tâches</TabsTrigger><TabsTrigger value="events">Événements</TabsTrigger><TabsTrigger value="equipe">Équipe</TabsTrigger><TabsTrigger value="factures">Factures</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger><TabsTrigger value="documents">Documents</TabsTrigger></TabsList>
            <TabsContent value="resume" className="mt-4 space-y-3 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[#6B7280]">Client :</span> <span className="font-medium">{caseDetail?.client ? caseDetail.client.fullName : '—'}</span></div>
                <div><span className="text-[#6B7280]">Type :</span> <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[caseDetail?.caseType || ''] || caseDetail?.caseType}</Badge></div>
                <div><span className="text-[#6B7280]">Statut :</span> <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[caseDetail?.status || ''])}>{STATUS_LABELS[caseDetail?.status || ''] || caseDetail?.status}</Badge></div>
                <div><span className="text-[#6B7280]">Priorité :</span> <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[caseDetail?.priority || ''])}>{PRIORITY_LABELS[caseDetail?.priority || ''] || caseDetail?.priority}</Badge></div>
                {caseDetail?.adversary && <div className="col-span-2"><span className="text-[#6B7280]">Partie adverse :</span> <span className="font-medium">{caseDetail.adversary}</span></div>}
                {caseDetail?.jurisdiction && <div className="col-span-2"><span className="text-[#6B7280]">Juridiction :</span> <span className="font-medium">{caseDetail.jurisdiction}</span></div>}
                {caseDetail?.amountInDispute != null && <div><span className="text-[#6B7280]">Montant en jeu :</span> <span className="font-medium">{fmtMoney(caseDetail.amountInDispute)}</span></div>}
                {caseDetail?.billingType && <div><span className="text-[#6B7280]">Facturation :</span> <Badge variant="secondary" className="text-[10px]">{BILLING_LABELS[caseDetail.billingType] || caseDetail.billingType}</Badge></div>}
                <div className="col-span-2"><span className="text-[#6B7280]">Description :</span><p className="mt-1 text-sm text-[#374151] whitespace-pre-wrap">{caseDetail?.description || 'Aucune description'}</p></div>
              </div>
            </TabsContent>
            <TabsContent value="timeline" className="mt-4 overflow-y-auto max-h-[50vh]">
              {timeline.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune activité</p> :
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E5E7EB]" />
                {timeline.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="relative pb-4">
                      <div className="absolute -left-6 top-1 size-[15px] rounded-full bg-white border-2 border-slate-300 flex items-center justify-center"><Icon className="size-2.5 text-[#6B7280]" /></div>
                      <div><p className="text-xs text-[#9CA3AF]">{fmtDateTime(item.date)}</p><p className="text-sm font-medium mt-0.5">{item.title}</p>{item.description && <p className="text-xs text-[#6B7280] mt-0.5">{item.description}</p>}</div>
                    </div>
                  )
                })}
              </div>}
            </TabsContent>
            <TabsContent value="notes" className="mt-4 space-y-3 overflow-y-auto max-h-[50vh]">
              {(caseDetail?.notes || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune note</p> :
                (caseDetail?.notes || []).map(n => (
                  <div key={n.id} className="border rounded-lg p-3"><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium">{n.author?.fullName || '—'}</span><span className="text-[10px] text-[#9CA3AF]">{fmtDateTime(n.createdAt)}</span></div><p className="text-sm text-[#374151] whitespace-pre-wrap">{n.content}</p></div>
                ))}
            </TabsContent>
            <TabsContent value="documents" className="mt-4 space-y-2 overflow-y-auto max-h-[50vh]">
              {(caseDetail?.documents || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucun document</p> :
                (caseDetail?.documents || []).map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F9FAFB]"><FileText className="size-4 text-[#9CA3AF] shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{d.fileName}</p><p className="text-[10px] text-[#9CA3AF]">{d.mimeType || 'fichier'} • {fmtFileSize(d.fileSize)}</p></div></div>
                ))}
            </TabsContent>
            <TabsContent value="taches" className="mt-4 overflow-y-auto max-h-[50vh]">
              {(caseTasks || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune tâche</p> :
              <div className="space-y-2">{(caseTasks || []).map((t: TaskItem) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB]">
                  <span className={cn('size-2 rounded-full shrink-0', t.priority === 'urgente' ? 'bg-[#EF4444]' : t.priority === 'haute' ? 'bg-[#D97706]' : 'bg-[#C8A45D]')} />
                  <div className="min-w-0 flex-1"><p className={cn('text-sm font-medium', t.status === 'terminee' && 'line-through')}>{t.title}</p>{t.dueDate && <p className="text-[10px] text-[#9CA3AF]">Échéance: {fmtDate(t.dueDate)}</p>}</div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', taskStatusColor(t.status))}>{taskStatusLabel(t.status)}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="events" className="mt-4 overflow-y-auto max-h-[50vh]">
              {(caseDetail?.events || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucun événement</p> :
              <div className="space-y-2">{(caseDetail?.events || []).map((e: EventItem) => (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB]">
                  <Calendar className="size-4 text-[#C8A45D] shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{e.title}</p><p className="text-[10px] text-[#9CA3AF]">{fmtDateTime(e.startTime)}{e.description ? ` • ${e.description}` : ''}</p></div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{EVENT_TYPE_LABELS[e.eventType] || e.eventType}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="equipe" className="mt-4 overflow-y-auto max-h-[50vh]">
              {(caseDetail?.assignments || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucun membre assigné</p> :
              <div className="space-y-2">{(caseDetail?.assignments || []).map((a: CaseAssignment) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB]">
                  <Avatar className="size-8"><AvatarFallback className="text-[10px] bg-[#1E5A8A] text-white">{a.user?.fullName ? initials(a.user.fullName) : 'U'}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{a.user?.fullName || '—'}</p><p className="text-[10px] text-[#9CA3AF]">{ROLE_LABELS[a.user?.role || ''] || a.user?.role || ''}</p></div>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="factures" className="mt-4 overflow-y-auto max-h-[50vh]">
              {(caseInvoices || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune facture</p> :
              <div className="space-y-2">{(caseInvoices || []).map((inv: Invoice) => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB]">
                  <Receipt className="size-4 text-[#926B2D] shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{inv.id.slice(0,8)}</p><p className="text-[10px] text-[#9CA3AF]">{fmtDate(inv.createdAt)}{inv.dueDate ? ` • Échéance: ${fmtDate(inv.dueDate)}` : ''}</p></div>
                  <span className="text-sm font-semibold shrink-0">{fmtMoney(inv.amount, inv.currency?.code || 'XAF')}</span>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[inv.status])}>{STATUS_LABELS[inv.status] || inv.status}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== CLIENTS VIEW ====================
function ClientsView() {
  const { user, setCurrentView } = useAppStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [form, setForm] = useState({ fullName: '', company: '', email: '', phone: '', address: '', city: '', country: 'Cameroun', notes: '', clientType: 'particulier', niu: '', riskLevel: 'faible', source: '', isActive: true })

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', user?.tenantId, search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (search) p.set('search', search)
      return fetch(`/api/clients?${p}`).then(r => r.json())
    },
  })

  const { data: clientDetail } = useQuery({
    queryKey: ['client-detail', selectedClient?.id],
    queryFn: () => fetch(`/api/clients/${selectedClient!.id}?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!selectedClient?.id && detailOpen,
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client créé'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => fetch(`/api/clients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client mis à jour'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/clients/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client supprimé') },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const resetForm = () => { setForm({ fullName: '', company: '', email: '', phone: '', address: '', city: '', country: 'Cameroun', notes: '', clientType: 'particulier', niu: '', riskLevel: 'faible', source: '', isActive: true }); setEditing(null) }
  const openEdit = (c: Client) => { setEditing(c); setForm({ fullName: c.fullName, company: c.company || '', email: c.email || '', phone: c.phone || '', address: c.address || '', city: c.city || '', country: c.country || 'Cameroun', notes: c.notes || '', clientType: c.clientType || 'particulier', niu: c.niu || '', riskLevel: c.riskLevel || 'faible', source: c.source || '', isActive: c.isActive }); setDialogOpen(true) }
  const handleSubmit = () => {
    if (!form.fullName.trim()) return
    const payload = { ...form, company: form.company || null, email: form.email || null, phone: form.phone || null, address: form.address || null, city: form.city || null, niu: form.niu || null, notes: form.notes || null, source: form.source || null }
    if (editing) { updateMut.mutate({ id: editing.id, ...payload }) } else { createMut.mutate(payload) }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Clients</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm"><Plus className="size-4 mr-1" />Nouveau client</Button>
      </div>

      <div className="relative max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" /><Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" /></div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (clients || []).length === 0 ? <EmptyState icon={Users} title="Aucun client" description="Ajoutez votre premier client" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Nom</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden lg:table-cell">Ville</TableHead>
            <TableHead className="hidden md:table-cell">Risque</TableHead>
            <TableHead className="hidden sm:table-cell">Dossiers</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {(clients || []).map((c: Client, i: number) => (
              <TableRow key={c.id} className={cn(i % 2 === 1 && 'bg-[#F9FAFB]', 'cursor-pointer')} onClick={() => { setSelectedClient(c); setDetailOpen(true) }}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7"><AvatarFallback className="text-[10px] bg-[#F3F4F6]">{initials(c.fullName)}</AvatarFallback></Avatar>
                    <div><p className="text-sm font-medium">{c.fullName}</p>{c.company && <p className="text-[10px] text-[#9CA3AF]">{c.company}</p>}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{c.clientType === 'entreprise' ? 'Entreprise' : 'Particulier'}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-[#6B7280]">{c.city || '—'}</TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline" className={cn('text-[10px]', RISK_COLORS[c.riskLevel || 'faible'])}>{c.riskLevel === 'eleve' ? 'Élevé' : c.riskLevel === 'moyen' ? 'Moyen' : 'Faible'}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-[#6B7280]">{c._count?.cases || 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(c)}><Edit className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="size-7 text-[#EF4444] hover:text-[#DC2626]" onClick={() => deleteMut.mutate(c.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div></CardContent></Card>}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier le client' : 'Nouveau client'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom complet *</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></div>
            <div><Label>Société</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div><Label>Adresse</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>Pays</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.clientType} onValueChange={v => setForm(f => ({ ...f, clientType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="particulier">Particulier</SelectItem><SelectItem value="entreprise">Entreprise</SelectItem></SelectContent></Select></div>
              <div><Label>NIU</Label><Input value={form.niu} onChange={e => setForm(f => ({ ...f, niu: e.target.value }))} placeholder="Numéro d'Identification Unique" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Niveau de risque</Label><Select value={form.riskLevel} onValueChange={v => setForm(f => ({ ...f, riskLevel: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="faible">Faible</SelectItem><SelectItem value="moyen">Moyen</SelectItem><SelectItem value="eleve">Élevé</SelectItem></SelectContent></Select></div>
              <div><Label>Source</Label><Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="bouche_a_oreille">Bouche à oreille</SelectItem><SelectItem value="internet">Internet</SelectItem><SelectItem value="recommandation">Recommandation</SelectItem><SelectItem value="autre">Autre</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSubmit} disabled={!form.fullName.trim() || createMut.isPending || updateMut.isPending}>{editing ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="size-10"><AvatarFallback className="bg-[#1E5A8A] text-white text-sm">{initials(selectedClient?.fullName || '')}</AvatarFallback></Avatar>
              <div><div>{selectedClient?.fullName}{selectedClient?.company && <span className="text-[#6B7280] font-normal"> — {selectedClient.company}</span>}</div>
              <div className="flex items-center gap-2 mt-1"><Badge variant="outline" className="text-[10px]">{selectedClient?.clientType === 'entreprise' ? 'Entreprise' : 'Particulier'}</Badge><Badge variant="outline" className={cn('text-[10px]', RISK_COLORS[selectedClient?.riskLevel || 'faible'])}>{selectedClient?.riskLevel === 'eleve' ? 'Élevé' : selectedClient?.riskLevel === 'moyen' ? 'Moyen' : 'Faible'}</Badge></div></div>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7280] px-1 py-2">
            {selectedClient?.email && <div className="flex items-center gap-1.5"><Mail className="size-3" />{selectedClient.email}</div>}
            {selectedClient?.phone && <div className="flex items-center gap-1.5"><Phone className="size-3" />{selectedClient.phone}</div>}
            {selectedClient?.address && <div className="flex items-center gap-1.5"><MapPin className="size-3" />{selectedClient.address}</div>}
            {selectedClient?.city && <div className="flex items-center gap-1.5"><MapPin className="size-3" />{selectedClient.city}{selectedClient?.country ? `, ${selectedClient.country}` : ''}</div>}
            {selectedClient?.niu && <div className="flex items-center gap-1.5"><Building2 className="size-3" />NIU: {selectedClient.niu}</div>}
          </div>
          <Tabs defaultValue="dossiers" className="flex-1 overflow-hidden">
            <TabsList className="w-full"><TabsTrigger value="dossiers">Dossiers ({(clientDetail?.cases || []).length})</TabsTrigger><TabsTrigger value="factures">Factures ({(clientDetail?.invoices || []).length})</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>
            <TabsContent value="dossiers" className="mt-3 overflow-y-auto max-h-[45vh]">
              {(clientDetail?.cases || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucun dossier</p> :
              <div className="space-y-2">{(clientDetail?.cases || []).map((c: CaseItem) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer" onClick={() => { setDetailOpen(false); setCurrentView('cases') }}>
                  <Briefcase className="size-4 text-[#C8A45D] shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{c.reference} — {c.title}</p><p className="text-[10px] text-[#9CA3AF]">{TYPE_LABELS[c.caseType] || c.caseType} • Créé le {fmtDate(c.createdAt)}</p></div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status] || c.status}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="factures" className="mt-3 overflow-y-auto max-h-[45vh]">
              {(clientDetail?.invoices || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune facture</p> :
              <div className="space-y-2">{(clientDetail?.invoices || []).map((inv: Invoice) => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer" onClick={() => { setDetailOpen(false); setCurrentView('invoices') }}>
                  <Receipt className="size-4 text-[#926B2D] shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{inv.id.slice(0,8)}{inv.case?.reference ? ` — ${inv.case.reference}` : ''}</p><p className="text-[10px] text-[#9CA3AF]">{fmtDate(inv.createdAt)}</p></div>
                  <span className="text-sm font-semibold shrink-0">{fmtMoney(inv.amount, inv.currency?.code || 'XAF')}</span>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[inv.status])}>{STATUS_LABELS[inv.status] || inv.status}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="notes" className="mt-3 overflow-y-auto max-h-[45vh]">
              <div className="p-4 border rounded-lg bg-[#F9FAFB]">
                <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{selectedClient?.notes || clientDetail?.notes || 'Aucune note'}</p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== DOCUMENTS VIEW ====================
function DocumentsView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [caseFilter, setCaseFilter] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ caseId: '', folder: 'Général', tags: '', documentType: 'autre' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: cases } = useQuery({
    queryKey: ['cases-mini-docs', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()),
  })

  const { data: docs, isLoading } = useQuery({
    queryKey: ['documents', user?.tenantId, caseFilter],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (caseFilter !== 'all') p.set('caseId', caseFilter)
      return fetch(`/api/documents?${p}`).then(r => r.json())
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/documents/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Document supprimé') },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true); setUploadProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('tenantId', user?.tenantId || '')
      if (uploadForm.caseId) fd.append('caseId', uploadForm.caseId)
      fd.append('folder', uploadForm.folder)
      fd.append('tags', uploadForm.tags)
      fd.append('documentType', uploadForm.documentType)
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)) }
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { resolve() } else { reject(new Error('Upload failed')) } }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('POST', '/api/documents')
        xhr.send(fd)
      })
      toast.success('Document téléchargé')
      qc.invalidateQueries({ queryKey: ['documents'] })
      setUploadOpen(false); setSelectedFile(null); setUploadForm({ caseId: '', folder: 'Général', tags: '', documentType: 'autre' })
    } catch { toast.error('Erreur lors du téléchargement') } finally { setUploading(false); setUploadProgress(0) }
  }

  const folders = ['Général', 'Procédure', 'Contrats', 'Pièces client', 'Correspondances', 'Décisions', 'Factures', 'Archives']
  const docTypes = [{ value: 'contrat', label: 'Contrat' }, { value: 'conclusion', label: 'Conclusion' }, { value: 'assignation', label: 'Assignation' }, { value: 'jugement', label: 'Jugement' }, { value: 'correspondance', label: 'Correspondance' }, { value: 'autre', label: 'Autre' }]

  const grouped = useMemo(() => {
    const groups: Record<string, Doc[]> = {}
    for (const d of (docs || []) as Doc[]) {
      const folder = d.folder || 'Sans dossier'
      if (!groups[folder]) groups[folder] = []
      groups[folder].push(d)
    }
    return groups
  }, [docs])

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Documents</h2>
        <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="size-4 mr-1" />Ajouter un document</Button>
      </div>
      <Select value={caseFilter} onValueChange={setCaseFilter}>
        <SelectTrigger className="w-[220px] h-9 text-xs"><SelectValue placeholder="Filtrer par dossier" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Tous les dossiers</SelectItem>{(cases || []).map(c => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent>
      </Select>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (docs || []).length === 0 ? <EmptyState icon={FileText} title="Aucun document" /> :
        <div className="max-h-[600px] overflow-y-auto space-y-4">
          {Object.entries(grouped).map(([folder, items]) => (
            <Card key={folder}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Folder className="size-4 text-[#C8A45D]" />{folder}<Badge variant="secondary" className="text-[10px]">{items.length}</Badge></CardTitle></CardHeader>
              <CardContent className="p-4 pt-0 space-y-1">
                {items.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F9FAFB]">
                    <FileText className="size-4 text-[#9CA3AF] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="text-sm font-medium truncate">{d.fileName}</p></div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#9CA3AF]">{d.mimeType || 'fichier'} • {fmtFileSize(d.fileSize)}</span>
                        {d.tags && d.tags.split(',').map((t, i) => <Badge key={i} variant="outline" className="text-[10px] px-1 py-0"><Tag className="size-2.5 mr-0.5" />{t.trim()}</Badge>)}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0 hidden sm:block">{fmtDate(d.createdAt)}</span>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0 text-[#EF4444] hover:text-[#DC2626]" onClick={() => deleteMut.mutate(d.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>}

      <Dialog open={uploadOpen} onOpenChange={o => { setUploadOpen(o); if (!o) { setSelectedFile(null); setUploadForm({ caseId: '', folder: 'Général', tags: '', documentType: 'autre' }); setUploadProgress(0) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajouter un document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 text-center cursor-pointer hover:border-[#1E5A8A] transition-colors" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              {selectedFile ? <><FileUp className="size-8 mx-auto text-[#1E5A8A] mb-2" /><p className="text-sm font-medium">{selectedFile.name}</p><p className="text-xs text-[#9CA3AF]">{fmtFileSize(selectedFile.size)}</p></> : <><Upload className="size-8 mx-auto text-[#9CA3AF] mb-2" /><p className="text-sm font-medium">Cliquez pour sélectionner un fichier</p><p className="text-xs text-[#9CA3AF]">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p></>}
            </div>
            {uploading && <div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-[#6B7280]">Téléchargement...</span><span className="font-medium">{uploadProgress}%</span></div><Progress value={uploadProgress} className="h-1.5" /></div>}
            <div><Label>Dossier lié</Label><Select value={uploadForm.caseId} onValueChange={v => setUploadForm(f => ({ ...f, caseId: v }))}><SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger><SelectContent>{(cases || []).map(c => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Répertoire</Label><Select value={uploadForm.folder} onValueChange={v => setUploadForm(f => ({ ...f, folder: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{folders.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Type de document</Label><Select value={uploadForm.documentType} onValueChange={v => setUploadForm(f => ({ ...f, documentType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{docTypes.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Tags (séparés par des virgules)</Label><Input value={uploadForm.tags} onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))} placeholder="contrat, urgent, v1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setUploadOpen(false)}>Annuler</Button><Button onClick={handleUpload} disabled={!selectedFile || uploading}><Upload className="size-4 mr-1" />{uploading ? 'Téléchargement...' : 'Télécharger'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== CALENDAR VIEW ====================
function CalendarView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', eventType: 'rdv', criticality: 'normale', caseId: '', assignments: '' as string })
  const [generateTasks, setGenerateTasks] = useState(false)
  const monthStr = format(currentMonth, 'yyyy-MM')

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', user?.tenantId, monthStr],
    queryFn: () => fetch(`/api/events?tenantId=${user?.tenantId}&month=${monthStr}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const { data: tenantCases } = useQuery({
    queryKey: ['cases-mini-cal', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()),
  })

  const { data: tenantUsers } = useQuery({
    queryKey: ['users-cal', user?.tenantId],
    queryFn: () => fetch(`/api/users?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : d.users || []),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Événement créé'); setDialogOpen(false)
      if (generateTasks && data?.id) {
        fetch('/api/workflow/generate-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: data.id, tenantId: user?.tenantId }) }).then(r => r.json()).then(res => {
          if (res.createdCount > 0) toast.success(`${res.createdCount} tâches générées automatiquement`)
          else toast('Aucune nouvelle tâche générée')
          qc.invalidateQueries({ queryKey: ['tasks'] })
        }).catch(() => {})
      }
      resetForm()
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Événement mis à jour'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/events/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Événement supprimé'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const resetForm = () => { setForm({ title: '', description: '', startTime: '', endTime: '', eventType: 'rdv', criticality: 'normale', caseId: '', assignments: '' }); setEditing(null); setGenerateTasks(false) }
  const openCreate = (day?: Date) => {
    resetForm()
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
    })
    setDialogOpen(true)
  }
  const handleSubmit = () => {
    if (!form.title.trim() || !form.startTime) return
    const assignments = form.assignments ? form.assignments.split(',').filter(Boolean) : []
    const payload = { title: form.title, description: form.description || null, startTime: form.startTime, endTime: form.endTime || null, eventType: form.eventType, criticality: form.criticality, caseId: form.caseId || null, assignments }
    if (editing) { updateMut.mutate({ id: editing.id, ...payload }) } else { createMut.mutate(payload) }
  }

  const CRIT_EVENT_COLORS: Record<string, string> = {
    normale: 'bg-[#C8A45D]', importante: 'bg-[#F59E0B]', urgente: 'bg-[#EF4444]',
  }

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const getEventsForDay = (day: Date) => (Array.isArray(events) ? events : []).filter((e: EventItem) => { try { return isSameDay(parseISO(e.startTime), day) } catch { return false } })

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendrier</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="size-4" /></Button>
          <span className="text-sm font-medium min-w-[140px] text-center">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="size-4" /></Button>
          <Button size="sm" className="bg-[#1E5A8A] hover:bg-[#164070] ml-2" onClick={() => openCreate()}><CalendarPlus className="size-4 mr-1" />Nouvel événement</Button>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> : (
        <Card><CardContent className="p-2">
          <div className="grid grid-cols-7 gap-px bg-[#F3F4F6] rounded-lg overflow-hidden">
            {weekDays.map(d => <div key={d} className="bg-white p-2 text-center text-xs font-medium text-[#6B7280]">{d}</div>)}
            {days.map(day => {
              const dayEvents = getEventsForDay(day)
              return (
                <div key={day.toISOString()} className={cn('bg-white p-1 min-h-[80px] md:min-h-[100px] border border-[#E5E7EB] cursor-pointer', !isSameMonth(day, currentMonth) && 'opacity-40', isToday(day) && 'bg-[#E8F0F8] ring-1 ring-[#1E5A8A]')} onClick={() => openCreate(day)}>
                  <p className={cn('text-xs mb-1', isToday(day) ? 'font-bold text-[#926B2D]' : 'text-[#6B7280]')}>{format(day, 'd')}</p>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} onClick={ev => { ev.stopPropagation(); openEdit(e) }} className={cn('text-[10px] px-1 py-0.5 rounded truncate text-white flex items-center gap-1', CRIT_EVENT_COLORS[e.criticality] || CRIT_EVENT_COLORS.normale)} title={e.title}>
                        {e.title}
                        {(e.assignments || []).length > 0 && <span className="ml-auto shrink-0">{(e.assignments || []).slice(0, 2).map((a: EventAssignment) => <span key={a.userId} className="inline-block size-3 rounded-full bg-white/30 ml-0.5" title={a.user?.fullName || ''}><span className="text-[6px] leading-3 block text-center">{a.user?.fullName?.[0] || ''}</span></span>)}</span>}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <p className="text-[10px] text-[#9CA3AF] pl-1">+{dayEvents.length - 3}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de l'événement" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Début *</Label><Input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
              <div><Label>Fin</Label><Input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.eventType} onValueChange={v => setForm(f => ({ ...f, eventType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="audience">Audience</SelectItem><SelectItem value="echeance">Échéance</SelectItem><SelectItem value="rdv">Rendez-vous</SelectItem><SelectItem value="reunion">Réunion</SelectItem><SelectItem value="autre">Autre</SelectItem></SelectContent></Select></div>
              <div><Label>Criticité</Label><Select value={form.criticality} onValueChange={v => setForm(f => ({ ...f, criticality: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normale">Normale</SelectItem><SelectItem value="importante">Importante</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Dossier lié</Label><Select value={form.caseId} onValueChange={v => setForm(f => ({ ...f, caseId: v }))}><SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger><SelectContent>{(tenantCases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Personnes assignées</Label><div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">{(tenantUsers || []).map((u: UserItem) => {
              const ids = form.assignments.split(',').filter(Boolean)
              const checked = ids.includes(u.id)
              return <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5"><Checkbox checked={checked} onCheckedChange={v => { const arr = ids.filter(x => x !== u.id); if (v) arr.push(u.id); setForm(f => ({ ...f, assignments: arr.join(',') })) }} className="size-3.5" /><span>{u.fullName}</span></label>
            })}</div></div>
            {!editing && <div className="flex items-center gap-2 pt-1"><Checkbox checked={generateTasks} onCheckedChange={v => setGenerateTasks(!!v)} className="size-3.5" /><Label className="text-xs cursor-pointer" onClick={() => setGenerateTasks(!generateTasks)}>Générer automatiquement les tâches de préparation</Label></div>}
            {editing && <div className="pt-1"><Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={async () => {
              try {
                const res = await fetch('/api/workflow/generate-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: editing.id, tenantId: user?.tenantId }) }).then(r => r.json())
                if (res.createdCount > 0) toast.success(`${res.createdCount} tâches générées automatiquement`)
                else toast('Aucune nouvelle tâche générée')
                qc.invalidateQueries({ queryKey: ['tasks'] })
              } catch { toast.error('Erreur') }
            }}><ZapIcon className="size-3.5 mr-1" />Générer les tâches</Button></div>}
          </div>
          <DialogFooter>
            {editing && <Button variant="outline" className="text-[#DC2626] hover:text-[#DC2626] hover:bg-[#FEF2F2] mr-auto" onClick={() => deleteMut.mutate(editing.id)}><Trash2 className="size-3.5 mr-1" />Supprimer</Button>}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.startTime || createMut.isPending || updateMut.isPending}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== INVOICES VIEW ====================
function InvoicesView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', method: 'virement', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' })
  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [createForm, setCreateForm] = useState({ type: 'facture', clientId: '', caseId: '', currencyId: '', dueDate: '', billingType: 'forfait', notes: '' })

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', user?.tenantId, typeFilter, statusFilter],
    queryFn: () => { const p = new URLSearchParams(); if (user?.tenantId) p.set('tenantId', user.tenantId); if (typeFilter !== 'all') p.set('type', typeFilter); if (statusFilter !== 'all') p.set('status', statusFilter); return fetch(`/api/invoices?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []) },
  })

  const { data: invoiceDetail } = useQuery({
    queryKey: ['invoice-detail', selectedInvoice?.id],
    queryFn: () => fetch(`/api/invoices/${selectedInvoice!.id}?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!selectedInvoice?.id && detailOpen,
  })

  const { data: clients } = useQuery({ queryKey: ['clients-invoice', user?.tenantId], queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()) })
  const { data: cases } = useQuery({ queryKey: ['cases-invoice', user?.tenantId], queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()) })
  const { data: currencies } = useQuery({ queryKey: ['currencies-invoice'], queryFn: () => fetch('/api/currencies').then(r => r.json()) })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Facture créée'); setCreateOpen(false); resetCreateForm() },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => fetch(`/api/invoices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-detail'] }); toast.success('Statut mis à jour') },
    onError: () => toast.error('Erreur'),
  })

  const payMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId, recordedBy: user?.id }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-detail'] }); toast.success('Paiement enregistré'); setShowPayForm(false); setPayForm({ amount: '', method: 'virement', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' }) },
    onError: () => toast.error('Erreur de paiement'),
  })

  const resetCreateForm = () => { setCreateForm({ type: 'facture', clientId: '', caseId: '', currencyId: '', dueDate: '', billingType: 'forfait', notes: '' }); setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]) }
  const subtotal = lineItems.reduce((s, li) => s + (li.quantity * li.unitPrice), 0)
  const addLine = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])
  const removeLine = (i: number) => { if (lineItems.length <= 1) return; setLineItems(lineItems.filter((_, idx) => idx !== i)) }
  const updateLine = (i: number, field: string, value: string | number) => setLineItems(lineItems.map((li, idx) => idx === i ? { ...li, [field]: value } : li))

  const handleCreate = () => {
    if (!createForm.clientId || lineItems.every(li => !li.description.trim())) return
    createMut.mutate({
      ...createForm, caseId: createForm.caseId || null, currencyId: createForm.currencyId || null,
      lineItems: lineItems.filter(li => li.description.trim()).map((li, i) => ({ description: li.description, quantity: li.quantity, unitPrice: li.unitPrice, total: li.quantity * li.unitPrice, sortOrder: i })),
    })
  }

  const handlePay = () => {
    if (!selectedInvoice || !payForm.amount) return
    payMut.mutate({ invoiceId: selectedInvoice.id, amount: parseFloat(payForm.amount), method: payForm.method, reference: payForm.reference || null, paidAt: payForm.paidAt || null, notes: payForm.notes || null })
  }

  const handlePrint = async () => {
    if (!selectedInvoice) return
    try { const res = await fetch(`/api/invoices/${selectedInvoice.id}/print?tenantId=${user?.tenantId}`); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${selectedInvoice.invoiceNumber || 'facture'}.pdf`; a.click(); URL.revokeObjectURL(url) } catch { toast.error('Erreur impression') }
  }

  const openDetail = (inv: Invoice) => { setSelectedInvoice(inv); setDetailOpen(true); setShowPayForm(false) }
  const paid = invoiceDetail?.paidAmount || 0
  const total = invoiceDetail?.amount || 0
  const remaining = Math.max(0, total - paid)
  const payPercent = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  const curCode = invoiceDetail?.currency?.code || 'XAF'

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Factures</h2>
        <Button onClick={() => { resetCreateForm(); setCreateOpen(true) }} size="sm" className="bg-[#1E5A8A] hover:bg-[#164070]"><Plus className="size-4 mr-1" />Nouvelle facture</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="devis">Devis</SelectItem><SelectItem value="facture">Facture</SelectItem><SelectItem value="avoir">Avoir</SelectItem><SelectItem value="recu">Reçu</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="non_paye">Non payé</SelectItem><SelectItem value="partiel">Partiel</SelectItem><SelectItem value="paye">Payé</SelectItem><SelectItem value="annule">Annulé</SelectItem></SelectContent></Select>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (invoices || []).length === 0 ? <EmptyState icon={Receipt} title="Aucune facture" description="Créez votre première facture" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Numéro</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="hidden md:table-cell text-right">Payé</TableHead><TableHead>Statut</TableHead><TableHead className="hidden lg:table-cell">Échéance</TableHead><TableHead className="w-16"></TableHead>
          </TableRow></TableHeader><TableBody>
            {(invoices || []).map((inv: Invoice, i: number) => {
              const invPaid = inv.paidAmount || 0
              const invTotal = inv.amount || 0
              const invPercent = invTotal > 0 ? Math.min(100, (invPaid / invTotal) * 100) : 0
              return (
                <TableRow key={inv.id} className={cn(i % 2 === 1 && 'bg-[#F9FAFB]', 'cursor-pointer')} onClick={() => openDetail(inv)}>
                  <TableCell className="font-medium text-sm">{inv.invoiceNumber || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge className={cn('text-[10px]', INVOICE_TYPE_COLORS[inv.type] || 'bg-[#6B7280] text-white')}>{INVOICE_TYPE_LABELS[inv.type] || inv.type}</Badge></TableCell>
                  <TableCell className="text-sm text-[#6B7280]">{inv.client?.fullName || '—'}</TableCell>
                  <TableCell className="text-sm font-medium text-right">{fmtMoney(invTotal, inv.currency?.code || 'XAF')}</TableCell>
                  <TableCell className="hidden md:table-cell"><div className="text-right"><p className="text-xs font-medium">{fmtMoney(invPaid, inv.currency?.code || 'XAF')}</p>{inv.status === 'partiel' && <div className="w-16 h-1.5 bg-[#F3F4F6] rounded-full mt-1 ml-auto"><div className="h-full rounded-full bg-[#C8A45D]" style={{ width: invPercent + '%' }} /></div>}</div></TableCell>
                  <TableCell><Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[inv.status])}>{STATUS_LABELS[inv.status] || inv.status}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-[#6B7280]">{fmtDate(inv.dueDate)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="size-7" onClick={e => { e.stopPropagation(); openDetail(inv) }}><Eye className="size-3.5" /></Button></TableCell>
                </TableRow>
              )
            })}
          </TableBody></Table>
        </div></CardContent></Card>}

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) resetCreateForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle facture</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type *</Label><Select value={createForm.type} onValueChange={v => setCreateForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="devis">Devis</SelectItem><SelectItem value="facture">Facture</SelectItem><SelectItem value="avoir">Avoir</SelectItem><SelectItem value="recu">Reçu</SelectItem></SelectContent></Select></div>
              <div><Label>Client *</Label><Select value={createForm.clientId} onValueChange={v => setCreateForm(f => ({ ...f, clientId: v }))}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{(clients || []).map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.fullName}{c.company ? ` (${c.company})` : ''}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Dossier</Label><Select value={createForm.caseId} onValueChange={v => setCreateForm(f => ({ ...f, caseId: v }))}><SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger><SelectContent><SelectItem value="">Aucun</SelectItem>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Devise</Label><Select value={createForm.currencyId} onValueChange={v => setCreateForm(f => ({ ...f, currencyId: v }))}><SelectTrigger><SelectValue placeholder="XAF" /></SelectTrigger><SelectContent>{(currencies || []).map((c: CurrencyItem) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.symbol}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Échéance</Label><Input type="date" value={createForm.dueDate} onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            </div>
            <div><Label>Type de facturation</Label><Select value={createForm.billingType} onValueChange={v => setCreateForm(f => ({ ...f, billingType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="forfait">Forfait</SelectItem><SelectItem value="horaire">Horaire</SelectItem><SelectItem value="abonnement">Abonnement</SelectItem><SelectItem value="success_fee">Success fee</SelectItem><SelectItem value="provision">Provision</SelectItem></SelectContent></Select></div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-sm font-semibold">Lignes de facturation</Label><Button type="button" size="sm" variant="outline" className="text-xs h-7" onClick={addLine}><Plus className="size-3 mr-1" />Ajouter une ligne</Button></div>
              <div className="space-y-2">
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5"><Label className="text-[10px]">Description</Label><Input value={li.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" className="h-9 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">Qté</Label><Input type="number" min={1} value={li.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 1)} className="h-9 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">Prix unit.</Label><Input type="number" min={0} value={li.unitPrice} onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-9 text-xs" /></div>
                    <div className="col-span-2"><Label className="text-[10px]">Total</Label><div className="h-9 flex items-center text-xs font-medium px-2 border rounded-md bg-[#F9FAFB]">{fmtMoney(li.quantity * li.unitPrice)}</div></div>
                    <div className="col-span-1 flex justify-end"><Button type="button" variant="ghost" size="icon" className="size-9 text-[#EF4444] hover:text-[#DC2626]" onClick={() => removeLine(i)} disabled={lineItems.length <= 1}><Trash2 className="size-3.5" /></Button></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end p-3 bg-[#F9FAFB] rounded-lg"><span className="text-sm text-[#6B7280]">Sous-total :</span><span className="text-sm font-bold ml-2">{fmtMoney(subtotal)}</span></div>
            </div>
            <div><Label>Notes</Label><Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button><Button onClick={handleCreate} disabled={!createForm.clientId || createMut.isPending || lineItems.every(li => !li.description.trim())}>{createMut.isPending ? <RefreshCw className="size-4 mr-1 animate-spin" /> : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle className="text-base">{invoiceDetail?.invoiceNumber || '—'}</DialogTitle>
              <Badge className={cn('text-[10px]', INVOICE_TYPE_COLORS[invoiceDetail?.type || ''] || 'bg-[#6B7280] text-white')}>{INVOICE_TYPE_LABELS[invoiceDetail?.type || ''] || invoiceDetail?.type}</Badge>
              <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[invoiceDetail?.status || ''])}>{STATUS_LABELS[invoiceDetail?.status || ''] || invoiceDetail?.status}</Badge>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-[#6B7280]">Client :</span> <span className="font-medium">{invoiceDetail?.client?.fullName || '—'}</span></div>
            {invoiceDetail?.client?.company && <div><span className="text-[#6B7280]">Société :</span> <span className="font-medium">{invoiceDetail.client.company}</span></div>}
            {invoiceDetail?.case && <div className="col-span-2"><span className="text-[#6B7280]">Dossier :</span> <span className="font-medium">{invoiceDetail.case.reference} — {invoiceDetail.case.title}</span></div>}
          </div>
          <Separator />
          {(invoiceDetail?.lineItems || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Lignes de facturation</p>
              <Table><TableHeader><TableRow><TableHead className="text-xs">Description</TableHead><TableHead className="text-xs text-right">Qté</TableHead><TableHead className="text-xs text-right">Prix unit.</TableHead><TableHead className="text-xs text-right">Total</TableHead></TableRow></TableHeader><TableBody>
                {(invoiceDetail?.lineItems || []).map((li: InvoiceLineItem) => (
                  <TableRow key={li.id}><TableCell className="text-sm">{li.description}</TableCell><TableCell className="text-sm text-right">{li.quantity}</TableCell><TableCell className="text-sm text-right">{fmtMoney(li.unitPrice, curCode)}</TableCell><TableCell className="text-sm text-right font-medium">{fmtMoney(li.total, curCode)}</TableCell></TableRow>
                ))}
              </TableBody></Table>
            </div>
          )}
          <div className="flex justify-end p-4 bg-[#F9FAFB] rounded-lg">
            <div className="text-right"><p className="text-xs text-[#6B7280]">Montant total</p><p className="text-xl font-bold text-[#111827]">{fmtMoney(total, curCode)}</p></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-[#6B7280]">Payé : {fmtMoney(paid, curCode)} / {fmtMoney(total, curCode)}</span><span className="font-semibold">{Math.round(payPercent)}%</span></div>
            <Progress value={payPercent} className="h-2" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280]">Changer le statut :</span>
            <Select value={invoiceDetail?.status || ''} onValueChange={v => { if (selectedInvoice) updateStatusMut.mutate({ id: selectedInvoice.id, status: v }) }}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="non_paye">Non payé</SelectItem><SelectItem value="partiel">Partiel</SelectItem><SelectItem value="paye">Payé</SelectItem><SelectItem value="annule">Annulé</SelectItem></SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Paiements ({(invoiceDetail?.payments || []).length})</p>
              <div className="flex gap-2">
                {(invoiceDetail?.status === 'non_paye' || invoiceDetail?.status === 'partiel') && <Button size="sm" variant="outline" className="text-xs" onClick={() => { setPayForm({ amount: remaining.toString(), method: 'virement', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' }); setShowPayForm(!showPayForm) }}><CreditCard className="size-3.5 mr-1" />Enregistrer un paiement</Button>}
                <Button size="sm" variant="outline" className="text-xs" onClick={handlePrint}><Printer className="size-3.5 mr-1" />Imprimer</Button>
              </div>
            </div>
            {showPayForm && (
              <div className="border rounded-lg p-4 bg-[#F9FAFB] space-y-3">
                <p className="text-xs font-semibold">Enregistrer un paiement</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Montant *</Label><Input type="number" min={0} step={0.01} value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
                  <div><Label>Méthode *</Label><Select value={payForm.method} onValueChange={v => setPayForm(f => ({ ...f, method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="especes">Espèces</SelectItem><SelectItem value="virement">Virement</SelectItem><SelectItem value="mobile_money">Mobile Money</SelectItem><SelectItem value="carte">Carte</SelectItem><SelectItem value="cheque">Chèque</SelectItem></SelectContent></Select></div>
                  <div><Label>Référence</Label><Input value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="Ref. transaction" /></div>
                  <div><Label>Date</Label><Input type="date" value={payForm.paidAt} onChange={e => setPayForm(f => ({ ...f, paidAt: e.target.value }))} /></div>
                </div>
                <div><Label>Notes</Label><Input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes optionnelles" /></div>
                <div className="flex gap-2"><Button size="sm" className="bg-[#059669] hover:bg-[#047857] text-white" onClick={handlePay} disabled={!payForm.amount || parseFloat(payForm.amount) <= 0 || payMut.isPending}>{payMut.isPending ? <RefreshCw className="size-3.5 mr-1 animate-spin" /> : <Banknote className="size-3.5 mr-1" />}Enregistrer</Button><Button size="sm" variant="outline" onClick={() => setShowPayForm(false)}>Annuler</Button></div>
              </div>
            )}
            {(invoiceDetail?.payments || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-4">Aucun paiement enregistré</p> : (
              <div className="space-y-2">
                {(invoiceDetail?.payments || []).map((p: Payment) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB]">
                    <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', PAYMENT_METHOD_COLORS[p.method] || 'bg-[#6B7280]')}><span className="text-white text-xs font-bold">{(PAYMENT_METHOD_LABELS[p.method] || '?')[0]}</span></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{fmtMoney(p.amount, curCode)}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{PAYMENT_METHOD_LABELS[p.method] || p.method}{p.reference ? ` • ${p.reference}` : ''} • {p.recorder?.fullName || '—'}</p>
                    </div>
                    <span className="text-xs text-[#9CA3AF] shrink-0">{fmtDate(p.paidAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {invoiceDetail?.notes && <><Separator /><div><p className="text-xs font-semibold text-[#6B7280] mb-1">Notes</p><p className="text-sm text-[#374151] whitespace-pre-wrap">{invoiceDetail.notes}</p></div></>}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== MESSAGES VIEW ====================
function MessagesView() {
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
          {contactList.length === 0 ? <p className="text-xs text-[#9CA3AF] p-4 text-center">Aucun contact</p> :
            contactList.map((c: UserItem) => (
              <button key={c.id} className={cn('w-full flex items-center gap-2 p-3 hover:bg-[#F9FAFB] text-left transition-colors', selectedContact === c.id && 'bg-[#E8F0F8]')} onClick={() => setSelectedContact(c.id)}>
                <Avatar className="size-8"><AvatarFallback className="text-[10px] bg-[#F3F4F6]">{initials(c.fullName)}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.fullName}</p><p className="text-[10px] text-[#9CA3AF]">{ROLE_LABELS[c.role] || c.role}</p></div>
              </button>
            ))}
        </div>
        <div className="flex-1 flex flex-col">
          {!selectedContact ? <div className="flex-1 flex items-center justify-center"><EmptyState icon={MessageSquare} title="Sélectionnez une conversation" description="Choisissez un contact pour commencer" /></div> : (
            <>
              <div className="p-3 border-b"><p className="text-sm font-semibold">{(contacts || []).find((c: UserItem) => c.id === selectedContact)?.fullName || ''}</p></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && <p className="text-xs text-[#9CA3AF] text-center py-8">Aucun message</p>}
                {chatMessages.map((m: Message) => {
                  const isMine = m.senderId === user?.id
                  return (
                    <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-xl px-3 py-2', isMine ? 'bg-[#1E5A8A] text-white' : 'bg-[#F3F4F6] text-[#111827]')}>
                        <p className="text-sm">{m.content}</p>
                        <p className={cn('text-[10px] mt-1', isMine ? 'text-[#E8F0F8]' : 'text-[#9CA3AF]')}>{fmtDateTime(m.createdAt)}</p>
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

// ==================== REPORTS VIEW ====================
function ReportsView() {
  const { user } = useAppStore()
  const [period, setPeriod] = useState('month')

  const { data: invoices } = useQuery({
    queryKey: ['invoices-report', user?.tenantId],
    queryFn: () => fetch(`/api/invoices?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard-report', user?.tenantId],
    queryFn: () => fetch(`/api/dashboard?tenantId=${user?.tenantId}`).then(r => r.json()),
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-report', user?.tenantId],
    queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const periodStart = useMemo(() => {
    const now = new Date()
    if (period === 'month') return startOfMonth(now).toISOString()
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), q * 3, 1).toISOString()
    }
    if (period === 'year') return new Date(now.getFullYear(), 0, 1).toISOString()
    return '2000-01-01'
  }, [period])

  const filteredInvoices = useMemo(() => {
    const all = (invoices || []) as Invoice[]
    if (period === 'all') return all
    return all.filter(i => i.createdAt >= periodStart || (i.issuedAt && i.issuedAt >= periodStart))
  }, [invoices, period, periodStart])

  const stats = useMemo(() => {
    const all = filteredInvoices
    const paid = all.filter(i => i.status === 'paye')
    const unpaid = all.filter(i => i.status === 'non_paye')
    const partial = all.filter(i => i.status === 'partiel')
    const totalRevenue = paid.reduce((s, i) => s + i.amount, 0)
    const monthRevenue = paid.filter(i => {
      try { return format(parseISO(i.paidAt || i.createdAt), 'yyyy-MM') === format(new Date(), 'yyyy-MM') } catch { return false }
    }).reduce((s, i) => s + i.amount, 0)
    const totalPending = unpaid.reduce((s, i) => s + i.amount, 0) + partial.reduce((s, i) => s + i.amount - (i.paidAmount || 0), 0)
    const newClientsCount = (clients || []).filter((c: Client) => {
      try { return c.createdAt >= periodStart } catch { return false }
    }).length
    return { totalRevenue, monthRevenue, totalPending, paidCount: paid.length, pendingCount: unpaid.length + partial.length, totalInvoices: all.length, newClientsCount, activeCases: dashboard?.activeCases || 0 }
  }, [filteredInvoices, clients, dashboard, periodStart])

  const monthlyData = useMemo(() => {
    const all = (invoices || []) as Invoice[]
    const months: Record<string, { month: string; label: string; revenue: number }> = {}
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i)
      const key = format(d, 'yyyy-MM')
      const label = format(d, 'MMM yy', { locale: fr })
      months[key] = { month: key, label, revenue: 0 }
    }
    for (const inv of all) {
      if (inv.status === 'annule') continue
      const m = format(parseISO(inv.createdAt), 'yyyy-MM')
      if (months[m]) months[m].revenue += inv.amount
    }
    return Object.values(months)
  }, [invoices])

  const maxMonthlyRevenue = useMemo(() => Math.max(...monthlyData.map(x => x.revenue), 1), [monthlyData])

  const caseTypeData = useMemo(() => {
    const all = (invoices || []) as Invoice[]
    const types: Record<string, number> = {}
    for (const inv of all) {
      if (inv.status === 'annule') continue
      const t = inv.case?.caseType || TYPE_LABELS[inv.case?.caseType as keyof typeof TYPE_LABELS] || 'Autre'
      types[t] = (types[t] || 0) + inv.amount
    }
    return Object.entries(types).sort((a, b) => b[1] - a[1]).map(([type, amount], i) => ({ type: TYPE_LABELS[type] || type, amount, color: CHART_COLORS[i % CHART_COLORS.length] }))
  }, [invoices])

  const maxCaseTypeAmount = useMemo(() => Math.max(...caseTypeData.map(x => x.amount), 1), [caseTypeData])

  const topClients = useMemo(() => {
    const all = filteredInvoices
    const map: Record<string, { name: string; total: number; count: number; lastDate: string }> = {}
    for (const inv of all) {
      if (inv.status === 'annule') continue
      const name = inv.client?.fullName || 'Inconnu'
      if (!map[inv.clientId]) map[inv.clientId] = { name, total: 0, count: 0, lastDate: inv.createdAt }
      map[inv.clientId].total += inv.amount
      map[inv.clientId].count++
      if (inv.createdAt > map[inv.clientId].lastDate) map[inv.clientId].lastDate = inv.createdAt
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
  }, [filteredInvoices])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Rapports</h2>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="h-8 text-xs"><TabsTrigger value="month" className="text-xs px-3">Ce mois</TabsTrigger><TabsTrigger value="quarter" className="text-xs px-3">Ce trimestre</TabsTrigger><TabsTrigger value="year" className="text-xs px-3">Cette année</TabsTrigger><TabsTrigger value="all" className="text-xs px-3">Tout</TabsTrigger></TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">CA total</p><p className="text-lg font-bold text-[#1E5A8A] mt-1">{fmtMoney(stats.totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">CA ce mois</p><p className="text-lg font-bold text-[#059669] mt-1">{fmtMoney(stats.monthRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Factures payées</p><p className="text-lg font-bold text-[#059669] mt-1">{stats.paidCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Factures en attente</p><p className="text-lg font-bold text-[#D97706] mt-1">{stats.pendingCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Nouveaux clients</p><p className="text-lg font-bold text-[#1E5A8A] mt-1">{stats.newClientsCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Dossiers actifs</p><p className="text-lg font-bold mt-1">{stats.activeCases}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tendance revenus mensuels</CardTitle></CardHeader><CardContent>
          {monthlyData.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune donnée</p> : (
            <div className="flex items-end gap-1.5 h-48 pt-2">
              {monthlyData.map(d => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#6B7280] font-medium">{d.revenue > 0 ? fmtMoney(d.revenue) : ''}</span>
                  <div className="w-full bg-[#F3F4F6] rounded-t relative" style={{ height: '100%' }}>
                    <div className="absolute bottom-0 w-full rounded-t transition-all duration-500" style={{ height: `${Math.max(2, (d.revenue / maxMonthlyRevenue) * 100)}%`, backgroundColor: CHART_COLORS[0] }} />
                  </div>
                  <span className="text-[9px] text-[#9CA3AF]">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Répartition par type de dossier</CardTitle></CardHeader><CardContent>
          {caseTypeData.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune donnée</p> : (
            <div className="space-y-3 pt-2">
              {caseTypeData.map(d => (
                <div key={d.type} className="flex items-center gap-3">
                  <span className="text-xs text-[#6B7280] w-24 text-right truncate">{d.type}</span>
                  <div className="flex-1 h-5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (d.amount / maxCaseTypeAmount) * 100)}%`, backgroundColor: d.color }} />
                  </div>
                  <span className="text-xs font-semibold w-28 text-right">{fmtMoney(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      </div>

      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top clients par revenus</CardTitle></CardHeader><CardContent>
        {topClients.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune donnée</p> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead className="w-12">#</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Revenu total</TableHead><TableHead className="hidden md:table-cell text-right">Factures</TableHead><TableHead className="hidden lg:table-cell">Dernière facture</TableHead>
          </TableRow></TableHeader><TableBody>
            {topClients.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs font-bold">{i + 1}</TableCell>
                <TableCell className="text-sm font-medium">{c.name}</TableCell>
                <TableCell className="text-sm font-semibold text-right">{fmtMoney(c.total)}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-right">{c.count}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-[#9CA3AF]">{fmtDate(c.lastDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>
        )}
      </CardContent></Card>
    </div>
  )
}

// ==================== AUDIT LOGS VIEW ====================
function AuditLogsView() {
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

// ==================== SETTINGS VIEW ====================
function SettingsView() {
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
  const [settingsTab, setSettingsTab] = useState<'profil'|'equipe'|'permissions'|'abonnement'|'devises'>('profil')

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

// ==================== FINANCES VIEW ====================
function FinancesView() {
  const { user } = useAppStore()

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard-finances', user?.tenantId],
    queryFn: () => fetch(`/api/dashboard?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!user?.tenantId,
  })

  const { data: paymentsData, isLoading: payLoading } = useQuery({
    queryKey: ['payments-finances', user?.tenantId],
    queryFn: () => fetch(`/api/payments?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!user?.tenantId,
  })

  const { data: overdueData, isLoading: odLoading } = useQuery({
    queryKey: ['invoices-overdue', user?.tenantId],
    queryFn: () => fetch(`/api/invoices?tenantId=${user?.tenantId}&status=non_paye`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: !!user?.tenantId,
  })

  const fin = dashData?.financial
  const payments: Payment[] = (paymentsData?.payments || paymentsData || [])
  const overdueInvoices: Invoice[] = overdueData || []
  const now = new Date()

  const overdueList = useMemo(() => {
    return overdueInvoices.filter(inv => inv.dueDate && isBefore(parseISO(inv.dueDate), now) && (inv.status === 'non_paye' || inv.status === 'partiel')).map(inv => ({
      ...inv,
      daysOverdue: differenceInDays(now, parseISO(inv.dueDate)),
    }))
  }, [overdueInvoices])

  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of payments) {
      if (!map[p.method]) map[p.method] = 0
      map[p.method] += p.amount
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [payments])

  const isLoading = dashLoading || payLoading || odLoading

  if (isLoading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-6" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h2 className="text-lg font-semibold">Finances</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[#E8F0F8] flex items-center justify-center"><TrendingUp className="size-5 text-[#1E5A8A]" /></div><div><p className="text-xs text-[#6B7280]">CA du mois</p><p className="text-lg font-bold text-[#1E5A8A]">{fmtMoney(fin?.revenueThisMonth || 0)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center"><Banknote className="size-5 text-[#059669]" /></div><div><p className="text-xs text-[#6B7280]">Encaissé ce mois</p><p className="text-lg font-bold text-[#059669]">{fmtMoney(fin?.paymentsThisMonth || 0)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center"><Clock className="size-5 text-[#D97706]" /></div><div><p className="text-xs text-[#6B7280]">À recouvrer</p><p className="text-lg font-bold text-[#D97706]">{fmtMoney(fin?.toRecover || 0)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[#FEF2F2] flex items-center justify-center"><AlertCircle className="size-5 text-[#DC2626]" /></div><div><p className="text-xs text-[#6B7280]">Impayés</p><p className="text-lg font-bold text-[#DC2626]">{fin?.overdueInvoicesCount || 0} facture{(fin?.overdueInvoicesCount || 0) !== 1 ? 's' : ''}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CreditCard className="size-4 text-[#1E5A8A]" />Paiements récents</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {payments.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucun paiement</p> : (
              <div className="max-h-96 overflow-y-auto">
                <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead className="hidden sm:table-cell">Facture</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="hidden md:table-cell">Méthode</TableHead><TableHead className="hidden lg:table-cell">Enregistré par</TableHead></TableRow></TableHeader><TableBody>
                  {payments.slice(0, 10).map((p: Payment) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm text-[#6B7280]">{fmtDate(p.paidAt)}</TableCell>
                      <TableCell className="text-sm font-medium">{p.invoice?.client?.fullName || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-[#9CA3AF]">{p.invoice?.invoiceNumber || p.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm font-medium text-right">{fmtMoney(p.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell"><div className="flex items-center gap-1.5"><span className={cn('size-2 rounded-full', PAYMENT_METHOD_COLORS[p.method] || 'bg-[#6B7280]')} /><span className="text-xs text-[#6B7280]">{PAYMENT_METHOD_LABELS[p.method] || p.method}</span></div></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-[#9CA3AF]">{p.recorder?.fullName || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Wallet className="size-4 text-[#C8A45D]" />Répartition par méthode</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {methodBreakdown.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune donnée</p> : (
              <div className="space-y-3">
                {methodBreakdown.map(([method, amount]) => {
                  const pct = payments.reduce((s, p) => s + p.amount, 0) > 0 ? (amount / payments.reduce((s, p) => s + p.amount, 0)) * 100 : 0
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className={cn('size-3 rounded-full', PAYMENT_METHOD_COLORS[method] || 'bg-[#6B7280]')} /><span className="text-xs font-medium">{PAYMENT_METHOD_LABELS[method] || method}</span></div><span className="text-xs font-semibold">{fmtMoney(amount)}</span></div>
                      <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden"><div className={cn('h-full rounded-full', PAYMENT_METHOD_COLORS[method] || 'bg-[#6B7280]')} style={{ width: pct + '%' }} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {overdueList.length > 0 && (
        <Card className="border-l-4 border-l-[#DC2626]">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#DC2626]"><AlertTriangle className="size-4" />Factures en retard ({overdueList.length})</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {overdueList.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2]">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{inv.client?.fullName || '—'}</p>
                    <p className="text-[10px] text-[#6B7280]">{inv.invoiceNumber || '—'} • {fmtDate(inv.dueDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{fmtMoney(inv.amount, inv.currency?.code || 'XAF')}</p>
                    <p className="text-[10px] font-semibold text-[#DC2626]">{inv.daysOverdue}j de retard</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== NOTIFICATIONS VIEW ====================
function NotificationsView() {
  const { user, setCurrentView } = useAppStore()
  const qc = useQueryClient()
  const [category, setCategory] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data: notifsData, isLoading } = useQuery({
    queryKey: ['notifications-view', user?.tenantId, category, unreadOnly],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (category !== 'all') p.set('category', category)
      if (unreadOnly) p.set('unreadOnly', 'true')
      return fetch(`/api/notifications?${p}`).then(r => r.json())
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => fetch(`/api/notifications?tenantId=${user?.tenantId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }).then(r => r.json()),
    onSuccess: () => { toast.success('Toutes les notifications marquées comme lues'); qc.invalidateQueries({ queryKey: ['notifications'] }) },
    onError: () => toast.error('Erreur'),
  })

  const notifications: Notification[] = notifsData?.notifications || notifsData || []
  const unreadCount = notifications.filter(n => !n.read).length

  const catTabs = [
    { value: 'all', label: 'Tous' },
    { value: 'dossier', label: 'Dossiers' },
    { value: 'echeance', label: 'Échéances' },
    { value: 'facture', label: 'Factures' },
    { value: 'document', label: 'Documents' },
    { value: 'tache', label: 'Tâches' },
    { value: 'message', label: 'Messages' },
  ]

  const catIcons: Record<string, React.ElementType> = { dossier: Briefcase, echeance: Clock, facture: Receipt, document: FileText, tache: ClipboardList, message: MessageSquare }
  const viewMap: Record<string, ViewName> = { dossier: 'cases', echeance: 'calendar', facture: 'invoices', document: 'documents', tache: 'tasks', message: 'messages' }
  const catColors: Record<string, string> = { dossier: 'text-[#926B2D]', echeance: 'text-[#D97706]', facture: 'text-[#DC2626]', document: 'text-[#6B7280]', tache: 'text-[#1E5A8A]', message: 'text-[#059669]' }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3"><h2 className="text-lg font-semibold">Notifications</h2>{unreadCount > 0 && <Badge className="bg-[#EF4444] text-white text-[10px]">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Badge>}</div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unreadCount === 0}><CheckCheck className="size-4 mr-1" />Tout marquer comme lu</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {catTabs.map(ct => (
          <Button key={ct.value} size="sm" variant={category === ct.value ? 'default' : 'outline'} className={cn('text-xs h-8', category === ct.value && 'bg-[#1E5A8A] hover:bg-[#164070]')} onClick={() => setCategory(ct.value)}>{ct.label}</Button>
        ))}
        <Button size="sm" variant={unreadOnly ? 'default' : 'outline'} className={cn('text-xs h-8', unreadOnly && 'bg-[#C8A45D] hover:bg-[#926B2D]')} onClick={() => setUnreadOnly(!unreadOnly)}>{unreadOnly ? 'Non lues uniquement' : 'Toutes'}</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        notifications.length === 0 ? <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour !" /> :
        <div className="max-h-[600px] overflow-y-auto space-y-2">
          {notifications.map(n => {
            const CatIcon = catIcons[n.category] || Bell
            const targetView = viewMap[n.category]
            return (
              <Card key={n.id} className={cn(!n.read && 'border-l-4 border-l-[#1E5A8A] bg-white', n.read && 'opacity-70')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      {!n.read && <span className="size-2 rounded-full bg-[#1E5A8A] shrink-0" />}
                      <CatIcon className={cn('size-4', catColors[n.category] || 'text-[#6B7280]')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={cn('text-sm font-medium', !n.read && 'text-[#111827]')}>{n.title}</p>
                        <Badge variant="outline" className="text-[9px] shrink-0">{n.category}</Badge>
                      </div>
                      <p className="text-xs text-[#6B7280] line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-[#9CA3AF]">{relativeTime(n.createdAt)}</span>
                        {targetView && n.resourceId && <button className="text-[10px] text-[#1E5A8A] hover:underline flex items-center gap-0.5" onClick={() => setCurrentView(targetView)}>Voir <ExternalLink className="size-2.5" /></button>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>}
    </div>
  )
}

// ==================== ARCHIVES VIEW ====================
function ArchivesView() {
  const { user } = useAppStore()

  const { data: cases, isLoading } = useQuery({
    queryKey: ['archived-cases', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}&status=archive`).then(r => r.json()),
  })

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Archives</h2>
      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (cases || []).length === 0 ? <EmptyState icon={Archive} title="Aucun dossier archivé" /> :
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {(cases || []).map((c: CaseItem) => (
            <Card key={c.id} className="opacity-80">
              <CardHeader className="pb-2"><div className="flex items-start justify-between"><CardTitle className="text-sm font-semibold">{c.reference}</CardTitle><Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS.archive)}>{STATUS_LABELS.archive}</Badge></div><CardDescription className="text-xs mt-1 line-clamp-2">{c.title}</CardDescription></CardHeader>
              <CardContent className="p-4 pt-0 space-y-1">
                <p className="text-xs text-[#6B7280]">{c.client?.fullName || '—'}</p>
                <p className="text-xs text-[#9CA3AF]">Type : {TYPE_LABELS[c.caseType] || c.caseType}</p>
                {c.closingDate && <p className="text-xs text-[#9CA3AF]">Clôture : {fmtDate(c.closingDate)}</p>}
              </CardContent>
            </Card>
          ))}
        </div>}
    </div>
  )
}

// ==================== TIME TRACKING VIEW ====================
const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string }> = {
  contrat: { label: 'Contrat', color: 'bg-[#1E5A8A] text-white' },
  conclusion: { label: 'Conclusion', color: 'bg-[#C8A45D] text-white' },
  correspondance: { label: 'Correspondance', color: 'bg-[#059669] text-white' },
  assignation: { label: 'Assignation', color: 'bg-[#DC2626] text-white' },
  general: { label: 'Général', color: 'bg-[#6B7280] text-white' },
}
const COMM_TYPE_LABELS: Record<string, string> = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' }
const COMM_TYPE_COLORS: Record<string, string> = { email: 'bg-[#1E5A8A] text-white', sms: 'bg-[#059669] text-white', whatsapp: 'bg-[#25D366] text-white' }
const COMM_STATUS_COLORS: Record<string, string> = {
  sent: 'bg-[#D1FAE5] text-[#065F46]', pending: 'bg-[#FEF3C7] text-[#92400E]', failed: 'bg-[#FEE2E2] text-[#991B1B]', bounced: 'bg-[#F3F4F6] text-[#6B7280]',
}
const COMM_STATUS_LABELS: Record<string, string> = { sent: 'Envoyé', pending: 'En attente', failed: 'Échoué', bounced: 'Rebondi' }
const QUICK_TEMPLATES = [
  { label: 'Rappel audience', content: 'Bonjour {name},\n\nNous vous rappelons que votre audience est prévue le {date} à {time} au {location}.\n\nCordialement,' },
  { label: 'Relance facture', content: 'Bonjour {name},\n\nNous vous prions de bien vouloir régler la facture n° {ref} d\'un montant de {amount} qui est arrivée à échéance le {date}.\n\nCordialement,' },
  { label: 'Demande de pièces', content: 'Bonjour {name},\n\nDans le cadre du dossier {caseRef}, nous aurions besoin des pièces suivantes :\n- {doc1}\n- {doc2}\n\nMerci de nous les transmettre dès que possible.\n\nCordialement,' },
  { label: 'Confirmation rendez-vous', content: 'Bonjour {name},\n\nNous confirmons votre rendez-vous le {date} à {time} dans nos locaux.\n\nCordialement,' },
]

function TimeTrackingView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [timerDesc, setTimerDesc] = useState('')
  const [timerCaseId, setTimerCaseId] = useState('')
  const [timerIsBillable, setTimerIsBillable] = useState(true)
  const [dateRange, setDateRange] = useState('week')
  const [filterCaseId, setFilterCaseId] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<string>('')

  const { data: cases } = useQuery({
    queryKey: ['cases-tt', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}&status=open,en_cours,en_attente`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['time-entries', user?.tenantId, dateRange, filterCaseId],
    queryFn: () => {
      const p = new URLSearchParams({ tenantId: user?.tenantId || "" })
      if (filterCaseId) p.set('caseId', filterCaseId)
      const now = new Date()
      if (dateRange === 'week') { p.set('fromDate', startOfWeek(now, { weekStartsOn: 1 }).toISOString()) }
      else if (dateRange === 'month') { p.set('fromDate', startOfMonth(now).toISOString()) }
      else if (dateRange === 'year') { p.set('fromDate', new Date(now.getFullYear(), 0, 1).toISOString()) }
      return fetch(`/api/time-entries?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
    enabled: !!user?.tenantId,
  })

  const { data: summary } = useQuery({
    queryKey: ['time-summary', user?.tenantId],
    queryFn: () => fetch(`/api/time-entries/summary?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!user?.tenantId,
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/time-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Temps enregistré'); qc.invalidateQueries({ queryKey: ['time-entries'] }); qc.invalidateQueries({ queryKey: ['time-summary'] }) },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerState])

  const handleStart = () => {
    startRef.current = new Date().toISOString()
    setElapsed(0)
    setTimerState('running')
  }
  const handlePause = () => setTimerState('paused')
  const handleResume = () => setTimerState('running')
  const handleStop = () => {
    setTimerState('idle')
    if (elapsed < 5) return
    createMut.mutate({
      tenantId: user?.tenantId, userId: user?.id,
      caseId: timerCaseId || undefined,
      description: timerDesc || 'Temps tracé',
      startTime: startRef.current,
      endTime: new Date().toISOString(),
      duration: elapsed, isBillable: timerIsBillable,
    })
    setTimerDesc('')
    setTimerCaseId('')
    setElapsed(0)
  }

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const hh = Math.floor(elapsed / 3600)
  const mm = Math.floor((elapsed % 3600) / 60)
  const ss = elapsed % 60
  const timerDisplay = `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`

  const sum = summary as TimeSummary | undefined

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h2 className="text-lg font-semibold">Suivi du Temps</h2>

      <Card className="bg-[#F5F7FA] border-[#E5E7EB]">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              {timerState === 'running' && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-red-500 animate-pulse" />}
              <span className="text-5xl md:text-6xl font-mono font-bold text-[#1E5A8A] tabular-nums tracking-wider">{timerDisplay}</span>
            </div>
            <div className="flex-1 flex flex-col gap-3 w-full max-w-md">
              <div className="flex gap-2">
                <Select value={timerCaseId} onValueChange={v => setTimerCaseId(v)} disabled={timerState === 'running'}>
                  <SelectTrigger className="h-9 text-xs flex-1"><SelectValue placeholder="Dossier lié (optionnel)" /></SelectTrigger>
                  <SelectContent>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent>
                </Select>
                <Checkbox checked={timerIsBillable} onCheckedChange={v => setTimerIsBillable(!!v)} disabled={timerState === 'running'} />
                <Label className="text-xs text-[#6B7280] whitespace-nowrap">Facturable</Label>
              </div>
              <Input value={timerDesc} onChange={e => setTimerDesc(e.target.value)} placeholder="Description du travail..." className="h-9 text-sm" disabled={timerState === 'running'} />
              <div className="flex gap-2">
                {timerState === 'idle' && <Button onClick={handleStart} className="bg-[#059669] hover:bg-[#047857] text-white" size="sm"><Play className="size-4 mr-1" />Démarrer</Button>}
                {timerState === 'running' && <><Button onClick={handlePause} variant="outline" size="sm"><Pause className="size-4 mr-1" />Pause</Button><Button onClick={handleStop} variant="destructive" size="sm"><Square className="size-4 mr-1" />Arrêter</Button></>}
                {timerState === 'paused' && <><Button onClick={handleResume} className="bg-[#059669] hover:bg-[#047857] text-white" size="sm"><Play className="size-4 mr-1" />Reprendre</Button><Button onClick={handleStop} variant="destructive" size="sm"><Square className="size-4 mr-1" />Arrêter</Button></>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Total heures (sem.)</p><p className="text-xl font-bold text-[#1E5A8A] mt-1">{fmtDuration(sum?.totalSeconds || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Heures facturables</p><p className="text-xl font-bold text-[#059669] mt-1">{fmtDuration(sum?.totalBillableSeconds || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Montant estimé</p><p className="text-xl font-bold text-[#C8A45D] mt-1">{fmtMoney(sum?.totalAmount || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#6B7280]">Entrées cette semaine</p><p className="text-xl font-bold mt-1">{sum?.totalEntries || 0}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="week">Cette semaine</SelectItem><SelectItem value="month">Ce mois</SelectItem><SelectItem value="year">Cette année</SelectItem></SelectContent>
        </Select>
        <Select value={filterCaseId} onValueChange={v => setFilterCaseId(v)}>
          <SelectTrigger className="w-[200px] h-9 text-xs"><SelectValue placeholder="Tous les dossiers" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tous les dossiers</SelectItem>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (entries || []).length === 0 ? <EmptyState icon={Timer} title="Aucune entrée de temps" description="Démarrez le timer ou ajoutez des entrées manuellement" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="hidden md:table-cell">Dossier</TableHead><TableHead>Durée</TableHead><TableHead>Facturable</TableHead><TableHead className="hidden md:table-cell text-right">Montant</TableHead>
          </TableRow></TableHeader><TableBody>
            {(entries || []).map((e: TimeEntry) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs text-[#6B7280]">{fmtDate(e.createdAt)}</TableCell>
                <TableCell className="text-sm">{e.description}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-[#6B7280]">{e.case ? `${e.case.reference}` : '—'}</TableCell>
                <TableCell className="text-sm font-medium">{fmtDuration(e.duration)}</TableCell>
                <TableCell><Badge className={cn('text-[10px]', e.isBillable ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#F3F4F6] text-[#6B7280]')}>{e.isBillable ? 'Oui' : 'Non'}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-sm text-right font-medium">{e.totalAmount ? fmtMoney(e.totalAmount) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div></CardContent></Card>}
    </div>
  )
}

// ==================== TEMPLATES VIEW ====================
function TemplatesView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [showGenerate, setShowGenerate] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [form, setForm] = useState({ name: '', category: 'general', description: '', content: '', variables: '', isActive: true })
  const [genVars, setGenVars] = useState<Record<string, string>>({})
  const [genCaseId, setGenCaseId] = useState('')
  const [genClientId, setGenClientId] = useState('')

  const { data: templates, isLoading } = useQuery({
    queryKey: ['doc-templates', user?.tenantId, catFilter],
    queryFn: () => {
      const p = new URLSearchParams({ tenantId: user?.tenantId || "" })
      if (catFilter !== 'all') p.set('category', catFilter)
      return fetch(`/api/document-templates?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
    enabled: !!user?.tenantId,
  })

  const { data: cases } = useQuery({
    queryKey: ['cases-tpl', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: showGenerate !== null,
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-tpl', user?.tenantId],
    queryFn: () => fetch(`/api/clients?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    enabled: showGenerate !== null,
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/document-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Modèle créé'); setShowCreate(false); resetForm(); qc.invalidateQueries({ queryKey: ['doc-templates'] }) },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => fetch(`/api/document-templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success('Modèle mis à jour'); setEditId(null); resetForm(); qc.invalidateQueries({ queryKey: ['doc-templates'] }) },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch('/api/document-templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { toast.success('Modèle supprimé'); qc.invalidateQueries({ queryKey: ['doc-templates'] }) },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const resetForm = () => setForm({ name: '', category: 'general', description: '', content: '', variables: '', isActive: true })

  const openEdit = (t: DocTemplate) => {
    let vars = ''
    try { vars = t.variables ? JSON.parse(t.variables).join(', ') : '' } catch { vars = t.variables || '' }
    setForm({ name: t.name, category: t.category, description: t.description || '', content: t.content, variables: vars, isActive: t.isActive })
    setEditId(t.id)
  }

  const openGenerate = (t: DocTemplate) => {
    setShowGenerate(t.id)
    setGenCaseId('')
    setGenClientId('')
    const vars: Record<string, string> = {}
    try { (t.variables ? JSON.parse(t.variables) : []).forEach((v: string) => { vars[v] = '' }) } catch {}
    setGenVars(vars)
  }

  const handleSave = () => {
    const vars = form.variables ? form.variables.split(',').map(v => v.trim()).filter(Boolean) : []
    const body = { ...form, variables: JSON.stringify(vars), tenantId: user?.tenantId }
    if (editId) updateMut.mutate({ id: editId, body })
    else createMut.mutate(body)
  }

  const previewTemplate = templates?.find((t: DocTemplate) => t.id === showPreview)
  const generateTemplate = templates?.find((t: DocTemplate) => t.id === showGenerate)

  const generatePreview = useMemo(() => {
    if (!generateTemplate) return ''
    let result = generateTemplate.content
    for (const [key, val] of Object.entries(genVars)) {
      result = result.replaceAll(`{{${key}}}`, val || `{{${key}}}`)
    }
    return result
  }, [generateTemplate, genVars])

  const getVarCount = (t: DocTemplate) => {
    try { return t.variables ? JSON.parse(t.variables).length : 0 } catch { return 0 }
  }

  const highlightVars = (text: string) => {
    const parts = text.split(/({{[^}]+}})/g)
    return parts.map((p, i) => /{{[^}]+}}/.test(p) ? <span key={i} className="bg-[#C8A45D]/20 text-[#C8A45D] font-semibold px-0.5 rounded">{p}</span> : p)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Modèles de Documents</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}><BookOpen className="size-4" /></Button>
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true) }}><Plus className="size-4 mr-1" />Nouveau modèle</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'contrat', 'conclusion', 'correspondance', 'assignation', 'general'].map(cat => (
          <Button key={cat} variant={catFilter === cat ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setCatFilter(cat)}>
            {cat === 'all' ? 'Tous' : TEMPLATE_CATEGORIES[cat]?.label || cat}
          </Button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (templates || []).length === 0 ? <EmptyState icon={FileCode2} title="Aucun modèle" description="Créez votre premier modèle de document" /> :
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(templates || []).map((t: DocTemplate) => {
              const cat = TEMPLATE_CATEGORIES[t.category]
              return (
                <Card key={t.id} className={!t.isActive ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => setShowPreview(t.id)}><Eye className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openGenerate(t)}><Sparkles className="size-3.5" /></Button>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}><Edit className="size-3.5 mr-2" />Modifier</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="size-3.5 mr-2" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent></DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {cat && <Badge className={cn('text-[10px]', cat.color)}>{cat.label}</Badge>}
                      {getVarCount(t) > 0 && <Badge variant="outline" className="text-[10px]"><Hash className="size-2.5 mr-0.5" />{getVarCount(t)} variables</Badge>}
                      <Badge variant="outline" className={cn('text-[10px]', t.isActive ? 'text-[#059669]' : 'text-[#9CA3AF]')}>{t.isActive ? 'Actif' : 'Inactif'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {t.description && <p className="text-xs text-[#6B7280] line-clamp-2">{t.description}</p>}
                    <p className="text-[10px] text-[#9CA3AF]">Modifié {relativeTime(t.updatedAt)}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
            <Table><TableHeader><TableRow>
              <TableHead>Nom</TableHead><TableHead className="hidden md:table-cell">Catégorie</TableHead><TableHead className="hidden lg:table-cell">Variables</TableHead><TableHead>Statut</TableHead><TableHead className="hidden md:table-cell">Modifié</TableHead><TableHead className="w-[100px]">Actions</TableHead>
            </TableRow></TableHeader><TableBody>
              {(templates || []).map((t: DocTemplate) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-medium">{t.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{TEMPLATE_CATEGORIES[t.category] && <Badge className={cn('text-[10px]', TEMPLATE_CATEGORIES[t.category].color)}>{TEMPLATE_CATEGORIES[t.category].label}</Badge>}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-[#6B7280]">{getVarCount(t)}</TableCell>
                  <TableCell><Badge variant="outline" className={cn('text-[10px]', t.isActive ? 'text-[#059669]' : 'text-[#9CA3AF]')}>{t.isActive ? 'Actif' : 'Inactif'}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-[#9CA3AF]">{fmtDate(t.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(t)}><Edit className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="size-3.5 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div></CardContent></Card>
        )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={v => { if (!v) { setShowCreate(false); setEditId(null); resetForm() } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Modifier le modèle' : 'Nouveau modèle'}</DialogTitle><DialogDescription>Remplissez les champs ci-dessous</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Nom</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom du modèle" className="h-9 text-sm" /></div>
              <div className="space-y-2"><Label className="text-xs">Catégorie</Label><Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TEMPLATE_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optionnel)" className="text-sm min-h-[60px]" /></div>
            <div className="space-y-2"><Label className="text-xs">Contenu <span className="text-[#9CA3AF]">(utilisez {'{{variable}}'} pour les variables)</span></Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Contenu du modèle..." className="text-sm font-mono min-h-[200px]" /></div>
            <div className="space-y-2"><Label className="text-xs">Variables <span className="text-[#9CA3AF]">(séparées par des virgules)</span></Label><Input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} placeholder="nom, date, montant" className="h-9 text-sm" /></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v as boolean }))} /><Label className="text-xs">Modèle actif</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditId(null); resetForm() }}>Annuler</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.content || createMut.isPending || updateMut.isPending}>{editId ? 'Mettre à jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Aperçu : {previewTemplate?.name}</DialogTitle></DialogHeader>
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 text-sm leading-relaxed whitespace-pre-wrap">{previewTemplate ? highlightVars(previewTemplate.content) : ''}</div>
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={!!showGenerate} onOpenChange={() => setShowGenerate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Générer depuis : {generateTemplate?.name}</DialogTitle><DialogDescription>Remplissez les variables pour générer le document</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Dossier</Label><Select value={genCaseId} onValueChange={setGenCaseId}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner un dossier" /></SelectTrigger><SelectContent>{(cases || []).map((c: CaseItem) => <SelectItem key={c.id} value={c.id}>{c.reference} — {c.title}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label className="text-xs">Client</Label><Select value={genClientId} onValueChange={setGenClientId}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger><SelectContent>{(clients || []).map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {Object.keys(genVars).length > 0 && <div className="space-y-3">{Object.entries(genVars).map(([key, val]) => (
              <div key={key} className="space-y-1"><Label className="text-xs font-medium">{'{{'}{key}{'}}'}</Label><Input value={val} onChange={e => setGenVars(g => ({ ...g, [key]: e.target.value }))} placeholder={`Valeur pour ${key}`} className="h-9 text-sm" /></div>
            ))}</div>}
            <div className="space-y-2"><Label className="text-xs font-semibold">Aperçu généré</Label><div className="bg-white rounded-lg border border-[#E5E7EB] p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">{highlightVars(generatePreview)}</div></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(null)}>Fermer</Button>
            <Button onClick={() => { navigator.clipboard.writeText(generatePreview); toast.success('Copié dans le presse-papiers') }}><Copy className="size-4 mr-1" />Copier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== COMMUNICATIONS VIEW ====================
function CommunicationsView() {
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
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="size-10 rounded-lg bg-[#1E5A8A]/10 flex items-center justify-center"><Mail className="size-5 text-[#1E5A8A]" /></div><div><p className="text-xs text-[#6B7280]">Emails envoyés</p><p className="text-lg font-bold text-[#1E5A8A]">{summary.totalEmails}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="size-10 rounded-lg bg-[#059669]/10 flex items-center justify-center"><MessageCircle className="size-5 text-[#059669]" /></div><div><p className="text-xs text-[#6B7280]">SMS envoyés</p><p className="text-lg font-bold text-[#059669]">{summary.totalSms}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="size-10 rounded-lg bg-[#C8A45D]/10 flex items-center justify-center"><MailCheck className="size-5 text-[#C8A45D]" /></div><div><p className="text-xs text-[#6B7280]">Taux d'envoi réussi</p><p className="text-lg font-bold text-[#C8A45D]">{summary.successRate}%</p></div></CardContent></Card>
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
                <TableCell className="text-xs text-[#6B7280]">{fmtDateTime(c.sentAt || c.createdAt)}</TableCell>
                <TableCell><Badge className={cn('text-[10px]', COMM_TYPE_COLORS[c.type])}><span className="flex items-center gap-1">{typeIcon(c.type)}{COMM_TYPE_LABELS[c.type] || c.type}</span></Badge></TableCell>
                <TableCell className="text-sm">{c.client?.fullName || c.recipientEmail || c.recipientPhone || '—'}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-[#6B7280] truncate max-w-[200px]">{c.subject || c.content.slice(0, 50)}</TableCell>
                <TableCell><Badge className={cn('text-[10px]', COMM_STATUS_COLORS[c.status])}>{COMM_STATUS_LABELS[c.status] || c.status}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-[#9CA3AF]">{c.sentBy?.fullName || '—'}</TableCell>
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
                  {COMM_TYPE_LABELS[t]}
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

// ==================== ADMIN VIEWS ====================
function AdminDashboardView() {
  const { data, isLoading } = useQuery<AdminDashboardData>({ queryKey: ['admin-dashboard'], queryFn: () => fetch('/api/admin/dashboard').then(r => r.json()) })
  if (isLoading) return <div className='p-6 space-y-4'><div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className='h-24 rounded-xl' />)}</div></div>
  if (!data) return <EmptyState icon={ShieldCheck} title='Erreur de chargement' />
  const months = Object.entries(data.signupsByMonth || {}).slice(-12)
  const maxMonth = Math.max(...months.map(([, v]) => v), 1)
  const maxPlan = Math.max(...(data.tenantsByPlan || []).map(p => p._count.id), 1)
  const maxRole = Math.max(...(data.usersByRole || []).map(r => r._count.id), 1)
  const kpis = [
    { label: 'Cabinets actifs', value: data.activeTenants, icon: BuildingIcon, color: 'text-[#1E5A8A]' },
    { label: 'Utilisateurs actifs', value: data.activeUsers, icon: UsersRound, color: 'text-[#059669]' },
    { label: 'Dossiers actifs', value: data.activeCases, icon: Briefcase, color: 'text-[#C8A45D]' },
    { label: 'Clients', value: data.totalClients, icon: Users, color: 'text-[#7C3AED]' },
    { label: 'CA total', value: fmtMoney(data.totalRevenue), icon: TrendingUp, color: 'text-[#1E5A8A]' },
    { label: 'CA ce mois', value: fmtMoney(data.thisMonthRevenue), icon: DollarSign, color: 'text-[#059669]' },
  ]
  return (<div className='p-6 space-y-6'>
    <div className='flex items-center gap-2'><Crown className='size-5 text-[#C8A45D]' /><h2 className='text-lg font-bold text-[#111827]'>Administration</h2></div>
    <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'>
      {kpis.map(k => (<Card key={k.label} className='p-4'><div className='flex items-center gap-3'><div className={cn('p-2 rounded-lg bg-[#F3F4F6]', k.color)}><k.icon className='size-4' /></div><div><p className='text-xs text-[#9CA3AF]'>{k.label}</p><p className='text-lg font-bold text-[#111827]'>{k.value}</p></div></div></Card>))}
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
      <Card className='lg:col-span-2 p-4'><CardTitle className='text-sm font-semibold mb-4'>Inscriptions par mois</CardTitle>
        <div className='flex items-end gap-2 h-40'>{months.map(([m, v]) => (<div key={m} className='flex-1 flex flex-col items-center gap-1'><span className='text-[10px] text-[#6B7280]'>{v}</span><div className='w-full bg-[#C8A45D] rounded-t' style={{ height: `${Math.max((v / maxMonth) * 120, 2)}px` }} /><span className='text-[9px] text-[#9CA3AF] truncate w-full text-center'>{m}</span></div>))}</div>
      </Card>
      <Card className='p-4'><CardTitle className='text-sm font-semibold mb-3'>Cabinets récents</CardTitle>
        <div className='space-y-3'>{(data.recentTenants || []).slice(0, 5).map(t => (<div key={t.id} className='flex items-center justify-between'><div><p className='text-sm font-medium text-[#111827]'>{t.name}</p><p className='text-xs text-[#9CA3AF]'>{t._count.users} utilisateur{t._count.users > 1 ? 's' : ''} · {fmtDate(t.createdAt)}</p></div>{t.subscription?.plan && <Badge className='bg-[#E8F0F8] text-[#1E5A8A] text-[10px]'>{t.subscription.plan.name}</Badge>}</div>))}</div>
      </Card>
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      <Card className='p-4'><CardTitle className='text-sm font-semibold mb-4'>Distribution par plan</CardTitle>
        <div className='space-y-3'>{(data.tenantsByPlan || []).map(p => (<div key={p.plan}><div className='flex justify-between text-xs mb-1'><span className='text-[#374151]'>{p.plan}</span><span className='text-[#6B7280]'>{p._count.id}</span></div><div className='h-2 bg-[#F3F4F6] rounded-full overflow-hidden'><div className='h-full bg-[#C8A45D] rounded-full' style={{ width: `${(p._count.id / maxPlan) * 100}%` }} /></div></div>))}</div>
      </Card>
      <Card className='p-4'><CardTitle className='text-sm font-semibold mb-4'>Distribution par rôle</CardTitle>
        <div className='space-y-3'>{(data.usersByRole || []).map(r => (<div key={r.role}><div className='flex justify-between text-xs mb-1'><span className='text-[#374151]'>{ROLE_LABELS[r.role] || r.role}</span><span className='text-[#6B7280]'>{r._count.id}</span></div><div className='h-2 bg-[#F3F4F6] rounded-full overflow-hidden'><div className='h-full bg-[#1E5A8A] rounded-full' style={{ width: `${(r._count.id / maxRole) * 100}%` }} /></div></div>))}</div>
      </Card>
    </div>
  </div>)
}

function AdminCabinsView() {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
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
  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '', email: '', phone: '', address: '', city: '', country: '', niu: '', plan: 'starter', maxUsers: 5, maxStorageGb: 5, isActive: true }); setDialogOpen(true) }
  const openEdit = (t: AdminTenant) => { setEditing(t); setForm({ name: t.name, slug: t.slug, email: t.email || '', phone: t.phone || '', address: t.address || '', city: t.city || '', country: t.country || '', niu: t.niu || '', plan: t.plan, maxUsers: t.maxUsers, maxStorageGb: t.maxStorageGb, isActive: t.isActive }); setDialogOpen(true) }
  const genSlug = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const kpis = [
    { label: 'Cabinets actifs', value: totalActive, icon: BuildingIcon, color: 'text-[#1E5A8A]', bg: 'bg-[#E8F0F8]', ring: 'ring-[#1E5A8A]/10' },
    { label: 'Cabinets inactifs', value: totalInactive, icon: Archive, color: 'text-[#9CA3AF]', bg: 'bg-[#F3F4F6]', ring: 'ring-[#9CA3AF]/10' },
    { label: 'Total utilisateurs', value: totalUsers, icon: Users, color: 'text-[#059669]', bg: 'bg-[#D1FAE5]', ring: 'ring-[#059669]/10' },
    { label: 'Total dossiers', value: totalCases, icon: Briefcase, color: 'text-[#C8A45D]', bg: 'bg-[#F5F0E3]', ring: 'ring-[#C8A45D]/10' },
    { label: 'Total clients', value: totalClients, icon: UserCircle, color: 'text-[#7C3AED]', bg: 'bg-[#EDE9FE]', ring: 'ring-[#7C3AED]/10' },
    { label: 'Types de forfaits', value: Object.keys(plansMap).length, icon: CreditCardIcon, color: 'text-[#D97706]', bg: 'bg-[#FEF3C7]', ring: 'ring-[#D97706]/10' },
  ]
  return (<div className='p-6 space-y-6'>
    <div className='flex items-center justify-between flex-wrap gap-3'>
      <div>
        <h2 className='text-lg font-bold text-[#111827]'>Cabinets</h2>
        <p className='text-xs text-[#9CA3AF] mt-0.5'>{allTenants.length} cabinet{allTenants.length !== 1 ? 's' : ''} enregistré{allTenants.length !== 1 ? 's' : ''} au total</p>
      </div>
      <Button onClick={openCreate} className='bg-[#1E5A8A] hover:bg-[#164070] text-white'><BuildingIcon className='size-4 mr-2' />Nouveau cabinet</Button>
    </div>

    {/* KPI Cards */}
    <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'>
      {kpis.map((k, i) => (
        <Card key={i} className='relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='flex items-start justify-between mb-3'>
              <div className={cn('p-2.5 rounded-xl ring-1', k.bg, k.ring)}><k.icon className={cn('size-5', k.color)} /></div>
              <div className={cn('size-2 rounded-full mt-1', k.value > 0 ? 'bg-[#059669]' : 'bg-[#E5E7EB]')} title={k.value > 0 ? 'Données disponibles' : 'Aucune donnée'} />
            </div>
            <p className={cn('text-2xl font-bold tracking-tight', k.color)}>{k.value.toLocaleString('fr-FR')}</p>
            <p className='text-[11px] text-[#9CA3AF] mt-1 font-medium'>{k.label}</p>
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
          const planColors: Record<string, string> = { starter: 'bg-[#9CA3AF]', standard: 'bg-[#1E5A8A]', premium: 'bg-[#C8A45D]', entreprise: 'bg-[#7C3AED]', professional: 'bg-[#059669]', free: 'bg-[#D1D5DB]' }
          return (<div key={plan} className='flex items-center gap-3'><span className='text-xs text-[#374151] w-28 truncate'>{plan}</span><div className='flex-1 h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden'><div className={cn('h-full rounded-full transition-all', planColors[plan] || 'bg-[#1E5A8A]')} style={{ width: pct + '%' }} /></div><span className='text-xs font-medium text-[#374151] w-16 text-right'>{count} ({pct}%)</span></div>)
        })}
        {Object.keys(plansMap).length === 0 && <p className='text-xs text-[#9CA3AF] text-center py-4'>Aucun cabinet</p>}
      </CardContent></Card>
      <Card><CardHeader className='pb-3'><CardTitle className='text-sm font-semibold'>Top 3 cabinets par dossiers</CardTitle></CardHeader><CardContent className='space-y-3'>
        {topByCases.map((t, i) => (<div key={t.id} className='flex items-center gap-3 p-3 rounded-lg bg-[#F9FAFB]'><div className={cn('flex items-center justify-center size-8 rounded-full text-sm font-bold', i === 0 ? 'bg-[#C8A45D] text-white' : i === 1 ? 'bg-[#9CA3AF] text-white' : 'bg-[#CD7F32] text-white')}>{i + 1}</div><div className='flex-1 min-w-0'><p className='text-sm font-medium text-[#111827] truncate'>{t.name}</p><p className='text-[10px] text-[#9CA3AF]'>{t._count?.users ?? 0} utilisateurs · {t.subscription?.plan?.name || t.plan}</p></div><div className='text-right'><p className='text-lg font-bold text-[#1E5A8A]'>{t._count?.cases ?? 0}</p><p className='text-[10px] text-[#9CA3AF]'>dossiers</p></div></div>))}
        {topByCases.length === 0 && <p className='text-xs text-[#9CA3AF] text-center py-4'>Aucun cabinet</p>}
      </CardContent></Card>
    </div>

    {/* Search + Table */}
    <div className='flex items-center gap-3 flex-wrap'>
      <div className='relative flex-1 min-w-[200px] max-w-sm'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]' /><Input placeholder='Rechercher…' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9' /></div>
      <label className='flex items-center gap-2 text-sm text-[#374151] cursor-pointer'><Switch checked={showInactive} onCheckedChange={setShowInactive} /><span>Voir inactifs</span></label>
    </div>
    {isLoading ? <div className='space-y-2'>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-12' />)}</div> :
    <Card><CardContent className='p-0'><div className='max-h-[480px] overflow-y-auto'><Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className='hidden sm:table-cell'>Plan</TableHead><TableHead>Utilisateurs</TableHead><TableHead>Dossiers</TableHead><TableHead className='hidden md:table-cell'>Clients</TableHead><TableHead className='hidden lg:table-cell'>Factures</TableHead><TableHead className='hidden lg:table-cell'>Créé le</TableHead><TableHead className='w-[80px]'>Actions</TableHead></TableRow></TableHeader><TableBody>
      {tenants.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={BuildingIcon} title='Aucun cabinet' /></TableCell></TableRow> :
      tenants.map(t => (<TableRow key={t.id} className='cursor-pointer hover:bg-[#F9FAFB]'><TableCell><div className='flex items-center gap-2'><div className={cn('size-2 rounded-full shrink-0', t.isActive ? 'bg-[#059669]' : 'bg-[#D1D5DB]')} /><div><span className='font-medium text-[#111827]'>{t.name}</span>{t.city && <p className='text-[10px] text-[#9CA3AF]'>{t.city}{t.country ? `, ${t.country}` : ''}</p>}</div></div></TableCell><TableCell className='hidden sm:table-cell'><Badge className='bg-[#E8F0F8] text-[#1E5A8A] text-xs'>{t.subscription?.plan?.name || t.plan}</Badge></TableCell><TableCell><div className='flex items-center gap-1.5'><Users className='size-3 text-[#9CA3AF]' /><span className='text-sm font-medium'>{t._count?.users ?? 0}</span></div></TableCell><TableCell><div className='flex items-center gap-1.5'><Briefcase className='size-3 text-[#9CA3AF]' /><span className='text-sm font-medium'>{t._count?.cases ?? 0}</span></div></TableCell><TableCell className='hidden md:table-cell text-sm text-[#6B7280]'>{t._count?.clients ?? 0}</TableCell><TableCell className='hidden lg:table-cell text-sm text-[#6B7280]'>{t._count?.invoices ?? 0}</TableCell><TableCell className='hidden lg:table-cell text-xs text-[#6B7280]'>{fmtDate(t.createdAt)}</TableCell><TableCell><div className='flex items-center gap-1'><Button variant='ghost' size='icon' className='size-7' onClick={() => openEdit(t)}><Edit className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[#DC2626]' onClick={() => delMut.mutate(t.id)}><Trash2 className='size-3.5' /></Button></div></TableCell></TableRow>))}
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
      <DialogFooter><Button variant='outline' onClick={() => setDialogOpen(false)}>Annuler</Button><Button className='bg-[#1E5A8A] hover:bg-[#164070] text-white' disabled={!form.name || saveMut.isPending} onClick={() => saveMut.mutate(form)}>{saveMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : (editing ? 'Modifier' : 'Créer')}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>)
}

function AdminUsersView() {
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
      <h2 className='text-lg font-bold text-[#111827]'>Utilisateurs</h2>
      <Button onClick={openCreate} className='bg-[#1E5A8A] hover:bg-[#164070] text-white'><UserPlus className='size-4 mr-2' />Nouvel utilisateur</Button>
    </div>
    <div className='flex items-center gap-3 flex-wrap'>
      <div className='relative flex-1 min-w-[200px] max-w-sm'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]' /><Input placeholder='Rechercher…' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9' /></div>
      <Select value={roleFilter} onValueChange={v => setRoleFilter(v)}><SelectTrigger className='w-[160px] h-9'><SelectValue placeholder='Rôle' /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
      <label className='flex items-center gap-2 text-sm text-[#374151] cursor-pointer'><Switch checked={showInactive} onCheckedChange={setShowInactive} /><span>Voir inactifs</span></label>
    </div>
    {isLoading ? <div className='space-y-2'>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-12' />)}</div> :
    <Card><Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Rôle</TableHead><TableHead>Cabinet</TableHead><TableHead>Statut</TableHead><TableHead>Dernière connexion</TableHead><TableHead className='w-[100px]'>Actions</TableHead></TableRow></TableHeader><TableBody>
      {users.length === 0 ? <TableRow><TableCell colSpan={7}><EmptyState icon={UsersRound} title='Aucun utilisateur' /></TableCell></TableRow> :
      users.map(u => (<TableRow key={u.id}><TableCell><div className='flex items-center gap-2'><Avatar className='size-7'><AvatarFallback className='bg-[#1E5A8A] text-white text-[10px]'>{initials(u.fullName)}</AvatarFallback></Avatar><span className='font-medium text-[#111827]'>{u.fullName}</span>{u.role === 'root_admin' && <Crown className='size-3.5 text-[#C8A45D]' />}</div></TableCell><TableCell className='text-[#6B7280]'>{u.email}</TableCell><TableCell><Badge className='bg-[#F3F4F6] text-[#374151] text-xs'>{ROLE_LABELS[u.role] || u.role}</Badge></TableCell><TableCell className='text-[#6B7280]'>{u.tenant?.name || '—'}</TableCell><TableCell><Badge className={cn('text-xs', u.isActive ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]')}>{u.isActive ? 'Actif' : 'Inactif'}</Badge></TableCell><TableCell className='text-[#6B7280] text-xs'>{fmtDateTime((u as UserItem & { lastLogin?: string }).lastLogin)}</TableCell><TableCell><div className='flex items-center gap-1'><Button variant='ghost' size='icon' className='size-7' onClick={() => openEdit(u as UserItem & { tenant?: { id: string; name: string } })}><Edit className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[#1E5A8A] hover:text-[#164070]' onClick={() => openPwDialog(u)}><Lock className='size-3.5' /></Button>{u.role !== 'root_admin' && <><Button variant='ghost' size='icon' className={cn('size-7', u.isActive ? 'text-[#F59E0B]' : 'text-[#059669]')} onClick={() => toggleMut.mutate(u)}><ArrowUpDown className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[#DC2626]' onClick={() => delMut.mutate(u.id)}><Trash2 className='size-3.5' /></Button></>}</div></TableCell></TableRow>))}
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
      <DialogFooter><Button variant='outline' onClick={() => setDialogOpen(false)}>Annuler</Button><Button className='bg-[#1E5A8A] hover:bg-[#164070] text-white' disabled={(!form.fullName || !form.email || (!editing && !form.password)) || saveMut.isPending} onClick={() => saveMut.mutate(form)}>{saveMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : (editing ? 'Modifier' : 'Créer')}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}><DialogContent className='max-w-sm'><DialogHeader><DialogTitle>Modifier le mot de passe</DialogTitle><DialogDescription>Pour : <span className='font-semibold'>{pwTarget?.fullName}</span></DialogDescription></DialogHeader>
      <div className='space-y-3'>
        <div><Label>Nouveau mot de passe *</Label><Input type='password' value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder='Min. 6 caractères' /></div>
        <div><Label>Confirmer *</Label><Input type='password' value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder='••••••••' /></div>
        {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && <p className='text-xs text-[#DC2626]'>Les mots de passe ne correspondent pas</p>}
      </div>
      <DialogFooter><Button variant='outline' onClick={() => setPwDialogOpen(false)}>Annuler</Button><Button className='bg-[#1E5A8A] hover:bg-[#164070] text-white' disabled={adminChangePw.isPending || !pwForm.newPassword || pwForm.newPassword.length < 6 || pwForm.newPassword !== pwForm.confirmPassword} onClick={() => pwTarget && adminChangePw.mutate({ userId: pwTarget.id, newPassword: pwForm.newPassword })}>{adminChangePw.isPending ? <RefreshCw className='size-4 animate-spin' /> : <Check className='size-4 mr-1.5' />}Modifier</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>)
}

function AdminPlansView() {
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
      <h2 className='text-lg font-bold text-[#111827]'>Abonnements</h2>
      <Button onClick={openCreate} className='bg-[#1E5A8A] hover:bg-[#164070] text-white'><CreditCardIcon className='size-4 mr-2' />Nouveau forfait</Button>
    </div>
    {isLoading ? <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-72 rounded-xl' />)}</div> :
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {(plans || []).map((p: any) => (<Card key={p.id} className={cn('p-5 flex flex-col', !p.isActive && 'opacity-60')}><div className='flex items-start justify-between mb-3'><div><h3 className='text-base font-bold text-[#111827]'>{p.name}</h3><p className='text-xs text-[#9CA3AF] mt-0.5'>{p.description || ''}</p></div><div className='flex items-center gap-1'><Button variant='ghost' size='icon' className='size-7' onClick={() => openEdit(p)}><Edit className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[#DC2626]' onClick={() => delMut.mutate(p.id)}><Trash2 className='size-3.5' /></Button></div></div>
        <div className='mb-3'><span className='text-2xl font-bold text-[#1E5A8A]'>{fmtMoney(p.priceAnnual)}</span><span className='text-xs text-[#9CA3AF]'>/an</span></div>
        {p.priceMonthly > 0 && <p className='text-[10px] text-[#9CA3AF] mb-3'>{fmtMoney(p.priceMonthly)}/mois · {fmtMoney(p.priceQuarterly || 0)}/trimestre · {fmtMoney(p.priceSemiAnnual || 0)}/semestre</p>}
        <div className='flex-1 space-y-1.5 mb-4'>{(parseFeatures(p.features) || []).slice(0, 6).map((f: string, i: number) => (<div key={i} className='flex items-center gap-2 text-xs text-[#374151]'><CheckCircle2 className='size-3 text-[#059669] shrink-0' /><span>{f}</span></div>))}</div>
        <div className='flex items-center gap-2 flex-wrap'><Badge className='bg-[#E8F0F8] text-[#1E5A8A] text-[10px]'>{p.maxUsers} utilisateurs</Badge><Badge className='bg-[#F3F4F6] text-[#6B7280] text-[10px]'>{p.maxStorageGb} Go</Badge>{p.hasAI && <Badge className='bg-[#C8A45D] text-white text-[10px]'>IA</Badge>}<Badge className={cn('text-[10px]', p.isActive ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]')}>{p.isActive ? 'Actif' : 'Inactif'}</Badge></div>
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
      <DialogFooter><Button variant='outline' onClick={() => setDialogOpen(false)}>Annuler</Button><Button className='bg-[#1E5A8A] hover:bg-[#164070] text-white' disabled={!form.name || saveMut.isPending} onClick={() => saveMut.mutate(form)}>{saveMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : (editing ? 'Modifier' : 'Créer')}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>)
}

// ==================== FOOTER ====================
function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E5E7EB] py-4 px-6 flex items-center justify-between text-xs text-[#9CA3AF]">
      <span className="flex items-center gap-1.5"><img src="/icon.png" alt="" className="size-3.5 rounded-sm" />JurisLink</span>
      <span>v3.8.65</span>
    </footer>
  )
}

// ==================== ADMIN ROUTER ====================
function AdminRouter() {
  const { currentView } = useAppStore()
  switch (currentView) {
    case 'admin-dashboard': return <AdminDashboardView />
    case 'admin-cabinets': return <AdminCabinsView />
    case 'admin-users': return <AdminUsersView />
    case 'admin-plans': return <AdminPlansView />
    case 'settings': return <SettingsView />
    default: return <AdminDashboardView />
  }
}

// ==================== DASHBOARD ROUTER ====================
function DashboardRouter() {
  const { currentView } = useAppStore()
  switch (currentView) {
    case 'dashboard': return <DashboardView />
    case 'cases': return <CasesView />
    case 'clients': return <ClientsView />
    case 'tasks': return <TasksView />
    case 'documents': return <DocumentsView />
    case 'calendar': return <CalendarView />
    case 'invoices': return <InvoicesView />
    case 'finances': return <FinancesView />
    case 'time-tracking': return <TimeTrackingView />
    case 'templates': return <TemplatesView />
    case 'communications': return <CommunicationsView />
    case 'messages': return <MessagesView />
    case 'reports': return <ReportsView />
    case 'audit-logs': return <AuditLogsView />
    case 'settings': return <SettingsView />
    case 'archives': return <ArchivesView />
    case 'notifications': return <NotificationsView />
    default: return <DashboardView />
  }
}

// ==================== MAIN APP ====================
function AppInner() {
  const { isAuthenticated, user } = useAppStore()
  const isRootAdmin = user?.role === 'root_admin'
  const needsTenant = isAuthenticated && !user?.tenantId && !isRootAdmin
  if (!isAuthenticated) return <LoginPage />
  if (needsTenant) return (
    <div className='flex-1 flex items-center justify-center p-4'>
      <Card className='max-w-md w-full'>
        <CardHeader className='text-center'>
          <Building2 className='mx-auto size-12 text-[#C8A45D] mb-2' />
          <CardTitle>Configuration requise</CardTitle>
          <CardDescription>Vous n'êtes pas encore assigné à un cabinet. Contactez l'administrateur.</CardDescription>
        </CardHeader>
        <CardFooter className='justify-center'>
          <Button variant='outline' onClick={() => { localStorage.clear(); window.location.reload() }}>Se déconnecter</Button>
        </CardFooter>
      </Card>
    </div>
  )
  if (isRootAdmin) return (
    <>
      <AdminSidebar />
      <div className='lg:pl-[260px] flex-1 flex flex-col'>
        <AdminHeader />
        <main className='flex-1'><AdminRouter /></main>
        <Footer />
      </div>
    </>
  )
  return (
    <>
      <Sidebar />
      <div className='lg:pl-[260px] flex-1 flex flex-col'>
        <Header />
        <main className='flex-1'><DashboardRouter /></main>
        <Footer />
      </div>
    </>
  )
}

export default function App() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id) }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className='min-h-screen flex flex-col bg-[#F5F7FA]'>
          <div className='flex-1 flex flex-col'>
            {!mounted ? (
              <div className='flex-1 flex items-center justify-center bg-[#F5F7FA]'>
                <div className='flex flex-col items-center gap-3'>
                  <img src='/splash.png' alt='JurisLink' className='h-12 w-auto object-contain animate-pulse' />
                  <p className='text-sm text-[#9CA3AF]'>Chargement…</p>
                </div>
              </div>
            ) : <AppInner />}
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
