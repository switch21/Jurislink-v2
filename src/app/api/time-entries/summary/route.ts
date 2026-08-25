import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const userId = searchParams.get('userId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const where: Prisma.TimeEntryWhereInput = { tenantId }
    if (userId) where.userId = userId

    if (fromDate || toDate) {
      where.startTime = {}
      if (fromDate) (where.startTime as Prisma.DateTimeNullableFilter).gte = new Date(fromDate)
      if (toDate) (where.startTime as Prisma.DateTimeNullableFilter).lte = new Date(toDate)
    }

    // Aggregate totals
    const aggregates = await db.timeEntry.aggregate({
      where,
      _count: true,
      _sum: {
        duration: true,
        totalAmount: true,
      },
    })

    // Billable-only aggregates
    const billableAgg = await db.timeEntry.aggregate({
      where: { ...where, isBillable: true },
      _sum: { duration: true },
    })

    // Group by case
    const byCase = await db.timeEntry.groupBy({
      by: ['caseId'],
      where: { ...where, caseId: { not: null } },
      _sum: { duration: true, totalAmount: true },
      _count: true,
      orderBy: { _sum: { duration: 'desc' } },
    })

    // Fetch case details for each group
    const caseIds = byCase.map((g) => g.caseId!).filter(Boolean)
    const cases = caseIds.length > 0
      ? await db.case.findMany({
          where: { id: { in: caseIds } },
          select: { id: true, reference: true, title: true },
        })
      : []
    const caseMap = new Map(cases.map((c) => [c.id, c]))

    // Calculate average daily hours
    const totalSeconds = aggregates._sum.duration || 0
    let avgDailyHours = 0
    if (fromDate && toDate) {
      const days = Math.max(1, Math.ceil(
        (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24),
      ))
      avgDailyHours = parseFloat(((totalSeconds / 3600) / days).toFixed(2))
    } else {
      // Get all time entries to count distinct days
      const entries = await db.timeEntry.findMany({
        where,
        select: { startTime: true },
      })
      const distinctDays = new Set(entries.map((e) => e.startTime.toISOString().slice(0, 10))).size
      avgDailyHours = distinctDays > 0
        ? parseFloat(((totalSeconds / 3600) / distinctDays).toFixed(2))
        : 0
    }

    const byCaseResult = byCase.map((g) => {
      const c = caseMap.get(g.caseId!)
      return {
        caseId: g.caseId,
        caseReference: c?.reference || null,
        caseTitle: c?.title || 'Sans dossier',
        totalSeconds: g._sum.duration || 0,
        totalAmount: g._sum.totalAmount || 0,
      }
    })

    return NextResponse.json({
      totalEntries: aggregates._count,
      totalSeconds: totalSeconds,
      totalBillableSeconds: billableAgg._sum.duration || 0,
      totalAmount: aggregates._sum.totalAmount || 0,
      avgDailyHours,
      byCase: byCaseResult,
    })
  } catch (error) {
    console.error('Time entries summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
