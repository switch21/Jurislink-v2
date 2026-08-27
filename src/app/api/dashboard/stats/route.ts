import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'dashboard', 'read')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const where = { tenantId }

    const [totalCases, activeCases, totalClients, unpaidInvoices, paidInvoices] =
      await Promise.all([
        db.case.count({ where }),
        db.case.count({
          where: {
            ...where,
            status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] },
          },
        }),
        db.client.count({ where }),
        db.invoice.count({ where: { ...where, status: 'non_paye' } }),
        db.invoice.count({ where: { ...where, status: 'paye' } }),
      ])

    const revenueResult = await db.invoice.aggregate({
      where: { ...where, status: 'paye' },
      _sum: { amount: true },
    })
    const totalRevenue = revenueResult._sum.amount ?? 0

    const upcomingEvents = await db.event.findMany({
      where: {
        ...where,
        startTime: { gte: new Date() },
      },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
        case: { select: { id: true, reference: true, title: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 5,
    })

    const casesByStatusRaw = await db.case.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    })
    const casesByStatus: Record<string, number> = {}
    for (const item of casesByStatusRaw) {
      casesByStatus[item.status] = item._count.status
    }

    const casesByTypeRaw = await db.case.groupBy({
      by: ['caseType'],
      where,
      _count: { caseType: true },
    })
    const casesByType: Record<string, number> = {}
    for (const item of casesByTypeRaw) {
      casesByType[item.caseType] = item._count.caseType
    }

    const recentActivity = await db.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      totalCases,
      activeCases,
      totalClients,
      upcomingEvents: upcomingEvents.length,
      unpaidInvoices,
      totalRevenue,
      paidInvoices,
      casesByStatus,
      casesByType,
      recentActivity,
      upcomingEventsList: upcomingEvents,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
