// Auto-extracted types from page.tsx split
// ==================== Types ====================
export interface Client {
  id: string; fullName: string; company?: string | null;
  clientType?: string; niu?: string | null; email?: string | null;
  phone?: string | null; address?: string | null; city?: string | null; country?: string | null;
  notes?: string | null; riskLevel?: string; source?: string | null;
  status?: string; responsibleLawyerId?: string | null;
  isActive: boolean; tenantId: string; createdAt: string; _count?: { cases: number; invoices: number };
}
export interface CaseItem {
  id: string; reference: string; title: string; description?: string | null; caseType: string;
  status: string; priority: string; isSecret: boolean;
  createdAt: string; tenantId: string; clientId: string;
  adversary?: string | null; jurisdiction?: string | null; amountInDispute?: number | null;
  billingType?: string | null;
  client?: Client; assignments?: CaseAssignment[]; notes?: CaseNote[]; documents?: Doc[]; events?: EventItem[];
}
export interface CaseAssignment { id: string; userId: string; caseId: string; user?: UserItem }
export interface CaseNote { id: string; content: string; createdAt: string; authorId?: string | null; author?: UserItem }
export interface Doc {
  id: string; fileName: string; fileSize: number; filePath: string;
  version: number; folder?: string | null; tags?: string | null;
  documentType?: string | null; mimeType?: string | null;
  description?: string | null;
  createdAt: string; updatedAt?: string | null;
  tenantId: string; caseId?: string | null;
  case?: CaseItem;
  uploadedBy?: { id: string; fullName: string; email: string } | null;
  _count?: { versions: number };
}
export interface EventItem {
  id: string; title: string; description?: string | null; startTime: string; endTime?: string | null;
  eventType: string; criticality: string; createdAt: string;
  tenantId: string; caseId?: string | null; case?: CaseItem; assignments?: EventAssignment[];
}
export interface EventAssignment { id: string; userId: string; eventId: string; user?: UserItem }
export interface InvoiceLineItem { id: string; description: string; quantity: number; unitPrice: number; total: number; sortOrder: number; invoiceId: string }
export interface Payment {
  id: string; amount: number; method: string; reference?: string | null; status: string; paidAt: string; notes?: string | null; createdAt: string;
  tenantId: string; invoiceId: string; recordedBy?: string | null; recorder?: UserItem;
  invoice?: { id: string; invoiceNumber?: string | null; client?: { id: string; fullName: string } };
}
export interface Invoice {
  id: string; invoiceNumber?: string | null; type: string; amount: number; paidAmount: number; status: string; dueDate?: string | null;
  notes?: string | null; billingType?: string | null; createdAt: string; issuedAt?: string | null;
  reminderLevel?: number; lastReminderAt?: string | null;
  tenantId: string; clientId: string; client?: Client; caseId?: string | null; case?: CaseItem;
  currencyId?: string | null; currency?: CurrencyItem;
  lineItems?: InvoiceLineItem[]; payments?: Payment[];
  daysOverdue?: number; totalPaid?: number; remaining?: number;
  suggestedAction?: { level: number; label: string; color: string; method: string } | null;
  currentLevelLabel?: string | null; currentLevelColor?: string | null;
  _count?: { reminders: number; payments: number };
}
export interface Message {
  id: string; content: string; createdAt: string; tenantId: string;
  senderId: string; receiverId: string; sender?: UserItem; receiver?: UserItem;
}
export interface Notification {
  id: string; title: string; message: string; category: string; read: boolean;
  resourceType?: string | null; resourceId?: string | null; createdAt: string;
}
export interface AuditLogItem {
  id: string; action: string; resourceType?: string | null; resourceId?: string | null;
  metadata?: string | null; ipAddress?: string | null; userAgent?: string | null;
  timestamp: string; tenantId: string; userId?: string | null; user?: UserItem;
}
export interface UserItem {
  id: string; email: string; fullName: string; role: string; tenantId?: string | null;
  phone?: string | null; avatarUrl?: string | null; preferredLanguage?: string; isActive?: boolean;
}
export interface TenantItem {
  id: string; name: string; slug: string; plan: string; maxUsers: number; maxStorageGb: number;
  isActive: boolean; createdAt: string; phone?: string | null; email?: string | null; address?: string | null; city?: string | null; country?: string | null; niu?: string | null; logoUrl?: string | null;
  _count?: { users: number; clients: number; cases: number; invoices?: number; documents?: number; events?: number; tasks?: number; payments?: number; notifications?: number; auditLogs?: number };
}
export interface AdminDashboardData {
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
export interface AdminTenant extends TenantItem {
  _count: { users: number; clients: number; cases: number; invoices: number; documents: number };
  subscription?: { id: string; status: string; billingPeriod: string; currentPeriodStart: string; currentPeriodEnd: string; plan: { id: string; name: string; slug: string; maxUsers: number; maxStorageGb: number } } | null;
}
export interface TaskItem {
  id: string; title: string; description?: string | null; status: string; priority: string;
  dueDate?: string | null; createdAt: string;
  tenantId: string; caseId?: string | null; eventId?: string | null;
  case?: { id: string; reference: string; title: string } | null;
  event?: { id: string; title: string } | null;
  assignedToUser?: { id: string; fullName: string } | null;
}
export interface DashboardStats {
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
  pendingDocuments?: Array<{ id: string; fileName: string; status: string; createdAt: string; caseReference: string | null; caseTitle: string | null; uploadedBy: string | null }>;
  pendingDocumentsCount?: number;
  casesWithoutDeadlines?: Array<{ id: string; reference: string; title: string; clientName: string | null; status: string; updatedAt: string; pendingTasksCount: number }>;
  casesWithoutDeadlinesCount?: number;
}
export interface ConflictResult {
  type: string; case: { id: string; reference: string; title: string; clientName: string }; description: string;
}
export interface CurrencyItem { id: string; code: string; name: string; symbol: string }
export interface TimeEntry {
  id: string; description: string; startTime: string; endTime?: string | null; duration: number;
  isBillable: boolean; hourlyRate?: number | null; totalAmount?: number | null;
  createdAt: string; tenantId: string; userId: string; caseId?: string | null;
  user?: { id: string; fullName: string };
  case?: { id: string; reference: string; title: string } | null;
}
export interface DocTemplate {
  id: string; name: string; category: string; description?: string | null;
  content: string; variables?: string | null; isActive: boolean;
  createdAt: string; updatedAt: string; tenantId: string;
}
export interface Communication {
  id: string; type: string; subject?: string | null; content: string; status: string;
  recipientEmail?: string | null; recipientPhone?: string | null; sentAt?: string | null;
  createdAt: string; tenantId: string; caseId?: string | null; clientId?: string | null; sentById?: string | null;
  case?: { id: string; reference: string; title: string } | null;
  client?: { id: string; fullName: string; email?: string | null; phone?: string | null } | null;
  sentBy?: { id: string; fullName: string } | null;
}
export interface TimeSummary {
  totalEntries: number; totalSeconds: number; totalBillableSeconds: number;
  totalAmount: number; avgDailyHours: number;
  byCase: Array<{ caseId: string; caseReference: string; caseTitle: string; totalSeconds: number; totalAmount: number }>;
}

// ==================== Portal Types ====================
export interface PortalCaseItem {
  id: string; reference: string | null; title: string; description?: string | null;
  caseType: string; status: string; priority: string; createdAt: string; updatedAt: string;
  clientId: string; tenantId: string;
  adversary?: string | null; jurisdiction?: string | null; amountInDispute?: number | null;
  assignments?: Array<{ id: string; userId: string; user?: { id: string; fullName: string; email: string; role: string; avatarUrl?: string | null } | null }>;
  _count?: { documents: number; events: number; notes: number; tasks: number };
}
export interface PortalCaseDetail extends PortalCaseItem {
  client: { id: string; fullName: string };
  documents?: Array<{ id: string; fileName: string; fileSize: number; mimeType?: string | null; version: number; createdAt: string; uploadedBy?: { id: string; fullName: string } | null }>;
  events?: Array<{ id: string; title: string; description?: string | null; startTime: string; endTime?: string | null; eventType: string; criticality: string }>;
  notes?: Array<{ id: string; content: string; createdAt: string; author?: { id: string; fullName: string } | null }>;
  tasks?: Array<{ id: string; title: string; status: string; priority: string; dueDate?: string | null; createdAt: string }>;
  invoices?: Array<{ id: string; invoiceNumber?: string | null; amount: number; status: string; issuedAt?: string | null; dueDate?: string | null }>;
  timeEntries?: Array<{ id: string; description: string; duration: number; startTime: string; user?: { id: string; fullName: string } | null; totalAmount?: number | null }>;
}
export interface PortalTimelineEntry {
  id: string; type: string; title: string; description?: string | null; date: string; author?: string | null;
  metadata?: Record<string, string | number | null>;
}
export interface PortalInvoiceItem {
  id: string; invoiceNumber?: string | null; type: string; amount: number; paidAmount: number; status: string;
  issuedAt?: string | null; dueDate?: string | null; notes?: string | null;
  createdAt: string; tenantId: string; clientId: string;
  caseId?: string | null;
  case?: { id: string; reference: string | null; title: string } | null;
  currency?: { id: string; code: string; name: string; symbol: string } | null;
  payments?: Array<{ id: string; amount: number; method: string; reference?: string | null; paidAt: string; recorder?: { id: string; fullName: string } | null }>;
  _count?: { reminders: number };
}
export interface PortalDocItem {
  id: string; fileName: string; fileSize: number; filePath: string; version: number;
  folder?: string | null; tags?: string | null; documentType?: string | null; mimeType?: string | null;
  description?: string | null; createdAt: string; updatedAt?: string | null;
  tenantId: string; caseId?: string | null;
  case?: { id: string; reference: string | null; title: string } | null;
  uploadedBy?: { id: string; fullName: string } | null;
}
export interface PortalCommunication {
  id: string; type: string; subject?: string | null; content: string; status: string;
  sentAt?: string | null; createdAt: string;
  caseId?: string | null;
  case?: { id: string; reference: string | null; title: string } | null;
  sentBy?: { id: string; fullName: string } | null;
}
export interface PortalDashboardData {
  casesByStatus: Record<string, number>;
  totalInvoicesAmount: number; totalPaid: number; totalRemaining: number;
  overdueInvoicesCount: number; activeCasesCount: number; totalCasesCount: number;
  recentCases: PortalCaseItem[]; recentInvoices: PortalInvoiceItem[];
  recentCommunications: PortalCommunication[];
}
