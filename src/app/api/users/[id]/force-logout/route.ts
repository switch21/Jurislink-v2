import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/users/[id]/force-logout
 * Root admin: force-disconnect a specific user.
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

    await db.user.update({
      where: { id },
      data: { forceLogoutAt: new Date() },
    })
    await db.$disconnect().catch(() => {})

    return NextResponse.json({
      success: true,
      message: `${user.fullName} sera déconnecté à sa prochaine action`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Force logout error:', message)
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 })
  }
}
