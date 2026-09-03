import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hasPermission } from '@/lib/rbac'

/** UUID regex — validates format before hitting Prisma (accepts all UUID versions 0-8) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: string // normalized from roleObj.name in getAuthUser
  roleId: string | null
  tenantId: string | null
  isActive: boolean
}

export type AuthFailReason = 'invalid' | 'not_found' | 'inactive' | 'tenant_inactive' | 'force_logout'

interface AuthResult {
  user: AuthUser | null
  failReason?: AuthFailReason
}

/**
 * Extract authenticated user from request headers.
 * Looks for X-User-Id header, validates against DB.
 * Checks forceLogoutAt against X-Login-At to detect forced disconnections.
 */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const result = await getAuthResult(request)
  return result.user
}

/**
 * Get detailed auth result including fail reason.
 */
async function getAuthResult(request: Request): Promise<AuthResult> {
  const userId = request.headers.get('x-user-id')
  if (!userId || !UUID_RE.test(userId)) return { user: null, failReason: 'invalid' }

  try {
    const db = getDb()
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, fullName: true, role: true,
        roleId: true, tenantId: true, isActive: true, forceLogoutAt: true,
        tenant: { select: { isActive: true } },
        roleObj: { select: { name: true } },
      },
    })
    await db.$disconnect().catch(() => {})

    if (!user) return { user: null, failReason: 'not_found' }
    if (!user.isActive) return { user: null, failReason: 'inactive' }
    if (user.tenant && !user.tenant.isActive) return { user: null, failReason: 'tenant_inactive' }

    // Check forced logout
    if (user.forceLogoutAt) {
      const clientLoginAt = request.headers.get('x-login-at')
      const loginTime = clientLoginAt ? new Date(clientLoginAt).getTime() : 0
      const forceLogoutTime = new Date(user.forceLogoutAt).getTime()
      if (forceLogoutTime > loginTime) {
        return { user: null, failReason: 'force_logout' }
      }
    }

    const { roleObj, tenant, forceLogoutAt, ...rest } = user
    return { user: { ...rest, role: roleObj?.name ?? user.role } }
  } catch {
    return { user: null, failReason: 'not_found' }
  }
}

/**
 * Get authenticated user or return 401 response.
 * Adds X-Force-Logout header when the user was forcefully disconnected.
 */
export async function requireAuth(request: Request): Promise<AuthUser | NextResponse> {
  const result = await getAuthResult(request)
  if (!result.user) {
    const headers: Record<string, string> = {}
    if (result.failReason === 'force_logout') {
      headers['X-Force-Logout'] = 'true'
    }
    return NextResponse.json(
      { error: result.failReason === 'force_logout' ? 'Vous avez été déconnecté par un administrateur' : 'Non authentifié' },
      { status: 401, headers },
    )
  }
  return result.user
}

/**
 * Require root_admin role.
 */
export async function requireRootAdmin(request: Request): Promise<AuthUser | NextResponse> {
  const userOrErr = await requireAuth(request)
  if (userOrErr instanceof NextResponse) return userOrErr
  if (userOrErr.role !== 'root_admin') {
    return NextResponse.json({ error: 'Accès réservé à l\'administrateur' }, { status: 403 })
  }
  return userOrErr
}

/**
 * Check RBAC permission for a resource+action.
 */
export async function checkPermission(
  user: AuthUser, resource: string, action: string,
): Promise<true | NextResponse> {
  if (user.role === 'root_admin') return true
  const allowed = await hasPermission(user.roleId, resource, action)
  if (!allowed) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  return true
}

/**
 * Combined auth + permission check.
 */
export async function authenticate(
  request: Request, resource?: string, action?: string,
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
 */
export function requireTenantAccess(
  user: AuthUser, resourceTenantId: string | null | undefined,
): boolean {
  if (user.role === 'root_admin') return true
  if (!resourceTenantId) return true
  return user.tenantId === resourceTenantId
}

/** Helper to check if result is an error response */
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}
