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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Get all case IDs for this client (excluding secret cases)
    const clientCaseIds = await db.case.findMany({
      where: {
        clientId: portalAccount.clientId,
        tenantId: portalAccount.tenantId,
        isSecret: false,
      },
      select: { id: true },
    })

    const caseIds = clientCaseIds.map((c) => c.id)
    if (caseIds.length === 0) {
      return NextResponse.json([])
    }

    const where: Record<string, unknown> = { caseId: { in: caseIds } }
    if (search) {
      where.fileName = { contains: search, mode: 'insensitive' }
    }

    const documents = await db.document.findMany({
      where,
      include: {
        case: { select: { id: true, reference: true, title: true } },
        uploadedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal documents error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
