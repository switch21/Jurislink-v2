import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'time_entry', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const clientId = searchParams.get('clientId')
    const caseId = searchParams.get('caseId')

    if (!tenantId) return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })

    const where: any = { tenantId, billed: false, isBillable: true, endTime: { not: null } }
    if (caseId) where.caseId = caseId
    if (clientId) where.case = { clientId }

    const entries = await db.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true } },
        case: { select: { id: true, reference: true, title: true, clientId: true, client: { select: { id: true, fullName: true, company: true } } } },
      },
      orderBy: { startTime: 'asc' },
      take: 500,
    })

    // Group by client
    const byClient: Record<string, { clientId: string; clientName: string; company: string | null; entries: typeof entries; totalSeconds: number; totalAmount: number }> = {}
    for (const e of entries) {
      const cid = e.case?.clientId || 'no-case'
      const cname = e.case?.client?.fullName || 'Sans dossier'
      const ccompany = e.case?.client?.company || null
      if (!byClient[cid]) byClient[cid] = { clientId: cid, clientName: cname, company: ccompany, entries: [], totalSeconds: 0, totalAmount: 0 }
      byClient[cid].entries.push(e)
      byClient[cid].totalSeconds += e.duration
      byClient[cid].totalAmount += e.totalAmount || 0
    }

    // Group by case within client
    const grouped = Object.values(byClient).map(c => ({
      ...c,
      byCase: c.entries.reduce<Record<string, { caseId: string; reference: string; title: string; entries: typeof entries; totalSeconds: number; totalAmount: number }>>((acc, e) => {
        const ck = e.caseId || 'none'
        if (!acc[ck]) acc[ck] = { caseId: ck, reference: e.case?.reference || '—', title: e.case?.title || 'Sans titre', entries: [], totalSeconds: 0, totalAmount: 0 }
        acc[ck].entries.push(e)
        acc[ck].totalSeconds += e.duration
        acc[ck].totalAmount += e.totalAmount || 0
        return acc
      }, {}),
    }))

    return NextResponse.json({
      totalEntries: entries.length,
      totalSeconds: entries.reduce((s, e) => s + e.duration, 0),
      totalAmount: entries.reduce((s, e) => s + (e.totalAmount || 0), 0),
      grouped,
      allEntries: entries,
    })
  } catch (error) {
    console.error('Unbilled entries error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
