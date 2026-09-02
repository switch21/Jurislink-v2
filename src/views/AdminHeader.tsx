'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon , statusLabel, priorityLabel, typeLabel, eventTypeLabel, roleLabel, billingLabel, invoiceTypeLabel, invoiceStatusLabel, paymentMethodLabel, commTypeLabel, commStatusLabel, riskLabel, outcomeLabel, payStatusLabel, timelineTypeLabel, ROLE_OPTIONS } from './shared-ui'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'
import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'
// ==================== Admin Header ====================
export function AdminHeader() {
  const { user, logout, sidebarOpen, setSidebarOpen } = useAppStore()
  return (
    <header className='sticky top-0 z-30 bg-jl-card border-b border-jl px-4 md:px-6 h-14 flex items-center gap-4 shrink-0 transition-colors duration-300'>
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className='lg:hidden text-jl-secondary hover:text-jl-primary' aria-label='Ouvrir le menu'><Menu className='size-5' /></button>
      <div className='flex items-center gap-2'><Crown className='size-5 text-jl-gold' /><h1 className='text-sm font-semibold text-jl-primary'>Administration</h1></div>
      <div className='ml-auto flex items-center gap-3'>
        <div className='hidden sm:flex items-center gap-2'>
          <Avatar className='size-7'><AvatarFallback className='bg-jl-gold text-white text-[10px]'>{user?.fullName ? initials(user.fullName) : 'A'}</AvatarFallback></Avatar>
          <span className='text-sm font-medium text-jl-primary'>{user?.fullName}</span>
        </div>
        <Button variant='ghost' size='icon' className='text-jl-secondary hover:text-[var(--danger)]' onClick={logout} aria-label='Déconnexion'><LogOut className='size-4' /></Button>
      </div>
    </header>
  )
}
