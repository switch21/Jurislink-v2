import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hasPermission } from '@/lib/rbac'

/** UUID v4 regex — validates format before hitting Prisma */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: string // normalized from roleObj.name in getAuthUser
  roleId: string | null
  tenantId: string | null
  isActive: boolean
}

/**
 * Extract authenticated user from request headers.
 * Looks for X-User-Id header, validates against DB.
 * Optionally validates X-Tenant-Id matches user's tenant.
 */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const userId = request.headers.get('x-user-id')
  if (!userId || !UUID_RE.test(userId)) return null

  try {
    const db = getDb()
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        roleId: true,
        tenantId: true,
        isActive: true,
        tenant: { select: { isActive: true } },
        roleObj: { select: { name: true } },
      },
    })
    await db.$disconnect().catch(() => {})

    if (!user || !user.isActive) return null
    if (user.tenant && !user.tenant.isActive) return null
    // Normalize role: use roleObj.name (the real role) instead of the default 'lawyer' string
    const { roleObj, ...rest } = user
    return { ...rest, role: roleObj?.name ?? user.role }
  } catch {
    return null
  }
}

/**
 * Get authenticated user or return 401 response.
 */
export async function requireAuth(request: Request): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  return user
}

/**
 * Require root_admin role.
 */
export async function requireRootAdmin(request: Request): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.role !== 'root_admin') {
    return NextResponse.json({ error: 'Accès réservé à l\'administrateur' }, { status: 403 })
  }
  return user
}

/**
 * Check RBAC permission for a resource+action.
 * root_admin always passes. Others checked via rolePermission table.
 * Returns true if allowed, or a 403 NextResponse if not.
 */
export async function checkPermission(
  user: AuthUser,
  resource: string,
  action: string,
): Promise<true | NextResponse> {
  if (user.role === 'root_admin') return true
  const allowed = await hasPermission(user.roleId, resource, action)
  if (!allowed) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  return true
}

/**
 * Combined auth + permission check. Returns user or error response.
 * Usage:
 *   const auth = await authenticate(request, 'cases', 'create')
 *   if (auth instanceof NextResponse) return auth
 *   // auth is AuthUser
 */
export async function authenticate(
  request: Request,
  resource?: string,
  action?: string,
): Promise<AuthUser | NextResponse> {
  const userOrErr = await requireAuth(request)
  if (userOrErr instanceof NextResponse) return userOrErr

  if (resource && action) {
    const permOrErr = await checkPermission(userOrErr, resource, action)
    if (permOrErr instanceof NextResponse) return permOrErr
  }

  return userOrErr
}

/**
 * Ensure the user's tenantId matches a given tenantId.
 * root_admin bypasses this check.
 */
export function requireTenantAccess(
  user: AuthUser,
  resourceTenantId: string | null | undefined,
): boolean {
  if (user.role === 'root_admin') return true
  if (!resourceTenantId) return true
  return user.tenantId === resourceTenantId
}

/** Helper to check if result is an error response */
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}
