import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const caze = await db.case.findUnique({
      where: { id },
      include: {
        client: true,
        tenant: true,
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        notes: {
          include: {
            author: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        events: {
          include: {
            assignments: {
              include: {
                user: { select: { id: true, fullName: true } },
              },
            },
          },
          orderBy: { startTime: 'desc' },
        },
      },
    })

    if (!caze) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }
    return NextResponse.json(caze)
  } catch (error) {
    console.error('Get case error:', error)
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
    const caze = await db.case.update({
      where: { id },
      data: {
        reference: body.reference,
        title: body.title,
        description: body.description,
        caseType: body.caseType,
        status: body.status,
        outcome: body.outcome,
        paymentStatus: body.paymentStatus,
        priority: body.priority,
        isSecret: body.isSecret,
        adversary: body.adversary,
        jurisdiction: body.jurisdiction,
        amountInDispute: body.amountInDispute,
        billingType: body.billingType,
      },
    })
    return NextResponse.json(caze)
  } catch (error) {
    console.error('Update case error:', error)
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
    await db.case.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete case error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
