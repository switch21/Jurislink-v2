import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticatePortal } from '@/lib/portal-auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticatePortal(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params

    const portalAccount = await db.clientPortal.findUnique({
      where: { id: auth.portalUserId },
    })
    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const caseData = await db.case.findFirst({
      where: {
        id,
        clientId: portalAccount.clientId,
        tenantId: auth.tenantId,
      },
    })

    if (!caseData) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    if (caseData.isSecret) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const [events, notes, documents, tasks, invoices] = await Promise.all([
      db.event.findMany({
        where: { caseId: id },
        orderBy: { startTime: 'desc' },
      }),
      db.caseNote.findMany({
        where: { caseId: id },
        include: { author: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.document.findMany({
        where: { caseId: id },
        orderBy: { createdAt: 'desc' },
      }),
      db.task.findMany({
        where: { caseId: id },
        orderBy: { createdAt: 'desc' },
      }),
      db.invoice.findMany({
        where: { caseId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const timeline: Array<{
      id: string
      type: string
      title: string
      description: string | null
      date: Date
      author?: string
    }> = []

    for (const e of events) {
      timeline.push({
        id: `event-${e.id}`,
        type: 'event',
        title: e.title,
        description: e.description,
        date: e.startTime,
      })
    }

    for (const n of notes) {
      timeline.push({
        id: `note-${n.id}`,
        type: 'note',
        title: 'Note',
        description: n.content,
        date: n.createdAt,
        author: n.author?.fullName,
      })
    }

    for (const d of documents) {
      timeline.push({
        id: `document-${d.id}`,
        type: 'document',
        title: d.fileName,
        description: d.description,
        date: d.createdAt,
        author: undefined,
      })
    }

    for (const t of tasks) {
      timeline.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.title,
        description: t.description,
        date: t.createdAt,
        author: undefined,
      })
    }

    for (const inv of invoices) {
      timeline.push({
        id: `invoice-${inv.id}`,
        type: 'invoice',
        title: `${inv.invoiceNumber || 'Facture'} - ${inv.type}`,
        description: `Montant: ${inv.amount}`,
        date: inv.issuedAt ?? inv.createdAt,
        author: undefined,
      })
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(timeline)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal timeline error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
