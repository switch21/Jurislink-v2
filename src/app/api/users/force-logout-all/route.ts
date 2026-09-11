import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

/** Call the notification service to immediately cut ALL users' WebSocket(s) except the admin. */
async function disconnectAllSockets(exceptUserId: string): Promise<number> {
  try {
    const res = await fetch('http://localhost:3005/force-disconnect-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exceptUserId }),
    })
    if (!res.ok) return 0
    const data = await res.json()
    return data.disconnected ?? 0
  } catch {
    // Notification service may not be running; non-critical
    return 0
  }
}

/**
 * POST /api/users/force-logout-all
 * Root admin: force-disconnect ALL users (except self).
 * Sets forceLogoutAt in DB AND immediately cuts their WebSocket connections.
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

    // Immediately cut all WebSocket connections (except the admin's)
    const socketsCut = await disconnectAllSockets(auth.id)

    return NextResponse.json({
      success: true,
      message: socketsCut > 0
        ? `${result.count} utilisateur(s) déconnecté(s) immédiatement (${socketsCut} session(s) coupée(s))`
        : `${result.count} utilisateur(s) déconnecté(s)`,
      count: result.count,
      socketsCut,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Force logout all error:', message)
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 })
  }
}
