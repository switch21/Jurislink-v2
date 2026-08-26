import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

const TYPE_PREFIXES: Record<string, string> = {
  facture: 'FAC',
  devis: 'DEV',
  avoir: 'AVO',
  recu: 'REC',
}

async function generateInvoiceNumber(db: ReturnType<typeof getDb>, type: string, tenantId: string) {
  const year = new Date().getFullYear()
  const prefix = TYPE_PREFIXES[type] || 'FAC'

  const count = await db.invoice.count({
    where: {
      tenantId,
      type,
      invoiceNumber: { startsWith: `${prefix}-${year}-` },
    },
  })

  const sequence = String(count + 1).padStart(3, '0')
  return `${prefix}-${year}-${sequence}`
}

export async function GET(request: Request) {
  const auth = await authenticate(request, 'invoices', 'read')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const type = searchParams.get('type')
    const caseId = searchParams.get('caseId')

    const where: Prisma.InvoiceWhereInput = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status
    if (clientId) where.clientId = clientId
    if (type) where.type = type
    if (caseId) where.caseId = caseId

    const invoices = await db.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, fullName: true, company: true } },
        case: { select: { id: true, reference: true, title: true } },
        currency: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: {
          include: {
            recorder: { select: { id: true, fullName: true } },
          },
          orderBy: { paidAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(invoices)
  } catch (error) {
    console.error('List invoices error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'invoices', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const {
      tenantId,
      clientId,
      caseId,
      currencyId,
      type = 'facture',
      status = 'non_paye',
      dueDate,
      notes,
      billingType,
      lineItems: rawLineItems,
    } = body

    if (!tenantId || !clientId) {
      return NextResponse.json(
        { error: 'tenantId and clientId are required' },
        { status: 400 }
      )
    }

    // Calculate total from line items
    let total = body.amount ? parseFloat(body.amount) : 0
    const lineItemsData: Array<{
      description: string
      quantity: number
      unitPrice: number
      total: number
      sortOrder: number
    }> = []

    if (Array.isArray(rawLineItems) && rawLineItems.length > 0) {
      total = 0
      rawLineItems.forEach((item: { description?: string; quantity?: number; unitPrice?: number }, index: number) => {
        const qty = parseInt(String(item.quantity)) || 1
        const price = parseFloat(String(item.unitPrice)) || 0
        const lineTotal = Math.round(qty * price * 100) / 100
        lineItemsData.push({
          description: item.description || '',
          quantity: qty,
          unitPrice: price,
          total: lineTotal,
          sortOrder: index,
        })
        total += lineTotal
      })
      total = Math.round(total * 100) / 100
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(db, type, tenantId)

    // Create invoice with line items in a transaction
    const invoice = await db.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          type,
          amount: total,
          paidAmount: 0,
          status,
          issuedAt: body.issuedAt ? new Date(body.issuedAt) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes || null,
          billingType: billingType || null,
          tenantId,
          clientId,
          caseId: caseId || null,
          currencyId: currencyId || null,
          lineItems: {
            create: lineItemsData,
          },
        },
        include: {
          client: { select: { id: true, fullName: true, company: true } },
          case: { select: { id: true, reference: true, title: true } },
          currency: true,
          lineItems: { orderBy: { sortOrder: 'asc' } },
        },
      })
      return created
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Create invoice error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
