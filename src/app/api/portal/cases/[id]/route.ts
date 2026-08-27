import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const caseDetail = await db.case.findFirst({
      where: {
        id,
        clientId: portalAccount.clientId,
        tenantId: portalAccount.tenantId,
      },
      include: {
        client: true,
        assignments: {
          include: { user: { select: { id: true, fullName: true, avatarUrl: true, email: true, phone: true } } },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        events: {
          orderBy: { startTime: 'desc' },
        },
        notes: {
          include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          include: {
            currency: { select: { code: true, symbol: true } },
            payments: true,
          },
        },
        timeEntries: {
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    })

    if (!caseDetail) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    if (caseDetail.isSecret) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    return NextResponse.json(caseDetail)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal case detail error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
