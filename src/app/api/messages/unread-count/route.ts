import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'message', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const userId = searchParams.get('userId')

    if (!tenantId || !userId) {
      return NextResponse.json({ count: 0 })
    }

    // Count messages where the user is the receiver (proxy for "unread" since
    // the Message model has no isRead field yet)
    const count = await db.message.count({
      where: {
        receiverId: userId,
        tenantId,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Unread message count error:', error)
    return NextResponse.json({ count: 0 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
