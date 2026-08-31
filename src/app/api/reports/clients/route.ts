import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

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
    const dateFilter: any = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) dateFilter.lte = new Date(toDate)

    const clients = await db.client.findMany({
      where: { tenantId },
      include: {
        cases: { include: { invoices: true, timeEntries: true, tasks: true } },
        invoices: { where: { ...dateFilter } },
        _count: { select: { cases: true } },
      },
    })

    // KPIs
    const totalClients = clients.length
    const activeClients = clients.filter(c => c.isActive).length
    const newClients = clients.filter(c => {
      if (!fromDate) return false
      return c.createdAt >= new Date(fromDate)
    }).length
    const clientsWithCases = clients.filter(c => c.cases.length > 0).length
    const totalRevenue = clients.reduce((s, c) => s + c.invoices.filter(i => i.type !== 'avoir').reduce((s2, i) => s2 + i.amount, 0), 0)
    const totalPaid = clients.reduce((s, c) => s + c.invoices.reduce((s2, i) => s2 + (i.paidAmount || 0), 0), 0)

    // By risk level
    const byRisk: Record<string, number> = {}
    for (const c of clients) { byRisk[c.riskLevel] = (byRisk[c.riskLevel] || 0) + 1 }

    // By source
    const bySource: Record<string, number> = {}
    for (const c of clients) { if (c.source) bySource[c.source] = (bySource[c.source] || 0) + 1 }

    // By month (new clients)
    const byMonth: Record<string, number> = {}
    for (const c of clients) {
      const m = c.createdAt.toISOString().slice(0, 7)
      byMonth[m] = (byMonth[m] || 0) + 1
    }

    // Client details sorted by revenue
    const clientDetails = clients.map(c => {
      const revenue = c.invoices.filter(i => i.type !== 'avoir').reduce((s, i) => s + i.amount, 0)
      const paid = c.invoices.reduce((s, i) => s + (i.paidAmount || 0), 0)
      const overdue = c.invoices.filter(i => (i.status === 'non_paye' || i.status === 'partiel') && i.dueDate && new Date(i.dueDate) < new Date())
      const allCases = c.cases
      return {
        id: c.id, fullName: c.fullName, company: c.company, email: c.email, phone: c.phone,
        riskLevel: c.riskLevel, source: c.source, clientType: c.clientType,
        isActive: c.isActive, createdAt: c.createdAt,
        caseCount: allCases.length, activeCases: allCases.filter(ca => !['clos', 'archive'].includes(ca.status)).length,
        revenue, paid, outstanding: revenue - paid,
        overdueCount: overdue.length, overdueAmount: overdue.reduce((s, i) => s + i.amount - (i.paidAmount || 0), 0),
        totalTimeSeconds: allCases.reduce((s, ca) => s + ca.timeEntries.reduce((s2, t) => s2 + t.duration, 0), 0),
      }
    }).sort((a, b) => b.revenue - a.revenue)

    // Top clients by revenue (top 20)
    const topClients = clientDetails.slice(0, 20)

    // Outstanding clients
    const outstandingClients = clientDetails.filter(c => c.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding)

    return NextResponse.json({
      kpis: { totalClients, activeClients, newClients, clientsWithCases, totalRevenue, totalPaid, avgRevenuePerClient: totalClients > 0 ? totalRevenue / totalClients : 0 },
      byRisk, bySource, byMonth, topClients, outstandingClients,
    })
  } catch (error) {
    console.error('Client report error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
