import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'case', 'edit')
  if (isErrorResponse(auth)) return auth
  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    const { name, color } = body

    // Verify tag exists and belongs to tenant
    const existing = await db.caseTag.findUnique({
      where: { id },
      select: { tenantId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Étiquette non trouvée' }, { status: 404 })
    }
    if (existing.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // If name is being changed, check uniqueness
    if (name && name.trim().length > 0) {
      const nameTaken = await db.caseTag.findUnique({
        where: { name_tenantId: { name: name.trim(), tenantId: auth.tenantId! } },
      })
      if (nameTaken && nameTaken.id !== id) {
        return NextResponse.json({ error: 'Une étiquette avec ce nom existe déjà' }, { status: 409 })
      }
    }

    const tag = await db.caseTag.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(color ? { color } : {}),
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { taggings: true } },
      },
    })

    return NextResponse.json(tag)
  } catch (error: any) {
    console.error('Mise à jour étiquette erreur:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Une étiquette avec ce nom existe déjà' }, { status: 409 })
    }
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'case', 'delete')
  if (isErrorResponse(auth)) return auth
  const db = getDb()
  try {
    const { id } = await params

    // Verify tag exists and belongs to tenant
    const existing = await db.caseTag.findUnique({
      where: { id },
      select: { tenantId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Étiquette non trouvée' }, { status: 404 })
    }
    if (existing.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Cascade will remove taggings automatically (onDelete: Cascade in schema)
    await db.caseTag.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Suppression étiquette erreur:', error)
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
