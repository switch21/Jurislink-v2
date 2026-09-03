import { NextResponse } from 'next/server'
import { authenticate, requireTenantAccess } from '@/lib/auth-server'
import ZAI from 'z-ai-web-dev-sdk'

export const maxDuration = 60

export async function POST(request: Request) {
  const auth = await authenticate(request, 'task', 'view')
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { caseId, tenantId, caseDescription } = body as {
      caseId: string
      tenantId: string
      caseDescription: string
    }

    if (!caseId || !tenantId || !caseDescription) {
      return NextResponse.json(
        { error: 'caseId, tenantId et caseDescription sont requis' },
        { status: 400 },
      )
    }

    if (!requireTenantAccess(auth, tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Call LLM for task suggestions
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `Vous êtes un assistant juridique expert en gestion de dossiers. Vous aidez les avocats à organiser leur travail.
Répondez UNIQUEMENT en JSON valide, sans texte additionnel.
Les valeurs de priority doivent être parmi: "urgente", "haute", "normale".
Les valeurs de daysOffset sont des nombres entiers (0 = aujourd'hui, 1 = demain, etc.).
La catégorie est optionnelle (ex: "recherche", "rédaction", "procédure", "communication").`,
        },
        {
          role: 'user',
          content: `En tant qu'assistant juridique, suggérez 5 à 8 tâches à accomplir pour ce dossier : ${caseDescription}

Répondez en JSON : [{"title": "...", "priority": "haute", "daysOffset": 0, "category": "procédure"}].
Sans texte additionnel, uniquement le tableau JSON.`,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      return NextResponse.json(
        { error: 'Aucune réponse de l\'IA' },
        { status: 500 },
      )
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = response.trim()
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }

    let suggestions: Array<{
      title: string
      priority: string
      daysOffset: number
      category?: string
    }>

    try {
      suggestions = JSON.parse(jsonStr)
      if (!Array.isArray(suggestions)) {
        throw new Error('Format invalide')
      }
      // Validate and sanitize
      suggestions = suggestions
        .filter((s) => s.title && typeof s.title === 'string')
        .map((s) => ({
          title: String(s.title).slice(0, 200),
          priority: ['urgente', 'haute', 'normale'].includes(s.priority) ? s.priority : 'normale',
          daysOffset: typeof s.daysOffset === 'number' ? Math.max(0, Math.min(s.daysOffset, 365)) : 0,
          category: s.category ? String(s.category).slice(0, 50) : undefined,
        }))
        .slice(0, 10) // Cap at 10
    } catch {
      return NextResponse.json(
        { error: 'Impossible de parser la réponse IA' },
        { status: 500 },
      )
    }

    return NextResponse.json({ suggestions })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne du serveur'
    console.error('AI suggest error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
