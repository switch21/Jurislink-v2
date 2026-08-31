import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'

export async function PUT(request: Request) {
  const auth = await authenticate(request, 'document', 'update')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const body = await request.json()
    const { documentIds, action, reason } = body as {
      documentIds: string[]
      action: 'valider' | 'rejeter'
      reason?: string
    }

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenante requis' }, { status: 400 })
    }

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'documentIds requis' }, { status: 400 })
    }

    if (action !== 'valider' && action !== 'rejeter') {
      return NextResponse.json({ error: 'action doit être valider ou rejeter' }, { status: 400 })
    }

    // Only act on pending documents
    const newStatus = action === 'valider' ? 'actif' : 'rejete'

    const updated = await db.document.updateMany({
      where: {
        id: { in: documentIds },
        tenantId: auth.tenantId,
        status: 'en_attente',
      },
      data: { status: newStatus },
    })

    // For rejected documents, notify the portal user who uploaded them
    if (action === 'rejeter' && updated.count > 0) {
      const rejectedDocs = await db.document.findMany({
        where: {
          id: { in: documentIds },
          tenantId: auth.tenantId,
          status: 'rejete',
          uploadedByPortalId: { not: null },
        },
        select: {
          id: true,
          fileName: true,
          uploadedByPortalId: true,
          tenantId: true,
        },
      })

      for (const doc of rejectedDocs) {
        if (doc.uploadedByPortalId) {
          await db.portalNotification.create({
            data: {
              title: 'Document rejeté',
              message: reason
                ? `Votre document « ${doc.fileName} » a été rejeté. Raison : ${reason}`
                : `Votre document « ${doc.fileName} » a été rejeté.`,
              category: 'document',
              resourceType: 'document',
              resourceId: doc.id,
              portalId: doc.uploadedByPortalId,
              tenantId: doc.tenantId,
            },
          })
        }
      }
    }

    return NextResponse.json({ updated: updated.count })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Bulk validate documents error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
