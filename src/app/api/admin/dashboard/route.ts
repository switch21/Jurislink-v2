import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
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
      db.user.count({ where: { role: { not: 'root_admin' } } }),
      db.user.count({ where: { role: { not: 'root_admin' }, isActive: true } }),
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
    const usersByRole = await db.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { role: { not: 'root_admin' } },
    })

    // Recent tenants
    const recentTenants = await db.tenant.findMany({
      include: {
        _count: { select: { users: true, cases: true } },
        subscription: { include: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Monthly signups (last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const monthlySignups = await db.tenant.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: twelveMonthsAgo } },
      _count: { id: true },
    })

    // Group monthly signups by YYYY-MM
    const signupsByMonth: Record<string, number> = {}
    for (const s of monthlySignups) {
      const key = s.createdAt.toISOString().slice(0, 7)
      signupsByMonth[key] = (signupsByMonth[key] || 0) + s._count.id
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
      usersByRole,
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
