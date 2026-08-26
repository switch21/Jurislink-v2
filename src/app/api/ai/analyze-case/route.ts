import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function POST(request: Request) {
  const auth = await authenticate(request, 'ai', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { tenantId, caseId } = body

    if (!tenantId || !caseId) {
      return NextResponse.json(
        { error: 'tenantId and caseId are required' },
        { status: 400 }
      )
    }

    const caseData = await db.case.findUnique({
      where: { id: caseId, tenantId },
      include: {
        client: {
          select: {
            id: true, fullName: true, company: true,
            clientType: true, email: true, phone: true, address: true,
            city: true, country: true, niu: true, riskLevel: true, notes: true,
          },
        },
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true } },
          },
        },
        events: {
          orderBy: { startTime: 'asc' },
          include: {
            assignments: {
              include: {
                user: { select: { fullName: true } },
              },
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { fullName: true } },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          orderBy: { dueDate: { sort: 'asc', nulls: 'last' } },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, amount: true, status: true,
            currency: { select: { code: true } },
            dueDate: true, notes: true, createdAt: true,
          },
        },
        tenant: {
          select: { name: true, address: true, phone: true, email: true },
        },
      },
    })

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const clientInfo = caseData.client
      ? `${caseData.client.fullName}${caseData.client.company ? ` (${caseData.client.company})` : ''} — ${caseData.client.clientType}, ${caseData.client.city || ''} ${caseData.client.country || ''}`
      : 'Non renseigné'

    const adversary = caseData.adversary || 'Non renseigné'
    const assignedLawyers = caseData.assignments
      .map((a) => a.user.fullName)
      .join(', ') || 'Non assigné'

    const chronologie = caseData.events
      .map((e) => {
        const dateStr = new Date(e.startTime).toLocaleDateString('fr-FR')
        const attendees = e.assignments.map((a) => a.user.fullName).join(', ')
        return `[${dateStr}] ${e.eventType.toUpperCase()}: ${e.title}${attendees ? ` (Participants: ${attendees})` : ''}`
      })
      .join('\n') || 'Aucun événement'

    const notesList = caseData.notes
      .map((n) => `[${new Date(n.createdAt).toLocaleDateString('fr-FR')}] ${n.author?.fullName || 'Système'}: ${n.content}`)
      .join('\n') || 'Aucune note'

    const documentsList = caseData.documents
      .map((d) => `- ${d.fileName} (${d.mimeType || 'inconnu'}, ${d.folder || 'Pas de dossier'}, v${d.version})`)
      .join('\n') || 'Aucun document'

    const tasksList = caseData.tasks
      .map((t) => `- [${t.status}] ${t.priority.toUpperCase()}: ${t.title}${t.dueDate ? ` (échéance: ${new Date(t.dueDate).toLocaleDateString('fr-FR')})` : ''}`)
      .join('\n') || 'Aucune tâche'

    const invoicesList = caseData.invoices
      .map((inv) => `- ${inv.amount.toLocaleString('fr-FR')} ${inv.currency?.code ?? 'XAF'} [${inv.status}]${inv.notes ? ` — ${inv.notes}` : ''}`)
      .join('\n') || 'Aucune facture'

    const prompt = `Tu es un assistant juridique expert. Analyse le dossier suivant et fournis une analyse structurée.

## Dossier
- Référence: ${caseData.reference}
- Titre: ${caseData.title}
- Description: ${caseData.description || 'Non renseignée'}
- Type: ${caseData.caseType}
- Statut: ${caseData.status}
- Priorité: ${caseData.priority}
- Juridiction: ${caseData.jurisdiction || 'Non renseignée'}
- Montant en litige: ${caseData.amountInDispute ? caseData.amountInDispute.toLocaleString('fr-FR') + ' XAF' : 'Non renseigné'}
- Mode de facturation: ${caseData.billingType || 'Non renseigné'}

## Parties
- Client: ${clientInfo}
- Partie adverse: ${adversary}
- Avocats assignés: ${assignedLawyers}
- Cabinet: ${caseData.tenant.name}

## Chronologie des événements
${chronologie}

## Notes du dossier
${notesList}

## Documents
${documentsList}

## Tâches en cours
${tasksList}

## Facturation
${invoicesList}

---

Fournis ton analyse sous la forme suivante:
1. **Résumé** — Synthèse du dossier en 3-5 phrases
2. **Chronologie** — Frise chronologique des faits marquants
3. **Parties** — Analyse des parties et de leurs positions
4. **Questions juridiques** — Liste des questions juridiques soulevées
5. **Risques** — Identification des risques (juridiques, financiers, procéduraux)
6. **Pièces manquantes** — Liste des pièces probablement manquantes
7. **Échéances** — Prochaines échéances et délais à respecter
8. **Actions recommandées** — Liste priorisée d'actions à entreprendre`

    return NextResponse.json({
      success: true,
      caseData,
      prompt,
    })
  } catch (error) {
    console.error('Analyze case error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
