import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

/** Format a Date to iCal DATE-TIME or DATE value */
function formatICalDate(date: Date, allDay: boolean): string {
  if (allDay) {
    // DATE format: YYYYMMDD
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}${m}${d}`
  }
  // DATE-TIME format: YYYYMMDDTHHMMSS with TZID=Europe/Paris
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}${mo}${d}T${h}${mi}${s}`
}

/** Escape iCal text values */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

/** Map our event criticality/status to iCal STATUS */
function mapStatus(eventType: string, criticality: string): string {
  if (criticality === 'urgent') return 'CONFIRMED'
  if (eventType === 'annule') return 'CANCELLED'
  return 'CONFIRMED'
}

export async function GET(request: Request) {
  const auth = await authenticate(request, 'event', 'view')
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const caseId = searchParams.get('caseId')

  // Require tenantId
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId est requis' }, { status: 400 })
  }

  // Tenant access check
  if (!auth.tenantId || auth.tenantId !== tenantId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const db = getDb()
  try {
    const where: Record<string, unknown> = { tenantId }
    if (caseId) where.caseId = caseId

    const events = await db.event.findMany({
      where,
      include: {
        case: { select: { reference: true, title: true } },
        assignments: { select: { user: { select: { fullName: true, email: true } } } },
      },
      orderBy: { startTime: 'asc' },
      take: 500,
    })

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JurisDocus//Calendar//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-TIMEZONE:Europe/Paris',
    ]

    for (const ev of events) {
      const allDay = ev.allDay
      const dtStart = formatICalDate(new Date(ev.startTime), allDay)
      const dtEnd = ev.endTime
        ? formatICalDate(new Date(ev.endTime), allDay)
        : formatICalDate(new Date(new Date(ev.startTime).getTime() + 3600_000), allDay)

      const status = mapStatus(ev.eventType, ev.criticality)
      const summary = ev.case
        ? `[${ev.case.reference}] ${ev.title}`
        : ev.title
      const description = ev.description || ''
      const location = ev.location || undefined

      const attendees = ev.assignments
        .map((a) => `ATTENDEE;CN=${escapeICS(a.user.fullName)}:mailto:${a.user.email}`)
        .join('\r\n')

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${ev.id}@jurisdocus.fr`)
      lines.push(`DTSTAMP:${formatICalDate(new Date(), false)}`)

      if (allDay) {
        lines.push(`DTSTART;VALUE=DATE:${dtStart}`)
        lines.push(`DTEND;VALUE=DATE:${dtEnd}`)
      } else {
        lines.push(`DTSTART;TZID=Europe/Paris:${dtStart}`)
        lines.push(`DTEND;TZID=Europe/Paris:${dtEnd}`)
      }

      lines.push(`SUMMARY:${escapeICS(summary)}`)
      if (description) lines.push(`DESCRIPTION:${escapeICS(description)}`)
      if (location) lines.push(`LOCATION:${escapeICS(location)}`)
      lines.push(`STATUS:${status}`)
      if (attendees) lines.push(attendees)
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    const icsContent = lines.join('\r\n')

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('iCal export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
