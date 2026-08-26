import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'events', 'read')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const month = searchParams.get('month')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const startDate = new Date(year, mon - 1, 1)
      const endDate = new Date(year, mon, 0, 23, 59, 59, 999)
      where.startTime = { gte: startDate, lte: endDate }
    }

    if (userId) {
      where.assignments = { some: { userId } }
    }

    const events = await db.event.findMany({
      where,
      include: {
        assignments: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
        case: { select: { id: true, reference: true, title: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 200,
    })
    return NextResponse.json(events)
  } catch (error) {
    console.error('List events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'events', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const event = await db.event.create({
      data: {
        title: body.title,
        description: body.description,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        eventType: body.eventType,
        criticality: body.criticality,
        tenantId: body.tenantId,
        caseId: body.caseId,
      },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
        case: { select: { id: true, reference: true, title: true } },
      },
    })

    // Handle assignments if provided
    if (Array.isArray(body.assignments) && body.assignments.length > 0) {
      const assignmentData = body.assignments.map((userId: string) => ({
        userId,
        eventId: event.id,
      }))
      await db.eventAssignment.createMany({
        data: assignmentData,
        skipDuplicates: true,
      })

      // Re-fetch with assignments included
      const eventWithAssignments = await db.event.findUnique({
        where: { id: event.id },
        include: {
          assignments: {
            include: {
              user: { select: { id: true, fullName: true } },
            },
          },
          case: { select: { id: true, reference: true, title: true } },
        },
      })
      return NextResponse.json(eventWithAssignments, { status: 201 })
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Create event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
