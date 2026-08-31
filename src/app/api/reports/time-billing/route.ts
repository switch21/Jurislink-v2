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
    if (!tenantId) return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })

    const fromDate = searchParams.get('from') || undefined
    const toDate = searchParams.get('to') || undefined
    const dateFilter: any = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) dateFilter.lte = new Date(toDate)

    const timeEntries = await db.timeEntry.findMany({
      where: { tenantId, startTime: dateFilter },
      include: { user: { select: { id: true, fullName: true } }, case: { select: { id: true, reference: true, title: true, client: { select: { id: true, fullName: true } } } } },
    })

    // KPIs
    const totalSeconds = timeEntries.reduce((s, t) => s + t.duration, 0)
    const billableSeconds = timeEntries.filter(t => t.isBillable).reduce((s, t) => s + t.duration, 0)
    const nonBillableSeconds = totalSeconds - billableSeconds
    const billedSeconds = timeEntries.filter(t => t.billed).reduce((s, t) => s + t.duration, 0)
    const unbilledSeconds = billableSeconds - billedSeconds
    const totalBilledAmount = timeEntries.filter(t => t.billed && t.totalAmount).reduce((s, t) => s + t.totalAmount!, 0)
    const totalPotentialAmount = timeEntries.filter(t => t.isBillable && t.totalAmount).reduce((s, t) => s + t.totalAmount!, 0)
    const unbilledAmount = totalPotentialAmount - totalBilledAmount
    const billingEfficiency = billableSeconds > 0 ? (billedSeconds / billableSeconds) * 100 : 0

    // By user
    const byUser: Record<string, { name: string; totalSeconds: number; billableSeconds: number; billedSeconds: number; amount: number; entryCount: number; caseCount: number }> = {}
    const userCases = new Set<string>()
    for (const t of timeEntries) {
      const uid = t.userId
      const name = t.user?.fullName || 'Inconnu'
      if (!byUser[uid]) byUser[uid] = { name, totalSeconds: 0, billableSeconds: 0, billedSeconds: 0, amount: 0, entryCount: 0, caseCount: 0 }
      byUser[uid].totalSeconds += t.duration
      if (t.isBillable) byUser[uid].billableSeconds += t.duration
      if (t.billed) byUser[uid].billedSeconds += t.duration
      if (t.totalAmount && t.billed) byUser[uid].amount += t.totalAmount
      byUser[uid].entryCount++
      if (t.caseId) {
        const ck = `${uid}-${t.caseId}`
        if (!userCases.has(ck)) { userCases.add(ck); byUser[uid].caseCount++ }
      }
    }

    // By case
    const byCase: Record<string, { caseId: string; reference: string; title: string; clientName: string; totalSeconds: number; billableSeconds: number; billedSeconds: number; amount: number; entryCount: number }> = {}
    for (const t of timeEntries) {
      if (!t.caseId) continue
      const cid = t.caseId
      const ref = t.case?.reference || '—'
      const title = t.case?.title || '—'
      const clientName = t.case?.client?.fullName || '—'
      if (!byCase[cid]) byCase[cid] = { caseId: cid, reference: ref, title, clientName, totalSeconds: 0, billableSeconds: 0, billedSeconds: 0, amount: 0, entryCount: 0 }
      byCase[cid].totalSeconds += t.duration
      if (t.isBillable) byCase[cid].billableSeconds += t.duration
      if (t.billed) byCase[cid].billedSeconds += t.duration
      if (t.totalAmount) byCase[cid].amount += t.totalAmount
      byCase[cid].entryCount++
    }

    // By month
    const byMonth: Record<string, { totalSeconds: number; billableSeconds: number; billedSeconds: number; amount: number }> = {}
    for (const t of timeEntries) {
      const m = t.startTime.toISOString().slice(0, 7)
      if (!byMonth[m]) byMonth[m] = { totalSeconds: 0, billableSeconds: 0, billedSeconds: 0, amount: 0 }
      byMonth[m].totalSeconds += t.duration
      if (t.isBillable) byMonth[m].billableSeconds += t.duration
      if (t.billed) byMonth[m].billedSeconds += t.duration
      if (t.totalAmount && t.billed) byMonth[m].amount += t.totalAmount
    }

    // Hourly rate distribution
    const rateDistribution: Record<string, { count: number; totalSeconds: number }> = {}
    for (const t of timeEntries) {
      const rate = t.hourlyRate ? `${t.hourlyRate}` : 'non défini'
      if (!rateDistribution[rate]) rateDistribution[rate] = { count: 0, totalSeconds: 0 }
      rateDistribution[rate].count++
      rateDistribution[rate].totalSeconds += t.duration
    }

    return NextResponse.json({
      kpis: { totalSeconds, billableSeconds, nonBillableSeconds, billedSeconds, unbilledSeconds, totalBilledAmount, totalPotentialAmount, unbilledAmount, billingEfficiency, totalEntries: timeEntries.length },
      byUser: Object.values(byUser).sort((a, b) => b.totalSeconds - a.totalSeconds),
      byCase: Object.values(byCase).sort((a, b) => b.totalSeconds - a.totalSeconds),
      byMonth, rateDistribution,
    })
  } catch (error) {
    console.error('Time billing report error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
