import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'case', 'view')
  if (isErrorResponse(auth)) return auth
  const db = getDb()
  try {
    const tags = await db.caseTag.findMany({
      where: { tenantId: auth.tenantId! },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { taggings: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(tags)
  } catch (error) {
    console.error('Liste des étiquettes erreur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'case', 'create')
  if (isErrorResponse(auth)) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { name, color } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Le nom de l\'étiquette est requis' }, { status: 400 })
    }

    // Check unique constraint
    const existing = await db.caseTag.findUnique({
      where: { name_tenantId: { name: name.trim(), tenantId: auth.tenantId! } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Une étiquette avec ce nom existe déjà' }, { status: 409 })
    }

    const tag = await db.caseTag.create({
      data: {
        name: name.trim(),
        color: color || '#6B7280',
        tenantId: auth.tenantId!,
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { taggings: true } },
      },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error: any) {
    console.error('Création étiquette erreur:', error)
    // Handle Prisma unique constraint violation (P2002)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Une étiquette avec ce nom existe déjà' }, { status: 409 })
    }
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
