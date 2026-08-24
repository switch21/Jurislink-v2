import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
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

    // Current month boundaries
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

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
        startTime: { gte: now },
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

    // === Enhanced dashboard data ===

    // Overdue invoices: dueDate < now and status non_paye or partiel
    const overdueInvoices = await db.invoice.findMany({
      where: {
        ...where,
        dueDate: { lt: now },
        status: { in: ['non_paye', 'partiel'] },
      },
      include: {
        client: { select: { fullName: true } },
      },
      orderBy: { dueDate: 'asc' },
    })
    const overdueInvoicesFormatted = overdueInvoices.map((inv) => {
      const daysOverdue = Math.ceil(
        (now.getTime() - inv.dueDate!.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        id: inv.id,
        clientName: inv.client.fullName,
        amount: inv.amount,
        currencyCode: inv.currency?.code ?? 'XAF',
        dueDate: inv.dueDate,
        status: inv.status,
        daysOverdue,
      }
    })

    // Urgent tasks: priority urgente or haute, not terminee
    const urgentTasks = await db.task.findMany({
      where: {
        ...where,
        priority: { in: ['urgente', 'haute'] },
        status: { not: 'terminee' },
      },
      include: {
        case: { select: { reference: true } },
      },
      orderBy: { dueDate: { sort: 'asc', nulls: 'last' } },
    })
    const urgentTasksFormatted = urgentTasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
      caseReference: t.case?.reference ?? null,
    }))

    // Upcoming events: next 7 days
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingEventsEnhanced = await db.event.findMany({
      where: {
        ...where,
        startTime: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        case: { select: { reference: true } },
        assignments: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    })
    const upcomingEventsFormatted = upcomingEventsEnhanced.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startTime: e.startTime,
      endTime: e.endTime,
      eventType: e.eventType,
      criticality: e.criticality,
      caseReference: e.case?.reference ?? null,
      assignments: e.assignments.map((a) => ({
        userId: a.userId,
        userName: a.user.fullName,
      })),
    }))

    // === myTasks: tasks relevant to the current user ===
    let myTasks: Array<{
      id: string
      title: string
      priority: string
      status: string
      dueDate: Date | null
      caseReference: string | null
    }> = []
    if (userId) {
      // Get case IDs assigned to this user
      const userCaseAssignments = await db.caseAssignment.findMany({
        where: { userId, tenantId },
        select: { caseId: true },
      })
      const userCaseIds = userCaseAssignments.map((a) => a.caseId)

      const taskWhere: Record<string, unknown> = {
        ...where,
        status: { not: 'terminee' },
      }
      if (userCaseIds.length > 0) {
        taskWhere.OR = [
          { caseId: { in: userCaseIds } },
          { caseId: null },
        ]
      }

      const tasks = await db.task.findMany({
        where: taskWhere,
        include: {
          case: { select: { reference: true } },
        },
        orderBy: {
          dueDate: { sort: 'asc', nulls: 'last' },
        },
        take: 20,
      })
      myTasks = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        caseReference: t.case?.reference ?? null,
      }))
    } else {
      // No userId: return all tenant tasks not completed
      const tasks = await db.task.findMany({
        where: { ...where, status: { not: 'terminee' } },
        include: {
          case: { select: { reference: true } },
        },
        orderBy: {
          dueDate: { sort: 'asc', nulls: 'last' },
        },
        take: 20,
      })
      myTasks = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        caseReference: t.case?.reference ?? null,
      }))
    }

    // === Financial enhancements ===

    // toRecover: sum of unpaid (non_paye) + partial (partiel) invoice amounts
    const toRecoverResult = await db.invoice.aggregate({
      where: {
        ...where,
        status: { in: ['non_paye', 'partiel'] },
      },
      _sum: { amount: true },
    })
    const toRecover = toRecoverResult._sum.amount ?? 0

    // overdueInvoicesCount: count where dueDate < now AND status in non_paye/partiel
    const overdueInvoicesCount = await db.invoice.count({
      where: {
        ...where,
        dueDate: { lt: now },
        status: { in: ['non_paye', 'partiel'] },
      },
    })

    // newClientsThisMonth
    const newClientsThisMonth = await db.client.count({
      where: {
        ...where,
        createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    })

    // newCasesThisMonth
    const newCasesThisMonth = await db.case.count({
      where: {
        ...where,
        createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    })

    // === Payment data ===

    // paymentsThisMonth: total payments received this month
    const paymentsThisMonthResult = await db.payment.aggregate({
      where: {
        ...where,
        paidAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        status: { not: 'annule' },
      },
      _sum: { amount: true },
    })
    const paymentsThisMonth = paymentsThisMonthResult._sum.amount ?? 0

    // overduePayments: count of invoices where dueDate < now AND status in (non_paye, partiel)
    const overduePayments = await db.invoice.count({
      where: {
        ...where,
        dueDate: { lt: now },
        status: { in: ['non_paye', 'partiel'] },
      },
    })

    // === activityCounts (current month) ===
    const [
      dossiersOuverts,
      dossiersCloses,
      nouveauxClients,
      audiences,
      facturesEmises,
    ] = await Promise.all([
      db.case.count({
        where: {
          ...where,
          createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
      }),
      db.case.count({
        where: {
          ...where,
          status: 'ferme',
          updatedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
      }),
      db.client.count({
        where: {
          ...where,
          createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
      }),
      db.event.count({
        where: {
          ...where,
          eventType: 'audience',
          startTime: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
      }),
      db.invoice.count({
        where: {
          ...where,
          createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
      }),
    ])

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
      urgencies: [],
      overdueInvoices: overdueInvoicesFormatted,
      urgentTasks: urgentTasksFormatted,
      upcomingEventsEnhanced: upcomingEventsFormatted,
      myTasks,
      financial: {
        revenueThisMonth: totalRevenue,
        revenueLastMonth: 0,
        collectedThisMonth: totalRevenue,
        collectedLastMonth: 0,
        toRecover,
        overdueInvoicesCount,
        paymentsThisMonth,
        overduePayments,
        newClientsThisMonth,
        newCasesThisMonth,
        topClients: [],
        monthlyRevenue: [],
        methodBreakdown: [],
      },
      activityCounts: {
        dossiersOuverts,
        dossiersCloses,
        nouveauxClients,
        audiences,
        facturesEmises,
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
