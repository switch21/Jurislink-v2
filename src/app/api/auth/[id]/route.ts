import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse, requireRootAdmin, requireTenantAccess } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: only authenticated users can fetch user profiles
  const auth = await authenticate(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params

  // root_admin can see any user, others can only see themselves or same-tenant users
  if (auth.role !== 'root_admin' && auth.id !== id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        phone: true,
        preferredLanguage: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

  // Non-root users can only see profiles from their own tenant
  if (auth.role !== 'root_admin' && !requireTenantAccess(auth, user.tenantId)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
