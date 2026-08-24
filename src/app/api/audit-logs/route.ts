import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const resourceType = searchParams.get('resourceType')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (userId) where.userId = userId
    if (action) where.action = action
    if (resourceType) where.resourceType = resourceType

    const auditLogs = await db.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    })
    return NextResponse.json(auditLogs)
  } catch (error) {
    console.error('List audit logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    const body = await request.json()
    const auditLog = await db.auditLog.create({
      data: {
        action: body.action,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        metadata: body.metadata,
        ipAddress: body.ipAddress,
        userAgent: body.userAgent,
        tenantId: body.tenantId,
        userId: body.userId,
      },
    })
    return NextResponse.json(auditLog, { status: 201 })
  } catch (error) {
    console.error('Create audit log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
