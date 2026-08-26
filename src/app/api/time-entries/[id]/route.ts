import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb()
  try {
    const { id } = await params
    const timeEntry = await db.timeEntry.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true } },
        case: { select: { id: true, reference: true, title: true } },
      },
    })

    if (!timeEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    return NextResponse.json(timeEntry)
  } catch (error) {
    console.error('Get time entry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb()
  try {
    const { id } = await params
    const existing = await db.timeEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    const body = await request.json()
    const { description, startTime, endTime, duration, isBillable, hourlyRate, caseId } = body

    const data: Record<string, unknown> = {}
    if (description !== undefined) data.description = description
    if (caseId !== undefined) data.caseId = caseId || null
    if (isBillable !== undefined) data.isBillable = isBillable
    if (hourlyRate !== undefined) data.hourlyRate = hourlyRate ? parseFloat(hourlyRate as string) : null

    let computedDuration = existing.duration
    if (startTime !== undefined) data.startTime = new Date(startTime)
    if (endTime !== undefined) data.endTime = endTime ? new Date(endTime as string) : null

    // Recalculate duration if startTime or endTime changed
    const start = startTime ? new Date(startTime) : existing.startTime
    const end = endTime !== undefined
      ? (endTime ? new Date(endTime as string) : null)
      : existing.endTime

    if (end && duration === undefined) {
      computedDuration = Math.round((end.getTime() - start.getTime()) / 1000)
      data.duration = computedDuration
    } else if (duration !== undefined) {
      computedDuration = parseInt(duration as string, 10)
      data.duration = computedDuration
    }

    // Recalculate totalAmount
    const rate = hourlyRate !== undefined
      ? (hourlyRate ? parseFloat(hourlyRate as string) : null)
      : existing.hourlyRate
    const billable = isBillable !== undefined ? isBillable : existing.isBillable

    if (rate && billable && computedDuration > 0) {
      data.totalAmount = (computedDuration / 3600) * rate
    } else {
      data.totalAmount = null
    }

    const timeEntry = await db.timeEntry.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, fullName: true } },
        case: { select: { id: true, reference: true, title: true } },
      },
    })

    await db.auditLog.create({
      data: {
        action: 'update',
        resourceType: 'time_entry',
        resourceId: id,
        metadata: JSON.stringify({ description: timeEntry.description, duration: computedDuration }),
        tenantId: existing.tenantId,
        userId: existing.userId,
      },
    })

    return NextResponse.json(timeEntry)
  } catch (error) {
    console.error('Update time entry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb()
  try {
    const { id } = await params
    const existing = await db.timeEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    await db.timeEntry.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        action: 'delete',
        resourceType: 'time_entry',
        resourceId: id,
        metadata: JSON.stringify({ description: existing.description }),
        tenantId: existing.tenantId,
        userId: existing.userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete time entry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
