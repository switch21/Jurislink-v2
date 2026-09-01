import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'report', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })

    const fromDate = searchParams.get('from') || undefined
    const toDate = searchParams.get('to') || undefined
    const prevFrom = searchParams.get('prevFrom') || undefined
    const prevTo = searchParams.get('prevTo') || undefined

    const dateFilter: Prisma.InvoiceWhereInput = {}
    if (fromDate || toDate) {
      dateFilter.createdAt = {}
      if (fromDate) (dateFilter.createdAt as any).gte = new Date(fromDate)
      if (toDate) (dateFilter.createdAt as any).lte = new Date(toDate)
    }

    // Current period invoices
    const invoices = await db.invoice.findMany({
      where: { tenantId, ...dateFilter, type: { in: ['facture', 'devis', 'recu', 'avoir'] } },
      include: { client: { select: { id: true, fullName: true } }, currency: true, payments: true },
    })

    // Previous period for comparison
    let prevInvoices: any[] = []
    if (prevFrom && prevTo) {
      prevInvoices = await db.invoice.findMany({
        where: { tenantId, createdAt: { gte: new Date(prevFrom), lte: new Date(prevTo) }, type: { in: ['facture', 'devis', 'recu', 'avoir'] } },
      })
    }

    // KPIs
    const totalInvoiced = invoices.filter(i => i.type !== 'avoir').reduce((s, i) => s + i.amount, 0)
    const totalAvoir = invoices.filter(i => i.type === 'avoir').reduce((s, i) => s + i.amount, 0)
    const totalPaid = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0)
    const totalDiscount = invoices.reduce((s, i) => s + (i.discountAmount || 0), 0)
    const totalTax = invoices.reduce((s, i) => s + (i.amount * (i.taxRate || 0)) / 100, 0)
    const netRevenue = totalInvoiced - totalAvoir - totalDiscount
    const outstanding = invoices.filter(i => i.status === 'non_paye' || i.status === 'partiel')
      .reduce((s, i) => s + i.amount - (i.paidAmount || 0), 0)
    const avgInvoice = invoices.length > 0 ? totalInvoiced / invoices.length : 0
    const paidCount = invoices.filter(i => i.status === 'paye').length

    // Previous period comparison
    const prevTotal = prevInvoices.filter(i => i.type !== 'avoir').reduce((s, i) => s + i.amount, 0)
    const revenueChange = prevTotal > 0 ? ((totalInvoiced - prevTotal) / prevTotal) * 100 : 0

    // By month
    const byMonth: Record<string, { invoiced: number; paid: number; count: number }> = {}
    for (const inv of invoices) {
      const m = inv.createdAt.toISOString().slice(0, 7)
      if (!byMonth[m]) byMonth[m] = { invoiced: 0, paid: 0, count: 0 }
      if (inv.type !== 'avoir') byMonth[m].invoiced += inv.amount
      else byMonth[m].invoiced -= inv.amount
      byMonth[m].paid += inv.paidAmount || 0
      byMonth[m].count++
    }

    // By type
    const byType: Record<string, { count: number; amount: number }> = {}
    for (const inv of invoices) {
      if (!byType[inv.type]) byType[inv.type] = { count: 0, amount: 0 }
      byType[inv.type].count++
      byType[inv.type].amount += inv.amount
    }

    // By status
    const byStatus: Record<string, { count: number; amount: number }> = {}
    for (const inv of invoices) {
      if (!byStatus[inv.status]) byStatus[inv.status] = { count: 0, amount: 0 }
      byStatus[inv.status].count++
      byStatus[inv.status].amount += inv.amount
    }

    // By payment method
    const payments = await db.payment.findMany({
      where: { tenantId, ...(fromDate ? { paidAt: { gte: new Date(fromDate) } } : {}), ...(toDate ? { paidAt: { lte: new Date(toDate) } } : {}) },
    })
    const byMethod: Record<string, { count: number; amount: number }> = {}
    for (const p of payments) {
      if (!byMethod[p.method]) byMethod[p.method] = { count: 0, amount: 0 }
      byMethod[p.method].count++
      byMethod[p.method].amount += p.amount
    }

    // Aging
    const now = new Date()
    const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    for (const inv of outstanding ? invoices.filter(i => i.status === 'non_paye' || i.status === 'partiel') : []) {
      const remaining = inv.amount - (inv.paidAmount || 0)
      if (!inv.dueDate) { aging['90+'] += remaining; continue }
      const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000)
      if (days <= 0) aging['0-30'] += remaining
      else if (days <= 30) aging['0-30'] += remaining
      else if (days <= 60) aging['31-60'] += remaining
      else if (days <= 90) aging['61-90'] += remaining
      else aging['90+'] += remaining
    }

    // Top clients by revenue
    const byClient: Record<string, { name: string; amount: number; paid: number; count: number }> = {}
    for (const inv of invoices) {
      const cid = inv.clientId
      const name = inv.client?.fullName || 'Inconnu'
      if (!byClient[cid]) byClient[cid] = { name, amount: 0, paid: 0, count: 0 }
      if (inv.type !== 'avoir') byClient[cid].amount += inv.amount
      else byClient[cid].amount -= inv.amount
      byClient[cid].paid += inv.paidAmount || 0
      byClient[cid].count++
    }
    const topClients = Object.values(byClient).sort((a, b) => b.amount - a.amount).slice(0, 20)

    return NextResponse.json({
      kpis: { totalInvoiced, totalAvoir, totalPaid, totalDiscount, totalTax, netRevenue, outstanding, avgInvoice, paidCount, revenueChange, invoiceCount: invoices.length },
      byMonth, byType, byStatus, byMethod, aging, topClients,
    })
  } catch (error) {
    console.error('Financial report error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
