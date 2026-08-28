/**
 * GET /api/dashboard
 * Returns all dashboard data in a single optimized request.
 * All independent queries are batched in Promise.all for maximum parallelism.
 */
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
    // ═══════════════════════════════════════════════════════
    const [
      // --- Basic counts ---
      totalCases,
      activeCases,
      totalClients,
      unpaidInvoices,
      paidInvoices,
      // --- Revenue aggregates (this month + last month) ---
      revenueThisMonthResult,
      revenueLastMonthResult,
      // --- Payment aggregates (this month + last month) ---
      collectedThisMonthResult,
      collectedLastMonthResult,
      // --- Grouped data ---
      casesByStatusRaw,
      casesByTypeRaw,
      // --- Activity ---
      recentActivity,
      // --- Overdue invoices (full list) ---
      overdueInvoices,
      // --- Urgent tasks ---
      urgentTasks,
      // --- Upcoming events (next 7 days) ---
      upcomingEventsEnhanced,
      // --- Urgency cases (events within 3 days) ---
      urgencyCases,
      // --- Financial KPIs ---
      toRecoverResult,
      overdueInvoicesCount,
      paymentsThisMonthResult,
      // --- Activity counts (current month) ---
      dossiersOuverts,
      dossiersCloses,
      nouveauxClients,
      audiences,
      facturesEmises,
      // --- Today's events ---
      todayEvents,
      // --- Pending documents (list + count) ---
      pendingDocsList,
      pendingDocumentsCount,
      // --- Cases without deadlines (list + count) ---
      casesWithoutDeadlinesRaw,
      casesWithoutDeadlinesCount,
      // --- User-specific: case assignments (for myTasks filtering) ---
      userCaseAssignments,
    ] = await Promise.all([
      // Basic counts
      db.case.count({ where }),
      db.case.count({ where: { ...where, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] } } }),
      db.client.count({ where }),
      db.invoice.count({ where: { ...where, status: 'non_paye' } }),
      db.invoice.count({ where: { ...where, status: 'paye' } }),
      // Revenue aggregates
      db.invoice.aggregate({ where: { ...where, status: 'paye', issuedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } }, _sum: { amount: true } }),
      db.invoice.aggregate({ where: { ...where, status: 'paye', issuedAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } }, _sum: { amount: true } }),
      // Payment aggregates
      db.payment.aggregate({ where: { ...where, paidAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }, status: { not: 'annule' } }, _sum: { amount: true } }),
      db.payment.aggregate({ where: { ...where, paidAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth }, status: { not: 'annule' } }, _sum: { amount: true } }),
      // Grouped data
      db.case.groupBy({ by: ['status'], where, _count: { status: true } }),
      db.case.groupBy({ by: ['caseType'], where, _count: { caseType: true } }),
      // Activity
      db.auditLog.findMany({ where, include: { user: { select: { id: true, fullName: true } } }, orderBy: { timestamp: 'desc' }, take: 10 }),
      // Overdue invoices
      db.invoice.findMany({
        where: { ...where, dueDate: { lt: now }, status: { in: ['non_paye', 'partiel'] } },
        include: { client: { select: { fullName: true } }, currency: { select: { code: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      // Urgent tasks
      db.task.findMany({
        where: { ...where, priority: { in: ['urgente', 'haute'] }, status: { not: 'terminee' } },
        include: { case: { select: { reference: true } } },
        orderBy: { dueDate: { sort: 'asc', nulls: 'last' } },
      }),
      // Upcoming events (7 days)
      db.event.findMany({
        where: { ...where, startTime: { gte: now, lte: sevenDays } },
        include: { case: { select: { reference: true } }, assignments: { include: { user: { select: { fullName: true } } } } },
        orderBy: { startTime: 'asc' },
      }),
      // Urgency cases
      db.case.findMany({
        where: { ...where, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] }, events: { some: { startTime: { gte: now, lte: threeDays } } } },
        include: { client: { select: { fullName: true } }, events: { where: { startTime: { gte: now, lte: threeDays } }, orderBy: { startTime: 'asc' }, take: 1 } },
        take: 10,
      }),
      // Financial KPIs
      db.invoice.aggregate({ where: { ...where, status: { in: ['non_paye', 'partiel'] } }, _sum: { amount: true } }),
      db.invoice.count({ where: { ...where, dueDate: { lt: now }, status: { in: ['non_paye', 'partiel'] } } }),
      db.payment.aggregate({ where: { ...where, paidAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }, status: { not: 'annule' } }, _sum: { amount: true } }),
      // Activity counts
      db.case.count({ where: { ...where, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
      db.case.count({ where: { ...where, status: 'ferme', updatedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
      db.client.count({ where: { ...where, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
      db.event.count({ where: { ...where, eventType: 'audience', startTime: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
      db.invoice.count({ where: { ...where, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
      // Today's events
      db.event.findMany({
        where: { ...where, startTime: { gte: startOfDay, lte: endOfDay } },
        include: { case: { select: { id: true, reference: true, title: true } }, assignments: { include: { user: { select: { fullName: true } } } } },
        orderBy: { startTime: 'asc' },
      }),
      // Pending documents
      db.document.findMany({
        where: { tenantId, status: { in: ['en_attente', 'brouillon'] } },
        include: { case: { select: { reference: true, title: true } }, uploadedBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' }, take: 10,
      }),
      db.document.count({ where: { tenantId, status: { in: ['en_attente', 'brouillon'] } } }),
      // Cases without deadlines
      db.case.findMany({
        where: { tenantId, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] }, events: { none: { startTime: { gte: now } } } },
        include: { client: { select: { fullName: true } }, _count: { select: { tasks: { where: { status: { not: 'terminee' } } } } } },
        orderBy: { updatedAt: 'desc' }, take: 10,
      }),
      db.case.count({
        where: { tenantId, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] }, events: { none: { startTime: { gte: now } } } },
      }),
      // User case assignments (for myTasks)
      userId
        ? db.caseAssignment.findMany({ where: { userId, tenantId }, select: { caseId: true } })
        : Promise.resolve([]),
    ])

    // ═══════════════════════════════════════════════════════
    // BATCH 2: myTasks (depends on userCaseAssignments from batch 1)
    // ═══════════════════════════════════════════════════════
    const userCaseIds = userCaseAssignments.map((a: { caseId: string }) => a.caseId)
    const taskWhere: Record<string, unknown> = { ...where, status: { not: 'terminee' } }
    if (userCaseIds.length > 0) {
      taskWhere.OR = [{ caseId: { in: userCaseIds } }, { caseId: null }]
    }
    const tasks = await db.task.findMany({
      where: taskWhere,
      include: { case: { select: { reference: true } } },
      orderBy: { dueDate: { sort: 'asc', nulls: 'last' } },
      take: 20,
    })

    // ═══════════════════════════════════════════════════════
    // FORMAT RESULTS (CPU-only, no DB calls)
    // ═══════════════════════════════════════════════════════
    const casesByStatus: Record<string, number> = {}
    for (const item of casesByStatusRaw) casesByStatus[item.status] = item._count.status

    const casesByType: Record<string, number> = {}
    for (const item of casesByTypeRaw) casesByType[item.caseType] = item._count.caseType

    const overdueInvoicesFormatted = overdueInvoices.map((inv: any) => {
      const daysOverdue = Math.ceil((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000)
      return { id: inv.id, clientName: inv.client.fullName, amount: inv.amount, currencyCode: inv.currency?.code ?? 'XAF', dueDate: inv.dueDate, status: inv.status, daysOverdue }
    })

    const urgentTasksFormatted = urgentTasks.map((t: any) => ({
      id: t.id, title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate, caseReference: t.case?.reference ?? null
    }))

    const upcomingEventsFormatted = upcomingEventsEnhanced.map((e: any) => ({
      id: e.id, title: e.title, description: e.description, startTime: e.startTime, endTime: e.endTime, eventType: e.eventType, criticality: e.criticality,
      caseReference: e.case?.reference ?? null, assignments: e.assignments.map((a: any) => ({ userId: a.userId, userName: a.user.fullName })),
    }))

    const urgencies = urgencyCases.map((c: any) => {
      const nextEvent = c.events[0]
      const daysRemaining = Math.ceil((new Date(nextEvent.startTime).getTime() - now.getTime()) / 86400000)
      return { id: c.id, reference: c.reference, title: c.title, clientName: c.client.fullName, nextDueDate: nextEvent.startTime, daysRemaining }
    })

    const myTasks = tasks.map((t: any) => ({
      id: t.id, title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate, caseReference: t.case?.reference ?? null
    }))

    const pendingDocumentsFormatted = pendingDocsList.map((d: any) => ({
      id: d.id, fileName: d.fileName, status: d.status, createdAt: d.createdAt, caseReference: d.case?.reference ?? null, caseTitle: d.case?.title ?? null, uploadedBy: d.uploadedBy?.fullName ?? null
    }))

    const casesWithoutDeadlinesFormatted = casesWithoutDeadlinesRaw.map((c: any) => ({
      id: c.id, reference: c.reference, title: c.title, clientName: c.client?.fullName ?? null, status: c.status, updatedAt: c.updatedAt, pendingTasksCount: c._count.tasks
    }))

    return NextResponse.json({
      totalCases,
      activeCases,
      totalClients,
      upcomingEvents: upcomingEventsEnhanced.length,
      unpaidInvoices,
      totalRevenue: revenueThisMonthResult._sum.amount ?? 0,
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
      todayEventsCount: todayEvents.length,
      todayEvents: todayEvents.map((e: any) => ({
        id: e.id, title: e.title, startTime: e.startTime, endTime: e.endTime, eventType: e.eventType, criticality: e.criticality,
        caseReference: e.case?.reference ?? null, assignments: e.assignments.map((a: any) => ({ userName: a.user.fullName })),
      })),
      financial: {
        revenueThisMonth: revenueThisMonthResult._sum.amount ?? 0,
        revenueLastMonth: revenueLastMonthResult._sum.amount ?? 0,
        collectedThisMonth: collectedThisMonthResult._sum.amount ?? 0,
        collectedLastMonth: collectedLastMonthResult._sum.amount ?? 0,
        toRecover: toRecoverResult._sum.amount ?? 0,
        overdueInvoicesCount,
        paymentsThisMonth: paymentsThisMonthResult._sum.amount ?? 0,
        overduePayments: overdueInvoicesCount, // same count, no duplicate query
        newClientsThisMonth: nouveauxClients, // deduplicated (same as activityCounts.nouveauxClients)
        newCasesThisMonth: dossiersOuverts, // deduplicated (same as activityCounts.dossiersOuverts)
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
