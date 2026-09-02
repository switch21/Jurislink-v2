import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { fireNotification } from '@/lib/notify'

const TYPE_PREFIXES: Record<string, string> = { facture: 'FAC', devis: 'DEV', avoir: 'AVO', recu: 'REC' }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request, 'invoice', 'update')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { id } = await params
    const original = await db.invoice.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!original) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (original.type !== 'devis') return NextResponse.json({ error: 'Seul un devis peut être converti en facture' }, { status: 400 })
    if (original.status === 'annule') return NextResponse.json({ error: 'Ce devis est annulé' }, { status: 400 })
    if (!requireTenantAccess(auth, original.tenantId)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    // Generate new facture number
    const year = new Date().getFullYear()
    const count = await db.invoice.count({ where: { tenantId: original.tenantId, type: 'facture', invoiceNumber: { startsWith: `FAC-${year}-` } } })
    const invoiceNumber = `FAC-${year}-${String(count + 1).padStart(3, '0')}`

    // Create facture from devis
    const facture = await db.$transaction(async (tx) => {
      // Mark devis as converted
      await tx.invoice.update({ where: { id }, data: { status: 'annule', notes: original.notes ? `Converti en facture ${invoiceNumber}. ${original.notes}` : `Converti en facture ${invoiceNumber}` } })

      // Create new facture
      return tx.invoice.create({
        data: {
          tenantId: original.tenantId, clientId: original.clientId, caseId: original.caseId, currencyId: original.currencyId,
          invoiceNumber, type: 'facture', amount: original.amount,
          taxRate: original.taxRate, discountAmount: original.discountAmount, terms: original.terms,
          notes: `Facture convertie du devis ${original.invoiceNumber || id.slice(0, 8)}`,
          issuedAt: new Date(), dueDate: original.dueDate ? new Date(original.dueDate) : new Date(Date.now() + 30 * 86400000),
          billingType: original.billingType,
          status: 'non_paye', paidAmount: 0,
          lineItems: {
            create: original.lineItems.map(li => ({
              description: li.description, quantity: li.quantity, unitPrice: li.unitPrice,
              total: li.total, sortOrder: li.sortOrder,
            })),
          },
        },
        include: { client: { select: { id: true, fullName: true } }, lineItems: true },
      })
    })

    fireNotification({
      tenantId: original.tenantId, userId: auth.id,
      title: 'Devis converti en facture',
      message: `Devis ${original.invoiceNumber || ''} → Facture ${invoiceNumber}`,
      type: 'facture', resourceType: 'invoice', resourceId: facture.id,
    })

    return NextResponse.json(facture)
  } catch (error) {
    console.error('Convert devis error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

function requireTenantAccess(user: { tenantId: string | null; role: string }, resourceTenantId: string): boolean {
  if (user.role === 'root_admin') return true
  return user.tenantId === resourceTenantId
}
