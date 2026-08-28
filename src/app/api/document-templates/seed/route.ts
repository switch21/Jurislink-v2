import { NextResponse } from 'next/server'
import { authenticate, requireTenantAccess } from '@/lib/auth-server'
import { seedLegalTemplates } from '@/lib/legal-templates'

/**
 * POST /api/document-templates/seed
 * Seeds built-in legal templates for a tenant.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request, 'document', 'create')
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { tenantId } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId est requis' }, { status: 400 })
    }

    if (!requireTenantAccess(auth, tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const created = await seedLegalTemplates(tenantId)

    return NextResponse.json({ success: true, created, message: `${created} modèle(s) ajouté(s)` })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
