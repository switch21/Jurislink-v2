import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            client: { select: { id: true, fullName: true, company: true } },
          },
        },
        recorder: { select: { id: true, fullName: true } },
      },
    })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    return NextResponse.json(payment)
  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, method, reference, notes, status } = body

    const existing = await db.payment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = await db.payment.update({
      where: { id },
      data: {
        ...(amount != null ? { amount: parseFloat(amount) } : {}),
        ...(method ? { method } : {}),
        ...(reference !== undefined ? { reference } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(status ? { status } : {}),
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

    // Recalculate invoice status after payment update
    await recalcInvoiceStatus(db, existing.invoiceId)

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Update payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const existing = await db.payment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    await db.payment.delete({ where: { id } })

    // Recalculate invoice status after payment deletion
    await recalcInvoiceStatus(db, existing.invoiceId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
