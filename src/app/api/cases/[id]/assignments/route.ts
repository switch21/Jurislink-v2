import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const assignments = await db.caseAssignment.findMany({
      where: { caseId: id },
      include: { user: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } } },
      orderBy: { user: { fullName: 'asc' } },
    })
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Get assignments error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

    const caseData = await db.case.findUnique({ where: { id }, select: { tenantId: true } })
    if (!caseData) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

    const assignment = await db.caseAssignment.upsert({
      where: { userId_caseId: { userId: body.userId, caseId: id } },
      update: {},
      create: { userId: body.userId, caseId: id, tenantId: caseData.tenantId },
    })
    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Add assignment error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

    await db.caseAssignment.deleteMany({ where: { caseId: id, userId: body.userId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Remove assignment error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
