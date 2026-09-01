import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

/** Purposes valides pour le consentement (Loi 2024/017) */
const VALID_PURPOSES = new Set([
  'data_processing',
  'marketing',
  'analytics',
  'ai_analysis',
])

/**
 * GET /api/privacy/consent?tenantId=...
 * Retourne les enregistrements de consentement de l'utilisateur.
 */
export async function GET(request: Request) {
  const auth = await authenticate(request, 'user', 'view')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const userId = auth.id
    const tenantId = auth.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Aucun cabinet associé' }, { status: 400 })
    }

    const consents = await db.$queryRaw<{
      id: string
      user_id: string
      tenant_id: string
      purpose: string
      granted_at: Date
      ip_address: string | null
      user_agent: string | null
    }[]>`
      SELECT id, user_id, tenant_id, purpose, granted_at, ip_address, user_agent
      FROM privacy_consent_logs
      WHERE user_id = ${userId}::uuid AND tenant_id = ${tenantId}::uuid
      ORDER BY granted_at DESC
    `

    return NextResponse.json({ consents })
  } catch (error) {
    console.error('Erreur lecture consentements:', error)
    return NextResponse.json({ error: 'Erreur lors de la lecture des consentements' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

/**
 * POST /api/privacy/consent
 * Enregistre un consentement (accordé ou retiré).
 * Corps : { purpose: string, granted: boolean }
 */
export async function POST(request: Request) {
  const auth = await authenticate(request, 'user', 'update')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { purpose, granted } = await request.json()

    if (!purpose || typeof purpose !== 'string') {
      return NextResponse.json({ error: 'Le champ « purpose » est requis' }, { status: 400 })
    }

    if (!VALID_PURPOSES.has(purpose)) {
      return NextResponse.json(
        {
          error: `Finalité invalide. Valeurs autorisées : ${[...VALID_PURPOSES].join(', ')}`,
        },
        { status: 400 },
      )
    }

    if (typeof granted !== 'boolean') {
      return NextResponse.json({ error: 'Le champ « granted » doit être un booléen' }, { status: 400 })
    }

    const userId = auth.id
    const tenantId = auth.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Aucun cabinet associé' }, { status: 400 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const userAgent = request.headers.get('user-agent') || ''

    // Si granted=false, c'est un retrait de consentement — on l'enregistre aussi
    await db.$executeRaw`
      INSERT INTO privacy_consent_logs (id, user_id, tenant_id, purpose, granted_at, ip_address, user_agent)
      VALUES (
        gen_random_uuid(),
        ${userId}::uuid,
        ${tenantId}::uuid,
        ${purpose},
        CASE WHEN ${granted}::boolean THEN NOW() ELSE NULL END,
        ${ipAddress},
        ${userAgent}
      )
    `

    // Journal d'audit
    await db.auditLog.create({
      data: {
        action: granted ? 'consent_granted' : 'consent_withdrawn',
        resourceType: 'consent',
        resourceId: purpose,
        metadata: JSON.stringify({ purpose, granted }),
        ipAddress,
        userAgent,
        tenantId,
        userId,
      },
    })

    return NextResponse.json(
      {
        message: granted
          ? `Consentement enregistré pour la finalité « ${purpose} »`
          : `Consentement retiré pour la finalité « ${purpose} »`,
        purpose,
        granted,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Erreur enregistrement consentement:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement du consentement' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
