'use client'

// ══════════════════════════════════════════════════════════════
// Shared UI barrel — all imports needed by view components
// Next.js tree-shaking removes unused exports at build time
// ══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { useTheme } from 'next-themes'
import { useAppStore, type ViewName, type UserInfo, type PortalViewName, type PortalUserInfo, type PortalClientInfo } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { initAuthFetch } from '@/lib/auth-fetch'

// React
export { React, useState, useEffect, useCallback, useMemo, useRef }

// React Query
export { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient }

// Framer Motion
export { motion, AnimatePresence }

// date-fns
export { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr }

// Libs
export { toast, useTheme, cn, initAuthFetch }
export { useAppStore }
export type { ViewName, UserInfo, PortalViewName, PortalUserInfo, PortalClientInfo }

// ═══ shadcn/ui ═══
export { Button } from '@/components/ui/button'
export { Input } from '@/components/ui/input'
export { Label } from '@/components/ui/label'
export { Textarea } from '@/components/ui/textarea'
export { Checkbox } from '@/components/ui/checkbox'
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter } from '@/components/ui/card'
export { Badge } from '@/components/ui/badge'
export { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table'
export { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
export { ScrollArea } from '@/components/ui/scroll-area'
export { Separator } from '@/components/ui/separator'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
export { Skeleton } from '@/components/ui/skeleton'
export { Progress } from '@/components/ui/progress'
export { Switch } from '@/components/ui/switch'
export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '@/components/ui/command'

// ═══ Lucide Icons ═══
export {
  LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3,
  Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight,
  ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download,
  Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail,
  Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity,
  Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon,
  ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel,
  UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save,
  Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer,
  FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen,
  Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown,
  FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2,
  FileImage, List, LayoutGrid, History,
  Globe, ShieldUser, FileDown, MessageCircleReply, UserCog,
  Building2 as BuildingIcon, CreditCard as CreditCardIcon, Zap as ZapIcon,
  QrCode, KeyRound as Key,
  SlidersHorizontal, Table2,
  Unplug, Info, Star, ArrowRight
} from 'lucide-react'
// ═══ Internal Components ═══
export { EmptyState } from './EmptyState'
export { ThemeToggle } from './ThemeToggle'
export { t } from '@/lib/i18n'
export { statusLabel, priorityLabel, typeLabel, eventTypeLabel, roleLabel, billingLabel, invoiceTypeLabel, invoiceStatusLabel, paymentMethodLabel, commTypeLabel, commStatusLabel, riskLabel, outcomeLabel, payStatusLabel, timelineTypeLabel } from './helpers'
