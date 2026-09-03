import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

/**
 * POST /api/users/force-logout-all
 * Root admin: force-disconnect ALL users (except self).
 */
export async function POST(request: Request) {
  const auth = await authenticate(request, 'user', 'manage')
  if (isErrorResponse(auth)) return auth

  try {
    const db = getDb()
    const now = new Date()
    const result = await db.user.updateMany({
      where: { id: { not: auth.id }, isActive: true },
      data: { forceLogoutAt: now },
    })
    await db.$disconnect().catch(() => {})

    return NextResponse.json({
      success: true,
      message: `${result.count} utilisateur(s) déconnecté(s)`,
      count: result.count,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Force logout all error:', message)
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 })
  }
}
