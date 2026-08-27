#!/usr/bin/env python3
"""
Split page.tsx into modular views with proper imports.
Creates shared-ui.tsx barrel + individual view files with correct imports.
"""
import re, os

BASE = '/home/z/my-project/src'
PAGE = f'{BASE}/app/page.tsx'
VIEWS = f'{BASE}/views'

with open(PAGE, 'r') as f:
    lines = f.readlines()

# Trailing newline check
lines_text = ''.join(lines)

# ══════════════════════════════════════════════════════════════
# STEP 1: Create shared-ui.tsx barrel
# ══════════════════════════════════════════════════════════════
shared_ui = """'use client'

// Shared UI barrel — re-exports all UI components and icons
// Next.js tree-shaking will only bundle what each view actually uses

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

// shadcn/ui
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

// Re-export React and libraries
export { useState, useEffect, useCallback, useMemo, useRef }
export { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider }
export { motion, AnimatePresence }
export { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays }
export { fr }
export { toast }
export { useTheme }
export { useAppStore }
export type { ViewName, UserInfo, PortalViewName, PortalUserInfo, PortalClientInfo }
export { cn }
export { initAuthFetch }
export { React }

// Lucide icons
export {
  LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3,
  Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight,
  ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download,
  Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail,
  Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity,
  Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon,
  ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel,
  UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save,
  Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, ZapIcon,
  FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen,
  Crown, UsersRound, BuildingIcon, CreditCardIcon, ShieldCheck, UserPlus, ArrowUpDown,
  FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2,
  FileImage, List, LayoutGrid, History,
  Globe, ShieldUser, FileDown, MessageCircleReply, UserCog
} from 'lucide-react'
"""

with open(f'{VIEWS}/shared-ui.tsx', 'w') as f:
    f.write(shared_ui)
print('Created shared-ui.tsx')

# ══════════════════════════════════════════════════════════════
# STEP 2: Process each extracted file — add 'use client' and imports
# ══════════════════════════════════════════════════════════════
SECTIONS = {
    'helpers.tsx':       (357, 411),
    'ThemeToggle.tsx':   (413, 425),
    'EmptyState.tsx':    (427, 439),
    'LoginPage.tsx':     (440, 530),
    'Sidebar.tsx':       (531, 572),
    'AdminSidebar.tsx':  (573, 614),
    'AdminHeader.tsx':   (615, 632),
    'Header.tsx':        (633, 729),
    'DashboardView.tsx': (730, 931),
    'TasksView.tsx':     (933, 1080),
    'CasesView.tsx':     (1081, 1699),
    'ClientsView.tsx':   (1700, 1875),
    'DocumentsView.tsx': (1876, 2230),
    'CalendarView.tsx':  (2231, 2405),
    'InvoicesView.tsx':  (2406, 2640),
    'MessagesView.tsx':  (2641, 2725),
    'ReportsView.tsx':   (2726, 2923),
    'AuditLogsView.tsx': (2924, 2975),
    'SettingsView.tsx':  (2976, 3398),
    'FinancesView.tsx':  (3399, 3651),
    'NotificationsView.tsx': (3652, 3741),
    'ArchivesView.tsx':  (3742, 3771),
    'ImpayesView.tsx':   (3772, 3988),
    'TimeTrackingView.tsx': (3989, 4164),
    'TemplatesView.tsx': (4165, 4394),
    'CommunicationsView.tsx': (4395, 4552),
    'AdminViews.tsx':    (4553, 4907),
    'PortalViews.tsx':   (4908, 5547),
}

# Build import lines for each file based on what identifiers it uses
# We scan the extracted content for known symbols

# Collect all available symbols
UI_COMPONENTS = [
    'Button', 'Input', 'Label', 'Textarea', 'Checkbox',
    'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardAction', 'CardFooter',
    'Badge', 'Avatar', 'AvatarImage', 'AvatarFallback',
    'Table', 'TableBody', 'TableCell', 'TableHead', 'TableHeader', 'TableRow', 'TableCaption',
    'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent',
    'Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle', 'DialogTrigger', 'DialogClose',
    'DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuLabel', 'DropdownMenuSeparator', 'DropdownMenuTrigger',
    'Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue',
    'Sheet', 'SheetContent', 'SheetHeader', 'SheetTitle', 'SheetDescription',
    'ScrollArea', 'Separator', 'Tooltip', 'TooltipContent', 'TooltipProvider', 'TooltipTrigger',
    'Skeleton', 'Progress', 'Switch',
]

ICONS = [
    'LayoutDashboard', 'Briefcase', 'Users', 'FileText', 'Calendar', 'Receipt', 'MessageSquare', 'BarChart3',
    'Shield', 'Settings', 'Menu', 'X', 'Search', 'Bell', 'LogOut', 'User', 'ChevronDown', 'ChevronRight',
    'ChevronLeft', 'Plus', 'Edit', 'Trash2', 'Eye', 'EyeOff', 'Lock', 'Clock', 'Send', 'ArrowLeft', 'Download',
    'Filter', 'MoreHorizontal', 'Archive', 'AlertTriangle', 'CheckCircle2', 'Circle', 'Phone', 'Mail',
    'Building2', 'RefreshCw', 'TrendingUp', 'DollarSign', 'FileCheck', 'FileWarning', 'Activity',
    'Sun', 'Moon', 'Inbox', 'FolderOpen', 'Scale', 'ClipboardList', 'Zap', 'AlertOctagon',
    'ChevronUp', 'ExternalLink', 'Timer', 'Target', 'Flag', 'Folder', 'Tag', 'MapPin', 'Banknote', 'Gavel',
    'UserCheck', 'Check', 'CircleDot', 'ArrowUpRight', 'ArrowDownRight', 'Minus', 'AlertCircle', 'Wallet', 'Brain', 'Save',
    'Upload', 'CalendarPlus', 'CheckCheck', 'UserCircle', 'FileUp', 'CreditCard', 'Printer', 'ZapIcon',
    'FileCode2', 'SendHorizontal', 'Play', 'Pause', 'Square', 'Copy', 'Sparkles', 'MailCheck', 'MessageCircle', 'Hash', 'BookOpen',
    'Crown', 'UsersRound', 'BuildingIcon', 'CreditCardIcon', 'ShieldCheck', 'UserPlus', 'ArrowUpDown',
    'FileSpreadsheet', 'ArrowDown', 'ArrowUp', 'SearchX', 'Loader2',
    'FileImage', 'List', 'LayoutGrid', 'History',
    'Globe', 'ShieldUser', 'FileDown', 'MessageCircleReply', 'UserCog'
]

REACT_HOOKS = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef']
RQ = ['useQuery', 'useMutation', 'useQueryClient', 'QueryClient', 'QueryClientProvider']
DATE_FNS = ['format', 'parseISO', 'startOfMonth', 'endOfMonth', 'eachDayOfInterval', 'getDay', 'isSameDay',
            'addMonths', 'subMonths', 'isToday', 'startOfWeek', 'endOfWeek', 'isSameMonth', 'differenceInDays', 'isBefore', 'addDays']
OTHER = ['toast', 'useTheme', 'useAppStore', 'cn', 'initAuthFetch', 'motion', 'AnimatePresence', 'fr']

ALL_SYMBOLS = UI_COMPONENTS + ICONS + REACT_HOOKS + RQ + DATE_FNS + OTHER + ['React']

# Sort by length descending for accurate matching (match longer names first)
ALL_SYMBOLS.sort(key=len, reverse=True)

def find_used_symbols(text):
    """Find which symbols from ALL_SYMBOLS are used in the text."""
    used = set()
    for sym in ALL_SYMBOLS:
        # Use word boundary matching
        pattern = re.compile(r'\b' + re.escape(sym) + r'\b')
        if pattern.search(text):
            used.add(sym)
    return used

def categorize_symbols(used):
    """Categorize used symbols into import groups."""
    ui = sorted([s for s in used if s in UI_COMPONENTS])
    icons = sorted([s for s in used if s in ICONS])
    hooks = sorted([s for s in used if s in REACT_HOOKS])
    rq = sorted([s for s in used if s in RQ])
    datefns = sorted([s for s in used if s in DATE_FNS])
    other = sorted([s for s in used if s in OTHER and s not in ['React']])
    return ui, icons, hooks, rq, datefns, other

def build_imports(ui, icons, hooks, rq, datefns, other):
    """Build import lines for a view file."""
    lines = ["'use client'", '']
    
    # React hooks
    if hooks:
        lines.append(f'import {{ {", ".join(hooks)} }} from \'react\'')
    
    # React Query
    if rq:
        lines.append(f'import {{ {", ".join(rq)} }} from \'@tanstack/react-query\'')
    
    # Framer motion
    if 'motion' in other or 'AnimatePresence' in other:
        motion_items = []
        if 'motion' in other: motion_items.append('motion')
        if 'AnimatePresence' in other: motion_items.append('AnimatePresence')
        lines.append(f'import {{ {", ".join(motion_items)} }} from \'framer-motion\'')
    
    # date-fns
    if datefns:
        lines.append(f'import {{ {", ".join(datefns)} }} from \'date-fns\'')
        if 'fr' in other:
            lines.append("import { fr } from 'date-fns/locale'")
    
    # Other libs
    remaining = [s for s in other if s not in ['motion', 'AnimatePresence', 'fr']]
    for sym in remaining:
        if sym == 'toast':
            lines.append("import { toast } from '@/hooks/use-toast'")
        elif sym == 'useTheme':
            lines.append("import { useTheme } from 'next-themes'")
        elif sym == 'useAppStore':
            lines.append("import { useAppStore, type ViewName, type UserInfo, type PortalViewName, type PortalUserInfo, type PortalClientInfo } from '@/store/appStore'")
        elif sym == 'cn':
            lines.append("import { cn } from '@/lib/utils'")
        elif sym == 'initAuthFetch':
            lines.append("import { initAuthFetch } from '@/lib/auth-fetch'")
    
    # UI Components - grouped
    if ui:
        lines.append(f'import {{ {", ".join(ui)} }} from \'@/components/ui/\' + \n  TODO')
    
    return lines

# Process each section
for filename, (start, end) in SECTIONS.items():
    section_text = ''.join(lines[start-1:end])
    
    # Find used symbols
    used = find_used_symbols(section_text)
    ui, icons, hooks, rq, datefns, other = categorize_symbols(used)
    
    # Skip types that are just interface definitions
    needs_types = filename in ['helpers.tsx']
    needs_constants = any(c in section_text for c in ['STATUS_COLORS', 'STATUS_LABELS', 'PRIORITY_COLORS', 'PRIORITY_LABELS', 
                                                        'EVENT_TYPE_LABELS', 'CRIT_COLORS', 'CHART_COLORS', 'TYPE_LABELS',
                                                        'queryClient', 'TASK_STATUS_MAP'])
    needs_helpers = any(h in section_text for h in ['fmtDate(', 'fmtDateTime(', 'fmtMoney(', 'fmtFileSize(', 'initials(', 
                                                         'relativeTime(', 'fmtDuration(', 'taskStatusColor(', 'taskStatusLabel('])
    
    # Build file header
    file_lines = ["'use client'", '']
    
    # React
    if hooks:
        file_lines.append(f'import {{ {", ".join(hooks)} }} from \'react\'')
    
    # React Query
    if rq:
        file_lines.append(f'import {{ {", ".join(rq)} }} from \'@tanstack/react-query\'')
    
    # Framer motion
    if 'motion' in other or 'AnimatePresence' in other:
        m_items = [x for x in ['motion', 'AnimatePresence'] if x in other]
        file_lines.append(f'import {{ {", ".join(m_items)} }} from \'framer-motion\'')
    
    # date-fns
    if datefns:
        file_lines.append(f'import {{ {", ".join(datefns)} }} from \'date-fns\'')
    if 'fr' in other:
        file_lines.append("import { fr } from 'date-fns/locale'")
    
    # Other single imports
    if 'toast' in other:
        file_lines.append("import { toast } from '@/hooks/use-toast'")
    if 'useTheme' in other:
        file_lines.append("import { useTheme } from 'next-themes'")
    if 'useAppStore' in other:
        file_lines.append("import { useAppStore, type ViewName, type UserInfo, type PortalViewName, type PortalUserInfo, type PortalClientInfo } from '@/store/appStore'")
    if 'cn' in other:
        file_lines.append("import { cn } from '@/lib/utils'")
    if 'initAuthFetch' in other:
        file_lines.append("import { initAuthFetch } from '@/lib/auth-fetch'")
    
    # Types import
    if needs_types:
        file_lines.append("import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'")
    
    # Constants import
    if needs_constants:
        file_lines.append("import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS } from './constants'")
    
    # Helpers import
    if needs_helpers:
        file_lines.append("import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'")
    
    # UI Components
    if ui:
        file_lines.append(f'import {{ {", ".join(ui)} }} from \'@/components/ui/...\'')
    
    # Icons
    if icons:
        file_lines.append(f'import {{ {", ".join(icons)} }} from \'lucide-react\'')
    
    file_lines.append('')
    
    # Write
    filepath = f'{VIEWS}/{filename}'
    with open(filepath, 'w') as f:
        f.write('\n'.join(file_lines) + section_text)
    
    ui_count = len(ui)
    icon_count = len(icons)
    print(f'  {filename}: {len(file_lines)} import lines, {ui_count} UI, {icon_count} icons')

print('\nDone! Files written to', VIEWS)
