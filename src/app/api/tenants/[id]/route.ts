import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isErrorResponse, requireAuth, requireRootAdmin } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth(request)
  if (isErrorResponse(auth)) return auth
  // Cabinet users may read their OWN tenant; root_admin may read any tenant
  if (auth.role !== 'root_admin' && id !== auth.tenantId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const db = getDb()
  try {
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
  const { id } = await params
  const auth = await requireAuth(request)
  if (isErrorResponse(auth)) return auth
  const isRoot = auth.role === 'root_admin'
  // Cabinet users may update their OWN tenant (limited fields); root_admin may update any tenant
  if (!isRoot && id !== auth.tenantId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const db = getDb()
  try {
    const body = await request.json()
    const tenant = await db.tenant.update({
      where: { id },
      data: {
        ...(typeof body.name === 'string' && body.name.trim() && { name: body.name.trim() }),
        ...(isRoot && typeof body.slug === 'string' && body.slug.trim() && { slug: body.slug.trim() }),
        ...(typeof body.logoUrl === 'string' && { logoUrl: body.logoUrl }),
        ...(typeof body.address === 'string' && { address: body.address }),
        ...(typeof body.city === 'string' && { city: body.city }),
        ...(typeof body.phone === 'string' && { phone: body.phone }),
        ...(typeof body.email === 'string' && { email: body.email }),
        ...(typeof body.country === 'string' && { country: body.country }),
        ...(typeof body.niu === 'string' && { niu: body.niu }),
        ...(typeof body.currencyCode === 'string' && body.currencyCode.trim() && { currencyCode: body.currencyCode.trim() }),
        ...(isRoot && body.plan !== undefined && { plan: body.plan }),
        ...(isRoot && body.maxUsers !== undefined && { maxUsers: body.maxUsers }),
        ...(isRoot && body.maxStorageGb !== undefined && { maxStorageGb: body.maxStorageGb }),
        ...(isRoot && body.isActive !== undefined && { isActive: body.isActive }),
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRootAdmin(request)
  if (isErrorResponse(auth)) return auth

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
