import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'case', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const cursor = searchParams.get('cursor') || null
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 10), 200)

    // Fetch all relevant data in parallel (generous limits, we slice after merge)
    const [events, notes, documents, tasks, invoices, communications] = await Promise.all([
      db.event.findMany({
        where: { 
          caseId: id, tenantId: tenantId || undefined,
          ...(search ? { OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ]} : {}),
        },
        include: { assignments: { include: { user: { select: { id: true, fullName: true } } } } },
        orderBy: { startTime: 'desc' },
        take: 100,
      }),
      db.caseNote.findMany({
        where: { 
          caseId: id,
          ...(search ? { content: { contains: search } } : {}),
        },
        include: { author: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.document.findMany({
        where: { 
          caseId: id,
          ...(search ? { fileName: { contains: search } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.task.findMany({
        where: { 
          caseId: id, tenantId: tenantId || undefined,
          ...(search ? { title: { contains: search } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.invoice.findMany({
        where: { caseId: id, tenantId: tenantId || undefined },
        include: {
          currency: true,
          payments: { include: { recorder: { select: { id: true, fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.communication.findMany({
        where: { 
          caseId: id, tenantId: tenantId || undefined,
          ...(search ? { OR: [
            { subject: { contains: search } },
            { content: { contains: search } },
          ]} : {}),
        },
        include: { sentBy: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const items: Array<{
      id: string
      date: string
      type: string
      title: string
      description: string
      color: string
      icon: string
      author?: string
      amount?: number
      currency?: string
      status?: string
      metadata?: Record<string, unknown>
      deletable?: boolean
    }> = []

    // Events
    for (const e of events) {
      const color = e.criticality === 'urgente' ? '#EF4444' : e.criticality === 'haute' ? '#F59E0B' : e.criticality === 'basse' ? '#9CA3AF' : '#C8A45D'
      items.push({
        id: `event-${e.id}`, date: e.startTime.toISOString(), type: 'event',
        title: e.title,
        description: e.description || e.eventType,
        color, icon: 'calendar', author: undefined, metadata: { eventType: e.eventType, criticality: e.criticality },
        deletable: true,
      })
    }

    // Notes
    for (const n of notes) {
      items.push({
        id: `note-${n.id}`, date: n.createdAt.toISOString(), type: 'note',
        title: 'Note', description: n.content,
        color: '#6366F1', icon: 'message-square', author: n.author?.fullName,
        deletable: true,
      })
    }

    // Documents
    for (const d of documents) {
      const sizeStr = d.fileSize < 1024 ? `${d.fileSize} o` : d.fileSize < 1048576 ? `${(d.fileSize / 1024).toFixed(1)} Ko` : `${(d.fileSize / 1048576).toFixed(1)} Mo`
      items.push({
        id: `doc-${d.id}`, date: d.createdAt.toISOString(), type: 'doc',
        title: d.fileName,
        description: `${d.mimeType || 'fichier'} \u2022 ${sizeStr}${d.folder ? ` \u2022 ${d.folder}` : ''}`,
        color: '#059669', icon: 'file-text',
      })
    }

    // Tasks
    for (const t of tasks) {
      const color = t.priority === 'urgente' ? '#EF4444' : t.priority === 'haute' ? '#D97706' : '#C8A45D'
      const statusLabel: Record<string, string> = { a_faire: '\u00C0 faire', en_cours: 'En cours', terminee: 'Termin\u00E9e', todo: '\u00C0 faire', in_progress: 'En cours', done: 'Termin\u00E9e' }
      const priorityLabel: Record<string, string> = { haute: 'Haute', urgente: 'Urgente', normale: 'Normale', normal: 'Normale', basse: 'Basse' }
      const parts = [statusLabel[t.status] || t.status, priorityLabel[t.priority] || t.priority]
      if (t.dueDate) parts.push(`\u00C9ch\u00E9ance: ${t.dueDate.toLocaleDateString('fr-FR')}`)
      items.push({
        id: `task-${t.id}`, date: t.createdAt.toISOString(), type: 'task',
        title: t.title,
        description: parts.join(' \u2022 '),
        color, icon: 'clipboard-list', status: t.status,
      })
    }

    // Invoices
    for (const inv of invoices) {
      const typeLabels: Record<string, string> = { honoraires: 'Honoraires', provision: 'Provision', debours: 'D\u00E9bours' }
      const statusStr = inv.status === 'non_paye' ? 'Non pay\u00E9' : inv.status === 'partiel' ? `Pay\u00E9: ${inv.paidAmount.toLocaleString('fr-FR')} ${inv.currency?.code || 'XAF'}` : 'Pay\u00E9'
      items.push({
        id: `invoice-${inv.id}`, date: inv.createdAt.toISOString(), type: 'invoice',
        title: `${typeLabels[inv.type] || inv.type}${inv.invoiceNumber ? ` ${inv.invoiceNumber}` : ''}`,
        description: `${inv.amount.toLocaleString('fr-FR')} ${inv.currency?.code || 'XAF'} \u2022 ${statusStr}`,
        color: '#926B2D', icon: 'receipt', amount: inv.amount, currency: inv.currency?.code || 'XAF', status: inv.status,
      })
    }

    // Payments (from invoices)
    for (const inv of invoices) {
      for (const p of inv.payments) {
        const methodLabels: Record<string, string> = { espece: 'Esp\u00E8ce', virement: 'Virement', cheque: 'Ch\u00E8que', mobile_money: 'Mobile Money', carte: 'Carte' }
        items.push({
          id: `payment-${p.id}`, date: p.paidAt.toISOString(), type: 'payment',
          title: `Paiement ${methodLabels[p.method] || p.method}`,
          description: `${p.amount.toLocaleString('fr-FR')} XAF${p.reference ? ` \u2022 R\u00E9f: ${p.reference}` : ''}${p.recorder?.fullName ? ` par ${p.recorder.fullName}` : ''}`,
          color: '#059669', icon: 'wallet', amount: p.amount, author: p.recorder?.fullName,
        })
      }
    }

    // Communications
    for (const c of communications) {
      const typeLabels: Record<string, string> = { email: 'E-mail', sms: 'SMS', whatsapp: 'WhatsApp', lettre: 'Lettre' }
      const commIconMap: Record<string, string> = { email: 'mail', sms: 'message-square', whatsapp: 'message-circle', lettre: 'mail' }
      items.push({
        id: `comm-${c.id}`, date: (c.sentAt || c.createdAt).toISOString(), type: 'communication',
        title: `${typeLabels[c.type] || c.type}${c.subject ? ` : ${c.subject}` : ''}`,
        description: c.content.length > 200 ? c.content.slice(0, 200) + '\u2026' : c.content,
        color: '#0891B2', icon: commIconMap[c.type] || 'message-circle', author: c.sentBy?.fullName,
        metadata: { commType: c.type, recipientEmail: c.recipientEmail, recipientPhone: c.recipientPhone },
      })
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Compute counts per type for filter badges (before pagination)
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.type] = (counts[item.type] || 0) + 1
    }

    // Cursor-based pagination
    let paginatedItems = items
    let nextCursor: string | null = null
    if (cursor) {
      const idx = items.findIndex(i => i.id === cursor)
      if (idx >= 0) paginatedItems = items.slice(idx + 1)
    }
    if (paginatedItems.length > limit) {
      nextCursor = paginatedItems[limit - 1].id
      paginatedItems = paginatedItems.slice(0, limit)
    }

    return NextResponse.json({ items: paginatedItems, counts, total: items.length, nextCursor })
  } catch (error) {
    console.error('Timeline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
