import { getDb } from '@/lib/db'

/**
 * Check if a user (by roleId) has permission for a resource+action.
 * root_admin users (no roleId) always have access.
 * Uses in-memory cache within the same request for efficiency.
 */
const permissionCache = new Map<string, boolean>()

export async function hasPermission(
  roleId: string | null | undefined,
   resource: string,
  action: string,
): Promise<boolean> {
  // root_admin always has access
  if (!roleId) return true

  const cacheKey = `${roleId}:${resource}:${action}`
  if (permissionCache.has(cacheKey)) return permissionCache.get(cacheKey)!

  try {
    const db = getDb()
    const rp = await db.rolePermission.findFirst({
      where: {
        roleId,
        permission: { resource, action },
        allowed: true,
      },
    })
    const result = !!rp
    permissionCache.set(cacheKey, result)
    await db.$disconnect().catch(() => {})
    return result
  } catch {
    return false
  }
}

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
