import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-server'

/**
 * GET /api/auth/mfa/status
 * Returns the current user's MFA status (enabled or not).
 */
export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const db = getDb()
  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { mfaEnabled: true },
    })

    return NextResponse.json({
      mfaEnabled: dbUser?.mfaEnabled ?? false,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('MFA status error:', message)
    return NextResponse.json({ error: 'Erreur lors de la vérification du statut MFA' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
