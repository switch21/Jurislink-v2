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

    // Return communications for this client as notifications
    const communications = await db.communication.findMany({
      where: {
        clientId: portalAccount.clientId,
        tenantId: portalAccount.tenantId,
      },
      include: {
        sentBy: { select: { id: true, fullName: true } },
        case: { select: { id: true, reference: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(communications)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal notifications error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
