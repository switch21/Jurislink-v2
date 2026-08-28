import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'client', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (status === 'active') where.isActive = true
    if (status === 'inactive') where.isActive = false
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { company: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const clients = await db.client.findMany({
      where,
      include: {
        _count: { select: { cases: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(clients)
  } catch (error) {
    console.error('List clients error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'client', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const client = await db.client.create({
      data: {
        fullName: body.fullName,
        company: body.company,
        clientType: body.clientType,
        niu: body.niu,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        country: body.country,
        notes: body.notes,
        riskLevel: body.riskLevel,
        source: body.source,
        status: body.status ?? 'active',
        isActive: body.isActive ?? true,
        responsibleLawyerId: body.responsibleLawyerId,
        tenantId: body.tenantId,
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
