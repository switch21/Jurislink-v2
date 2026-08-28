import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isErrorResponse, requireRootAdmin } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await requireRootAdmin(request)
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      activeUsers,
      totalCases,
      activeCases,
      totalClients,
      totalInvoices,
      totalPayments,
      plans,
    ] = await Promise.all([
      db.tenant.count(),
      db.tenant.count({ where: { isActive: true } }),
      db.user.count({ where: { roleId: { not: 'a1000000-0002-0000-0000-000000000001' } } }),
      db.user.count({ where: { roleId: { not: 'a1000000-0002-0000-0000-000000000001' }, isActive: true } }),
      db.case.count(),
      db.case.count({ where: { status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] } } }),
      db.client.count(),
      db.invoice.count(),
      db.payment.count(),
      db.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    // Revenue metrics
    const paymentsAgg = await db.payment.aggregate({
      _sum: { amount: true },
      where: { status: { not: 'annule' } },
    })
    const thisMonthPayments = await db.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: { not: 'annule' },
        paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    })

    // Tenants by plan
    const tenantsByPlan = await db.tenant.groupBy({
      by: ['plan'],
      _count: { id: true },
    })

    // Users by role
    const usersByRole = await db.user.findMany({
      select: { roleObj: { select: { name: true, label: true } } },
      where: { roleId: { not: 'a1000000-0002-0000-0000-000000000001' } },
    })
    const roleCounts: Record<string, number> = {}
    for (const u of usersByRole) {
      const name = u.roleObj?.name || 'unknown'
      roleCounts[name] = (roleCounts[name] || 0) + 1
    }
    const usersByRoleFormatted = Object.entries(roleCounts).map(([role, count]) => ({ role, _count: { id: count } }))

    // Recent tenants
    const recentTenants = await db.tenant.findMany({
      include: {
        _count: { select: { users: true, cases: true } },
        subscription: { include: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Monthly signups (last 12 months) - use raw SQL for proper month grouping
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const monthlySignupsRaw = await db.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*)::bigint as count
      FROM tenants
      WHERE created_at >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `
    const signupsByMonth: Record<string, number> = {}
    for (const s of monthlySignupsRaw) {
      signupsByMonth[s.month] = Number(s.count)
    }

    return NextResponse.json({
      totalTenants,
      activeTenants,
      inactiveTenants: totalTenants - activeTenants,
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalCases,
      activeCases,
      totalClients,
      totalInvoices,
      totalPayments,
      totalRevenue: paymentsAgg._sum.amount || 0,
      thisMonthRevenue: thisMonthPayments._sum.amount || 0,
      tenantsByPlan,
      usersByRole: usersByRoleFormatted,
      recentTenants,
      signupsByMonth,
      plans,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
