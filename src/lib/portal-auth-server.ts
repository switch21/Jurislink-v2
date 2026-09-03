import { NextResponse } from 'next/server'
import { verifyPortalToken } from './portal-jwt'
import { getDb } from './db'

export interface PortalAuthResult {
  portalUserId: string
  tenantId: string
}

/**
 * Authenticates a portal request by verifying the JWT Bearer token.
 * Returns { portalUserId, tenantId } on success, or a 401 NextResponse on failure.
 * Also verifies the account is still active in the database.
 *
 * Usage:
 *   const auth = await authenticatePortal(request)
 *   if (auth instanceof NextResponse) return auth
 *   // auth.portalUserId, auth.tenantId are available
 */
export async function authenticatePortal(request: Request): Promise<PortalAuthResult | NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const payload = verifyPortalToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Verify account still exists and is active
  const db = getDb()
  try {
    const portalAccount = await db.clientPortal.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true },
    })

    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return { portalUserId: payload.sub, tenantId: payload.tenantId }
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
