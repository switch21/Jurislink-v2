import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'notifications', 'read')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')
    const unreadOnly = searchParams.get('unreadOnly')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (userId) where.userId = userId
    if (category) where.category = category
    if (unreadOnly === 'true') where.read = false

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // When polling unread count, return structured format
    if (unreadOnly === 'true') {
      return NextResponse.json({ count: notifications.length, notifications })
    }

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('List notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'notifications', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const notification = await db.notification.create({
      data: {
        title: body.title,
        message: body.message,
        category: body.category,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        tenantId: body.tenantId,
        userId: body.userId,
        eventId: body.eventId,
      },
    })
    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
