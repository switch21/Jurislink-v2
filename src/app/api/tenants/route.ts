import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (!includeInactive) where.isActive = true
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        include: {
          _count: { select: { users: true, clients: true, cases: true, invoices: true, documents: true } },
          subscription: { include: { plan: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.tenant.count({ where }),
    ])

    return NextResponse.json({ tenants, total, page, limit })
  } catch (error) {
    console.error('List tenants error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    const body = await request.json()
    const tenant = await db.tenant.create({
      data: {
        name: body.name,
        slug: body.slug,
        logoUrl: body.logoUrl,
        address: body.address,
        phone: body.phone,
        email: body.email,
        plan: body.plan,
        maxUsers: body.maxUsers,
        maxStorageGb: body.maxStorageGb,
      },
    })
    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error('Create tenant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
