import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  try {
    const roles = await db.role.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { level: 'desc' },
    })
    return NextResponse.json(roles)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la récupération des rôles:', message)
    return NextResponse.json({ error: 'Erreur lors de la récupération des rôles' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    const body = await request.json()
    const { name, label, description } = body

    if (!name || !label) {
      return NextResponse.json({ error: 'Le nom et le libellé sont requis' }, { status: 400 })
    }

    const existing = await db.role.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'Un rôle avec ce nom existe déjà' }, { status: 409 })
    }

    const role = await db.role.create({
      data: {
        name,
        label,
        description: description ?? null,
      },
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la création du rôle:', message)
    return NextResponse.json({ error: 'Erreur lors de la création du rôle' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
