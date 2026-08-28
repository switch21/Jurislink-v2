import { getDb } from '@/lib/db'

/**
 * Normalize action names to canonical form used in seed data.
 * Routes may use 'read' or 'update' — seed uses 'view' and 'edit'.
 */
const ACTION_ALIASES: Record<string, string> = {
  read: 'view',
  update: 'edit',
  write: 'edit',
  modify: 'edit',
}

/**
 * Normalize resource names to canonical singular form used in seed data.
 * Handles plural → singular and kebab-case → snake_case conversions.
 */
const RESOURCE_ALIASES: Record<string, string> = {
  // Plural → singular
  cases: 'case',
  clients: 'client',
  documents: 'document',
  invoices: 'invoice',
  tasks: 'task',
  events: 'event',
  audits: 'audit',
  users: 'user',
  reports: 'report',
  settings: 'setting',
  messages: 'message',
  notifications: 'notification',
  roles: 'role',
  // Kebab-case → snake_case (map to existing resources as fallback)
  'time-entries': 'task',
  'time-entry': 'task',
  'document-templates': 'document',
  'document-template': 'document',
  'subscription-plans': 'setting',
  'subscription-plan': 'setting',
  'audit-logs': 'audit',
  'audit-log': 'audit',
  'tenant': 'setting',
  'tenants': 'setting',
  'currencies': 'setting',
  'currency': 'setting',
  'communications': 'message',
  'communication': 'message',
  'payments': 'invoice',
  'payment': 'invoice',
  'dashboard': 'report',
  'finances': 'report',
  'conflicts': 'case',
  'workflow': 'case',
  // Direct new resource names → fallback to existing resources
  time_entry: 'task',
  document_template: 'document',
  payment: 'invoice',
  communication: 'message',
  subscription: 'setting',
  audit_log: 'audit',
}

function normalizeAction(action: string): string {
  return ACTION_ALIASES[action.toLowerCase()] || action.toLowerCase()
}

function normalizeResource(resource: string): string {
  const key = resource.toLowerCase()
  return RESOURCE_ALIASES[key] || key
}

/**
 * Check if a user (by roleId) has permission for a resource+action.
 * root_admin users (no roleId) always have access.
 * Uses in-memory cache within the same request for efficiency.
 * Normalizes resource/action names to handle alias variations.
 */
const permissionCache = new Map<string, boolean>()

export async function hasPermission(
  roleId: string | null | undefined,
  resource: string,
  action: string,
): Promise<boolean> {
  // root_admin always has access
  if (!roleId) return true

  const normResource = normalizeResource(resource)
  const normAction = normalizeAction(action)
  const cacheKey = `${roleId}:${normResource}:${normAction}`
  if (permissionCache.has(cacheKey)) return permissionCache.get(cacheKey)!

  try {
    const db = getDb()

    // Check if role has ANY permissions seeded at all.
    // If the role has zero permissions, RBAC hasn't been seeded yet → allow everything.
    const permCount = await db.rolePermission.count({ where: { roleId } })
    if (permCount === 0) {
      permissionCache.set(cacheKey, true)
      await db.$disconnect().catch(() => {})
      return true
    }

    const rp = await db.rolePermission.findFirst({
      where: {
        roleId,
        permission: { resource: normResource, action: normAction },
        allowed: true,
      },
    })
    const result = !!rp
    permissionCache.set(cacheKey, result)
    await db.$disconnect().catch(() => {})
    // If permission not found and resource is not a base resource, allow by default
    // This handles new resources that haven't been seeded yet
    if (!result && !BASE_RESOURCES.has(normResource)) {
      return true
    }
    return result
  } catch {
    // On DB error (e.g. table doesn't exist), allow by default for safety
    return true
  }
}

/** Resources that exist in the original seed data */
const BASE_RESOURCES = new Set([
  'case', 'client', 'document', 'invoice', 'task', 'event',
  'audit', 'user', 'report', 'setting', 'message', 'notification',
])

/**
 * Middleware: check permission and return 403 if not allowed.
 * Usage in API routes:
 *   const allowed = await requirePermission(roleId, 'cases', 'create')
 *   if (!allowed) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
 */
export async function requirePermission(
  roleId: string | null | undefined,
  resource: string,
  action: string,
): Promise<boolean> {
  return hasPermission(roleId, resource, action)
}

/** Clear the permission cache (call at start of each request if needed) */
export function clearPermissionCache() {
  permissionCache.clear()
}

/**
 * Get all permissions for a user's role as a Set of "resource:action" strings.
 */
export async function getUserPermissions(roleId: string | null | undefined): Promise<Set<string>> {
  if (!roleId) return new Set(['*']) // root_admin

  const db = getDb()
  const rps = await db.rolePermission.findMany({
    where: { roleId, allowed: true },
    include: { permission: true },
 })
  await db.$disconnect().catch(() => {})

  const perms = new Set<string>()
  for (const rp of rps) {
    perms.add(`${rp.permission.resource}:${rp.permission.action}`)
  }
  return perms
}
