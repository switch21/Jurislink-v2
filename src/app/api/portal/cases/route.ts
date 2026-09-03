import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticatePortal } from '@/lib/portal-auth-server'

export async function GET(request: Request) {
  const auth = await authenticatePortal(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const portalAccount = await db.clientPortal.findUnique({
      where: { id: auth.portalUserId },
    })
    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const cases = await db.case.findMany({
      where: {
        clientId: portalAccount.clientId,
        tenantId: auth.tenantId,
        isSecret: false,
      },
      include: {
        assignments: {
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
        _count: {
          select: { documents: true, events: true, notes: true, tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(cases)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal cases error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
