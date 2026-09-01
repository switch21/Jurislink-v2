import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

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

    const dateFilter: Prisma.CaseWhereInput = {}
    if (fromDate || toDate) {
      dateFilter.createdAt = {}
      if (fromDate) (dateFilter.createdAt as any).gte = new Date(fromDate)
      if (toDate) (dateFilter.createdAt as any).lte = new Date(toDate)
    }

    const cases = await db.case.findMany({
      where: { tenantId, ...dateFilter },
      include: {
        client: { select: { id: true, fullName: true } },
        assignments: { include: { user: { select: { id: true, fullName: true } } } },
        tasks: true, notes: true, documents: true, events: true, invoices: true, timeEntries: true, taggings: { include: { tag: true } },
      },
    })

    // KPIs
    const total = cases.length
    const byStatus: Record<string, number> = {}
    const byType: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    const byOutcome: Record<string, number> = {}
    const byLawyer: Record<string, { name: string; count: number }> = {}
    const byMonth: Record<string, number> = {}
    let totalAmountDispute = 0
    let resolvedCount = 0
    const resolutionTimes: number[] = []

    for (const c of cases) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1
      byType[c.caseType] = (byType[c.caseType] || 0) + 1
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1
      if (c.outcome) { byOutcome[c.outcome] = (byOutcome[c.outcome] || 0) + 1; resolvedCount++ }
      if (c.amountInDispute) totalAmountDispute += c.amountInDispute
      const m = c.createdAt.toISOString().slice(0, 7)
      byMonth[m] = (byMonth[m] || 0) + 1

      for (const a of c.assignments) {
        const name = a.user?.fullName || 'Inconnu'
        if (!byLawyer[a.userId]) byLawyer[a.userId] = { name, count: 0 }
        byLawyer[a.userId].count++
      }

      if ((c.status === 'clos' || c.status === 'archive') && c.updatedAt) {
        const days = Math.floor((new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / 86400000)
        if (days >= 0) resolutionTimes.push(days)
      }
    }

    const avgResolutionTime = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : 0
    const medianResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.sort((a, b) => a - b)[Math.floor(resolutionTimes.length / 2)]
      : 0

    // Per-case detail (top 20 most recent)
    const caseDetails = cases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50).map(c => ({
      id: c.id, reference: c.reference, title: c.title, caseType: c.caseType, status: c.status, priority: c.priority,
      outcome: c.outcome, createdAt: c.createdAt, updatedAt: c.updatedAt,
      clientName: c.client?.fullName || '—',
      amountInDispute: c.amountInDispute,
      taskCount: c.tasks.length, docCount: c.documents.length, eventCount: c.events.length,
      totalInvoiced: c.invoices.filter(i => i.type !== 'avoir').reduce((s, i) => s + i.amount, 0),
      totalPaid: c.invoices.reduce((s, i) => s + (i.paidAmount || 0), 0),
      totalTimeSeconds: c.timeEntries.reduce((s, t) => s + t.duration, 0),
      totalTimeBilled: c.timeEntries.filter(t => t.billed).reduce((s, t) => s + t.duration, 0),
      assignedLawyers: c.assignments.map(a => a.user?.fullName || '').filter(Boolean),
      tags: c.taggings.map(t => ({ name: t.tag.name, color: t.tag.color })),
    }))

    return NextResponse.json({
      kpis: { total, resolvedCount, avgResolutionTime, medianResolutionTime, totalAmountDispute, activeCases: cases.filter(c => !['clos', 'archive'].includes(c.status)).length },
      byStatus, byType, byPriority, byOutcome, byLawyer: Object.values(byLawyer).sort((a, b) => b.count - a.count), byMonth, caseDetails,
    })
  } catch (error) {
    console.error('Cases report error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
