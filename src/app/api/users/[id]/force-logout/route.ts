import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Call the notification service to immediately cut the user's WebSocket(s). */
async function disconnectUserSockets(userId: string): Promise<number> {
  try {
    const res = await fetch('http://localhost:3005/force-disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
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
 * POST /api/users/[id]/force-logout
 * Root admin: force-disconnect a specific user.
 * Sets forceLogoutAt in DB AND immediately cuts their WebSocket connection.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate(request, 'user', 'manage')
  if (isErrorResponse(auth)) return auth

  const { id } = await params
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'ID utilisateur invalide' }, { status: 400 })
  }

  // Cannot force-logout yourself
  if (id === auth.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous déconnecter vous-même' }, { status: 400 })
  }

  try {
    const db = getDb()
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, isActive: true },
    })
    await db.$disconnect().catch(() => {})

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }
    if (!user.isActive) {
      return NextResponse.json({ error: 'Utilisateur déjà désactivé' }, { status: 400 })
    }

    // 1. Set forceLogoutAt in DB — prevents re-auth via HTTP API
    await db.user.update({
      where: { id },
      data: { forceLogoutAt: new Date() },
    })
    await db.$disconnect().catch(() => {})

    // 2. Immediately cut the user's WebSocket connection(s)
    const socketsCut = await disconnectUserSockets(id)

    return NextResponse.json({
      success: true,
      message: socketsCut > 0
        ? `${user.fullName} a été déconnecté immédiatement (${socketsCut} session(s) coupée(s))`
        : `${user.fullName} sera déconnecté à sa prochaine action`,
      socketsCut,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Force logout error:', message)
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 })
  }
}
