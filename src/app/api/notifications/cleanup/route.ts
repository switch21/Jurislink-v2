import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireRootAdmin } from '@/lib/auth-server'

/**
 * Cleanup: delete read notifications older than 30 days.
 * Can be called by cron or manually (root_admin only).
 */
export async function POST(request: Request) {
  const auth = await requireRootAdmin(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await db.notification.deleteMany({
      where: {
        read: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('Notification cleanup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
