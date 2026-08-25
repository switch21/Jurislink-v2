import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const userId = searchParams.get('userId')
    const caseId = searchParams.get('caseId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const where: Prisma.TimeEntryWhereInput = { tenantId }

    if (userId) where.userId = userId
    if (caseId) where.caseId = caseId

    if (fromDate || toDate) {
      where.startTime = {}
      if (fromDate) (where.startTime as Prisma.DateTimeNullableFilter).gte = new Date(fromDate)
      if (toDate) (where.startTime as Prisma.DateTimeNullableFilter).lte = new Date(toDate)
    }

    const timeEntries = await db.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true } },
        case: { select: { id: true, reference: true, title: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 500,
    })

    return NextResponse.json(timeEntries)
  } catch (error) {
    console.error('List time entries error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    const body = await request.json()
    const {
      tenantId, userId, caseId, description, startTime,
      endTime, duration, isBillable, hourlyRate,
    } = body

    if (!tenantId || !userId || !description || !startTime) {
      return NextResponse.json(
        { error: 'tenantId, userId, description, and startTime are required' },
        { status: 400 },
      )
    }

    let computedDuration = duration ? parseInt(duration, 10) : 0
    if (endTime && !duration) {
      const start = new Date(startTime)
      const end = new Date(endTime)
      computedDuration = Math.round((end.getTime() - start.getTime()) / 1000)
    }

    const billable = isBillable !== undefined ? isBillable : true
    const rate = hourlyRate ? parseFloat(hourlyRate) : null
    let totalAmount: number | null = null

    if (rate && billable && computedDuration > 0) {
      totalAmount = (computedDuration / 3600) * rate
    }

    const timeEntry = await db.timeEntry.create({
      data: {
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration: computedDuration,
        isBillable: billable,
        hourlyRate: rate,
        totalAmount,
        tenantId,
        userId,
        caseId: caseId || null,
      },
      include: {
        user: { select: { id: true, fullName: true } },
        case: { select: { id: true, reference: true, title: true } },
      },
    })

    await db.auditLog.create({
      data: {
        action: 'create',
        resourceType: 'time_entry',
        resourceId: timeEntry.id,
        metadata: JSON.stringify({ description, duration: computedDuration }),
        tenantId,
        userId,
      },
    })

    return NextResponse.json(timeEntry, { status: 201 })
  } catch (error) {
    console.error('Create time entry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
