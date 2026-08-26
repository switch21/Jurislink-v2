import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'user', 'view')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        phone: true,
        preferredLanguage: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json(user)
  } catch (error) {
    console.error('Get user error:', error)
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
  const auth = await authenticate(request, 'user', 'update')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()

    // Prevent deactivation of root_admin
    if (body.isActive === false) {
      const targetUser = await db.user.findUnique({ where: { id }, select: { role: true } })
      if (targetUser?.role === 'root_admin') {
        return NextResponse.json({ error: 'Le compte root_admin ne peut pas être désactivé' }, { status: 403 })
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        email: body.email,
        fullName: body.fullName,
        role: body.role,
        avatarUrl: body.avatarUrl,
        phone: body.phone,
        preferredLanguage: body.preferredLanguage,
        isActive: body.isActive,
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
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        tenant: { select: { id: true, name: true, slug: true, plan: true } },
      },
    })
    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
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
  const auth = await authenticate(request, 'user', 'delete')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { id } = await params
    const targetUser = await db.user.findUnique({ where: { id }, select: { role: true, email: true } })
    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }
    if (targetUser.role === 'root_admin') {
      return NextResponse.json({ error: 'Le compte root_admin ne peut pas être supprimé' }, { status: 403 })
    }
    await db.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
