import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'role', 'view')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { id } = await params
    const role = await db.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    })

    if (!role) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 })
    }

    return NextResponse.json(role)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la récupération du rôle:', message)
    return NextResponse.json({ error: 'Erreur lors de la récupération du rôle' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'role', 'edit')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    const { label, description } = body

    if (!label) {
      return NextResponse.json({ error: 'Le libellé est requis' }, { status: 400 })
    }

    const role = await db.role.findUnique({ where: { id } })
    if (!role) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 })
    }

    const updated = await db.role.update({
      where: { id },
      data: {
        label,
        description: description ?? null,
      },
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la mise à jour du rôle:', message)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du rôle' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'role', 'delete')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { id } = await params
    const role = await db.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })

    if (!role) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 })
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Impossible de supprimer un rôle système' }, { status: 403 })
    }

    if (role._count.users > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un rôle assigné à des utilisateurs' },
        { status: 409 }
      )
    }

    await db.role.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la suppression du rôle:', message)
    return NextResponse.json({ error: 'Erreur lors de la suppression du rôle' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
