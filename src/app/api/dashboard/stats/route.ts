/**
 * GET /api/dashboard/stats
 * Lightweight stats endpoint — all queries parallelized.
 */
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
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })

    const where = { tenantId }
    const now = new Date()

    const [totalCases, activeCases, totalClients, unpaidInvoices, paidInvoices, revenueResult, upcomingEvents, casesByStatusRaw, casesByTypeRaw, recentActivity] =
      await Promise.all([
        db.case.count({ where }),
        db.case.count({ where: { ...where, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] } } }),
        db.client.count({ where }),
        db.invoice.count({ where: { ...where, status: 'non_paye' } }),
        db.invoice.count({ where: { ...where, status: 'paye' } }),
        db.invoice.aggregate({ where: { ...where, status: 'paye' }, _sum: { amount: true } }),
        db.event.findMany({
          where: { ...where, startTime: { gte: now } },
          include: { assignments: { include: { user: { select: { id: true, fullName: true } } } }, case: { select: { id: true, reference: true, title: true } } },
          orderBy: { startTime: 'asc' }, take: 5,
        }),
        db.case.groupBy({ by: ['status'], where, _count: { status: true } }),
        db.case.groupBy({ by: ['caseType'], where, _count: { caseType: true } }),
        db.auditLog.findMany({ where, include: { user: { select: { id: true, fullName: true } } }, orderBy: { timestamp: 'desc' }, take: 10 }),
      ])

    const casesByStatus: Record<string, number> = {}
    for (const item of casesByStatusRaw) casesByStatus[item.status] = item._count.status

    const casesByType: Record<string, number> = {}
    for (const item of casesByTypeRaw) casesByType[item.caseType] = item._count.caseType

    return NextResponse.json({
      totalCases, activeCases, totalClients, unpaidInvoices, totalRevenue: revenueResult._sum.amount ?? 0,
      paidInvoices, casesByStatus, casesByType, recentActivity,
      upcomingEvents: upcomingEvents.length, upcomingEventsList: upcomingEvents,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
