import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth-server'

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005'

export async function POST(request: Request) {
  // Auth check — skip RBAC for internal trigger but require valid user
  const auth = await authenticate(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { type, title, message, resourceType, resourceId, userId } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'title et message requis' }, { status: 400 })
    }

    // Use authenticated user's tenantId if not explicitly provided
    const tenantId = body.tenantId || auth.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })
    }

    // Forward to notification WebSocket service via HTTP
    const targetUserId = userId || null
    const endpoint = targetUserId ? '/notify-user' : '/notify'

    const res = await fetch(`${NOTIFICATION_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        type: type || 'dossier',
        title,
        message,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        userId: targetUserId,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json({ ok: true, notificationId: data.id })
  } catch (error) {
    console.error('Notification trigger error:', error)
    // Don't fail the parent request if notification service is down
    return NextResponse.json({ ok: true, warning: 'Notification service indisponible' })
  }
}
