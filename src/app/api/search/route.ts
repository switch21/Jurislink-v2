import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser, checkPermission } from '@/lib/auth-server'

/** Valid search type filters */
const VALID_TYPES = ['cases', 'clients', 'documents', 'tasks', 'events', 'messages', 'communications', 'all'] as const

type SearchType = typeof VALID_TYPES[number]

/** Resources that map to each search type for RBAC fallback */
const TYPE_RESOURCE_MAP: Record<string, { resource: string; action: string }> = {
  cases:         { resource: 'case',     action: 'view' },
  clients:       { resource: 'client',   action: 'view' },
  documents:     { resource: 'document', action: 'view' },
  tasks:         { resource: 'task',     action: 'view' },
  events:        { resource: 'event',    action: 'view' },
  messages:      { resource: 'message',  action: 'view' },
  communications:{ resource: 'message',  action: 'view' },
}

export async function GET(request: Request) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const q = searchParams.get('q')
  const rawType = searchParams.get('type') || 'all'
  const rawLimit = parseInt(searchParams.get('limit') || '10', 10)
  const limit = Math.min(Math.max(rawLimit, 1), 50)

  if (!tenantId || !q) {
    return NextResponse.json(
      { error: 'tenantId and q are required' },
      { status: 400 }
    )
  }

  // Normalize type filter
  const typeFilter: SearchType = VALID_TYPES.includes(rawType as SearchType)
    ? rawType as SearchType
    : 'all'

  // AI-powered search
  if (rawType === 'ai') {
    return handleAISearch(authUser, tenantId, q, limit)
  }

  const db = getDb()
  try {
    const searchFilter = {
      contains: q,
    }

    const tenantWhere = { tenantId }

    // Determine which types to search based on permissions
    const searchTypes: string[] = typeFilter === 'all'
      ? ['cases', 'clients', 'documents', 'tasks', 'events', 'messages', 'communications']
      : [typeFilter]

    // RBAC check: try 'search' resource first, fall back to individual resource permissions
    const permCheck = await checkPermission(authUser, 'search', 'view')
    const hasGlobalSearch = permCheck === true

    const results: Record<string, unknown[]> = {
      cases: [], clients: [], documents: [], tasks: [], events: [], messages: [], communications: [],
    }

    const promises: Promise<void>[] = []

    if (searchTypes.includes('cases')) {
      if (hasGlobalSearch || await checkPermission(authUser, 'case', 'view') === true) {
        promises.push(
          db.case.findMany({
            where: { ...tenantWhere, OR: [
              { title: searchFilter }, { reference: searchFilter }, { description: searchFilter }, { adversary: searchFilter },
            ] },
            select: { id: true, title: true, reference: true, status: true, caseType: true, description: true, createdAt: true },
            take: limit,
          }).then(r => { results.cases = r.map(c => ({ ...c, _type: 'case' as const })) })
        )
      }
    }

    if (searchTypes.includes('clients')) {
      if (hasGlobalSearch || await checkPermission(authUser, 'client', 'view') === true) {
        promises.push(
          db.client.findMany({
            where: { ...tenantWhere, OR: [
              { fullName: searchFilter }, { company: searchFilter }, { email: searchFilter }, { phone: searchFilter }, { niu: searchFilter },
            ] },
            select: { id: true, fullName: true, company: true, email: true, phone: true, status: true, createdAt: true },
            take: limit,
          }).then(r => { results.clients = r.map(c => ({ ...c, _type: 'client' as const })) })
        )
      }
    }

    if (searchTypes.includes('documents')) {
      if (hasGlobalSearch || await checkPermission(authUser, 'document', 'view') === true) {
        promises.push(
          db.document.findMany({
            where: { ...tenantWhere, OR: [
              { fileName: searchFilter }, { description: searchFilter }, { tags: searchFilter },
            ] },
            select: { id: true, fileName: true, fileSize: true, folder: true, documentType: true, mimeType: true, createdAt: true },
            take: limit,
          }).then(r => { results.documents = r.map(d => ({ ...d, _type: 'document' as const })) })
        )
      }
    }

    if (searchTypes.includes('tasks')) {
      if (hasGlobalSearch || await checkPermission(authUser, 'task', 'view') === true) {
        promises.push(
          db.task.findMany({
            where: { ...tenantWhere, OR: [
              { title: searchFilter }, { description: searchFilter },
            ] },
            select: { id: true, title: true, description: true, status: true, priority: true, dueDate: true, caseId: true, createdAt: true },
            take: limit,
          }).then(r => { results.tasks = r.map(t => ({ ...t, _type: 'task' as const })) })
        )
      }
    }

    if (searchTypes.includes('events')) {
      if (hasGlobalSearch || await checkPermission(authUser, 'event', 'view') === true) {
        promises.push(
          db.event.findMany({
            where: { ...tenantWhere, OR: [
              { title: searchFilter }, { description: searchFilter },
            ] },
            select: { id: true, title: true, description: true, eventType: true, criticality: true, startTime: true, endTime: true },
            take: limit,
          }).then(r => { results.events = r.map(e => ({ ...e, _type: 'event' as const })) })
        )
      }
    }

    if (searchTypes.includes('messages')) {
      if (hasGlobalSearch || await checkPermission(authUser, 'message', 'view') === true) {
        promises.push(
          db.message.findMany({
            where: { ...tenantWhere, content: searchFilter },
            select: { id: true, content: true, createdAt: true,
              sender: { select: { id: true, fullName: true } },
              receiver: { select: { id: true, fullName: true } }, },
            take: limit,
          }).then(r => { results.messages = r.map(m => ({
            id: m.id, title: m.content.slice(0, 80), subtitle: `De: ${m.sender?.fullName || '?'} → ${m.receiver?.fullName || '?'}`,
            createdAt: m.createdAt, _type: 'message' as const,
          })) })
        )
      }
    }

    if (searchTypes.includes('communications')) {
      if (hasGlobalSearch || await checkPermission(authUser, 'message', 'view') === true) {
        promises.push(
          db.communication.findMany({
            where: { ...tenantWhere, OR: [
              { subject: searchFilter }, { content: searchFilter },
            ] },
            select: { id: true, subject: true, content: true, type: true, status: true, createdAt: true,
              recipientEmail: true, recipientPhone: true,
              client: { select: { fullName: true } }, },
            take: limit,
          }).then(r => { results.communications = r.map(c => ({
            id: c.id, title: c.subject || c.content.slice(0, 80),
            subtitle: `${c.type}${c.client?.fullName ? ` — ${c.client.fullName}` : ''}`,
            type: c.type, status: c.status, createdAt: c.createdAt,
            _type: 'communication' as const,
          })) })
        )
      }
    }

    await Promise.all(promises)

    // Count totals
    const counts: Record<string, number> = {}
    for (const [key, val] of Object.entries(results)) {
      counts[key] = val.length
    }

    return NextResponse.json({ results, counts })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

async function handleAISearch(authUser: any, tenantId: string, q: string, limit: number) {
  const db = getDb()
  try {
    const searchFilter = { contains: q }
    const tenantWhere = { tenantId }

    const [cases, clients, tasks] = await Promise.all([
      db.case.findMany({
        where: { ...tenantWhere, OR: [{ title: searchFilter }, { reference: searchFilter }, { description: searchFilter }] },
        select: { id: true, title: true, reference: true, status: true, caseType: true, description: true, clientId: true, client: { select: { fullName: true } } },
        take: 20,
      }),
      db.client.findMany({
        where: { ...tenantWhere, OR: [{ fullName: searchFilter }, { company: searchFilter }, { email: searchFilter }] },
        select: { id: true, fullName: true, company: true, email: true, phone: true },
        take: 10,
      }),
      db.task.findMany({
        where: { ...tenantWhere, OR: [{ title: searchFilter }, { description: searchFilter }] },
        select: { id: true, title: true, status: true, priority: true, caseId: true },
        take: 10,
      }),
    ])

    const ZAI = await import('z-ai-web-dev-sdk')
    const zai = new (ZAI as any).default()

    const contextStr = JSON.stringify({ cases, clients, tasks }, null, 2)

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `Tu es un assistant de recherche pour un cabinet d'avocats (JurisLink). Tu analyses une requête de recherche et des résultats potentiels pour les classer par pertinence. Réponds UNIQUEMENT en JSON valide sans backticks ni markdown. Format: {"query": "...", "interpretation": "...", "results": [{"id": "...", "type": "case|client|task", "relevance": 0.95, "reason": "..."}]}`,
        },
        {
          role: 'user',
          content: `Recherche: "${q}"

Résultats trouvés dans la base:
${contextStr}

Classe les résultats par pertinence (score 0-1) et retourne les ${limit} plus pertinents. Ajoute une brève interprétation de la recherche.`,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = completion.choices[0]?.message?.content || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    let aiResult: any = {}
    if (jsonMatch) {
      try { aiResult = JSON.parse(jsonMatch[0]) } catch { /* fallback */ }
    }

    const aiResults = (aiResult.results || []).map((r: any) => ({
      id: r.id,
      _type: r.type || 'case',
      relevance: r.relevance || 0,
      reason: r.reason || '',
    }))

    return NextResponse.json({
      type: 'ai',
      query: q,
      interpretation: aiResult.interpretation || '',
      results: { ai: aiResults },
    })
  } catch (error) {
    return NextResponse.json({
      type: 'basic',
      fallback: true,
      error: 'La recherche IA a échoué, résultats basiques affichés',
      results: { cases: [], clients: [], documents: [], tasks: [], events: [], messages: [], communications: [] },
    })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
