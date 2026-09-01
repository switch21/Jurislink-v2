import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface OAuthState {
  userId: string
  tenantId: string
}

// --- Google token exchange ---
async function exchangeGoogleToken(code: string, redirectUri: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google token exchange failed: ${err}`)
  }
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>
}

// --- Outlook token exchange ---
async function exchangeOutlookToken(code: string, redirectUri: string) {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'Calendars.ReadWrite',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Outlook token exchange failed: ${err}`)
  }
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>
}

// --- Fetch Google events (next 30 days) ---
async function fetchGoogleEvents(accessToken: string, calendarId?: string) {
  const now = new Date()
  const max = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const timeMin = now.toISOString()
  const timeMax = max.toISOString()

  const cal = calendarId || 'primary'
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google events fetch failed: ${err}`)
  }
  const data = await res.json() as {
    items?: Array<{
      id: string
      summary?: string
      description?: string
      location?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
      status?: string
    }>
  }
  return (data.items || []).map((ev) => ({
    externalId: ev.id,
    title: ev.summary || 'Sans titre',
    description: ev.description || null,
    location: ev.location || null,
    startTime: ev.start?.dateTime || ev.start?.date || timeMin,
    endTime: ev.end?.dateTime || ev.end?.date || timeMax,
    allDay: !!(ev.start?.date && !ev.start?.dateTime),
    status: ev.status || 'confirmed',
  }))
}

// --- Fetch Outlook events (next 30 days) ---
async function fetchOutlookEvents(accessToken: string, calendarId?: string) {
  const now = new Date()
  const max = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  // Outlook requires ISO 8601 round-trip format
  const startStr = now.toISOString()
  const endStr = max.toISOString()

  const calPath = calendarId || 'default'
  const url = `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calPath)}/calendarView?startDateTime=${startStr}&endDateTime=${endStr}&$top=250&$orderby=start/dateTime`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Outlook events fetch failed: ${err}`)
  }
  const data = await res.json() as {
    value?: Array<{
      id: string
      subject?: string
      bodyPreview?: string
      location?: { displayName?: string }
      start?: { dateTime: string; timeZone?: string }
      end?: { dateTime: string; timeZone?: string }
      isAllDay?: boolean
      status?: string
    }>
  }
  return (data.value || []).map((ev) => ({
    externalId: ev.id,
    title: ev.subject || 'Sans titre',
    description: ev.bodyPreview || null,
    location: ev.location?.displayName || null,
    startTime: ev.start?.dateTime || startStr,
    endTime: ev.end?.dateTime || endStr,
    allDay: !!ev.isAllDay,
    status: ev.status || 'confirmed',
  }))
}

// --- Sync fetched events into local Event records ---
async function syncEventsToDb(
  events: Array<{
    externalId: string
    title: string
    description: string | null
    location: string | null
    startTime: string
    endTime: string
    allDay: boolean
    status: string
  }>,
  userId: string,
  tenantId: string,
) {
  const db = getDb()
  try {
    let created = 0
    let updated = 0

    for (const ev of events) {
      const existing = await db.event.findFirst({
        where: { externalEventId: ev.externalId, tenantId },
      })

      const eventData = {
        title: ev.title,
        description: ev.description,
        location: ev.location,
        startTime: new Date(ev.startTime),
        endTime: new Date(ev.endTime),
        allDay: ev.allDay,
        externalEventId: ev.externalId,
      }

      if (existing) {
        await db.event.update({ where: { id: existing.id }, data: eventData })
        updated++
      } else {
        await db.event.create({
          data: {
            ...eventData,
            tenantId,
            eventType: 'audience',
            criticality: 'normal',
            assignments: { create: { userId } },
          },
        })
        created++
      }
    }

    return { created, updated, total: events.length }
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

// --- Determine Google calendar email from token ---
async function getGoogleCalendarInfo(accessToken: string): Promise<{ calendarId: string; calendarEmail: string }> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.ok) {
    const data = await res.json() as { id?: string; description?: string }
    return { calendarId: data.id || 'primary', calendarEmail: data.description || '' }
  }
  return { calendarId: 'primary', calendarEmail: '' }
}

// --- Determine Outlook calendar email from token ---
async function getOutlookCalendarInfo(accessToken: string): Promise<{ calendarId: string; calendarEmail: string }> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.ok) {
    const data = await res.json() as { mail?: string; userPrincipalName?: string }
    return { calendarId: 'default', calendarEmail: data.mail || data.userPrincipalName || '' }
  }
  return { calendarId: 'default', calendarEmail: '' }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const stateRaw = searchParams.get('state')

  // Decode state
  let state: OAuthState | null = null
  try {
    if (stateRaw) state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString())
  } catch {
    // invalid state
  }

  const baseUrl = new URL(request.url).origin

  // OAuth error or missing params → redirect with error
  if (error || !code || !state?.userId || !state?.tenantId) {
    const errorMsg = error || !code ? 'Autorisation refusée' : 'État de session invalide'
    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&sync=error&message=${encodeURIComponent(errorMsg)}`)
  }

  const { userId, tenantId } = state
  const redirectUri = `${baseUrl}/api/calendar/callback/${provider}`

  try {
    let accessToken: string
    let refreshToken: string | undefined
    let expiresIn: number
    let calendarId: string | undefined
    let calendarEmail: string | undefined
    let events: Awaited<ReturnType<typeof fetchGoogleEvents>>

    if (provider === 'google') {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&sync=error&message=${encodeURIComponent('Google Calendar non configuré')}`)
      }

      const tokens = await exchangeGoogleToken(code, redirectUri)
      accessToken = tokens.access_token
      refreshToken = tokens.refresh_token
      expiresIn = tokens.expires_in

      const info = await getGoogleCalendarInfo(accessToken)
      calendarId = info.calendarId
      calendarEmail = info.calendarEmail

      events = await fetchGoogleEvents(accessToken, calendarId)
    } else if (provider === 'outlook') {
      if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
        return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&sync=error&message=${encodeURIComponent('Outlook Calendar non configuré')}`)
      }

      const tokens = await exchangeOutlookToken(code, redirectUri)
      accessToken = tokens.access_token
      refreshToken = tokens.refresh_token
      expiresIn = tokens.expires_in

      const info = await getOutlookCalendarInfo(accessToken)
      calendarId = info.calendarId
      calendarEmail = info.calendarEmail

      events = await fetchOutlookEvents(accessToken, calendarId)
    } else {
      return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&sync=error&message=${encodeURIComponent('Fournisseur invalide')}`)
    }

    // Save tokens to ExternalCalendar (upsert by userId+tenantId+provider)
    const db = getDb()
    try {
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000)

      await db.externalCalendar.upsert({
        where: {
          userId_tenantId_provider: { userId, tenantId, provider },
        },
        create: {
          provider,
          accessToken,
          refreshToken: refreshToken || null,
          tokenExpiry,
          calendarId: calendarId || null,
          calendarEmail: calendarEmail || null,
          syncEnabled: true,
          lastSyncAt: new Date(),
          syncDirection: 'bidirectional',
          userId,
          tenantId,
        },
        update: {
          accessToken,
          refreshToken: refreshToken || undefined, // don't overwrite with null if no refresh token returned
          tokenExpiry,
          calendarId: calendarId || undefined,
          calendarEmail: calendarEmail || undefined,
          lastSyncAt: new Date(),
        },
      })
    } finally {
      await db.$disconnect().catch(() => {})
    }

    // Sync events to local DB
    const syncResult = await syncEventsToDb(events, userId, tenantId)
    console.log(`[Calendar] ${provider} sync for user ${userId}: ${JSON.stringify(syncResult)}`)

    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&sync=success&created=${syncResult.created}&updated=${syncResult.updated}`)
  } catch (err) {
    console.error(`[Calendar] ${provider} callback error:`, err)
    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations&sync=error&message=${encodeURIComponent('Erreur lors de la synchronisation')}`)
  }
}
