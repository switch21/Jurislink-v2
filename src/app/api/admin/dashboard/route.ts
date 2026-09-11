import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isErrorResponse, requireRootAdmin } from '@/lib/auth-server'

async function safe<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch (err) {
    console.error(`[AdminDashboard] Query failed (${name}):`, err instanceof Error ? err.message : err)
    return fallback
  }
}

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
      safe('totalTenants', () => db.tenant.count(), 0),
      safe('activeTenants', () => db.tenant.count({ where: { isActive: true } }), 0),
      safe('totalUsers', () => db.user.count({ where: { roleId: { not: 'a1000000-0002-0000-0000-000000000001' } } }), 0),
      safe('activeUsers', () => db.user.count({ where: { roleId: { not: 'a1000000-0002-0000-0000-000000000001' }, isActive: true } }), 0),
      safe('totalCases', () => db.case.count(), 0),
      safe('activeCases', () => db.case.count({ where: { status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] } } }), 0),
      safe('totalClients', () => db.client.count(), 0),
      safe('totalInvoices', () => db.invoice.count(), 0),
      safe('totalPayments', () => db.payment.count(), 0),
      safe('plans', () => db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }), []),
    ])

    // Revenue metrics
    const paymentsAgg = await safe('paymentsAgg', () => db.payment.aggregate({ _sum: { amount: true }, where: { status: { not: 'annule' } } }), { _sum: { amount: null } })
    const thisMonthPayments = await safe('thisMonthPayments', () => db.payment.aggregate({ _sum: { amount: true }, where: { status: { not: 'annule' }, paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }), { _sum: { amount: null } })

    // Tenants by plan
    const tenantsByPlan = await safe('tenantsByPlan', () => db.tenant.groupBy({ by: ['plan'], _count: { id: true } }), [])

    // Users by role
    const usersByRole = await safe('usersByRole', () => db.user.findMany({
      select: { roleObj: { select: { name: true, label: true } } },
      where: { roleId: { not: 'a1000000-0002-0000-0000-000000000001' } },
    }), [])
    const roleCounts: Record<string, number> = {}
    for (const u of usersByRole) {
      const name = u.roleObj?.name || 'unknown'
      roleCounts[name] = (roleCounts[name] || 0) + 1
    }
    const usersByRoleFormatted = Object.entries(roleCounts).map(([role, count]) => ({ role, _count: { id: count } }))

    // Recent tenants
    const recentTenants = await safe('recentTenants', () => db.tenant.findMany({
      include: { _count: { select: { users: true, cases: true } }, subscription: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' }, take: 5,
    }), [])

    // Monthly signups (last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const monthlySignupsRaw = await safe('monthlySignups', () => db.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*)::bigint as count
      FROM tenants
      WHERE created_at >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `, [])
    const signupsByMonth: Record<string, number> = {}
    for (const s of monthlySignupsRaw) {
      signupsByMonth[s.month] = Number(s.count)
    }

    return NextResponse.json({
      totalTenants, activeTenants, inactiveTenants: totalTenants - activeTenants,
      totalUsers, activeUsers, inactiveUsers: totalUsers - activeUsers,
      totalCases, activeCases, totalClients, totalInvoices, totalPayments,
      totalRevenue: paymentsAgg._sum.amount || 0,
      thisMonthRevenue: thisMonthPayments._sum.amount || 0,
      tenantsByPlan, usersByRole: usersByRoleFormatted, recentTenants, signupsByMonth, plans,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
