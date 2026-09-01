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
    const df: any = {}
    if (fromDate) df.gte = new Date(fromDate)
    if (toDate) df.lte = new Date(toDate)

    const users = await db.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, fullName: true, role: true },
    })

    const tasks = await db.task.findMany({ where: { tenantId, createdAt: df } })
    const docs = await db.document.findMany({ where: { tenantId, createdAt: df } })
    const events = await db.event.findMany({ where: { tenantId, startTime: df } })
    const timeEntries = await db.timeEntry.findMany({ where: { tenantId, startTime: df } })
    const cases = await db.case.findMany({ where: { tenantId, createdAt: df } })
    const invoices = await db.invoice.findMany({ where: { tenantId, createdAt: df } })
    const notes = await db.caseNote.findMany({ where: { tenantId, createdAt: df } })
    const comms = await db.communication.findMany({ where: { tenantId, createdAt: df } })

    // KPIs
    const tasksCompleted = tasks.filter(t => t.status === 'terminee').length
    const tasksOverdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'terminee' && t.status !== 'annulee').length
    const totalDocs = docs.length
    const totalEvents = events.length
    const totalCases = cases.length
    const totalInvoices = invoices.length
    const totalNotes = notes.length
    const totalComms = comms.filter(c => c.status === 'sent').length
    const totalTimeSeconds = timeEntries.reduce((s, t) => s + t.duration, 0)

    // By user
    const byUser: Record<string, { name: string; role: string; tasksCompleted: number; tasksTotal: number; docsUploaded: number; eventsAttended: number; timeSeconds: number; casesHandled: number; notesAdded: number; commsSent: number }> = {}
    for (const u of users) {
      byUser[u.id] = { name: u.fullName, role: u.role, tasksCompleted: 0, tasksTotal: 0, docsUploaded: 0, eventsAttended: 0, timeSeconds: 0, casesHandled: 0, notesAdded: 0, commsSent: 0 }
    }
    // Tasks assigned
    for (const t of tasks) {
      if (t.assignedToId && byUser[t.assignedToId]) {
        byUser[t.assignedToId].tasksTotal++
        if (t.status === 'terminee') byUser[t.assignedToId].tasksCompleted++
      }
    }
    // Docs
    for (const d of docs) { if (d.uploadedById && byUser[d.uploadedById]) byUser[d.uploadedById].docsUploaded++ }
    // Events
    for (const e of events) {
      const assignments = await db.eventAssignment.findMany({ where: { eventId: e.id }, select: { userId: true } })
      for (const a of assignments) { if (byUser[a.userId]) byUser[a.userId].eventsAttended++ }
    }
    // Time
    for (const t of timeEntries) { if (byUser[t.userId]) byUser[t.userId].timeSeconds += t.duration }
    // Notes
    for (const n of notes) { if (n.authorId && byUser[n.authorId]) byUser[n.authorId].notesAdded++ }
    // Comms
    for (const c of comms) { if (c.sentById && byUser[c.sentById] && c.status === 'sent') byUser[c.sentById].commsSent++ }

    // By month
    const byMonth: Record<string, { tasks: number; docs: number; events: number; cases: number; invoices: number; notes: number; timeSeconds: number }> = {}
    const fill = (m: string) => { if (!byMonth[m]) byMonth[m] = { tasks: 0, docs: 0, events: 0, cases: 0, invoices: 0, notes: 0, timeSeconds: 0 } }
    for (const t of tasks) { fill(t.createdAt.toISOString().slice(0, 7)); byMonth[t.createdAt.toISOString().slice(0, 7)].tasks++ }
    for (const d of docs) { fill(d.createdAt.toISOString().slice(0, 7)); byMonth[d.createdAt.toISOString().slice(0, 7)].docs++ }
    for (const e of events) { fill(e.startTime.toISOString().slice(0, 7)); byMonth[e.startTime.toISOString().slice(0, 7)].events++ }
    for (const c of cases) { fill(c.createdAt.toISOString().slice(0, 7)); byMonth[c.createdAt.toISOString().slice(0, 7)].cases++ }
    for (const i of invoices) { fill(i.createdAt.toISOString().slice(0, 7)); byMonth[i.createdAt.toISOString().slice(0, 7)].invoices++ }
    for (const n of notes) { fill(n.createdAt.toISOString().slice(0, 7)); byMonth[n.createdAt.toISOString().slice(0, 7)].notes++ }
    for (const t of timeEntries) { fill(t.startTime.toISOString().slice(0, 7)); byMonth[t.startTime.toISOString().slice(0, 7)].timeSeconds += t.duration }

    return NextResponse.json({
      kpis: { tasksCompleted, tasksOverdue, totalTasks: tasks.length, totalDocs, totalEvents, totalCases, totalInvoices, totalNotes, totalComms, totalTimeSeconds },
      byUser: Object.values(byUser),
      byMonth,
    })
  } catch (error) {
    console.error('Activity report error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
