import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            cases: true,
            invoices: true,
            documents: true,
            events: true,
            tasks: true,
            payments: true,
            notifications: true,
            auditLogs: true,
          },
        },
        subscription: { include: { plan: true } },
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Get tenant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    const tenant = await db.tenant.update({
      where: { id },
      data: {
        ...(typeof body.name === 'string' && body.name.trim() && { name: body.name.trim() }),
        ...(typeof body.slug === 'string' && body.slug.trim() && { slug: body.slug.trim() }),
        ...(typeof body.logoUrl === 'string' && { logoUrl: body.logoUrl }),
        ...(typeof body.address === 'string' && { address: body.address }),
        ...(typeof body.city === 'string' && { city: body.city }),
        ...(typeof body.phone === 'string' && { phone: body.phone }),
        ...(typeof body.email === 'string' && { email: body.email }),
        ...(typeof body.country === 'string' && { country: body.country }),
        ...(typeof body.niu === 'string' && { niu: body.niu }),
        ...(typeof body.currencyCode === 'string' && body.currencyCode.trim() && { currencyCode: body.currencyCode.trim() }),
        ...(body.plan !== undefined && { plan: body.plan }),
        ...(body.maxUsers !== undefined && { maxUsers: body.maxUsers }),
        ...(body.maxStorageGb !== undefined && { maxStorageGb: body.maxStorageGb }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })
    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Update tenant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    await db.tenant.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete tenant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
