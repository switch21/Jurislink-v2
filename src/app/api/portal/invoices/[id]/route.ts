import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticatePortal } from '@/lib/portal-auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticatePortal(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params

    const portalAccount = await db.clientPortal.findUnique({
      where: { id: auth.portalUserId },
    })
    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id,
        clientId: portalAccount.clientId,
        tenantId: auth.tenantId,
      },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: {
          include: { recorder: { select: { id: true, fullName: true } } },
        },
        client: true,
        case: true,
        currency: true,
        reminders: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal invoice detail error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}