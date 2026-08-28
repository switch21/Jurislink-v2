import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

async function recalcInvoiceStatus(db: ReturnType<typeof getDb>, invoiceId: string) {
  const payments = await db.payment.findMany({
    where: { invoiceId, status: { not: 'annule' } },
    select: { amount: true },
  })
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) return

  let newStatus = invoice.status
  if (paidAmount <= 0) {
    newStatus = 'non_paye'
  } else if (paidAmount >= invoice.amount) {
    newStatus = 'paye'
  } else {
    newStatus = 'partiel'
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount, status: newStatus },
  })
}

export async function GET(request: Request) {
  const auth = await authenticate(request, 'payment', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const invoiceId = searchParams.get('invoiceId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const where: Prisma.PaymentWhereInput = { tenantId }
    if (invoiceId) where.invoiceId = invoiceId

    const payments = await db.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            client: { select: { id: true, fullName: true, company: true } },
          },
        },
        recorder: { select: { id: true, fullName: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(payments)
  } catch (error) {
    console.error('List payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'payment', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { tenantId, invoiceId, amount, method, reference, notes, recordedBy } = body

    if (!tenantId || !invoiceId || amount == null) {
      return NextResponse.json(
        { error: 'tenantId, invoiceId, and amount are required' },
        { status: 400 }
      )
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: { select: { fullName: true } },
        currency: { select: { code: true } },
      },
    })
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const payment = await db.payment.create({
      data: {
        amount: parseFloat(amount),
        method: method || 'virement',
        reference: reference || null,
        status: 'complet',
        paidAt: new Date(),
        notes: notes || null,
        tenantId,
        invoiceId,
        recordedBy: recordedBy || null,
      },
      include: {
        invoice: {
          include: {
            client: { select: { id: true, fullName: true, company: true } },
          },
        },
        recorder: { select: { id: true, fullName: true } },
      },
    })

    // Recalculate invoice paidAmount and status
    await recalcInvoiceStatus(db, invoiceId)

    // Create notification for the tenant
    await db.notification.create({
      data: {
        title: 'Paiement enregistré',
        message: `Un paiement de ${amount} ${invoice.currency?.code ?? 'XAF'} a été enregistré pour la facture du client ${invoice.client.fullName}.`,
        category: 'facturation',
        resourceType: 'payment',
        resourceId: payment.id,
        tenantId,
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
