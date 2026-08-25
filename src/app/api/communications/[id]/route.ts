import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb()
  try {
    const { id } = await params
    const communication = await db.communication.findUnique({
      where: { id },
      include: {
        case: { select: { id: true, reference: true, title: true } },
        client: { select: { id: true, fullName: true, email: true, phone: true } },
        sentBy: { select: { id: true, fullName: true } },
      },
    })

    if (!communication) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 })
    }

    return NextResponse.json(communication)
  } catch (error) {
    console.error('Get communication error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb()
  try {
    const { id } = await params
    const existing = await db.communication.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 })
    }

    await db.communication.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete communication error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
