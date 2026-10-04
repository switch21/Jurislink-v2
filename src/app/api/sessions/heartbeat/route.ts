import { NextResponse } from 'next/server'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { touchSession } from '@/lib/sessions'

/**
 * POST /api/sessions/heartbeat
 * Body: { sessionId }
 * Returns { active: boolean } — false means the session was revoked
 * (force logout or superseded) and the client must log out.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (isErrorResponse(auth)) return auth

  try {
    const body = await request.json().catch(() => ({}))
    const active = await touchSession(body.sessionId, auth.id)
    return NextResponse.json({ active })
  } catch (error) {
    console.error('Session heartbeat error:', error)
    return NextResponse.json({ active: true })
  }
}
