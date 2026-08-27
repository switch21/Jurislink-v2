import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  const db = getDb()
  try {
    const portalUserId = request.headers.get('X-Portal-User-Id')
    if (!portalUserId || !UUID_REGEX.test(portalUserId)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const portalAccount = await db.clientPortal.findUnique({
      where: { id: portalUserId },
    })
    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const cases = await db.case.findMany({
      where: {
        clientId: portalAccount.clientId,
        tenantId: portalAccount.tenantId,
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
