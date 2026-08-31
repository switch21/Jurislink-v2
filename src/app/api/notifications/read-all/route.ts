import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'

export async function POST(request: Request) {
  const auth = await authenticate(request, 'notification', 'edit')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { userId, tenantId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const where: Record<string, unknown> = { userId, read: false }
    if (tenantId) where.tenantId = tenantId

    const result = await db.notification.updateMany({
      where,
      data: { read: true },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
