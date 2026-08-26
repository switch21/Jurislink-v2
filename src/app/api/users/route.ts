import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'user', 'view')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const includeRootAdmin = searchParams.get('includeRootAdmin') === 'true'
    const where: Record<string, unknown> = {}

    // Tenant isolation: non-root_admin users can only see their own tenant's users
    const effectiveTenantId = auth.role === 'root_admin'
      ? searchParams.get('tenantId')
      : auth.tenantId

    if (effectiveTenantId) {
      where.tenantId = effectiveTenantId
      // Never expose root_admin to tenant-scoped queries
      if (role) where.role = role
      else where.role = { not: 'root_admin' }
    } else {
      if (role) where.role = role
      else if (!includeRootAdmin) where.role = { not: 'root_admin' }
    }
    if (!includeInactive) where.isActive = true
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          avatarUrl: true,
          phone: true,
          preferredLanguage: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
          tenant: { select: { id: true, name: true, slug: true, plan: true } },
          roleObj: { select: { id: true, name: true, label: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ])

    return NextResponse.json({ users, total, page, limit })
  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'user', 'create')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const body = await request.json()
    const user = await db.user.create({
      data: {
        email: body.email,
        fullName: body.fullName,
        role: body.role,
        avatarUrl: body.avatarUrl,
        phone: body.phone,
        preferredLanguage: body.preferredLanguage,
        isActive: body.isActive ?? true,
        tenantId: body.tenantId,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        phone: true,
        preferredLanguage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
      },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
