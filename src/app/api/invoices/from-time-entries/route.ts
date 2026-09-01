import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { fireNotification } from '@/lib/notify'

const TYPE_PREFIXES: Record<string, string> = { facture: 'FAC', devis: 'DEV', avoir: 'AVO', recu: 'REC' }

async function generateInvoiceNumber(db: ReturnType<typeof getDb>, type: string, tenantId: string) {
  const year = new Date().getFullYear()
  const prefix = TYPE_PREFIXES[type] || 'FAC'
  const count = await db.invoice.count({ where: { tenantId, type, invoiceNumber: { startsWith: `${prefix}-${year}-` } } })
  return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'invoice', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { tenantId, clientId, caseId, timeEntryIds, type, taxRate, discountAmount, notes, terms, dueDate, currencyId } = body

    if (!tenantId || !clientId || !Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
      return NextResponse.json({ error: 'tenantId, clientId et timeEntryIds requis' }, { status: 400 })
    }

    // Verify tenant access
    if (!requireTenantAccess(auth, tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Fetch time entries
    const entries = await db.timeEntry.findMany({
      where: { id: { in: timeEntryIds }, tenantId, billed: false, isBillable: true },
      include: { user: { select: { id: true, fullName: true } }, case: { select: { id: true, reference: true, title: true } } },
    })

    if (entries.length === 0) {
      return NextResponse.json({ error: 'Aucune entrée de temps facturable trouvée' }, { status: 400 })
    }

    // Build line items from time entries
    const lineItemsData = entries.map((e, i) => {
      const hours = e.duration / 3600
      const rate = e.hourlyRate || 0
      const total = Math.round(hours * rate)
      const caseRef = e.case?.reference || ''
      const desc = caseRef ? `[${caseRef}] ${e.description}` : e.description
      return {
        description: `${desc} (${hours.toFixed(1)}h × ${rate.toLocaleString()} FCFA/h)`,
        quantity: 1,
        unitPrice: total,
        total,
        sortOrder: i,
      }
    })

    const subtotal = lineItemsData.reduce((s, li) => s + li.total, 0)
    const tax = Math.round(subtotal * ((taxRate || 0) / 100))
    const discount = discountAmount || 0
    const amount = subtotal + tax - discount

    const invoiceNumber = await generateInvoiceNumber(db, type || 'facture', tenantId)

    // Create invoice with line items + mark time entries as billed
    const invoice = await db.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId, clientId, caseId: caseId || null, currencyId: currencyId || null,
          invoiceNumber, type: type || 'facture', amount,
          taxRate: taxRate || 0, discountAmount: discount, terms: terms || null,
          notes: notes || 'Facture générée depuis les relevés de temps',
          issuedAt: new Date(),
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000),
          lineItems: { create: lineItemsData },
        },
        include: { client: { select: { id: true, fullName: true, company: true } }, lineItems: true },
      })

      // Mark time entries as billed
      await tx.timeEntry.updateMany({
        where: { id: { in: entries.map(e => e.id) } },
        data: { billed: true, invoiceId: inv.id },
      })

      return inv
    })

    // Notification
    fireNotification({
      tenantId, userId: auth.id,
      title: 'Facture créée depuis les temps',
      message: `Facture ${invoiceNumber} (${entries.length} entrées) pour ${invoice.client.fullName}`,
      category: 'facture', resourceType: 'invoice', resourceId: invoice.id,
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Create invoice from time entries error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

function requireTenantAccess(user: { tenantId: string | null; role: string }, resourceTenantId: string): boolean {
  if (user.role === 'root_admin') return true
  return user.tenantId === resourceTenantId
}
