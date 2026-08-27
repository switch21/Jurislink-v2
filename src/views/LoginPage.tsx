'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'
import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== Login Page ====================
export function LoginPage() {
  const { login, portalLogin } = useAppStore()
  const [tab, setTab] = useState<'cabinet' | 'portal'>('cabinet')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [portalEmail, setPortalEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [portalShowPw, setPortalShowPw] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const handleCabinetSubmit = async (e: React.FormEvent) => {
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

  const handlePortalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!portalEmail) { toast.error('Veuillez entrer votre email'); return }
    if (!portalPassword) { toast.error('Veuillez entrer votre mot de passe'); return }
    setPortalLoading(true)
    try {
      const res = await fetch('/api/portal/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: portalEmail, password: portalPassword }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur de connexion au portail'); return }
      portalLogin(data); toast.success(`Bienvenue, ${data.client?.fullName || data.email} !`)
    } catch { toast.error('Erreur de connexion au serveur') } finally { setPortalLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <Card className="rounded-2xl shadow-sm border border-[var(--border)] bg-[var(--bg-card)]">
          <Tabs value={tab} onValueChange={v => setTab(v as 'cabinet' | 'portal')}>
            <div className="flex border-b border-[var(--border)]">
              <button onClick={() => setTab('cabinet')} className={cn('flex-1 py-3.5 text-sm font-semibold text-center transition-colors border-b-2 -mb-px', tab === 'cabinet' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]')}>Cabinet</button>
              <button onClick={() => setTab('portal')} className={cn('flex-1 py-3.5 text-sm font-semibold text-center transition-colors border-b-2 -mb-px', tab === 'portal' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]')}>Portail Client</button>
            </div>
            {tab === 'cabinet' && <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto mb-4 flex items-center justify-center">
                  <img src="/splash.png" alt="JurisLink" className="h-16 w-auto object-contain" />
                </div>
                <CardDescription className="text-sm mt-1 text-[var(--text-secondary)]">Le système d'exploitation de votre cabinet</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleCabinetSubmit} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" type="email" placeholder="email@jurislink.com" value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-lg border-[var(--border)] bg-[var(--bg-card)]" /></div>
                  <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><div className="relative"><Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-lg border-[var(--border)] bg-[var(--bg-card)] pr-10" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors" tabIndex={-1}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
                  <Button type="submit" className="w-full h-11 bg-[var(--primary)] hover:bg-jl-blue text-white rounded-lg font-medium" disabled={loading}>{loading ? <RefreshCw className="size-4 animate-spin" /> : 'Se connecter'}</Button>
                </form>
              </CardContent>
              <CardFooter className="flex-col gap-2 pb-8"><Separator className="mb-2" /><p className="text-xs text-[var(--text-muted)]">Connectez-vous avec votre email</p></CardFooter>
            </>}
            {tab === 'portal' && <>
              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto mb-4 flex items-center justify-center">
                  <img src="/splash.png" alt="JurisLink" className="h-16 w-auto object-contain" />
                </div>
                <CardDescription className="text-sm mt-1 text-[var(--text-secondary)]">Espace client — Accédez à vos dossiers</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handlePortalSubmit} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="portal-email">Adresse e-mail</Label><Input id="portal-email" type="email" placeholder="votre@email.com" value={portalEmail} onChange={e => setPortalEmail(e.target.value)} className="h-11 rounded-lg border-[var(--border)] bg-[var(--bg-card)]" /></div>
                  <div className="space-y-2"><Label htmlFor="portal-password">Mot de passe</Label><div className="relative"><Input id="portal-password" type={portalShowPw ? 'text' : 'password'} placeholder="••••••••" value={portalPassword} onChange={e => setPortalPassword(e.target.value)} className="h-11 rounded-lg border-[var(--border)] bg-[var(--bg-card)] pr-10" /><button type="button" onClick={() => setPortalShowPw(!portalShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors" tabIndex={-1}>{portalShowPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
                  <Button type="submit" className="w-full h-11 bg-[var(--primary)] hover:bg-jl-blue text-white rounded-lg font-medium" disabled={portalLoading}>{portalLoading ? <RefreshCw className="size-4 animate-spin" /> : 'Accéder à mon espace'}</Button>
                </form>
                <div className="mt-4 text-center">
                  <button type="button" onClick={() => toast.info('Fonctionnalité bientôt disponible')} className="text-xs text-[var(--primary)] hover:underline">Mot de passe oublié ?</button>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2 pb-8"><Separator className="mb-2" /><p className="text-xs text-[var(--text-muted)]">Espace réservé aux clients</p></CardFooter>
            </>}
          </Tabs>
        </Card>
        <p className="text-center text-xs text-[var(--text-muted)] mt-6">© 2025 JurisLink — Tous droits réservés</p>
      </div>
    </div>
  )
}

