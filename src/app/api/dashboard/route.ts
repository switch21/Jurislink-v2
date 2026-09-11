/**
 * GET /api/dashboard
 * Returns all dashboard data in a single optimized request.
 * Each query is wrapped individually so a missing column doesn't crash the whole response.
 */
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

/** Helper: run a Prisma query, return fallback on any error */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch (err) {
    console.warn('[dashboard] safe query failed:', (err as Error)?.message || err)
    return fallback
  }
}

export async function GET(request: Request) {
  const auth = await authenticate(request, 'report', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const userId = searchParams.get('userId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const where = { tenantId }
    const now = new Date()

    // Time boundaries
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // ═══════════════════════════════════════════════════════
    // BATCH 1: All independent queries (no dependencies)
    // Each wrapped in safe() so one failure doesn't crash the whole dashboard
    // ═══════════════════════════════════════════════════════
    const [
      totalCases,
      activeCases,
      totalClients,
      unpaidInvoices,
      paidInvoices,
      revenueThisMonthResult,
      revenueLastMonthResult,
      collectedThisMonthResult,
      collectedLastMonthResult,
      casesByStatusRaw,
      casesByTypeRaw,
      recentActivity,
      overdueInvoices,
      urgentTasks,
      upcomingEventsEnhanced,
      urgencyCases,
      toRecoverResult,
      overdueInvoicesCount,
      paymentsThisMonthResult,
      dossiersOuverts,
      dossiersCloses,
      nouveauxClients,
      audiences,
      facturesEmises,
      todayEvents,
      pendingDocsList,
      pendingDocumentsCount,
      casesWithoutDeadlinesRaw,
      casesWithoutDeadlinesCount,
      userCaseAssignments,
    ] = await Promise.all([
      // Basic counts (core — no missing column risk)
      safe(() => db.case.count({ where }), 0),
      safe(() => db.case.count({ where: { ...where, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] } } }), 0),
      safe(() => db.client.count({ where }), 0),
      safe(() => db.invoice.count({ where: { ...where, status: 'non_paye' } }), 0),
      safe(() => db.invoice.count({ where: { ...where, status: 'paye' } }), 0),
      // Revenue aggregates (needs issued_at column)
      safe(() => db.invoice.aggregate({ where: { ...where, status: 'paye', issuedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
      safe(() => db.invoice.aggregate({ where: { ...where, status: 'paye', issuedAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
      // Payment aggregates (needs paid_at column)
      safe(() => db.payment.aggregate({ where: { ...where, paidAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }, status: { not: 'annule' } }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
      safe(() => db.payment.aggregate({ where: { ...where, paidAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth }, status: { not: 'annule' } }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
      // Grouped data
      safe(() => db.case.groupBy({ by: ['status'], where, _count: { status: true } }), []),
      safe(() => db.case.groupBy({ by: ['caseType'], where, _count: { caseType: true } }), []),
      // Activity (needs timestamp column on audit_logs)
      safe(() => db.auditLog.findMany({ where, include: { user: { select: { id: true, fullName: true } } }, orderBy: { timestamp: 'desc' }, take: 10 }), []),
      // Overdue invoices (needs type, issued_at columns)
      safe(() => db.invoice.findMany({
        where: { ...where, type: 'facture', dueDate: { lte: now }, status: { in: ['non_paye', 'partiel'] } },
        include: { client: { select: { fullName: true } }, currency: { select: { code: true } } },
        orderBy: { dueDate: 'asc' },
      }), []),
      // Urgent tasks (needs priority column)
      safe(() => db.task.findMany({
        where: { ...where, priority: { in: ['urgente', 'haute'] }, status: { not: 'terminee' } },
        include: { case: { select: { reference: true } } },
        orderBy: { dueDate: { sort: 'asc', nulls: 'last' } },
      }), []),
      // Upcoming events (7 days)
      safe(() => db.event.findMany({
        where: { ...where, startTime: { gte: now, lte: sevenDays } },
        include: { case: { select: { reference: true } }, assignments: { include: { user: { select: { fullName: true } } } } },
        orderBy: { startTime: 'asc' },
      }), []),
      // Urgency cases
      safe(() => db.case.findMany({
        where: { ...where, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] }, events: { some: { startTime: { gte: now, lte: threeDays } } } },
        include: { client: { select: { fullName: true } }, events: { where: { startTime: { gte: now, lte: threeDays } }, orderBy: { startTime: 'asc' }, take: 1 } },
        take: 10,
      }), []),
      // Financial KPIs (needs type column on invoices)
      safe(() => db.invoice.aggregate({ where: { ...where, type: 'facture', status: { in: ['non_paye', 'partiel'] } }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
      safe(() => db.invoice.count({ where: { ...where, type: 'facture', dueDate: { lte: now }, status: { in: ['non_paye', 'partiel'] } } }), 0),
      safe(() => db.payment.aggregate({ where: { ...where, paidAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }, status: { not: 'annule' } }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
      // Activity counts
      safe(() => db.case.count({ where: { ...where, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }), 0),
      safe(() => db.case.count({ where: { ...where, status: 'ferme', updatedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }), 0),
      safe(() => db.client.count({ where: { ...where, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }), 0),
      safe(() => db.event.count({ where: { ...where, eventType: 'audience', startTime: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }), 0),
      safe(() => db.invoice.count({ where: { ...where, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }), 0),
      // Today's events
      safe(() => db.event.findMany({
        where: { ...where, startTime: { gte: startOfDay, lte: endOfDay } },
        include: { case: { select: { id: true, reference: true, title: true } }, assignments: { include: { user: { select: { fullName: true } } } } },
        orderBy: { startTime: 'asc' },
      }), []),
      // Pending documents (needs status column on documents)
      safe(() => db.document.findMany({
        where: { tenantId, status: { in: ['en_attente', 'brouillon'] } },
        include: { case: { select: { reference: true, title: true } }, uploadedBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' }, take: 10,
      }), []),
      safe(() => db.document.count({ where: { tenantId, status: { in: ['en_attente', 'brouillon'] } } }), 0),
      // Cases without deadlines
      safe(() => db.case.findMany({
        where: { tenantId, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] }, events: { none: { startTime: { gte: now } } } },
        include: { client: { select: { fullName: true } }, _count: { select: { tasks: { where: { status: { not: 'terminee' } } } } } },
        orderBy: { updatedAt: 'desc' }, take: 10,
      }), []),
      safe(() => db.case.count({
        where: { tenantId, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] }, events: { none: { startTime: { gte: now } } } },
      }), 0),
      // User case assignments (for myTasks)
      userId
        ? safe(() => db.caseAssignment.findMany({ where: { userId, tenantId }, select: { caseId: true } }), [])
        : Promise.resolve([] as { caseId: string }[]),
    ])

    // ═══════════════════════════════════════════════════════
    // BATCH 2: myTasks (depends on userCaseAssignments from batch 1)
    // ═══════════════════════════════════════════════════════
    const userCaseIds = (userCaseAssignments as { caseId: string }[]).map(a => a.caseId)
    const taskWhere: Record<string, unknown> = { ...where, status: { not: 'terminee' } }
    if (userCaseIds.length > 0) {
      taskWhere.OR = [{ caseId: { in: userCaseIds } }, { caseId: null }]
    }
    const tasks = await safe(() => db.task.findMany({
      where: taskWhere,
      include: { case: { select: { reference: true } } },
      orderBy: { dueDate: { sort: 'asc', nulls: 'last' } },
      take: 20,
    }), [])

    // ═══════════════════════════════════════════════════════
    // FORMAT RESULTS (CPU-only, no DB calls)
    // ═══════════════════════════════════════════════════════
    const casesByStatus: Record<string, number> = {}
    for (const item of (casesByStatusRaw as any[])) casesByStatus[item.status] = item._count.status

    const casesByType: Record<string, number> = {}
    for (const item of (casesByTypeRaw as any[])) casesByType[item.caseType] = item._count.caseType

    const overdueInvoicesFormatted = (overdueInvoices as any[]).map((inv) => {
      const daysOverdue = Math.ceil((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000)
      return { id: inv.id, clientName: inv.client?.fullName ?? 'Inconnu', amount: inv.amount, currencyCode: inv.currency?.code ?? 'XAF', dueDate: inv.dueDate, status: inv.status, daysOverdue }
    })

    const urgentTasksFormatted = (urgentTasks as any[]).map((t) => ({
      id: t.id, title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate, caseReference: t.case?.reference ?? null
    }))

    const upcomingEventsFormatted = (upcomingEventsEnhanced as any[]).map((e) => ({
      id: e.id, title: e.title, description: e.description, startTime: e.startTime, endTime: e.endTime, eventType: e.eventType, criticality: e.criticality,
      caseReference: e.case?.reference ?? null, assignments: (e.assignments || []).map((a: any) => ({ userId: a.userId, userName: a.user?.fullName ?? 'Inconnu' })),
    }))

    const urgencies = (urgencyCases as any[]).map((c) => {
      const nextEvent = c.events?.[0]
      if (!nextEvent) return null
      const daysRemaining = Math.ceil((new Date(nextEvent.startTime).getTime() - now.getTime()) / 86400000)
      return { id: c.id, reference: c.reference, title: c.title, clientName: c.client?.fullName ?? 'Inconnu', nextDueDate: nextEvent.startTime, daysRemaining }
    }).filter(Boolean)

    const myTasks = (tasks as any[]).map((t) => ({
      id: t.id, title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate, caseReference: t.case?.reference ?? null
    }))

    const pendingDocumentsFormatted = (pendingDocsList as any[]).map((d) => ({
      id: d.id, fileName: d.fileName, status: d.status, createdAt: d.createdAt, caseReference: d.case?.reference ?? null, caseTitle: d.case?.title ?? null, uploadedBy: d.uploadedBy?.fullName ?? null
    }))

    const casesWithoutDeadlinesFormatted = (casesWithoutDeadlinesRaw as any[]).map((c) => ({
      id: c.id, reference: c.reference, title: c.title, clientName: c.client?.fullName ?? null, status: c.status, updatedAt: c.updatedAt, pendingTasksCount: c._count.tasks
    }))

    return NextResponse.json({
      totalCases,
      activeCases,
      totalClients,
      upcomingEvents: (upcomingEventsEnhanced as any[]).length,
      unpaidInvoices,
      totalRevenue: (revenueThisMonthResult as any)._sum?.amount ?? 0,
      paidInvoices,
      casesByStatus,
      casesByType,
      recentActivity,
      upcomingEventsList: upcomingEventsEnhanced,
      urgencies,
      overdueInvoices: overdueInvoicesFormatted,
      urgentTasks: urgentTasksFormatted,
      upcomingEventsEnhanced: upcomingEventsFormatted,
      myTasks,
      todayEventsCount: (todayEvents as any[]).length,
      todayEvents: (todayEvents as any[]).map((e: any) => ({
        id: e.id, title: e.title, startTime: e.startTime, endTime: e.endTime, eventType: e.eventType, criticality: e.criticality,
        caseReference: e.case?.reference ?? null, assignments: (e.assignments || []).map((a: any) => ({ userName: a.user?.fullName ?? 'Inconnu' })),
      })),
      financial: {
        revenueThisMonth: (revenueThisMonthResult as any)._sum?.amount ?? 0,
        revenueLastMonth: (revenueLastMonthResult as any)._sum?.amount ?? 0,
        collectedThisMonth: (collectedThisMonthResult as any)._sum?.amount ?? 0,
        collectedLastMonth: (collectedLastMonthResult as any)._sum?.amount ?? 0,
        toRecover: (toRecoverResult as any)._sum?.amount ?? 0,
        overdueInvoicesCount,
        paymentsThisMonth: (paymentsThisMonthResult as any)._sum?.amount ?? 0,
        overduePayments: overdueInvoicesCount,
        newClientsThisMonth: nouveauxClients,
        newCasesThisMonth: dossiersOuverts,
        topClients: [],
        monthlyRevenue: [],
        methodBreakdown: [],
      },
      activityCounts: { dossiersOuverts, dossiersCloses, nouveauxClients, audiences, facturesEmises },
      pendingDocuments: pendingDocumentsFormatted,
      pendingDocumentsCount,
      casesWithoutDeadlines: casesWithoutDeadlinesFormatted,
      casesWithoutDeadlinesCount,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
