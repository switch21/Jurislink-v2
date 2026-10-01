/**
 * Supabase PostgreSQL Database Adapter
 * Prisma-compatible API using pg (node-postgres) connected to Supabase
 *
 * This replaces Prisma entirely. All database operations go through
 * Supabase's PostgreSQL database via the pg driver.
 */

import { Pool, PoolClient, QueryResult } from 'pg'

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err)
})

// ═══════════════════════════════════════════════════════════════
// MODEL ↔ TABLE MAPPING
// ═══════════════════════════════════════════════════════════════

const MODEL_TABLE: Record<string, string> = {
  tenant: 'tenants',
  user: 'users',
  role: 'roles',
  permission: 'permissions',
  rolePermission: 'role_permissions',
  subscriptionPlan: 'subscription_plans',
  subscription: 'subscriptions',
  client: 'clients',
  case: 'cases',
  caseAssignment: 'case_assignments',
  caseNote: 'case_notes',
  document: 'documents',
  documentVersion: 'document_versions',
  event: 'events',
  eventAssignment: 'event_assignments',
  invoice: 'invoices',
  invoiceLineItem: 'invoice_line_items',
  payment: 'payments',
  message: 'messages',
  notification: 'notifications',
  task: 'tasks',
  auditLog: 'audit_logs',
  timeEntry: 'time_entries',
  documentTemplate: 'document_templates',
  communication: 'communications',
  reminderLog: 'reminder_logs',
  clientPortal: 'client_portals',
  portalNotification: 'portal_notifications',
  externalCalendar: 'external_calendars',
  caseTag: 'case_tags',
  caseTagging: 'case_taggings',
  currency: 'currencies',
}

const TABLE_MODEL: Record<string, string> = Object.fromEntries(
  Object.entries(MODEL_TABLE).map(([k, v]) => [v, k])
)

// ═══════════════════════════════════════════════════════════════
// FIELD ↔ COLUMN MAPPING
// ═══════════════════════════════════════════════════════════════

const FIELD_MAP: Record<string, Record<string, string>> = {
  tenant: {
    id: 'id', name: 'name', slug: 'slug', logoUrl: 'logo_url', language: 'language',
    timezone: 'timezone', phone: 'phone', email: 'email', address: 'address',
    niu: 'niu', city: 'city', country: 'country', currencyCode: 'currency_code',
    plan: 'plan', maxUsers: 'max_users', maxStorageGb: 'max_storage_gb',
    isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  user: {
    id: 'id', tenantId: 'tenant_id', roleId: 'role_id', role: 'role',
    fullName: 'full_name', email: 'email', preferredLanguage: 'preferred_language',
    isActive: 'is_active', failedLoginAttempts: 'failed_login_attempts',
    lockedUntil: 'locked_until', lastLoginAt: 'last_login_at',
    lastSessionId: 'last_session_id', sessionCountToday: 'session_count_today',
    avatarUrl: 'avatar_url', phone: 'phone', password: 'password',
    mfaEnabled: 'mfa_enabled', mfaSecret: 'mfa_secret',
    createdAt: 'created_at', updatedAt: 'updated_at',
    forceLogoutAt: 'force_logout_at',
  },
  role: {
    id: 'id', name: 'name', label: 'label', description: 'description',
    level: 'level', isSystem: 'is_system', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  permission: {
    id: 'id', name: 'name', resource: 'resource', action: 'action',
    description: 'description', createdAt: 'created_at',
  },
  rolePermission: {
    id: 'id', roleId: 'role_id', permissionId: 'permission_id',
    allowed: 'allowed', createdAt: 'created_at',
  },
  subscriptionPlan: {
    id: 'id', name: 'name', slug: 'slug', description: 'description',
    priceAnnual: 'price_annual', priceSemiAnnual: 'price_semi_annual',
    priceQuarterly: 'price_quarterly', priceMonthly: 'price_monthly',
    currencyCode: 'currency_code', maxUsers: 'max_users',
    maxStorageGb: 'max_storage_gb', maxCases: 'max_cases',
    hasAI: 'has_ai', features: 'features', isActive: 'is_active',
    sortOrder: 'sort_order', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  subscription: {
    id: 'id', tenantId: 'tenant_id', planId: 'plan_id', status: 'status',
    billingPeriod: 'billing_period', currentPeriodStart: 'current_period_start',
    currentPeriodEnd: 'current_period_end', trialEndsAt: 'trial_ends_at',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
  client: {
    id: 'id', tenantId: 'tenant_id', fullName: 'full_name', company: 'company',
    phone: 'phone', email: 'email', address: 'address', city: 'city',
    country: 'country', niu: 'niu', notes: 'notes', riskLevel: 'risk_level',
    source: 'source', clientType: 'client_type', status: 'status',
    isActive: 'is_active', responsibleLawyerId: 'responsible_lawyer_id',
    lastActivityAt: 'last_activity_at', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  case: {
    id: 'id', title: 'title', description: 'description', caseType: 'case_type',
    status: 'status', outcome: 'outcome', paymentStatus: 'payment_status',
    priority: 'priority', isSecret: 'is_secret', reference: 'reference',
    adversary: 'adversary', jurisdiction: 'jurisdiction', amountInDispute: 'amount_in_dispute',
    billingType: 'billing_type', nextDueDate: 'next_due_date', aiAnalysis: 'ai_analysis',
    createdAt: 'created_at', updatedAt: 'updated_at', tenantId: 'tenant_id', clientId: 'client_id',
  },
  caseAssignment: {
    id: 'id', userId: 'user_id', caseId: 'case_id', tenantId: 'tenant_id',
  },
  caseNote: {
    id: 'id', content: 'content', createdAt: 'created_at', caseId: 'case_id',
    authorId: 'author_id', tenantId: 'tenant_id',
  },
  document: {
    id: 'id', fileName: 'file_name', fileSize: 'file_size', filePath: 'file_path',
    version: 'version', folder: 'folder', tags: 'tags', documentType: 'document_type',
    mimeType: 'mime_type', description: 'description', status: 'status',
    uploadedById: 'uploaded_by_id', uploadedByPortalId: 'uploaded_by_portal_id',
    createdAt: 'created_at', updatedAt: 'updated_at', tenantId: 'tenant_id', caseId: 'case_id',
  },
  documentVersion: {
    id: 'id', version: 'version', fileName: 'file_name', fileSize: 'file_size',
    filePath: 'file_path', mimeType: 'mime_type', changeNote: 'change_note',
    createdAt: 'created_at', documentId: 'document_id', uploadedById: 'uploaded_by_id',
  },
  event: {
    id: 'id', title: 'title', description: 'description', startTime: 'start_time',
    endTime: 'end_time', eventType: 'event_type', criticality: 'criticality',
    location: 'location', externalEventId: 'external_event_id', allDay: 'all_day',
    createdAt: 'created_at', tenantId: 'tenant_id', caseId: 'case_id',
  },
  eventAssignment: {
    id: 'id', userId: 'user_id', eventId: 'event_id',
  },
  invoice: {
    id: 'id', invoiceNumber: 'invoice_number', type: 'type', amount: 'amount',
    paidAmount: 'paid_amount', status: 'status', issuedAt: 'issued_at',
    dueDate: 'due_date', notes: 'notes', billingType: 'billing_type',
    reminderLevel: 'reminder_level', lastReminderAt: 'last_reminder_at',
    taxRate: 'tax_rate', discountAmount: 'discount_amount', terms: 'terms',
    paidAt: 'paid_at', createdAt: 'created_at', updatedAt: 'updated_at',
    tenantId: 'tenant_id', clientId: 'client_id', caseId: 'case_id', currencyId: 'currency_id',
  },
  invoiceLineItem: {
    id: 'id', description: 'description', quantity: 'quantity',
    unitPrice: 'unit_price', total: 'total', sortOrder: 'sort_order', invoiceId: 'invoice_id',
  },
  payment: {
    id: 'id', amount: 'amount', method: 'method', reference: 'reference',
    status: 'status', paidAt: 'paid_at', notes: 'notes', createdAt: 'created_at',
    tenantId: 'tenant_id', invoiceId: 'invoice_id', recordedBy: 'recorded_by',
  },
  message: {
    id: 'id', content: 'content', tenantId: 'tenant_id', senderId: 'sender_id',
    receiverId: 'receiver_id', createdAt: 'created_at',
  },
  notification: {
    id: 'id', title: 'title', message: 'message', category: 'category',
    read: 'read', resourceType: 'resource_type', resourceId: 'resource_id',
    createdAt: 'created_at', tenantId: 'tenant_id', userId: 'user_id', eventId: 'event_id',
  },
  task: {
    id: 'id', title: 'title', description: 'description', status: 'status',
    priority: 'priority', dueDate: 'due_date', createdAt: 'created_at', updatedAt: 'updated_at',
    tenantId: 'tenant_id', caseId: 'case_id', eventId: 'event_id', assignedToId: 'assigned_to_id',
  },
  auditLog: {
    id: 'id', action: 'action', resourceType: 'resource_type', resourceId: 'resource_id',
    metadata: 'metadata', ipAddress: 'ip_address', userAgent: 'user_agent',
    timestamp: 'timestamp', tenantId: 'tenant_id', userId: 'user_id',
  },
  timeEntry: {
    id: 'id', description: 'description', startTime: 'start_time', endTime: 'end_time',
    duration: 'duration', isBillable: 'is_billable', hourlyRate: 'hourly_rate',
    totalAmount: 'total_amount', billed: 'billed', createdAt: 'created_at', updatedAt: 'updated_at',
    tenantId: 'tenant_id', userId: 'user_id', caseId: 'case_id', invoiceId: 'invoice_id',
  },
  documentTemplate: {
    id: 'id', name: 'name', category: 'category', description: 'description',
    content: 'content', variables: 'variables', isActive: 'is_active',
    createdAt: 'created_at', updatedAt: 'updated_at', tenantId: 'tenant_id',
  },
  communication: {
    id: 'id', type: 'type', subject: 'subject', content: 'content', status: 'status',
    recipientEmail: 'recipient_email', recipientPhone: 'recipient_phone',
    sentAt: 'sent_at', createdAt: 'created_at', tenantId: 'tenant_id',
    caseId: 'case_id', clientId: 'client_id', sentById: 'sent_by_id',
  },
  reminderLog: {
    id: 'id', level: 'level', method: 'method', subject: 'subject', content: 'content',
    status: 'status', sentAt: 'sent_at', daysOverdue: 'days_overdue', amountDue: 'amount_due',
    invoiceId: 'invoice_id', tenantId: 'tenant_id', sentById: 'sent_by_id',
  },
  clientPortal: {
    id: 'id', email: 'email', passwordHash: 'password_hash', isActive: 'is_active',
    lastLoginAt: 'last_login_at', resetToken: 'reset_token', resetTokenExpiry: 'reset_token_expiry',
    createdAt: 'created_at', updatedAt: 'updated_at', clientId: 'client_id', tenantId: 'tenant_id',
  },
  portalNotification: {
    id: 'id', title: 'title', message: 'message', category: 'category',
    read: 'read', resourceType: 'resource_type', resourceId: 'resource_id',
    createdAt: 'created_at', portalId: 'portal_id', tenantId: 'tenant_id',
  },
  externalCalendar: {
    id: 'id', provider: 'provider', accessToken: 'access_token', refreshToken: 'refresh_token',
    tokenExpiry: 'token_expiry', calendarId: 'calendar_id', calendarEmail: 'calendar_email',
    syncEnabled: 'sync_enabled', lastSyncAt: 'last_sync_at', syncDirection: 'sync_direction',
    createdAt: 'created_at', updatedAt: 'updated_at', userId: 'user_id', tenantId: 'tenant_id',
  },
  caseTag: {
    id: 'id', name: 'name', color: 'color', createdAt: 'created_at', tenantId: 'tenant_id',
  },
  caseTagging: {
    caseId: 'case_id', tagId: 'tag_id', tenantId: 'tenant_id', createdAt: 'created_at',
  },
  currency: {
    id: 'id', code: 'code', name: 'name', symbol: 'symbol', tenantId: 'tenant_id',
    createdAt: 'created_at', updatedAt: 'updated_at',
  },
}

// Build reverse mapping: column → field per model
const COLUMN_MAP: Record<string, Record<string, string>> = {}
for (const [model, fields] of Object.entries(FIELD_MAP)) {
  COLUMN_MAP[model] = Object.fromEntries(
    Object.entries(fields).map(([field, col]) => [col, field])
  )
}

// ═══════════════════════════════════════════════════════════════
// RELATION METADATA
// ═══════════════════════════════════════════════════════════════

interface RelationMeta {
  targetModel: string
  fkColumn: string       // column name in the CHILD table
  isMany: boolean
  fkOnTarget?: string    // for belongs-to: the FK column on THIS model pointing to target
}

// Relations: model → relationName → meta
const RELATIONS: Record<string, Record<string, RelationMeta>> = {
  tenant: {
    users: { targetModel: 'user', fkColumn: 'tenant_id', isMany: true },
    clients: { targetModel: 'client', fkColumn: 'tenant_id', isMany: true },
    cases: { targetModel: 'case', fkColumn: 'tenant_id', isMany: true },
    invoices: { targetModel: 'invoice', fkColumn: 'tenant_id', isMany: true },
    documents: { targetModel: 'document', fkColumn: 'tenant_id', isMany: true },
    messages: { targetModel: 'message', fkColumn: 'tenant_id', isMany: true },
    events: { targetModel: 'event', fkColumn: 'tenant_id', isMany: true },
    auditLogs: { targetModel: 'auditLog', fkColumn: 'tenant_id', isMany: true },
    notifications: { targetModel: 'notification', fkColumn: 'tenant_id', isMany: true },
    tasks: { targetModel: 'task', fkColumn: 'tenant_id', isMany: true },
    caseNotes: { targetModel: 'caseNote', fkColumn: 'tenant_id', isMany: true },
    caseAssignments: { targetModel: 'caseAssignment', fkColumn: 'tenant_id', isMany: true },
    caseTags: { targetModel: 'caseTag', fkColumn: 'tenant_id', isMany: true },
    caseTaggings: { targetModel: 'caseTagging', fkColumn: 'tenant_id', isMany: true },
    subscription: { targetModel: 'subscription', fkColumn: 'tenant_id', isMany: false },
    payments: { targetModel: 'payment', fkColumn: 'tenant_id', isMany: true },
    timeEntries: { targetModel: 'timeEntry', fkColumn: 'tenant_id', isMany: true },
    documentTemplates: { targetModel: 'documentTemplate', fkColumn: 'tenant_id', isMany: true },
    communications: { targetModel: 'communication', fkColumn: 'tenant_id', isMany: true },
    reminderLogs: { targetModel: 'reminderLog', fkColumn: 'tenant_id', isMany: true },
    clientPortals: { targetModel: 'clientPortal', fkColumn: 'tenant_id', isMany: true },
    portalNotifications: { targetModel: 'portalNotification', fkColumn: 'tenant_id', isMany: true },
    externalCalendars: { targetModel: 'externalCalendar', fkColumn: 'tenant_id', isMany: true },
    currencies: { targetModel: 'currency', fkColumn: 'tenant_id', isMany: true },
  },
  user: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    roleObj: { targetModel: 'role', fkColumn: 'role_id', isMany: false, fkOnTarget: 'role_id' },
    assignedCases: { targetModel: 'caseAssignment', fkColumn: 'user_id', isMany: true },
    assignedEvents: { targetModel: 'eventAssignment', fkColumn: 'user_id', isMany: true },
    sentMessages: { targetModel: 'message', fkColumn: 'sender_id', isMany: true },
    receivedMessages: { targetModel: 'message', fkColumn: 'receiver_id', isMany: true },
    auditLogs: { targetModel: 'auditLog', fkColumn: 'user_id', isMany: true },
    caseNotes: { targetModel: 'caseNote', fkColumn: 'author_id', isMany: true },
    receivedNotifications: { targetModel: 'notification', fkColumn: 'user_id', isMany: true },
    recordedPayments: { targetModel: 'payment', fkColumn: 'recorded_by', isMany: true },
    timeEntries: { targetModel: 'timeEntry', fkColumn: 'user_id', isMany: true },
    sentCommunications: { targetModel: 'communication', fkColumn: 'sent_by_id', isMany: true },
    uploadedDocuments: { targetModel: 'document', fkColumn: 'uploaded_by_id', isMany: true },
    uploadedVersions: { targetModel: 'documentVersion', fkColumn: 'uploaded_by_id', isMany: true },
    sentReminders: { targetModel: 'reminderLog', fkColumn: 'sent_by_id', isMany: true },
    assignedTasks: { targetModel: 'task', fkColumn: 'assigned_to_id', isMany: true },
    externalCalendars: { targetModel: 'externalCalendar', fkColumn: 'user_id', isMany: true },
  },
  role: {
    users: { targetModel: 'user', fkColumn: 'role_id', isMany: true },
    permissions: { targetModel: 'rolePermission', fkColumn: 'role_id', isMany: true },
  },
  permission: {
    roles: { targetModel: 'rolePermission', fkColumn: 'permission_id', isMany: true },
  },
  rolePermission: {
    role: { targetModel: 'role', fkColumn: 'role_id', isMany: false, fkOnTarget: 'role_id' },
    permission: { targetModel: 'permission', fkColumn: 'permission_id', isMany: false, fkOnTarget: 'permission_id' },
  },
  subscriptionPlan: {
    subscriptions: { targetModel: 'subscription', fkColumn: 'plan_id', isMany: true },
  },
  subscription: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    plan: { targetModel: 'subscriptionPlan', fkColumn: 'plan_id', isMany: false, fkOnTarget: 'plan_id' },
  },
  client: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    cases: { targetModel: 'case', fkColumn: 'client_id', isMany: true },
    invoices: { targetModel: 'invoice', fkColumn: 'client_id', isMany: true },
    communications: { targetModel: 'communication', fkColumn: 'client_id', isMany: true },
    portalAccounts: { targetModel: 'clientPortal', fkColumn: 'client_id', isMany: true },
  },
  case: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    client: { targetModel: 'client', fkColumn: 'client_id', isMany: false, fkOnTarget: 'client_id' },
    assignments: { targetModel: 'caseAssignment', fkColumn: 'case_id', isMany: true },
    taggings: { targetModel: 'caseTagging', fkColumn: 'case_id', isMany: true },
    documents: { targetModel: 'document', fkColumn: 'case_id', isMany: true },
    events: { targetModel: 'event', fkColumn: 'case_id', isMany: true },
    invoices: { targetModel: 'invoice', fkColumn: 'case_id', isMany: true },
    notes: { targetModel: 'caseNote', fkColumn: 'case_id', isMany: true },
    tasks: { targetModel: 'task', fkColumn: 'case_id', isMany: true },
    timeEntries: { targetModel: 'timeEntry', fkColumn: 'case_id', isMany: true },
    communications: { targetModel: 'communication', fkColumn: 'case_id', isMany: true },
  },
  caseAssignment: {
    user: { targetModel: 'user', fkColumn: 'user_id', isMany: false, fkOnTarget: 'user_id' },
    case: { targetModel: 'case', fkColumn: 'case_id', isMany: false, fkOnTarget: 'case_id' },
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
  },
  caseNote: {
    case: { targetModel: 'case', fkColumn: 'case_id', isMany: false, fkOnTarget: 'case_id' },
    author: { targetModel: 'user', fkColumn: 'author_id', isMany: false, fkOnTarget: 'author_id' },
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
  },
  document: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    case: { targetModel: 'case', fkColumn: 'case_id', isMany: false, fkOnTarget: 'case_id' },
    uploadedBy: { targetModel: 'user', fkColumn: 'uploaded_by_id', isMany: false, fkOnTarget: 'uploaded_by_id' },
    uploadedByPortal: { targetModel: 'clientPortal', fkColumn: 'uploaded_by_portal_id', isMany: false, fkOnTarget: 'uploaded_by_portal_id' },
    versions: { targetModel: 'documentVersion', fkColumn: 'document_id', isMany: true },
  },
  documentVersion: {
    document: { targetModel: 'document', fkColumn: 'document_id', isMany: false, fkOnTarget: 'document_id' },
    uploadedBy: { targetModel: 'user', fkColumn: 'uploaded_by_id', isMany: false, fkOnTarget: 'uploaded_by_id' },
  },
  event: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    case: { targetModel: 'case', fkColumn: 'case_id', isMany: false, fkOnTarget: 'case_id' },
    assignments: { targetModel: 'eventAssignment', fkColumn: 'event_id', isMany: true },
    notifications: { targetModel: 'notification', fkColumn: 'event_id', isMany: true },
    tasks: { targetModel: 'task', fkColumn: 'event_id', isMany: true },
  },
  eventAssignment: {
    user: { targetModel: 'user', fkColumn: 'user_id', isMany: false, fkOnTarget: 'user_id' },
    event: { targetModel: 'event', fkColumn: 'event_id', isMany: false, fkOnTarget: 'event_id' },
  },
  invoice: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    client: { targetModel: 'client', fkColumn: 'client_id', isMany: false, fkOnTarget: 'client_id' },
    case: { targetModel: 'case', fkColumn: 'case_id', isMany: false, fkOnTarget: 'case_id' },
    currency: { targetModel: 'currency', fkColumn: 'currency_id', isMany: false, fkOnTarget: 'currency_id' },
    lineItems: { targetModel: 'invoiceLineItem', fkColumn: 'invoice_id', isMany: true },
    payments: { targetModel: 'payment', fkColumn: 'invoice_id', isMany: true },
    reminders: { targetModel: 'reminderLog', fkColumn: 'invoice_id', isMany: true },
    timeEntries: { targetModel: 'timeEntry', fkColumn: 'invoice_id', isMany: true },
  },
  invoiceLineItem: {
    invoice: { targetModel: 'invoice', fkColumn: 'invoice_id', isMany: false, fkOnTarget: 'invoice_id' },
  },
  payment: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    invoice: { targetModel: 'invoice', fkColumn: 'invoice_id', isMany: false, fkOnTarget: 'invoice_id' },
    recorder: { targetModel: 'user', fkColumn: 'recorded_by', isMany: false, fkOnTarget: 'recorded_by' },
  },
  message: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    sender: { targetModel: 'user', fkColumn: 'sender_id', isMany: false, fkOnTarget: 'sender_id' },
    receiver: { targetModel: 'user', fkColumn: 'receiver_id', isMany: false, fkOnTarget: 'receiver_id' },
  },
  notification: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    user: { targetModel: 'user', fkColumn: 'user_id', isMany: false, fkOnTarget: 'user_id' },
    event: { targetModel: 'event', fkColumn: 'event_id', isMany: false, fkOnTarget: 'event_id' },
  },
  task: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    case: { targetModel: 'case', fkColumn: 'case_id', isMany: false, fkOnTarget: 'case_id' },
    event: { targetModel: 'event', fkColumn: 'event_id', isMany: false, fkOnTarget: 'event_id' },
    assignedTo: { targetModel: 'user', fkColumn: 'assigned_to_id', isMany: false, fkOnTarget: 'assigned_to_id' },
  },
  auditLog: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    user: { targetModel: 'user', fkColumn: 'user_id', isMany: false, fkOnTarget: 'user_id' },
  },
  timeEntry: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    user: { targetModel: 'user', fkColumn: 'user_id', isMany: false, fkOnTarget: 'user_id' },
    case: { targetModel: 'case', fkColumn: 'case_id', isMany: false, fkOnTarget: 'case_id' },
    invoice: { targetModel: 'invoice', fkColumn: 'invoice_id', isMany: false, fkOnTarget: 'invoice_id' },
  },
  documentTemplate: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
  },
  communication: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    case: { targetModel: 'case', fkColumn: 'case_id', isMany: false, fkOnTarget: 'case_id' },
    client: { targetModel: 'client', fkColumn: 'client_id', isMany: false, fkOnTarget: 'client_id' },
    sentBy: { targetModel: 'user', fkColumn: 'sent_by_id', isMany: false, fkOnTarget: 'sent_by_id' },
  },
  reminderLog: {
    invoice: { targetModel: 'invoice', fkColumn: 'invoice_id', isMany: false, fkOnTarget: 'invoice_id' },
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    sentBy: { targetModel: 'user', fkColumn: 'sent_by_id', isMany: false, fkOnTarget: 'sent_by_id' },
  },
  clientPortal: {
    client: { targetModel: 'client', fkColumn: 'client_id', isMany: false, fkOnTarget: 'client_id' },
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    portalNotifications: { targetModel: 'portalNotification', fkColumn: 'portal_id', isMany: true },
    documents: { targetModel: 'document', fkColumn: 'uploaded_by_portal_id', isMany: true },
  },
  portalNotification: {
    portal: { targetModel: 'clientPortal', fkColumn: 'portal_id', isMany: false, fkOnTarget: 'portal_id' },
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
  },
  externalCalendar: {
    user: { targetModel: 'user', fkColumn: 'user_id', isMany: false, fkOnTarget: 'user_id' },
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
  },
  caseTag: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    taggings: { targetModel: 'caseTagging', fkColumn: 'tag_id', isMany: true },
  },
  caseTagging: {
    case: { targetModel: 'case', fkColumn: 'case_id', isMany: false, fkOnTarget: 'case_id' },
    tag: { targetModel: 'caseTag', fkColumn: 'tag_id', isMany: false, fkOnTarget: 'tag_id' },
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
  },
  currency: {
    tenant: { targetModel: 'tenant', fkColumn: 'tenant_id', isMany: false, fkOnTarget: 'tenant_id' },
    invoices: { targetModel: 'invoice', fkColumn: 'currency_id', isMany: true },
  },
}

// ═══════════════════════════════════════════════════════════════
// QUERY EXECUTION
// ═══════════════════════════════════════════════════════════════

type Executor = Pool | PoolClient

async function query<T = any>(executor: Executor, sql: string, params: any[] = []): Promise<QueryResult<T>> {
  try {
    return await executor.query<T>(sql, params)
  } catch (err: any) {
    // Translate common pg errors to Prisma-like errors
    if (err.code === '23505') {
      const match = err.detail?.match(/Key \(([^)]+)\)=\(([^)]+)\) already exists/)
      const prismaErr: any = new Error(
        match
          ? `Unique constraint failed on ${match[1]}: ${match[2]}`
          : 'Unique constraint violation'
      )
      prismaErr.code = 'P2002'
      prismaErr.meta = { target: match?.[1]?.split(', ') || [] }
      throw prismaErr
    }
    if (err.code === '23503') {
      const prismaErr: any = new Error('Foreign key constraint failed')
      prismaErr.code = 'P2003'
      throw prismaErr
    }
    if (err.code === 'P2025') throw err // already a Prisma-like error
    throw err
  }
}

// ═══════════════════════════════════════════════════════════════
// FIELD MAPPING HELPERS
// ═══════════════════════════════════════════════════════════════

function fieldToCol(model: string, field: string): string {
  return FIELD_MAP[model]?.[field] ?? field
}

function colToField(model: string, col: string): string {
  return COLUMN_MAP[model]?.[col] ?? col
}

/** Convert a Prisma-style data object (field names) to column names for SQL */
function dataToColumns(model: string, data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue
    // Skip relation fields (objects that aren't primitive types and are known relations)
    const rel = RELATIONS[model]?.[key]
    if (rel && typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
      continue // skip nested create/connect etc. - handled separately
    }
    out[fieldToCol(model, key)] = val
  }
  return out
}

/** Convert a DB row (column names) back to Prisma field names */
function rowToFields(model: string, row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [col, val] of Object.entries(row)) {
    out[colToField(model, col)] = val
  }
  return out
}

// ═══════════════════════════════════════════════════════════════
// WHERE CLAUSE BUILDER
// ═══════════════════════════════════════════════════════════════

function buildWhere(
  model: string,
  where: Record<string, any>,
  params: any[],
  tableAlias?: string
): string {
  const parts: string[] = []
  const prefix = tableAlias ? `${tableAlias}.` : ''

  for (const [key, val] of Object.entries(where)) {
    if (key === 'OR') {
      const orParts = val.map((w: any) => buildWhere(model, w, params, tableAlias))
      parts.push(`(${orParts.join(' OR ')})`)
      continue
    }
    if (key === 'AND') {
      const andParts = val.map((w: any) => buildWhere(model, w, params, tableAlias))
      parts.push(`(${andParts.join(' AND ')})`)
      continue
    }
    if (key === 'NOT') {
      const notPart = buildWhere(model, val, params, tableAlias)
      parts.push(`NOT (${notPart})`)
      continue
    }

    // Check if this is a relation filter (some/none/every)
    const rel = RELATIONS[model]?.[key]
    if (rel && typeof val === 'object' && val !== null && !Array.isArray(val)) {
      const targetTable = MODEL_TABLE[rel.targetModel]
      if (val.some) {
        const subWhere = buildWhere(rel.targetModel, val.some, params)
        parts.push(`EXISTS (SELECT 1 FROM ${targetTable} WHERE ${targetTable}.${rel.fkColumn} = ${prefix}id AND ${subWhere})`)
      } else if (val.none) {
        const subWhere = buildWhere(rel.targetModel, val.none, params)
        parts.push(`NOT EXISTS (SELECT 1 FROM ${targetTable} WHERE ${targetTable}.${rel.fkColumn} = ${prefix}id AND ${subWhere})`)
      } else if (val.every) {
        const subWhere = buildWhere(rel.targetModel, val.every, params)
        parts.push(`NOT EXISTS (SELECT 1 FROM ${targetTable} WHERE ${targetTable}.${rel.fkColumn} = ${prefix}id AND NOT (${subWhere}))`)
      }
      continue
    }

    const col = fieldToCol(model, key)

    if (val === null) {
      parts.push(`${prefix}${col} IS NULL`)
    } else if (typeof val === 'boolean' || typeof val === 'number' || typeof val === 'string') {
      params.push(val)
      parts.push(`${prefix}${col} = $${params.length}`)
    } else if (val instanceof Date) {
      params.push(val)
      parts.push(`${prefix}${col} = $${params.length}`)
    } else if (typeof val === 'object' && val !== null) {
      // Filter object: { in, not, contains, startsWith, lt, gt, gte, lte, mode, isSet }
      for (const [op, opVal] of Object.entries(val as Record<string, any>)) {
        if (op === 'mode') continue // handled with contains
        if (op === 'in') {
          if (Array.isArray(opVal) && opVal.length === 0) {
            parts.push('FALSE')
          } else {
            params.push(opVal)
            parts.push(`${prefix}${col} = ANY($${params.length})`)
          }
        } else if (op === 'not') {
          if (opVal === null) {
            parts.push(`${prefix}${col} IS NOT NULL`)
          } else {
            params.push(opVal)
            parts.push(`${prefix}${col} != $${params.length}`)
          }
        } else if (op === 'contains') {
          const mode = (val as any).mode || 'default'
          params.push(`%${opVal}%`)
          if (mode === 'insensitive') {
            parts.push(`${prefix}${col} ILIKE $${params.length}`)
          } else {
            parts.push(`${prefix}${col} LIKE $${params.length}`)
          }
        } else if (op === 'startsWith') {
          const mode = (val as any).mode || 'default'
          params.push(`${opVal}%`)
          if (mode === 'insensitive') {
            parts.push(`${prefix}${col} ILIKE $${params.length}`)
          } else {
            parts.push(`${prefix}${col} LIKE $${params.length}`)
          }
        } else if (op === 'endsWith') {
          const mode = (val as any).mode || 'default'
          params.push(`%${opVal}`)
          if (mode === 'insensitive') {
            parts.push(`${prefix}${col} ILIKE $${params.length}`)
          } else {
            parts.push(`${prefix}${col} LIKE $${params.length}`)
          }
        } else if (op === 'lt') {
          params.push(opVal)
          parts.push(`${prefix}${col} < $${params.length}`)
        } else if (op === 'gt') {
          params.push(opVal)
          parts.push(`${prefix}${col} > $${params.length}`)
        } else if (op === 'lte') {
          params.push(opVal)
          parts.push(`${prefix}${col} <= $${params.length}`)
        } else if (op === 'gte') {
          params.push(opVal)
          parts.push(`${prefix}${col} >= $${params.length}`)
        } else if (op === 'isSet') {
          if (opVal) {
            parts.push(`${prefix}${col} IS NOT NULL`)
          } else {
            parts.push(`${prefix}${col} IS NULL`)
          }
        } else if (op === 'equals') {
          if (opVal === null) {
            parts.push(`${prefix}${col} IS NULL`)
          } else {
            params.push(opVal)
            parts.push(`${prefix}${col} = $${params.length}`)
          }
        }
      }
    }
  }

  return parts.length > 0 ? parts.join(' AND ') : 'TRUE'
}

// ═══════════════════════════════════════════════════════════════
// ORDER BY BUILDER
// ═══════════════════════════════════════════════════════════════

function buildOrderBy(
  model: string,
  orderBy: any,
  params: any[]
): string {
  if (!orderBy) return ''

  const parts: string[] = []

  if (typeof orderBy === 'object' && !Array.isArray(orderBy)) {
    for (const [key, val] of Object.entries(orderBy)) {
      if (typeof val === 'string') {
        const col = fieldToCol(model, key)
        parts.push(`${col} ${val.toUpperCase()}`)
      } else if (typeof val === 'object' && val !== null) {
        // { sort: 'asc', nulls: 'last' } or { _sum: { ... } }
        if ('sort' in (val as any)) {
          const col = fieldToCol(model, key)
          const v = val as { sort: string; nulls?: string }
          let part = `${col} ${v.sort.toUpperCase()}`
          if (v.nulls === 'last') part += ' NULLS LAST'
          else if (v.nulls === 'first') part += ' NULLS FIRST'
          parts.push(part)
        } else if ('_count' in (val as any) || '_sum' in (val as any)) {
          // groupBy orderBy - handled separately
          // For now, skip as groupBy handles it differently
        }
      }
    }
  } else if (Array.isArray(orderBy)) {
    for (const item of orderBy) {
      parts.push(buildOrderBy(model, item, params))
    }
  }

  return parts.length > 0 ? `ORDER BY ${parts.join(', ')}` : ''
}

// ═══════════════════════════════════════════════════════════════
// INCLUDE / SELECT RESOLVER
// ═══════════════════════════════════════════════════════════════

interface IncludeSpec {
  [key: string]: boolean | IncludeSpec | {
    select?: IncludeSpec
    include?: IncludeSpec
    where?: Record<string, any>
    orderBy?: any
    skip?: number
    take?: number
  }
}

async function resolveIncludes(
  model: string,
  rows: Record<string, any>[],
  include: IncludeSpec | undefined,
  select: IncludeSpec | undefined,
  executor: Executor
): Promise<void> {
  if (!include && !select) return
  const spec = include || select
  if (!spec) return

  for (const [relName, relSpec] of Object.entries(spec)) {
    const rel = RELATIONS[model]?.[relName]
    if (!rel) continue

    const targetTable = MODEL_TABLE[rel.targetModel]
    if (!targetTable) continue

    // Determine nested include/select for the relation
    let nestedInclude: IncludeSpec | undefined
    let nestedSelect: IncludeSpec | undefined
    let relWhere: Record<string, any> | undefined
    let relOrderBy: any
    let relTake: number | undefined

    if (typeof relSpec === 'object' && relSpec !== null) {
      if ('include' in relSpec) nestedInclude = (relSpec as any).include
      if ('select' in relSpec) nestedSelect = (relSpec as any).select
      if ('where' in relSpec) relWhere = (relSpec as any).where
      if ('orderBy' in relSpec) relOrderBy = (relSpec as any).orderBy
      if ('take' in relSpec) relTake = (relSpec as any).take
      // If the spec has non-reserved keys that look like field names, treat as include
      if (!nestedInclude && !nestedSelect) {
        const hasNested = Object.keys(relSpec as any).some(
          k => !['where', 'orderBy', 'skip', 'take', 'select', 'include'].includes(k)
        )
        if (hasNested && include) nestedInclude = relSpec as IncludeSpec
        else if (hasNested && select) nestedSelect = relSpec as IncludeSpec
      }
    }

    if (rel.isMany) {
      // Fetch all related rows for all parent rows in one query
      const parentIds = rows.map(r => r.id).filter(Boolean)
      if (parentIds.length === 0) continue

      const baseWhere: Record<string, any> = { [rel.fkColumn]: { in: parentIds } }
      // Merge relation-specific where
      const mergedWhere = relWhere ? { AND: [baseWhere, relWhere] } : baseWhere

      const params: any[] = []
      const whereSql = buildWhere(rel.targetModel, mergedWhere, params)

      let sql = `SELECT * FROM ${targetTable} WHERE ${whereSql}`

      if (relOrderBy) {
        const orderSql = buildOrderBy(rel.targetModel, relOrderBy, params)
        if (orderSql) sql += ` ${orderSql}`
      }

      if (relTake) {
        params.push(relTake)
        sql += ` LIMIT $${params.length}`
      }

      const result = await query(executor, sql, params)
      const relatedRows = result.rows.map(r => rowToFields(rel.targetModel, r))

      // Resolve nested includes recursively
      await resolveIncludes(rel.targetModel, relatedRows, nestedInclude, nestedSelect, executor)

      // Group by parent id
      const grouped: Record<string, any[]> = {}
      for (const row of relatedRows) {
        const parentId = row[colToField(rel.targetModel, rel.fkColumn)]
        if (!grouped[parentId]) grouped[parentId] = []
        grouped[parentId].push(row)
      }

      // Attach to parent rows
      for (const row of rows) {
        row[relName] = grouped[row.id] || []
      }
    } else {
      // Belongs-to: fetch related rows by FK
      const fkCol = rel.fkOnTarget || rel.fkColumn
      const fkField = colToField(model, fkCol)
      const parentFkValues = [...new Set(rows.map(r => r[fkField]).filter(Boolean))]
      if (parentFkValues.length === 0) {
        for (const row of rows) row[relName] = null
        continue
      }

      const params: any[] = []
      params.push(parentFkValues)
      const whereSql = `id = ANY($${params.length})`

      let sql = `SELECT * FROM ${targetTable} WHERE ${whereSql}`
      const result = await query(executor, sql, params)
      const relatedRows = result.rows.map(r => rowToFields(rel.targetModel, r))

      // Resolve nested includes recursively
      await resolveIncludes(rel.targetModel, relatedRows, nestedInclude, nestedSelect, executor)

      // Map by id
      const byId: Record<string, any> = {}
      for (const row of relatedRows) {
        byId[row.id] = row
      }

      // Attach to parent rows
      for (const row of rows) {
        const fkVal = row[fkField]
        row[relName] = fkVal ? (byId[fkVal] || null) : null
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// _count RESOLVER
// ═══════════════════════════════════════════════════════════════

async function resolveCounts(
  model: string,
  rows: Record<string, any>[],
  countSpec: Record<string, any> | true,
  executor: Executor
): Promise<void> {
  const rels = RELATIONS[model] || {}

  // Determine which relations to count
  let countRels: string[]
  if (countSpec === true) {
    countRels = Object.keys(rels).filter(r => rels[r].isMany)
  } else if (typeof countSpec === 'object' && 'select' in countSpec) {
    const sel = (countSpec as any).select
    countRels = Object.keys(sel).filter(k => sel[k] === true)
  } else {
    countRels = Object.keys(countSpec).filter(k => (countSpec as any)[k] === true)
  }

  for (const relName of countRels) {
    const rel = rels[relName]
    if (!rel?.isMany) continue

    const targetTable = MODEL_TABLE[rel.targetModel]
    const parentIds = rows.map(r => r.id).filter(Boolean)
    if (parentIds.length === 0) {
      for (const row of rows) {
        if (!row._count) row._count = {}
        row._count[relName] = 0
      }
      continue
    }

    const params: any[] = []
    params.push(parentIds)
    const sql = `SELECT ${rel.fkColumn} as parent_id, COUNT(*)::int as cnt FROM ${targetTable} WHERE ${rel.fkColumn} = ANY($${params.length}) GROUP BY ${rel.fkColumn}`
    const result = await query(executor, sql, params)
    const countMap: Record<string, number> = {}
    for (const row of result.rows) {
      countMap[row.parent_id] = row.cnt
    }

    for (const row of rows) {
      if (!row._count) row._count = {}
      row._count[relName] = countMap[row.id] || 0
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SELECT FIELD RESOLVER
// ═══════════════════════════════════════════════════════════════

function applySelect(rows: Record<string, any>[], select: Record<string, any>): Record<string, any>[] {
  return rows.map(row => {
    const out: Record<string, any> = {}
    for (const [key, val] of Object.entries(select)) {
      if (val === true) {
        if (key in row) out[key] = row[key]
      } else if (typeof val === 'object' && val !== null) {
        // Nested select/include on relation
        if (key in row) {
          if (Array.isArray(row[key])) {
            out[key] = applySelect(row[key], val)
          } else if (row[key] && typeof row[key] === 'object') {
            out[key] = applySelect([row[key]], val)[0]
          } else {
            out[key] = row[key]
          }
        }
      }
    }
    // Always include _count if present
    if (row._count) out._count = row._count
    return out
  })
}

// ═══════════════════════════════════════════════════════════════
// NESTED CREATE HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleNestedCreate(
  model: string,
  data: Record<string, any>,
  parentId: string,
  executor: Executor
): Promise<void> {
  const rels = RELATIONS[model] || {}
  const table = MODEL_TABLE[model]

  for (const [key, val] of Object.entries(data)) {
    const rel = rels[key]
    if (!rel) continue
    if (typeof val !== 'object' || val === null) continue

    if ('create' in val) {
      const createData = val.create
      const targetTable = MODEL_TABLE[rel.targetModel]
      const items = Array.isArray(createData) ? createData : [createData]

      for (const item of items) {
        // Set the FK to the parent id
        const itemWithFk = { ...item, [colToField(rel.targetModel, rel.fkColumn)]: parentId }
        const cols = dataToColumns(rel.targetModel, itemWithFk)
        const colNames = Object.keys(cols)
        const params = Object.values(cols)
        const placeholders = params.map((_, i) => `$${i + 1}`).join(', ')
        const sql = `INSERT INTO ${targetTable} (${colNames.join(', ')}) VALUES (${placeholders})`
        await query(executor, sql, params)
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// MODEL ADAPTER
// ═══════════════════════════════════════════════════════════════

function createModelAdapter(model: string, getExecutor: () => Executor) {
  const table = MODEL_TABLE[model]

  return {
    async findMany(args?: {
      where?: Record<string, any>
      include?: IncludeSpec
      select?: IncludeSpec
      orderBy?: any
      skip?: number
      take?: number
      distinct?: string | string[]
    }): Promise<any[]> {
      const exec = getExecutor()
      const params: any[] = []
      const where = args?.where
      const whereSql = where ? buildWhere(model, where, params) : 'TRUE'

      let sql = `SELECT * FROM ${table} WHERE ${whereSql}`

      if (args?.orderBy) {
        const orderSql = buildOrderBy(model, args.orderBy, params)
        if (orderSql) sql += ` ${orderSql}`
      }

      if (args?.skip) {
        params.push(args.skip)
        sql += ` OFFSET $${params.length}`
      }
      if (args?.take) {
        params.push(args.take)
        sql += ` LIMIT $${params.length}`
      }

      const result = await query(exec, sql, params)
      let rows = result.rows.map(r => rowToFields(model, r))

      // Resolve includes
      const hasInclude = args?.include
      const hasSelectWithRelations = args?.select && Object.values(args.select!).some(
        v => typeof v === 'object' && v !== null && v !== true
      )

      if (hasInclude || hasSelectWithRelations) {
        await resolveIncludes(model, rows, args?.include, args?.select as IncludeSpec, exec)
      }

      // Resolve _count
      const selectObj = args?.select as Record<string, any> | undefined
      const includeObj = args?.include as Record<string, any> | undefined
      const countSpec = selectObj?._count || includeObj?._count
      if (countSpec) {
        await resolveCounts(model, rows, countSpec, exec)
      }

      // Apply select filtering
      if (args?.select) {
        const selectWithoutCount = { ...args.select } as Record<string, any>
        delete selectWithoutCount._count
        rows = applySelect(rows, selectWithoutCount)
      }

      return rows
    },

    async findUnique(args: {
      where: Record<string, any>
      include?: IncludeSpec
      select?: IncludeSpec
    }): Promise<any | null> {
      const exec = getExecutor()
      const params: any[] = []
      const whereSql = buildWhere(model, args.where, params)

      const sql = `SELECT * FROM ${table} WHERE ${whereSql} LIMIT 1`
      const result = await query(exec, sql, params)

      if (result.rows.length === 0) return null

      let row = rowToFields(model, result.rows[0])
      const rows = [row]

      // Resolve includes
      if (args.include || args.select) {
        await resolveIncludes(model, rows, args.include, args.select as IncludeSpec, exec)
      }

      // Resolve _count
      const selectObj = args.select as Record<string, any> | undefined
      const includeObj = args.include as Record<string, any> | undefined
      const countSpec = selectObj?._count || includeObj?._count
      if (countSpec) {
        await resolveCounts(model, rows, countSpec, exec)
      }

      // Apply select filtering
      if (args.select) {
        const filtered = applySelect(rows, { ...args.select, _count: true } as Record<string, any>)
        row = filtered[0]
      } else {
        row = rows[0]
      }

      return row
    },

    async findFirst(args?: {
      where?: Record<string, any>
      include?: IncludeSpec
      select?: IncludeSpec
      orderBy?: any
    }): Promise<any | null> {
      const exec = getExecutor()
      const params: any[] = []
      const where = args?.where
      const whereSql = where ? buildWhere(model, where, params) : 'TRUE'

      let sql = `SELECT * FROM ${table} WHERE ${whereSql}`

      if (args?.orderBy) {
        const orderSql = buildOrderBy(model, args.orderBy, params)
        if (orderSql) sql += ` ${orderSql}`
      }

      sql += ' LIMIT 1'

      const result = await query(exec, sql, params)
      if (result.rows.length === 0) return null

      let row = rowToFields(model, result.rows[0])
      const rows = [row]

      if (args?.include || args?.select) {
        await resolveIncludes(model, rows, args?.include, args?.select as IncludeSpec, exec)
      }

      const selectObj = args?.select as Record<string, any> | undefined
      const includeObj = args?.include as Record<string, any> | undefined
      const countSpec = selectObj?._count || includeObj?._count
      if (countSpec) {
        await resolveCounts(model, rows, countSpec, exec)
      }

      if (args?.select) {
        const filtered = applySelect(rows, { ...args.select, _count: true } as Record<string, any>)
        row = filtered[0]
      } else {
        row = rows[0]
      }

      return row
    },

    async create(args: {
      data: Record<string, any>
      include?: IncludeSpec
      select?: IncludeSpec
    }): Promise<any> {
      const exec = getExecutor()
      const data = args.data

      // Separate nested creates from scalar data
      const scalarData: Record<string, any> = {}
      const nestedData: Record<string, any> = {}
      for (const [key, val] of Object.entries(data)) {
        const rel = RELATIONS[model]?.[key]
        if (rel && typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
          nestedData[key] = val
        } else {
          scalarData[key] = val
        }
      }

      const cols = dataToColumns(model, scalarData)
      const colNames = Object.keys(cols)
      const params = Object.values(cols)
      const placeholders = params.map((_, i) => `$${i + 1}`).join(', ')

      const sql = `INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const result = await query(exec, sql, params)
      if (result.rows.length === 0) throw new Error('Create returned no rows')

      let row = rowToFields(model, result.rows[0])

      // Handle nested creates
      for (const [key, val] of Object.entries(nestedData)) {
        if (val && typeof val === 'object' && 'create' in val) {
          await handleNestedCreate(model, { [key]: val }, row.id, exec)
        }
      }

      // Resolve includes on the created row
      if (args.include || args.select) {
        const rows = [row]
        await resolveIncludes(model, rows, args.include, args.select as IncludeSpec, exec)
        row = rows[0]
      }

      return row
    },

    async update(args: {
      where: Record<string, any>
      data: Record<string, any>
      include?: IncludeSpec
      select?: IncludeSpec
    }): Promise<any> {
      const exec = getExecutor()

      // Separate nested creates from scalar data
      const scalarData: Record<string, any> = {}
      const nestedData: Record<string, any> = {}
      for (const [key, val] of Object.entries(args.data)) {
        const rel = RELATIONS[model]?.[key]
        if (rel && typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
          nestedData[key] = val
        } else {
          scalarData[key] = val
        }
      }

      const cols = dataToColumns(model, scalarData)
      if (Object.keys(cols).length === 0 && Object.keys(nestedData).length === 0) {
        // No data to update, just fetch
        return this.findUnique({ where: args.where, include: args.include, select: args.select })
      }

      const setParts: string[] = []
      const params: any[] = []

      if (Object.keys(cols).length > 0) {
        for (const [col, val] of Object.entries(cols)) {
          params.push(val)
          setParts.push(`${col} = $${params.length}`)
        }
      }

      const whereParams: any[] = []
      const whereSql = buildWhere(model, args.where, whereParams)
      // Re-index where params after set params
      const reindexedWhere = whereSql.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + params.length}`)
      params.push(...whereParams)

      const sql = `UPDATE ${table} SET ${setParts.join(', ')} WHERE ${reindexedWhere} RETURNING *`
      const result = await query(exec, sql, params)
      if (result.rows.length === 0) {
        const err: any = new Error(`Record not found for update on ${model}`)
        err.code = 'P2025'
        throw err
      }

      let row = rowToFields(model, result.rows[0])

      // Handle nested creates
      for (const [key, val] of Object.entries(nestedData)) {
        if (val && typeof val === 'object' && 'create' in val) {
          await handleNestedCreate(model, { [key]: val }, row.id, exec)
        }
      }

      if (args.include || args.select) {
        const rows = [row]
        await resolveIncludes(model, rows, args.include, args.select as IncludeSpec, exec)
        row = rows[0]
      }

      return row
    },

    async delete(args: {
      where: Record<string, any>
    }): Promise<any> {
      const exec = getExecutor()
      const params: any[] = []
      const whereSql = buildWhere(model, args.where, params)

      const sql = `DELETE FROM ${table} WHERE ${whereSql} RETURNING *`
      const result = await query(exec, sql, params)
      if (result.rows.length === 0) {
        const err: any = new Error(`Record not found for delete on ${model}`)
        err.code = 'P2025'
        throw err
      }
      return rowToFields(model, result.rows[0])
    },

    async deleteMany(args?: {
      where?: Record<string, any>
    }): Promise<{ count: number }> {
      const exec = getExecutor()
      const params: any[] = []
      const where = args?.where
      const whereSql = where ? buildWhere(model, where, params) : 'TRUE'

      const sql = `DELETE FROM ${table} WHERE ${whereSql}`
      const result = await query(exec, sql, params)
      return { count: result.rowCount ?? 0 }
    },

    async updateMany(args: {
      where?: Record<string, any>
      data: Record<string, any>
    }): Promise<{ count: number }> {
      const exec = getExecutor()
      const cols = dataToColumns(model, args.data)

      const setParts: string[] = []
      const params: any[] = []

      for (const [col, val] of Object.entries(cols)) {
        params.push(val)
        setParts.push(`${col} = $${params.length}`)
      }

      const where = args.where
      const whereParams: any[] = []
      const whereSql = where ? buildWhere(model, where, whereParams) : 'TRUE'
      const reindexedWhere = whereSql.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + params.length}`)
      params.push(...whereParams)

      const sql = `UPDATE ${table} SET ${setParts.join(', ')} WHERE ${reindexedWhere}`
      const result = await query(exec, sql, params)
      return { count: result.rowCount ?? 0 }
    },

    async count(args?: {
      where?: Record<string, any>
    }): Promise<number> {
      const exec = getExecutor()
      const params: any[] = []
      const where = args?.where
      const whereSql = where ? buildWhere(model, where, params) : 'TRUE'

      const sql = `SELECT COUNT(*)::int as cnt FROM ${table} WHERE ${whereSql}`
      const result = await query(exec, sql, params)
      return result.rows[0]?.cnt ?? 0
    },

    async aggregate(args: {
      where?: Record<string, any>
      _sum?: Record<string, boolean>
      _count?: boolean | Record<string, boolean>
      _avg?: Record<string, boolean>
      _min?: Record<string, boolean>
      _max?: Record<string, boolean>
    }): Promise<any> {
      const exec = getExecutor()
      const params: any[] = []
      const where = args.where
      const whereSql = where ? buildWhere(model, where, params) : 'TRUE'

      const selectParts: string[] = []

      if (args._sum) {
        for (const [field, val] of Object.entries(args._sum)) {
          if (val) {
            const col = fieldToCol(model, field)
            selectParts.push(`SUM(${col}) as sum_${col}`)
          }
        }
      }

      if (args._count === true) {
        selectParts.push('COUNT(*)::int as cnt')
      } else if (typeof args._count === 'object' && args._count) {
        for (const [field, val] of Object.entries(args._count)) {
          if (val) {
            const col = fieldToCol(model, field)
            selectParts.push(`COUNT(${col})::int as cnt_${col}`)
          }
        }
      }

      if (args._avg) {
        for (const [field, val] of Object.entries(args._avg)) {
          if (val) {
            const col = fieldToCol(model, field)
            selectParts.push(`AVG(${col}) as avg_${col}`)
          }
        }
      }

      if (args._min) {
        for (const [field, val] of Object.entries(args._min)) {
          if (val) {
            const col = fieldToCol(model, field)
            selectParts.push(`MIN(${col}) as min_${col}`)
          }
        }
      }

      if (args._max) {
        for (const [field, val] of Object.entries(args._max)) {
          if (val) {
            const col = fieldToCol(model, field)
            selectParts.push(`MAX(${col}) as max_${col}`)
          }
        }
      }

      if (selectParts.length === 0) selectParts.push('COUNT(*)::int as cnt')

      const sql = `SELECT ${selectParts.join(', ')} FROM ${table} WHERE ${whereSql}`
      const result = await query(exec, sql, params)
      const row = result.rows[0] || {}

      // Transform back to Prisma-like result
      const out: Record<string, any> = {}

      if (args._sum) {
        out._sum = {}
        for (const [field] of Object.entries(args._sum)) {
          const col = fieldToCol(model, field)
          out._sum[field] = row[`sum_${col}`] ?? null
        }
      }

      if (args._count === true) {
        out._count = row.cnt ?? 0
      } else if (typeof args._count === 'object' && args._count) {
        out._count = {}
        for (const [field] of Object.entries(args._count)) {
          const col = fieldToCol(model, field)
          out._count[field] = row[`cnt_${col}`] ?? 0
        }
      }

      if (args._avg) {
        out._avg = {}
        for (const [field] of Object.entries(args._avg)) {
          const col = fieldToCol(model, field)
          out._avg[field] = row[`avg_${col}`] ?? null
        }
      }

      if (args._min) {
        out._min = {}
        for (const [field] of Object.entries(args._min)) {
          const col = fieldToCol(model, field)
          out._min[field] = row[`min_${col}`] ?? null
        }
      }

      if (args._max) {
        out._max = {}
        for (const [field] of Object.entries(args._max)) {
          const col = fieldToCol(model, field)
          out._max[field] = row[`max_${col}`] ?? null
        }
      }

      return out
    },

    async groupBy(args: {
      by: string | string[]
      where?: Record<string, any>
      _count?: boolean | Record<string, boolean>
      _sum?: Record<string, boolean>
      _avg?: Record<string, boolean>
      orderBy?: any
      having?: Record<string, any>
    }): Promise<any[]> {
      const exec = getExecutor()
      const params: any[] = []
      const by = Array.isArray(args.by) ? args.by : [args.by]
      const byCols = by.map(f => fieldToCol(model, f))

      const where = args.where
      const whereSql = where ? buildWhere(model, where, params) : 'TRUE'

      const selectParts = [...byCols]
      const groupByParts = [...byCols]

      if (args._count === true) {
        selectParts.push('COUNT(*)::int as _count')
      } else if (typeof args._count === 'object' && args._count) {
        for (const [field, val] of Object.entries(args._count)) {
          if (val) {
            const col = fieldToCol(model, field)
            selectParts.push(`COUNT(${col})::int as _count_${col}`)
          }
        }
      }

      if (args._sum) {
        for (const [field, val] of Object.entries(args._sum)) {
          if (val) {
            const col = fieldToCol(model, field)
            selectParts.push(`SUM(${col}) as _sum_${col}`)
          }
        }
      }

      if (args._avg) {
        for (const [field, val] of Object.entries(args._avg)) {
          if (val) {
            const col = fieldToCol(model, field)
            selectParts.push(`AVG(${col}) as _avg_${col}`)
          }
        }
      }

      let sql = `SELECT ${selectParts.join(', ')} FROM ${table} WHERE ${whereSql} GROUP BY ${groupByParts.join(', ')}`

      // Handle orderBy for groupBy
      if (args.orderBy) {
        const orderParts: string[] = []
        if (typeof args.orderBy === 'object' && !Array.isArray(args.orderBy)) {
          for (const [key, val] of Object.entries(args.orderBy)) {
            if (key === '_count') {
              if (typeof val === 'object') {
                for (const [f, dir] of Object.entries(val as Record<string, any>)) {
                  const col = fieldToCol(model, f)
                  orderParts.push(`COUNT(${col}) ${String(dir).toUpperCase()}`)
                }
              }
            } else if (key === '_sum') {
              if (typeof val === 'object') {
                for (const [f, dir] of Object.entries(val as Record<string, any>)) {
                  const col = fieldToCol(model, f)
                  orderParts.push(`SUM(${col}) ${String(dir).toUpperCase()}`)
                }
              }
            } else {
              const col = fieldToCol(model, key)
              orderParts.push(`${col} ${String(val).toUpperCase()}`)
            }
          }
        }
        if (orderParts.length > 0) {
          sql += ` ORDER BY ${orderParts.join(', ')}`
        }
      }

      const result = await query(exec, sql, params)

      // Transform results
      return result.rows.map(row => {
        const out: Record<string, any> = {}

        // Map groupBy fields
        for (const field of by) {
          const col = fieldToCol(model, field)
          out[field] = row[col]
        }

        // Map aggregates
        if (args._count === true) {
          out._count = row._count ?? 0
        } else if (typeof args._count === 'object' && args._count) {
          out._count = {}
          for (const [field] of Object.entries(args._count)) {
            const col = fieldToCol(model, field)
            out._count[field] = row[`_count_${col}`] ?? 0
          }
        }

        if (args._sum) {
          out._sum = {}
          for (const [field] of Object.entries(args._sum)) {
            const col = fieldToCol(model, field)
            out._sum[field] = row[`_sum_${col}`] ?? null
          }
        }

        if (args._avg) {
          out._avg = {}
          for (const [field] of Object.entries(args._avg)) {
            const col = fieldToCol(model, field)
            out._avg[field] = row[`_avg_${col}`] ?? null
          }
        }

        return out
      })
    },

    async upsert(args: {
      where: Record<string, any>
      create: Record<string, any>
      update: Record<string, any>
      include?: IncludeSpec
    }): Promise<any> {
      const exec = getExecutor()
      // Try to find first
      const existing = await this.findUnique({ where: args.where })
      if (existing) {
        return this.update({ where: args.where, data: args.update, include: args.include })
      }
      return this.create({ data: args.create, include: args.include })
    },

    async createMany(args: {
      data: Record<string, any> | Record<string, any>[]
      skipDuplicates?: boolean
    }): Promise<{ count: number }> {
      const exec = getExecutor()
      const items = Array.isArray(args.data) ? args.data : [args.data]

      if (items.length === 0) return { count: 0 }

      let count = 0
      for (const item of items) {
        const cols = dataToColumns(model, item)
        const colNames = Object.keys(cols)
        const params = Object.values(cols)
        const placeholders = params.map((_, i) => `$${i + 1}`).join(', ')

        let sql = `INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`
        if (args.skipDuplicates) {
          sql += ' ON CONFLICT DO NOTHING'
        }

        const result = await query(exec, sql, params)
        count += result.rowCount ?? 0
      }

      return { count }
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// DB OBJECT WITH TRANSACTIONS
// ═══════════════════════════════════════════════════════════════

function createDb(executor?: Executor) {
  const getExecutor = () => executor || pool

  const models: Record<string, any> = {}
  for (const model of Object.keys(MODEL_TABLE)) {
    models[model] = createModelAdapter(model, getExecutor)
  }

  // Transaction support
  const $transaction = async (fnOrOps: ((tx: any) => Promise<any>) | Promise<any>[], options?: { maxWait?: number; timeout?: number }): Promise<any> => {
    if (typeof fnOrOps === 'function') {
      // Interactive transaction
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const txDb = createDb(client)
        const result = await fnOrOps(txDb)
        await client.query('COMMIT')
        return result
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    } else {
      // Batch transaction
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const results = []
        for (const op of fnOrOps) {
          results.push(await op)
        }
        await client.query('COMMIT')
        return results
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }
  }

  // Raw query support
  const $queryRaw = async <T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> => {
    const exec = getExecutor()
    let sql = strings[0]
    const params: any[] = []
    for (let i = 0; i < values.length; i++) {
      params.push(values[i])
      sql += `$${params.length}${strings[i + 1] || ''}`
    }
    const result = await query<T>(exec, sql, params)
    return result.rows
  }

  const $executeRaw = async (strings: TemplateStringsArray, ...values: any[]): Promise<number> => {
    const exec = getExecutor()
    let sql = strings[0]
    const params: any[] = []
    for (let i = 0; i < values.length; i++) {
      params.push(values[i])
      sql += `$${params.length}${strings[i + 1] || ''}`
    }
    const result = await query(exec, sql, params)
    return result.rowCount ?? 0
  }

  const $queryRawUnsafe = async <T = any>(sql: string, ...params: any[]): Promise<T[]> => {
    const exec = getExecutor()
    const result = await query<T>(exec, sql, params)
    return result.rows
  }

  return {
    ...models,
    $transaction,
    $queryRaw,
    $executeRaw,
    $queryRawUnsafe,
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS (same API as the old Prisma-based db.ts)
// ═══════════════════════════════════════════════════════════════

/** Get a database adapter instance. For API routes — uses the shared pool. */
export function getDb() {
  return createDb()
}

/** Type of the database adapter instance (replaces PrismaClient type) */
export type DbClient = ReturnType<typeof getDb>

/** Legacy singleton — same as getDb() for backward compatibility. */
export const db = createDb()
