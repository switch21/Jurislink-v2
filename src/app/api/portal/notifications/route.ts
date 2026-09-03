import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticatePortal } from '@/lib/portal-auth-server'

export async function GET(request: Request) {
  const auth = await authenticatePortal(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const notifications = await db.portalNotification.findMany({
      where: {
        portalId: auth.portalUserId,
        tenantId: auth.tenantId,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notifications)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal notifications error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticatePortal(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const body = await request.json()

    // Mark single notification as read
    if (body.id) {
      const updated = await db.portalNotification.updateMany({
        where: { id: body.id, portalId: auth.portalUserId, tenantId: auth.tenantId },
        data: { read: true },
      })
      return NextResponse.json({ success: true, updated: updated.count })
    }

    // Mark all as read
    if (body.all) {
      const result = await db.portalNotification.updateMany({
        where: { portalId: auth.portalUserId, tenantId: auth.tenantId, read: false },
        data: { read: true },
      })
      return NextResponse.json({ success: true, updated: result.count })
    }

    return NextResponse.json({ error: 'Paramètre manquant' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal notification mark-read error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}