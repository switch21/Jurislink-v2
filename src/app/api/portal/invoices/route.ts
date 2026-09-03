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
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      clientId: portalAccount.clientId,
      tenantId: auth.tenantId,
    }
    if (status) {
      where.status = status
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        client: true,
        case: true,
        currency: true,
        payments: true,
        _count: { select: { reminders: true } },
      },
      orderBy: { issuedAt: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal invoices error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}