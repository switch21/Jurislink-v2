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

    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')

    const where: Record<string, unknown> = {
      clientId: portalAccount.clientId,
      tenantId: auth.tenantId,
    }
    if (caseId) {
      where.caseId = caseId
    }

    const communications = await db.communication.findMany({
      where,
      include: {
        sentBy: { select: { id: true, fullName: true } },
        case: { select: { id: true, reference: true, title: true } },
        tenant: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(communications)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal communications error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
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

    const { subject, content, caseId } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 })
    }

    const communication = await db.communication.create({
      data: {
        type: 'portal_message',
        subject: subject || null,
        content,
        status: 'received',
        clientId: portalAccount.clientId,
        tenantId: auth.tenantId,
        caseId: caseId || null,
        sentById: null,
      },
      include: {
        sentBy: { select: { id: true, fullName: true } },
        case: { select: { id: true, reference: true, title: true } },
      },
    })

    return NextResponse.json(communication, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal communication create error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
