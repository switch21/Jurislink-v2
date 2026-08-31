import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, requireTenantAccess } from '@/lib/auth-server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'notification', 'edit')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const notification = await db.notification.update({
      where: { id },
      data: { read: true },
    })
    return NextResponse.json(notification)
  } catch (error) {
    console.error('Mark notification as read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'notification', 'delete')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params

    // Verify notification exists and belongs to user's tenant
    const notification = await db.notification.findUnique({
      where: { id },
      select: { tenantId: true, userId: true },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification non trouvée' }, { status: 404 })
    }

    // Verify tenant access (user can delete their own or any in their tenant)
    if (!requireTenantAccess(auth, notification.tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await db.notification.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
