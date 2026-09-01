import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

const TYPE_PREFIXES: Record<string, string> = { facture: 'FAC', devis: 'DEV', avoir: 'AVO', recu: 'REC' }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request, 'invoice', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { id } = await params
    const original = await db.invoice.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!original) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (!requireTenantAccess(auth, original.tenantId)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const year = new Date().getFullYear()
    const prefix = TYPE_PREFIXES[original.type] || 'FAC'
    const count = await db.invoice.count({ where: { tenantId: original.tenantId, type: original.type, invoiceNumber: { startsWith: `${prefix}-${year}-` } } })
    const invoiceNumber = `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`

    const duplicate = await db.invoice.create({
      data: {
        tenantId: original.tenantId, clientId: original.clientId, caseId: original.caseId, currencyId: original.currencyId,
        invoiceNumber, type: original.type, amount: original.amount,
        taxRate: original.taxRate, discountAmount: original.discountAmount, terms: original.terms,
        notes: original.notes ? `Copie de ${original.invoiceNumber}: ${original.notes}` : 'Copie',
        issuedAt: new Date(), dueDate: original.dueDate ? new Date(Date.now() + 30 * 86400000) : null,
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

    return NextResponse.json(duplicate, { status: 201 })
  } catch (error) {
    console.error('Duplicate invoice error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

function requireTenantAccess(user: { tenantId: string | null; role: string }, resourceTenantId: string): boolean {
  if (user.role === 'root_admin') return true
  return user.tenantId === resourceTenantId
}
