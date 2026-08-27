#!/usr/bin/env python3
"""
Build final view files with correct imports.
Reads raw sections from page.tsx, prepends 'use client' + import line.
"""
import re, os

BASE = '/home/z/my-project/src'
PAGE = f'{BASE}/app/page.tsx'
VIEWS = f'{BASE}/views'

with open(PAGE, 'r') as f:
    lines = f.readlines()

# Section definitions: filename -> (start_line, end_line) [1-indexed inclusive]
SECTIONS = [
    ('types.ts',          68,  266,  False, False, False),  # is_component, needs_ui, needs_constants
    ('constants.ts',      271, 355,  False, False, False),
    ('helpers.tsx',       357, 411,  False, False, True),
    ('ThemeToggle.tsx',   413, 425,  True,  True,  True),
    ('EmptyState.tsx',    427, 439,  True,  True,  False),
    ('LoginPage.tsx',     440, 530,  True,  True,  True),
    ('Sidebar.tsx',       531, 572,  True,  True,  True),
    ('AdminSidebar.tsx',  573, 614,  True,  True,  True),
    ('AdminHeader.tsx',   615, 632,  True,  True,  False),
    ('Header.tsx',        633, 729,  True,  True,  True),
    ('DashboardView.tsx', 730, 931,  True,  True,  True),
    ('TasksView.tsx',     933, 1080, True,  True,  True),
    ('CasesView.tsx',     1081, 1699, True, True, True),
    ('ClientsView.tsx',   1700, 1875, True, True, True),
    ('DocumentsView.tsx', 1876, 2230, True, True, True),
    ('CalendarView.tsx',  2231, 2405, True, True, True),
    ('InvoicesView.tsx',  2406, 2640, True, True, True),
    ('MessagesView.tsx',  2641, 2725, True, True,  True),
    ('ReportsView.tsx',   2726, 2923, True, True,  True),
    ('AuditLogsView.tsx', 2924, 2975, True, True,  True),
    ('SettingsView.tsx',  2976, 3398, True, True,  True),
    ('FinancesView.tsx',  3399, 3651, True, True,  True),
    ('NotificationsView.tsx', 3652, 3741, True, True, True),
    ('ArchivesView.tsx',  3742, 3771, True, True,  True),
    ('ImpayesView.tsx',   3772, 3988, True, True,  True),
    ('TimeTrackingView.tsx', 3989, 4164, True, True, True),
    ('TemplatesView.tsx', 4165, 4394, True, True,  True),
    ('CommunicationsView.tsx', 4395, 4552, True, True, True),
    ('AdminViews.tsx',    4553, 4907, True, True,  True),
    ('PortalViews.tsx',   4908, 5547, True, True,  True),
]

# Common import line for component files
SHARED_IMPORT = "import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'"

for filename, start, end, is_comp, needs_ui, needs_consts in SECTIONS:
    section_text = ''.join(lines[start-1:end])
    
    file_lines = ["'use client'", '']
    
    if filename == 'types.ts':
        # Pure type definitions, no imports needed
        file_lines = []
        file_lines.append('// Auto-extracted types from page.tsx split')
        file_lines.append('')
    
    elif filename == 'constants.ts':
        file_lines.append("import { QueryClient } from '@tanstack/react-query'")
        file_lines.append('')
    
    elif filename == 'helpers.tsx':
        file_lines.append("import { format, parseISO, differenceInDays } from 'date-fns'")
        file_lines.append("import { fr } from 'date-fns/locale'")
        file_lines.append("import { STATUS_COLORS, STATUS_LABELS, TASK_STATUS_MAP } from './constants'")
        file_lines.append('')
    
    else:
        # Component file
        file_lines.append(SHARED_IMPORT)
        
        # Add constants import if needed
        if needs_consts:
            file_lines.append("import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'")
        
        # Add helpers import
        file_lines.append("import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'")
        
        # Add types import
        file_lines.append("import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'")
        
        file_lines.append('')
    
    filepath = f'{VIEWS}/{filename}'
    with open(filepath, 'w') as f:
        f.write('\n'.join(file_lines) + section_text)
    
    total_lines = len(file_lines) + len(lines[start-1:end])
    section_lines = end - start + 1
    print(f'  {filename}: {total_lines} total ({section_lines} extracted + {len(file_lines)} header)')

print(f'\nAll {len(SECTIONS)} files written to {VIEWS}/')
