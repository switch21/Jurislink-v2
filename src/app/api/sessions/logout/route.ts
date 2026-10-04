import { NextResponse } from 'next/server'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { endSession } from '@/lib/sessions'

/**
 * POST /api/sessions/logout
 * Body: { sessionId }
 * Marks the session inactive (idle timeout / explicit logout).
 */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (isErrorResponse(auth)) return auth

  try {
    const body = await request.json().catch(() => ({}))
    await endSession(body.sessionId, auth.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Session logout error:', error)
    return NextResponse.json({ ok: true })
  }
}
