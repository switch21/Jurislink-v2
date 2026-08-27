/**
 * AI Service — Unified interface to an OpenAI-compatible chat completions API.
 * Uses env vars LLM_API_URL (default: Ollama localhost) and LLM_API_KEY.
 * All prompts in French, specialized for Cameroonian law (OHADA).
 */

const LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:11434/v1/chat/completions'
const LLM_API_KEY = process.env.LLM_API_KEY || ''

const SYSTEM_PROMPT = `Tu es un assistant juridique expert en droit OHADA et droit camerounais.
Tu assistes les avocats dans l'analyse de dossiers, la recherche de jurisprudence et la rédaction de documents juridiques.
Tu rédiges toujours en français avec un ton professionnel et précis.
Tu cites les textes de loi applicables quand c'est pertinent (AUPSR, AUDSCG, Acte uniforme, Code pénal camerounais, etc.).
Si tu n'es pas sûr d'une information, tu l'indiques clairement.`

async function callLLM(userPrompt: string, systemOverride?: string): Promise<string> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (LLM_API_KEY) {
      headers['Authorization'] = `Bearer ${LLM_API_KEY}`
    }

    const res = await fetch(LLM_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'llama3',
        messages: [
          { role: 'system', content: systemOverride || SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      return `Erreur: le service IA est temporairement indisponible (${res.status})`
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'Aucune réponse générée'
  } catch {
    return 'Erreur: impossible de joindre le service IA. Vérifiez la configuration LLM_API_URL.'
  }
}

/**
 * Analyse un dossier juridique et retourne une analyse structurée en français.
 */
export async function analyzeCase(caseData: Record<string, unknown>): Promise<string> {
  const prompt = `Analyse le dossier juridique suivant et fournis une analyse structurée.

## Dossier
- Référence: ${caseData.reference || 'Non renseignée'}
- Titre: ${caseData.title || 'Non renseigné'}
- Description: ${caseData.description || 'Non renseignée'}
- Type: ${caseData.caseType || 'Non renseigné'}
- Statut: ${caseData.status || 'Non renseigné'}
- Priorité: ${caseData.priority || 'Non renseignée'}
- Juridiction: ${caseData.jurisdiction || 'Non renseignée'}
- Montant en litige: ${caseData.amountInDispute ? Number(caseData.amountInDispute).toLocaleString('fr-FR') + ' XAF' : 'Non renseigné'}
- Partie adverse: ${caseData.adversary || 'Non renseignée'}
- Client: ${caseData.clientName || 'Non renseigné'}${caseData.clientCompany ? ` (${caseData.clientCompany})` : ''}
${caseData.chronologie ? `## Chronologie\n${caseData.chronologie}` : ''}
${caseData.notes ? `## Notes\n${caseData.notes}` : ''}
${caseData.documents ? `## Documents\n${caseData.documents}` : ''}
${caseData.tasks ? `## Tâches\n${caseData.tasks}` : ''}

---

Fournis ton analyse avec les sections suivantes :
1. **Résumé des faits** — Synthèse en 3-5 phrases
2. **Points juridiques clés** — Liste des questions juridiques soulevées
3. **Risques identifiés** — Avec niveau (élevé/moyen/faible) et description
4. **Recommandations** — Actions prioritaires à entreprendre`

  return callLLM(prompt)
}

/**
 * Génère un résumé de recherche jurisprudentielle.
 */
export async function generateJurisprudence(query: string, context?: string): Promise<string> {
  const ctx = context ? `\n\nContexte du dossier:\n${context}` : ''
  const prompt = `Effectue une recherche jurisprudentielle sur le sujet suivant : ${query}${ctx}

Fournis :
1. **Principes juridiques applicables** — Textes de loi et principes OHADA/du droit camerounais pertinents
2. **Jurisprudence pertinente** — Décisions de jurisprudence comparables (tribunaux camerounais, CCJA, etc.)
3. **Analyse** — Comment cette jurisprudence s'applique au cas
4. **Recommandations** — Arguments à privilégier`

  return callLLM(prompt)
}

/**
 * Résume un document juridique.
 */
export async function summarizeDocument(content: string, type: string): Promise<string> {
  const typeLabel: Record<string, string> = {
    contrat: 'contrat',
    conclusion: 'conclusions',
    assignation: 'assignation',
    jugement: 'jugement',
    correspondance: 'correspondance',
    autre: 'document',
  }

  const prompt = `Résume le ${typeLabel[type] || 'document'} juridique suivant :

---
${content.slice(0, 8000)}
---

Fournis :
1. **Nature du document** — Type et objet
2. **Points essentiels** — Les éléments clés du document
3. **Dates et échéances importantes** — Si applicable
4. **Risques ou points d'attention** — Éléments nécessitant une vigilance particulière`

  return callLLM(prompt)
}

/**
 * Vérifie si le tenant a accès à l'IA (plan.hasAI).
 */
export async function checkAIAccess(tenantId: string): Promise<boolean> {
  try {
    const { getDb } = await import('@/lib/db')
    const db = getDb()
    const subscription = await db.subscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { hasAI: true } } },
    })
    await db.$disconnect().catch(() => {})
    return !!subscription?.plan?.hasAI
  } catch {
    return false
  }
}
