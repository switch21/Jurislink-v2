import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'event', 'manage')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const calendars = await db.externalCalendar.findMany({
      where: { userId: auth.id, tenantId: auth.tenantId! },
      select: {
        id: true,
        provider: true,
        calendarId: true,
        calendarEmail: true,
        syncEnabled: true,
        lastSyncAt: true,
        syncDirection: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(calendars)
  } catch (error) {
    console.error('List external calendars error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'event', 'manage')
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const provider = body.provider // 'google' | 'outlook'

    if (provider !== 'google' && provider !== 'outlook') {
      return NextResponse.json({ error: 'Fournisseur invalide. Utilisez google ou outlook.' }, { status: 400 })
    }

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID
      if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
        return NextResponse.json(
          { error: 'Intégration Google Calendar non configurée. Contactez l\'administrateur.' },
          { status: 400 },
        )
      }

      const origin = new URL(request.url).origin
      const redirectUri = `${origin}/api/calendar/callback/google`

      const state = Buffer.from(
        JSON.stringify({ userId: auth.id, tenantId: auth.tenantId }),
      ).toString('base64url')

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
        access_type: 'offline',
        prompt: 'consent',
        state,
      })

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      return NextResponse.json({ url: authUrl, provider: 'google' })
    }

    // Outlook / Microsoft
    if (provider === 'outlook') {
      const clientId = process.env.OUTLOOK_CLIENT_ID
      if (!clientId || !process.env.OUTLOOK_CLIENT_SECRET) {
        return NextResponse.json(
          { error: 'Intégration Outlook Calendar non configurée. Contactez l\'administrateur.' },
          { status: 400 },
        )
      }

      const origin = new URL(request.url).origin
      const redirectUri = `${origin}/api/calendar/callback/outlook`

      const state = Buffer.from(
        JSON.stringify({ userId: auth.id, tenantId: auth.tenantId }),
      ).toString('base64url')

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'Calendars.ReadWrite',
        state,
      })

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
      return NextResponse.json({ url: authUrl, provider: 'outlook' })
    }
  } catch (error) {
    console.error('Calendar OAuth init error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
