import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, requireTenantAccess } from '@/lib/auth-server'
import { analyzeCase as aiAnalyzeCase, generateJurisprudence, summarizeDocument, checkAIAccess } from '@/lib/ai-service'

export const maxDuration = 60

export async function POST(request: Request) {
  const auth = await authenticate(request, 'case', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()

  try {
    const body = await request.json()
    const { caseId, type, query, refresh } = body

    if (!caseId) {
      return NextResponse.json({ error: 'caseId est requis' }, { status: 400 })
    }

    const validTypes = ['analysis', 'jurisprudence', 'summary']
    const reqType = type || 'analysis'
    if (!validTypes.includes(reqType)) {
      return NextResponse.json({ error: 'type invalide' }, { status: 400 })
    }

    const caseRecord = await db.case.findUnique({
      where: { id: caseId },
      select: { tenantId: true, id: true },
    })
    if (!caseRecord) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }
    if (!requireTenantAccess(auth, caseRecord.tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const hasAI = await checkAIAccess(caseRecord.tenantId)
    if (!hasAI) {
      return NextResponse.json(
        { error: "L'analyse IA n'est pas disponible avec votre abonnement." },
        { status: 403 },
      )
    }

    // === ANALYSIS ===
    if (reqType === 'analysis') {
      const forceRefresh = refresh === true
      if (!forceRefresh) {
        const cached = await db.case.findUnique({ where: { id: caseId }, select: { aiAnalysis: true, updatedAt: true } })
        if (cached?.aiAnalysis) {
          try {
            return NextResponse.json({ success: true, analysis: JSON.parse(cached.aiAnalysis), cached: true, analyzedAt: cached.updatedAt })
          } catch { /* re-analyze */ }
        }
      }

      const cd = await db.case.findUnique({
        where: { id: caseId, tenantId: caseRecord.tenantId },
        include: {
          client: { select: { fullName: true, company: true, clientType: true, city: true, country: true } },
          assignments: { include: { user: { select: { fullName: true } } } },
          events: { orderBy: { startTime: 'asc' } },
          notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { fullName: true } } } },
          documents: { orderBy: { createdAt: 'desc' } },
          tasks: { orderBy: { dueDate: { sort: 'asc', nulls: 'last' } } },
          invoices: { orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, status: true, currency: { select: { code: true } }, dueDate: true, notes: true } },
          tenant: { select: { name: true } },
        },
      })
      if (!cd) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

      const caseInput = {
        reference: cd.reference, title: cd.title, description: cd.description,
        caseType: cd.caseType, status: cd.status, priority: cd.priority,
        jurisdiction: cd.jurisdiction, amountInDispute: cd.amountInDispute,
        adversary: cd.adversary, clientName: cd.client?.fullName, clientCompany: cd.client?.company,
        chronologie: cd.events.map(e => `[${new Date(e.startTime).toLocaleDateString('fr-FR')}] ${e.eventType}: ${e.title}`).join('\n') || 'Aucun',
        notes: cd.notes.map(n => `${n.author?.fullName || 'Systeme'}: ${n.content}`).join('\n') || 'Aucune note',
        documents: cd.documents.map(d => `- ${d.fileName} (v${d.version})`).join('\n') || 'Aucun document',
        tasks: cd.tasks.map(t => `- [${t.status}] ${t.title}`).join('\n') || 'Aucune tache',
      }

      const result = await aiAnalyzeCase(caseInput)
      let jsonStr = result.trim()
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) jsonStr = jsonMatch[0]

      let analysis: Record<string, unknown>
      try {
        analysis = JSON.parse(jsonStr)
      } catch {
        analysis = { resume: result.slice(0, 500), chronologie: '', parties: '', questions_juridiques: [], risques: [], pieces_manquantes: [], echeances: [], actions_recommandees: [], _raw: result }
      }

      await db.case.update({ where: { id: caseId }, data: { aiAnalysis: JSON.stringify(analysis) } })
      return NextResponse.json({ success: true, analysis, cached: false, analyzedAt: new Date().toISOString() })
    }

    // === JURISPRUDENCE ===
    if (reqType === 'jurisprudence') {
      const jurisQuery = query || ''
      if (!jurisQuery.trim()) {
        return NextResponse.json({ error: 'Une requete de recherche est requise' }, { status: 400 })
      }
      const ctx = await db.case.findUnique({
        where: { id: caseId, tenantId: caseRecord.tenantId },
        select: { title: true, description: true, caseType: true, adversary: true, client: { select: { fullName: true } } },
      })
      const context = ctx ? `Dossier: ${ctx.title} (${ctx.caseType}). Client: ${ctx.client?.fullName || 'N/A'}. Adversaire: ${ctx.adversary || 'N/A'}.` : undefined
      const result = await generateJurisprudence(jurisQuery, context)
      await db.caseNote.create({ data: { content: `[IA - Jurisprudence] Recherche: ${jurisQuery}\n\n${result}`, caseId, tenantId: caseRecord.tenantId, authorId: auth.id } })
      return NextResponse.json({ success: true, result, query: jurisQuery })
    }

    // === SUMMARY ===
    if (reqType === 'summary') {
      const cd = await db.case.findUnique({
        where: { id: caseId, tenantId: caseRecord.tenantId },
        include: {
          client: { select: { fullName: true, company: true } },
          notes: { orderBy: { createdAt: 'desc' }, take: 10, include: { author: { select: { fullName: true } } } },
          documents: { orderBy: { createdAt: 'desc' } },
          tasks: { where: { status: { not: 'terminee' } }, orderBy: { dueDate: { sort: 'asc', nulls: 'last' } } },
        },
      })
      if (!cd) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
      const content = 'Dossier: ' + (cd.title || '') + '\nClient: ' + (cd.client?.fullName || 'N/A') + (cd.client?.company ? ' (' + cd.client.company + ')' : '') + '\n\nNotes:\n' + (cd.notes.map(n => n.author?.fullName + ': ' + n.content).join('\n') || 'Aucune') + '\n\nDocuments: ' + cd.documents.length + '\n\nTaches: ' + cd.tasks.map(t => t.title).join(', ')
      const result = await summarizeDocument(content, 'autre')
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json({ error: 'Type non gere' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne du serveur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
