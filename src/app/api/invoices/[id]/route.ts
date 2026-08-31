import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { fireNotification } from '@/lib/notify'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'invoice', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        case: { select: { id: true, reference: true, title: true } },
        tenant: true,
        currency: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: {
          include: {
            recorder: { select: { id: true, fullName: true } },
          },
          orderBy: { paidAt: 'desc' },
        },
      },
    })
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Get invoice error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'invoice', 'edit')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.invoice.findUnique({
      where: { id },
      select: { id: true, status: true, tenantId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Handle lineItems replacement
    const { lineItems: rawLineItems } = body
    let total = body.amount != null ? parseFloat(body.amount) : undefined
    let lineItemsData: Array<{
      description: string
      quantity: number
      unitPrice: number
      total: number
      sortOrder: number
    }> | undefined

    if (Array.isArray(rawLineItems)) {
      total = 0
      lineItemsData = rawLineItems.map(
        (
          item: { description?: string; quantity?: number; unitPrice?: number },
          index: number
        ) => {
          const qty = parseInt(String(item.quantity)) || 1
          const price = parseFloat(String(item.unitPrice)) || 0
          const lineTotal = Math.round(qty * price * 100) / 100
          total! += lineTotal
          return {
            description: item.description || '',
            quantity: qty,
            unitPrice: price,
            total: lineTotal,
            sortOrder: index,
          }
        }
      )
      total = Math.round(total! * 100) / 100
    }

    const invoice = await db.$transaction(async (tx) => {
      // If lineItems provided, delete existing ones and create new
      if (lineItemsData) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } })
      }

      return tx.invoice.update({
        where: { id },
        data: {
          ...(total != null ? { amount: total } : {}),
          ...(body.status ? { status: body.status } : {}),
          ...(body.dueDate != null
            ? { dueDate: body.dueDate ? new Date(body.dueDate) : null }
            : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
          ...(body.billingType !== undefined ? { billingType: body.billingType } : {}),
          ...(body.currencyId ? { currencyId: body.currencyId } : {}),
          ...(body.type ? { type: body.type } : {}),
          ...(lineItemsData
            ? {
                lineItems: { create: lineItemsData },
              }
            : {}),
        },
        include: {
          client: true,
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
      })
    })

    // Notification: invoice status changed
    if (body.status && existing.status !== body.status) {
      const statusLabels: Record<string, string> = { non_paye: 'non payée', paye: 'payée', partiel: 'partiellement payée', annule: 'annulée' }
      const label = statusLabels[body.status] || body.status
      fireNotification({
        tenantId: existing.tenantId,
        type: 'facture',
        title: 'Statut de facture modifié',
        message: `${invoice.invoiceNumber || 'Facture'} → ${label}${invoice.client ? ` (${invoice.client.fullName || invoice.client.company})` : ''}`,
        resourceType: 'invoice',
        resourceId: invoice.id,
      })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Update invoice error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'invoice', 'delete')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    await db.invoice.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete invoice error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
