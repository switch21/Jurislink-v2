#!/usr/bin/env python3
"""
Fix extracted view files:
1. Add 'export' to function declarations
2. Fix PortalViews truncation (should end at line 5542, not 5547)
3. Fix helpers.tsx TASK_STATUS_MAP duplicate
"""
import re, os

VIEWS = '/home/z/my-project/src/views'
PAGE = '/home/z/my-project/src/app/page.tsx'

# Read original page.tsx
with open(PAGE) as f:
    orig_lines = f.readlines()

# ══════════════════════════════════════════════════════════════
# FIX 1: Re-extract PortalViews.tsx (ends at line 5542, not 5547)
# ══════════════════════════════════════════════════════════════
portal_text = ''.join(orig_lines[4907:5542])  # lines 4908-5542 (0-indexed)

# Build header
SHARED_IMPORT = "import { useState, useEffect, useCallback, useMemo, useRef, useQuery, useMutation, useQueryClient, motion, AnimatePresence, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isBefore, addDays, fr, toast, useTheme, useAppStore, cn, initAuthFetch, Button, Input, Label, Textarea, Checkbox, Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction, CardFooter, Badge, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, ScrollArea, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Skeleton, Progress, Switch, LayoutDashboard, Briefcase, Users, FileText, Calendar, Receipt, MessageSquare, BarChart3, Shield, Settings, Menu, X, Search, Bell, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Plus, Edit, Trash2, Eye, EyeOff, Lock, Clock, Send, ArrowLeft, Download, Filter, MoreHorizontal, Archive, AlertTriangle, CheckCircle2, Circle, Phone, Mail, Building2, RefreshCw, TrendingUp, DollarSign, FileCheck, FileWarning, Activity, Sun, Moon, Inbox, FolderOpen, Scale, ClipboardList, Zap, AlertOctagon, ChevronUp, ExternalLink, Timer, Target, Flag, Folder, Tag, MapPin, Banknote, Gavel, UserCheck, Check, CircleDot, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Wallet, Brain, Save, Upload, CalendarPlus, CheckCheck, UserCircle, FileUp, CreditCard, Printer, FileCode2, SendHorizontal, Play, Pause, Square, Copy, Sparkles, MailCheck, MessageCircle, Hash, BookOpen, Crown, UsersRound, ShieldCheck, UserPlus, ArrowUpDown, FileSpreadsheet, ArrowDown, ArrowUp, SearchX, Loader2, FileImage, List, LayoutGrid, History, Globe, ShieldUser, FileDown, MessageCircleReply, UserCog, BuildingIcon, CreditCardIcon, ZapIcon } from './shared-ui'"

CONST_IMPORT = "import { queryClient, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, EVENT_TYPE_LABELS, CRIT_COLORS, CHART_COLORS, TYPE_LABELS, TASK_STATUS_MAP } from './constants'"
HELPERS_IMPORT = "import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from './helpers'"
TYPES_IMPORT = "import type { Client, CaseItem, CaseAssignment, CaseNote, Doc, EventItem, EventAssignment, InvoiceLineItem, Payment, Invoice, Message, Notification, AuditLogItem, UserItem, TenantItem, AdminDashboardData, AdminTenant, TaskItem, DashboardStats, ConflictResult, CurrencyItem, TimeEntry, DocTemplate, Communication, TimeSummary, PortalCaseItem, PortalCaseDetail, PortalTimelineEntry, PortalInvoiceItem, PortalDocItem, PortalCommunication, PortalDashboardData } from './types'"

header = f"""'use client'
{SHARED_IMPORT}
{CONST_IMPORT}
{HELPERS_IMPORT}
{TYPES_IMPORT}

"""

with open(f'{VIEWS}/PortalViews.tsx', 'w') as f:
    f.write(header + portal_text)
print('Fixed PortalViews.tsx (re-extracted lines 4908-5542)')

# ══════════════════════════════════════════════════════════════
# FIX 2: Add 'export' to function declarations in all view files
# ══════════════════════════════════════════════════════════════
export_pattern = re.compile(r'^function (\w+)')

for filename in os.listdir(VIEWS):
    if not filename.endswith(('.tsx', '.ts')) or filename in ('types.ts', 'constants.ts', 'shared-ui.tsx'):
        continue
    filepath = os.path.join(VIEWS, filename)
    with open(filepath) as f:
        content = f.read()
    
    # Add 'export' to non-exported function declarations
    new_content = re.sub(r'^function (\w+)', r'export function \1', content, flags=re.MULTILINE)
    
    if new_content != content:
        count = len(re.findall(r'^export function', new_content, re.MULTILINE)) - len(re.findall(r'^export function', content, re.MULTILINE))
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f'  Added {count} export(s) to {filename}')

# ══════════════════════════════════════════════════════════════
# FIX 3: helpers.tsx - remove TASK_STATUS_MAP import from constants
# (it's defined locally in helpers.tsx)
# ══════════════════════════════════════════════════════════════
filepath = os.path.join(VIEWS, 'helpers.tsx')
with open(filepath) as f:
    content = f.read()
# Remove TASK_STATUS_MAP from the import line
content = content.replace("import { STATUS_COLORS, STATUS_LABELS, TASK_STATUS_MAP } from './constants'",
                           "import { STATUS_COLORS, STATUS_LABELS } from './constants'")
with open(filepath, 'w') as f:
    f.write(content)
print('Fixed helpers.tsx: removed TASK_STATUS_MAP from import')

print('\nAll fixes applied!')
